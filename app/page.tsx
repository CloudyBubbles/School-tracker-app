"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, animate } from "framer-motion";
// Backup export/import intentionally stays on the old sync localStorage
// functions — it's the frozen rollback safety net, decoupled from the live
// Supabase-backed UI below. Everything else on this page uses the async db
// layer. Both are imported here on purpose — not an incomplete migration.
import { loadAssignments, saveAssignments } from "@/app/lib/storage";
import { getSubjects, saveSubjects } from "@/app/lib/subjects";
import type { Subject } from "@/app/lib/subjects";
import { listAssignments, deleteAssignmentsBySubject } from "@/app/lib/db/assignments";
import { listSubjects, createSubject, deleteSubject } from "@/app/lib/db/subjects";
import { parseLocalDate } from "@/app/lib/dates";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { toRoman } from "@/app/lib/utils";
import PageStack from "@/app/components/journal/PageStack";
import RiggedHand, { RiggedHandHandle } from "@/app/components/journal/RiggedHand";
import QuillTitle from "@/app/components/QuillTitle";
import { playBookOpen, playBookOpenRitual, playBookCloseRitual } from "@/app/lib/sounds";

const PRESET_COLOURS = [
  "#5b4a8f", "#8b5e2a", "#2d6b4a", "#7a3040",
  "#2d5a8b", "#8b4a2a", "#4a7a4a", "#6b4a7a",
];

// Full hand-driven ritual plays once per browser session per direction (open / close).
// Every open/close after that gets the quick version. Flip either check in
// `seenThisSession` to `false` to force full every time, or swap sessionStorage for
// localStorage below to make "seen" permanent across sessions.
const RITUAL_OPEN_KEY = "schoolwork-ritual-open-seen";
const RITUAL_CLOSE_KEY = "schoolwork-ritual-close-seen";

function seenThisSession(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return true; // storage unavailable — default to the quick path, never crash
  }
}

function markSeen(key: string) {
  try { sessionStorage.setItem(key, "1"); } catch { /* */ }
}

