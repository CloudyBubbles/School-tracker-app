"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, animate } from "framer-motion";
import { loadAssignments, saveAssignments } from "@/app/lib/storage";
import { parseLocalDate } from "@/app/lib/dates";
import { getSubjects, saveSubjects, Subject } from "@/app/lib/subjects";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { toRoman } from "@/app/lib/utils";
import PageStack from "@/app/components/journal/PageStack";
import { playBookOpen } from "@/app/lib/sounds";

const PRESET_COLOURS = [
  "#5b4a8f", "#8b5e2a", "#2d6b4a", "#7a3040",
  "#2d5a8b", "#8b4a2a", "#4a7a4a", "#6b4a7a",
];

export default function CoverPage() {
  const router = useRouter();
  const coverRef = useRef<HTMLDivElement>(null);
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

  const openCover = async () => {
    if (animating || !coverRef.current) return;
    setAnimating(true);
    if (document.documentElement.classList.contains("sounds-on")) playBookOpen();
    await animate(
      coverRef.current,
      { rotateY: -160 },
      { duration: 0.7, ease: [0.3, 0, 0.3, 1] }
    );
    setAnimating(false);
  };

  const closeCover = async () => {
    if (!coverRef.current) return;
    await animate(
      coverRef.current,
      { rotateY: 0 },
      { duration: 0.35, ease: [0.6, 0, 0.8, 1] }
    );
  };

  const handleOpen = async () => {
    if (animating) return;
    setAnimating(true);
    await closeCover();
    startTransition();
    router.push("/journal");
  };

  useEffect(() => {
    endTransition();
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

  const loadStats = () => {
    const subs = getSubjects();
    setSubjects(subs);
    const assignments = loadAssignments();
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
      counts[sub.id] = assignments.filter(
        (a) => a.subject.toLowerCase() === sub.name.toLowerCase()
      ).length;
    }
    setSubjectCounts(counts);
    const urgentSubs: Record<string, "overdue" | "today"> = {};
    for (const a of assignments) {
      if (a.status === "Done") continue;
      const due = parseLocalDate(a.dueDate);
      const subKey = a.subject.toLowerCase();
      if (due < today) {
        urgentSubs[subKey] = "overdue";
      } else if (due.getTime() === today.getTime()) {
        if (urgentSubs[subKey] !== "overdue") {
          urgentSubs[subKey] = "today";
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
        loadStats();
        setShowBackup(false);
        e.target.value = "";
      } catch {
        setImportError("Couldn't read that file — make sure it's a valid backup JSON.");
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleRemoveSubject = (id: string) => {
    const all = loadAssignments();
    const subjectName = subjects.find((s) => s.id === id)?.name ?? "";
    const count = all.filter((a) => a.subject.toLowerCase() === subjectName.toLowerCase()).length;
    if (count > 0 && !removeWarning[id]) {
      setRemoveWarning({ ...removeWarning, [id]: `has ${count} entr${count === 1 ? "y" : "ies"}` });
      return;
    }
    if (count > 0) {
      saveAssignments(all.filter((a) => a.subject.toLowerCase() !== subjectName.toLowerCase()));
    }
    const updated = subjects.filter((s) => s.id !== id);
    saveSubjects(updated);
    setSubjects(updated);
    loadStats();
    const newWarnings = { ...removeWarning };
    delete newWarnings[id];
    setRemoveWarning(newWarnings);
  };

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const id = newSubjectName.trim().toLowerCase().replace(/\s+/g, "-");
    if (subjects.find((s) => s.id === id)) return;
    const newSub: Subject = { id, name: newSubjectName.trim(), colour: newSubjectColour };
    const updated = [...subjects, newSub];
    saveSubjects(updated);
    setSubjects(updated);
    setSubjectCounts({ ...subjectCounts, [id]: 0 });
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
        <div style={{ position: "relative", margin: "16px" }}>

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
                    {urgentSubjects[sub.name.toLowerCase()] && (
                      <div
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: urgentSubjects[sub.name.toLowerCase()] === "overdue" ? "#e06060" : "#c8a050",
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
                SCHOOLWORK
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
          </motion.div>

        </div>
      </div>
    </div>
  );
}