export default function CoverPage() {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const gripHandRef = useRef<HTMLDivElement>(null);
  const restHandRef = useRef<HTMLDivElement>(null);
  const riggedHandRef = useRef<RiggedHandHandle>(null);
  const { startTransition, endTransition } = usePageTransition();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState({ total: 0, overdue: 0, done: 0, dueToday: 0 });
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [urgentSubjects, setUrgentSubjects] = useState<Record<string, "overdue" | "today">>({});
  const [showManageSubjects, setShowManageSubjects] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColour, setNewSubjectColour] = useState(PRESET_COLOURS[0]);
  const [removeWarning, setRemoveWarning] = useState<Record<string, string>>({});
  const [importError, setImportError] = useState<string | null>(null);
  const [candlelight, setCandlelight] = useState(false);
  const [sounds, setSounds] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Quick open — the original single swing. Rest hand is already resting, no grip stage.
  const openCoverQuick = async () => {
    if (!coverRef.current) return;
    if (restHandRef.current) restHandRef.current.style.opacity = "1";
    if (document.documentElement.classList.contains("sounds-on")) playBookOpen();
    await animate(
      coverRef.current,
      { rotateY: -160 },
      { duration: 0.7, ease: [0.3, 0, 0.3, 1] }
    );
  };

  // Full open ritual — grip hand rides the cover (nested inside the outer face, so it
  // auto-culls via backfaceVisibility at the exact same instant the leather does), rest
  // hand crossfades in around the edge-on crossing. Hold -> drag -> hitch -> release -> settle.
  const openCoverFull = async () => {
    if (!coverRef.current) return;
    if (gripHandRef.current) gripHandRef.current.style.opacity = "1";
    if (restHandRef.current) restHandRef.current.style.opacity = "0";
    riggedHandRef.current?.grip();
    if (document.documentElement.classList.contains("sounds-on")) playBookOpenRitual();

    animate(
      coverRef.current,
      { rotateY: [0, 0, -18, -75, -80, -160, -152, -160] },
      {
        duration: 1.8,
        times: [0, 0.1, 0.3, 0.55, 0.62, 0.85, 0.94, 1],
        ease: ["linear", "easeIn", "easeInOut", "linear", "easeOut", "easeInOut", "easeOut"],
      }
    );

    // Rest hand fades in right around the edge-on crossing — tune this offset by eye,
    // it should land the instant the grip hand disappears, not before or after.
    setTimeout(() => {
      if (restHandRef.current) {
        animate(restHandRef.current, { opacity: [0, 1] }, { duration: 0.2, ease: "easeOut" });
      }
      riggedHandRef.current?.release();
    }, 1150);

    await new Promise<void>((resolve) => setTimeout(resolve, 1800));
  };

  // Quick close — snap shut, no grip-hand stage.
  const closeCoverQuick = async () => {
    if (!coverRef.current) return;
    await animate(
      coverRef.current,
      { rotateY: 0 },
      { duration: 0.35, ease: [0.6, 0, 0.8, 1] }
    );
  };

  // Full close ritual — mirrors openCoverFull in reverse. The grip hand's entrance is an
  // instant hard cut (backfaceVisibility flips the instant rotateY crosses -90, same as the
  // cull on open) — it can't be delayed or eased. So unlike the open ritual, where the rest
  // hand's fade-IN starts at the crossing, here the rest hand's fade-OUT must instead FINISH
  // exactly at the crossing — otherwise it either overlaps the grip hand's hard appearance
  // (fade starts at/after crossing) or leaves a gap where neither hand renders (fade starts
  // too early and completes before the crossing, as a naive t=0 start would).
  const closeCoverFull = async () => {
    if (!coverRef.current) return;
    if (gripHandRef.current) gripHandRef.current.style.opacity = "1";
    riggedHandRef.current?.grip();
    if (document.documentElement.classList.contains("sounds-on")) playBookCloseRitual();
    if (restHandRef.current) {
      // rotateY crosses -90 (the backface cull point) at ~616ms into this timeline —
      // start the 200ms fade-out so it lands there. Re-derive both numbers together if
      // the keyframes/times/duration below change.
      setTimeout(() => {
        if (restHandRef.current) {
          animate(restHandRef.current, { opacity: [1, 0] }, { duration: 0.2, ease: "easeIn" });
        }
      }, 416);
    }

    await animate(
      coverRef.current,
      { rotateY: [-160, -160, -152, -80, -75, -18, 0, 0] },
      {
        duration: 1.6,
        times: [0, 0.08, 0.2, 0.45, 0.52, 0.75, 0.92, 1],
        ease: ["linear", "easeIn", "easeInOut", "linear", "easeOut", "easeInOut", "easeOut"],
      }
    );
  };

  // Trial verdict: full ritual every time, both directions. Quick variants stay defined
  // above (unused) in case that ever needs revisiting — see ALWAYS_FULL_RITUAL below.
  const ALWAYS_FULL_RITUAL = true;

  const openCover = async () => {
    if (animating || !coverRef.current) return;
    setAnimating(true);
    if (!ALWAYS_FULL_RITUAL && seenThisSession(RITUAL_OPEN_KEY)) {
      await openCoverQuick();
    } else {
      markSeen(RITUAL_OPEN_KEY);
      await openCoverFull();
    }
    setAnimating(false);
  };

  const handleOpen = async () => {
    if (animating) return;
    setAnimating(true);

    if (!ALWAYS_FULL_RITUAL && seenThisSession(RITUAL_CLOSE_KEY)) {
      await closeCoverQuick();
    } else {
      markSeen(RITUAL_CLOSE_KEY);
      await closeCoverFull();
    }

    // Zoom the closed book toward the camera — hand exits with it
    if (bookRef.current) {
      animate(
        bookRef.current,
        { scale: 4.5 },
        { duration: 0.55, ease: [0.2, 0, 0.4, 1] }
      );
    }

    // Navigate mid-zoom: startTransition overlay cuts in and masks the page swap
    await new Promise<void>((resolve) => setTimeout(resolve, 280));
    startTransition();
    router.push("/journal");
  };

  useEffect(() => {
    endTransition();
    // If the full ritual is about to play, hide the rest hand from frame 1 instead of
    // flashing it visible-then-hidden once openCoverFull actually starts.
    if (!seenThisSession(RITUAL_OPEN_KEY) && restHandRef.current) {
      restHandRef.current.style.opacity = "0";
    }
    const t = setTimeout(() => { openCover(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCandlelight(document.documentElement.classList.contains("candlelight"));
    setSounds(document.documentElement.classList.contains("sounds-on"));
  }, []);

  const toggleCandlelight = () => {
    const next = !document.documentElement.classList.contains("candlelight");
    document.documentElement.classList.toggle("candlelight", next);
    try { localStorage.setItem("candlelight", String(next)); } catch { /* */ }
    setCandlelight(next);
  };

  const toggleSounds = () => {
    const next = !sounds;
    setSounds(next);
    if (next) {
      document.documentElement.classList.add("sounds-on");
      try { localStorage.setItem("sounds", "true"); } catch { /* */ }
    } else {
      document.documentElement.classList.remove("sounds-on");
      try { localStorage.setItem("sounds", "false"); } catch { /* */ }
    }
  };

  const loadStats = async () => {
    const [subs, assignments] = await Promise.all([listSubjects(), listAssignments()]);
    setSubjects(subs);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = assignments.filter(
      (a) => a.status !== "Done" && parseLocalDate(a.dueDate) < today
    ).length;
    const dueToday = assignments.filter(
      (a) => a.status !== "Done" && parseLocalDate(a.dueDate).getTime() === today.getTime()
    ).length;
    const done = assignments.filter((a) => a.status === "Done").length;
    setStats({ total: assignments.length, overdue, done, dueToday });
    const counts: Record<string, number> = {};
    for (const sub of subs) {
      counts[sub.id] = assignments.filter((a) => a.subjectId === sub.id).length;
    }
    setSubjectCounts(counts);
    const urgentSubs: Record<string, "overdue" | "today"> = {};
    for (const a of assignments) {
      if (a.status === "Done") continue;
      const due = parseLocalDate(a.dueDate);
      if (due < today) {
        urgentSubs[a.subjectId] = "overdue";
      } else if (due.getTime() === today.getTime()) {
        if (urgentSubs[a.subjectId] !== "overdue") {
          urgentSubs[a.subjectId] = "today";
        }
      }
    }
    setUrgentSubjects(urgentSubs);
  };

  useEffect(() => {
    loadStats();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadStats();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data || typeof data !== "object") throw new Error("Invalid file format");
        if (data.assignments && Array.isArray(data.assignments)) {
          saveAssignments(data.assignments);
        }
        if (data.subjects && Array.isArray(data.subjects)) {
          saveSubjects(data.subjects);
        }
        // Not calling loadStats() here — it now reads Supabase, so it
        // wouldn't reflect a restore into localStorage anyway.
        setShowBackup(false);
        e.target.value = "";
      } catch {
        setImportError("Couldn't read that file — make sure it's a valid backup JSON.");
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleRemoveSubject = async (id: string) => {
    const all = await listAssignments();
    const count = all.filter((a) => a.subjectId === id).length;
    if (count > 0 && !removeWarning[id]) {
      setRemoveWarning({ ...removeWarning, [id]: `has ${count} entr${count === 1 ? "y" : "ies"}` });
      return;
    }
    // Must delete assignments before the subject — subject_id has no
    // ON DELETE CASCADE, so deleting the subject first would FK-violate.
    if (count > 0) {
      await deleteAssignmentsBySubject(id);
    }
    await deleteSubject(id);
    await loadStats();
    const newWarnings = { ...removeWarning };
    delete newWarnings[id];
    setRemoveWarning(newWarnings);
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const newSub = await createSubject({ name: newSubjectName.trim(), colour: newSubjectColour });
    setSubjects([...subjects, newSub]);
    setSubjectCounts({ ...subjectCounts, [newSub.id]: 0 });
    setNewSubjectName("");
  };

  const cornerStyles = [
    { top: 0, left: 0, borderTop: "1.5px solid rgba(200,160,80,0.3)", borderLeft: "1.5px solid rgba(200,160,80,0.3)" },
    { top: 0, right: 0, borderTop: "1.5px solid rgba(200,160,80,0.3)", borderRight: "1.5px solid rgba(200,160,80,0.3)" },
    { bottom: 0, left: 0, borderBottom: "1.5px solid rgba(200,160,80,0.3)", borderLeft: "1.5px solid rgba(200,160,80,0.3)" },
    { bottom: 0, right: 0, borderBottom: "1.5px solid rgba(200,160,80,0.3)", borderRight: "1.5px solid rgba(200,160,80,0.3)" },
  ];

  const coverInputStyle = {
    background: "rgba(100,60,20,0.04)",
    border: "1px solid rgba(100,60,20,0.2)",
    color: "var(--ink-dark)",
    WebkitTextFillColor: "var(--ink-dark)" as string,
    fontFamily: "var(--font-serif)",
    fontSize: "12px",
    padding: "5px 10px",
    borderRadius: "3px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(#1a0c04, #0e0601)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "var(--font-serif)",
      }}
    >
      {/* Spine */}
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "18px",
          background: "#0e0601",
          borderRight: "1px solid rgba(200,160,80,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            fontFamily: "var(--font-hand)",
            fontSize: "7px",
            color: "rgba(200,160,80,0.3)",
            letterSpacing: "0.15em",
            whiteSpace: "nowrap",
          }}
        >
          Schoolwork · 2026
        </span>
      </div>

      {/* Book wrapper */}
      <div style={{ maxWidth: "380px", width: "100%", padding: "0 24px" }}>
        <div ref={bookRef} style={{ position: "relative", margin: "16px", transformOrigin: "center center" }}>

          {/* LAYER 1: Interior (parchment, static) */}
          <div
            style={{
              border: "1.5px solid rgba(140,90,40,0.2)",
              borderRadius: "6px",
              padding: "28px 24px",
              position: "relative",
              background: "var(--parchment)",
              boxShadow: "inset 6px 0 16px rgba(0,0,0,0.12), 2px 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Spine gutter shadow */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "12px",
                background: "linear-gradient(to right, rgba(0,0,0,0.1), transparent)",
                borderRadius: "6px 0 0 6px",
                pointerEvents: "none",
              }}
            />

            {/* Year */}
            <p
              style={{
                fontFamily: "var(--font-hand)",
                fontSize: "9px",
                color: "var(--ink-medium)",
                letterSpacing: "0.2em",
                textAlign: "center",
                margin: "0 0 10px",
              }}
            >
              2026
            </p>

            {/* Title */}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "26px",
                color: "var(--ink-dark)",
                letterSpacing: "0.25em",
                textAlign: "center",
                margin: "0 0 6px",
              }}
            >
              SCHOOLWORK
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "10px",
                color: "var(--ink-medium)",
                textAlign: "center",
                margin: "0 0 16px",
              }}
            >
              Year 13 · Te Kura
            </p>

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(100,60,20,0.2)",
                width: "50%",
                margin: "0 auto 20px",
              }}
            />

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                marginBottom: "20px",
              }}
            >
              {[
                { label: "Total", value: stats.total, colour: "var(--ink-dark)" },
                { label: "Overdue", value: stats.overdue, colour: stats.overdue > 0 ? "#e06060" : "var(--ink-dark)" },
                { label: "Done", value: stats.done, colour: stats.done > 0 ? "#60a860" : "var(--ink-dark)" },
              ].map(({ label, value, colour }) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    border: "1px solid rgba(100,60,20,0.12)",
                    borderRadius: "3px",
                    padding: "8px 4px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "16px",
                      color: colour,
                      lineHeight: 1,
                      marginBottom: "4px",
                    }}
                  >
                    {value}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-hand)",
                      fontSize: "9px",
                      color: "var(--ink-light)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Urgency banner */}
            {(stats.overdue > 0 || stats.dueToday > 0) && (
              <div
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-hand)",
                  fontSize: "11px",
                  color: stats.overdue > 0 ? "#b04040" : "#c06030",
                  background: stats.overdue > 0 ? "rgba(176,64,64,0.08)" : "rgba(192,96,48,0.08)",
                  border: `1px solid ${stats.overdue > 0 ? "rgba(176,64,64,0.2)" : "rgba(192,96,48,0.2)"}`,
                  borderRadius: "3px",
                  padding: "6px 12px",
                  marginBottom: "12px",
                }}
              >
                {stats.overdue > 0
                  ? `${stats.overdue} assignment${stats.overdue !== 1 ? "s" : ""} overdue`
                  : `${stats.dueToday} assignment${stats.dueToday !== 1 ? "s" : ""} due today`}
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                height: "1px",
                background: "rgba(100,60,20,0.12)",
                margin: "0 0 16px",
              }}
            />

            {/* Chapter list */}
            <div style={{ marginBottom: "24px" }}>
              {subjects.map((sub, i) => (
                <Link
                  key={sub.id}
                  href={`/journal/${sub.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                  onClick={() => startTransition()}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "5px 0",
                      borderBottom: "1px solid rgba(100,60,20,0.06)",
                      cursor: "pointer",
                      transition: "opacity 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-hand)",
                        fontSize: "9px",
                        color: "var(--ink-light)",
                        marginRight: "8px",
                      }}
                    >
                      {toRoman(i + 1)}
                    </span>
                    {urgentSubjects[sub.id] && (
                      <div
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: urgentSubjects[sub.id] === "overdue" ? "#e06060" : "#c8a050",
                          flexShrink: 0,
                          marginRight: "6px",
                          opacity: 0.8,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "11px",
                        color: "var(--ink-dark)",
                        flex: 1,
                      }}
                    >
                      {sub.name}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-hand)",
                        fontSize: "9px",
                        color: "var(--ink-light)",
                      }}
                    >
                      {subjectCounts[sub.id] ?? 0}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Assessments & Milestones — peer to the chapter list, not a chapter itself */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <Link
                href="/journal/assessments"
                onClick={() => startTransition()}
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "10px",
                  color: "var(--ink-light)",
                  textDecoration: "none",
                  letterSpacing: "0.05em",
                }}
              >
                🎖 Assessments &amp; Milestones
              </Link>
            </div>

            <PageStack />

            {/* Open button */}
            <div style={{ textAlign: "center", marginTop: "24px" }}>
              <button
                onClick={handleOpen}
                disabled={animating}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(100,60,20,0.25)",
                  fontFamily: "var(--font-serif)",
                  fontSize: "12px",
                  color: "var(--ink-dark)",
                  padding: "10px 32px",
                  letterSpacing: "0.1em",
                  cursor: animating ? "default" : "pointer",
                  borderRadius: "2px",
                  opacity: animating ? 0.45 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                Open Journal →
              </button>
            </div>

            {/* Manage subjects link */}
            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <button
                onClick={() => setShowManageSubjects(!showManageSubjects)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-hand)",
                  fontSize: "10px",
                  color: "var(--ink-light)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                manage subjects
              </button>
            </div>

            {/* Backup link */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <button
                onClick={() => setShowBackup(!showBackup)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-hand)",
                  fontSize: "10px",
                  color: "var(--ink-light)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                backup / restore
              </button>
            </div>

            {/* Candlelight toggle */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <button
                onClick={toggleCandlelight}
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-hand)",
                  fontSize: "10px",
                  color: "var(--ink-light)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {candlelight ? "🕯 daylight" : "🕯 candlelight"}
              </button>
            </div>

            {/* Sounds toggle */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <button
                onClick={toggleSounds}
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-hand)",
                  fontSize: "10px",
                  color: "var(--ink-light)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {sounds ? "🖋 sounds on" : "🖋 sounds off"}
              </button>
            </div>

            {/* Subject management panel */}
            {showManageSubjects && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  borderTop: "1px solid rgba(100,60,20,0.1)",
                }}
              >
                {subjects.map((sub) => (
                  <div
                    key={sub.id}
                    style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: sub.colour,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "11px",
                        color: "var(--ink-dark)",
                        flex: 1,
                      }}
                    >
                      {sub.name}
                    </span>
                    {removeWarning[sub.id] ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "#b04040", opacity: 0.85 }}>
                          {removeWarning[sub.id]} — confirm:
                        </span>
                        <button
                          onClick={() => handleRemoveSubject(sub.id)}
                          style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "#b04040", cursor: "pointer", padding: 0, opacity: 0.85 }}
                        >
                          remove all
                        </button>
                        <button
                          onClick={() => { const w = { ...removeWarning }; delete w[sub.id]; setRemoveWarning(w); }}
                          style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0 }}
                        >
                          cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRemoveSubject(sub.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontFamily: "var(--font-hand)",
                          fontSize: "13px",
                          color: "var(--ink-light)",
                          cursor: "pointer",
                          padding: 0,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Add new subject */}
                <div style={{ marginTop: "14px" }}>
                  <input
                    type="text"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddSubject(); }}
                    placeholder="Subject name"
                    style={coverInputStyle}
                  />

                  {/* Colour swatches */}
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                    {PRESET_COLOURS.map((colour) => (
                      <div
                        key={colour}
                        onClick={() => setNewSubjectColour(colour)}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "50%",
                          background: colour,
                          cursor: "pointer",
                          outline: newSubjectColour === colour ? "2px solid rgba(200,160,80,0.6)" : "2px solid transparent",
                          outlineOffset: "2px",
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleAddSubject}
                    style={{
                      marginTop: "8px",
                      background: "rgba(100,60,20,0.06)",
                      border: "1px solid rgba(100,60,20,0.2)",
                      color: "var(--ink-dark)",
                      fontFamily: "var(--font-serif)",
                      fontSize: "12px",
                      padding: "5px 16px",
                      borderRadius: "3px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Add Subject
                  </button>
                </div>
              </div>
            )}

            {/* Backup panel */}
            {showBackup && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  borderTop: "1px solid rgba(100,60,20,0.1)",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-hand)",
                    fontSize: "9px",
                    color: "var(--ink-light)",
                    marginBottom: "12px",
                  }}
                >
                  backup / restore
                </div>
                <button
                  onClick={() => {
                    const data = {
                      assignments: loadAssignments(),
                      subjects: getSubjects(),
                      exportedAt: new Date().toISOString(),
                    };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `schoolwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    background: "rgba(100,60,20,0.06)",
                    border: "1px solid rgba(100,60,20,0.2)",
                    color: "var(--ink-dark)",
                    fontFamily: "var(--font-serif)",
                    fontSize: "12px",
                    padding: "5px 16px",
                    borderRadius: "3px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Export JSON
                </button>
                <div
                  style={{
                    fontFamily: "var(--font-hand)",
                    fontSize: "9px",
                    color: "var(--ink-light)",
                    marginTop: "12px",
                    marginBottom: "6px",
                  }}
                >
                  restore from file
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "11px",
                    color: "var(--ink-dark)",
                    WebkitTextFillColor: "var(--ink-dark)" as string,
                    width: "100%",
                  }}
                />
                {importError && (
                  <div
                    style={{
                      marginTop: "8px",
                      fontFamily: "var(--font-hand)",
                      fontSize: "10px",
                      color: "#b04040",
                      lineHeight: 1.4,
                    }}
                  >
                    {importError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* LAYER 2: Front cover (leather, rotates on left-spine hinge) */}
          <motion.div
            ref={coverRef}
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: "left center",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Outer face — leather exterior */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, #1e0e06 0%, #0e0601 100%)",
                borderRadius: "6px",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as "hidden",
                border: "1.5px solid rgba(200,160,80,0.13)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* Leather sheen */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at 30% 25%, rgba(255,255,255,0.04) 0%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />

              {/* Corner ornaments */}
              {cornerStyles.map((style, i) => (
                <div
                  key={i}
                  style={{ position: "absolute", width: "14px", height: "14px", ...style }}
                />
              ))}

              {/* Inner frame line */}
              <div
                style={{
                  position: "absolute",
                  inset: "20px",
                  border: "1px solid rgba(200,160,80,0.12)",
                  borderRadius: "2px",
                  pointerEvents: "none",
                }}
              />

              {/* Year */}
              <p
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "9px",
                  color: "rgba(200,160,80,0.4)",
                  letterSpacing: "0.25em",
                  margin: "0 0 20px",
                  position: "relative",
                }}
              >
                2026
              </p>

              {/* Title */}
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "24px",
                  color: "var(--gold)",
                  letterSpacing: "0.3em",
                  textAlign: "center",
                  margin: "0 0 10px",
                  position: "relative",
                  textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 -1px 0 rgba(200,160,80,0.15)",
                }}
              >
                <QuillTitle storageKey="schoolwork-title-quill-cover" inkColour="var(--gold)">
                  SCHOOLWORK
                </QuillTitle>
              </h1>

              {/* Divider rule */}
              <div
                style={{
                  width: "40px",
                  height: "1px",
                  background: "rgba(200,160,80,0.25)",
                  margin: "0 0 14px",
                }}
              />

              {/* Subtitle */}
              <p
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "10px",
                  color: "rgba(200,160,80,0.38)",
                  letterSpacing: "0.08em",
                  margin: 0,
                  position: "relative",
                }}
              >
                Year 13 · Te Kura
              </p>
            </div>

            {/* Inner face — dark endpaper (visible when cover is open) */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(160deg, #2a1408, #1a0c04)",
                borderRadius: "6px",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as "hidden",
                border: "1.5px solid rgba(200,160,80,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "9px",
                  color: "rgba(200,160,80,0.18)",
                  letterSpacing: "0.15em",
                }}
              >
                est. 2026
              </p>
            </div>

            {/* Grip hand — child of the cover itself, not a floating layer. Rides the
                exact same rotateY as the cover and auto-culls via backfaceVisibility at
                the same instant the leather does. Only shown during the full ritual —
                openCoverQuick/closeCoverQuick leave this at opacity 0 so it never flashes
                during a quick open/close. Full 6-piece articulated rig — see
                RiggedHand's own TODOs for the placeholder-vs-final-asset split. */}
            <div
              ref={gripHandRef}
              style={{
                position: "absolute",
                bottom: -16,
                right: -20,
                width: 168,
                pointerEvents: "none",
                userSelect: "none" as const,
                zIndex: 10,
                opacity: 0,
                filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden" as "hidden",
              }}
            >
              <RiggedHand ref={riggedHandRef} />
            </div>
          </motion.div>

          {/* Rest hand — independent layer, not part of the cover's 3D transform.
              Visible immediately on the quick path (matches the old always-present
              behaviour). On the full ritual it starts hidden and crossfades in once
              the grip hand disappears — see openCoverFull / the mount effect. */}
          <div
            ref={restHandRef}
            style={{
              position: "absolute",
              bottom: -16,
              right: -20,
              width: 168,
              pointerEvents: "none",
              userSelect: "none" as const,
              zIndex: 10,
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.45))",
            }}
          >
            <img
              src="/hand.png"
              alt=""
              draggable={false}
              style={{ width: "100%", display: "block", mixBlendMode: "multiply" }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
