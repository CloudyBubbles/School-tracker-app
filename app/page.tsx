"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useAnimate } from "framer-motion";
import { loadAssignments, saveAssignments } from "@/app/lib/storage";
import { parseLocalDate } from "@/app/lib/dates";
import { getSubjects, saveSubjects, Subject } from "@/app/lib/subjects";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import PageStack from "@/app/components/journal/PageStack";

const PRESET_COLOURS = [
  "#5b4a8f", "#8b5e2a", "#2d6b4a", "#7a3040",
  "#2d5a8b", "#8b4a2a", "#4a7a4a", "#6b4a7a",
];

function toRoman(n: number): string {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ["M","CM","D","CD","C","XC","L","XL","X","IX","V","IV","I"];
  let out = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { out += syms[i]; n -= vals[i]; }
  }
  return out;
}

export default function CoverPage() {
  const router = useRouter();
  const [scope, animate] = useAnimate();
  const { startTransition, endTransition } = usePageTransition();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState({ total: 0, overdue: 0, done: 0, dueToday: 0 });
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [showManageSubjects, setShowManageSubjects] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColour, setNewSubjectColour] = useState(PRESET_COLOURS[0]);
  const [removeWarning, setRemoveWarning] = useState<Record<string, string>>({});

  useEffect(() => { endTransition(); }, [endTransition]);

  useEffect(() => {
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
  }, []);

  const handleOpen = async () => {
    await animate(
      scope.current,
      { rotateY: -90, opacity: 0 },
      { duration: 0.38, ease: [0.4, 0, 0.9, 0.5] }
    );
    startTransition();
    router.push("/journal");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.assignments && Array.isArray(data.assignments)) {
          saveAssignments(data.assignments);
        }
        if (data.subjects && Array.isArray(data.subjects)) {
          saveSubjects(data.subjects);
        }
        const subs = getSubjects();
        setSubjects(subs);
        const assignments = loadAssignments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setStats({
          total: assignments.length,
          overdue: assignments.filter(
            (a) => a.status !== "Done" && parseLocalDate(a.dueDate) < today
          ).length,
          dueToday: assignments.filter(
            (a) => a.status !== "Done" && parseLocalDate(a.dueDate).getTime() === today.getTime()
          ).length,
          done: assignments.filter((a) => a.status === "Done").length,
        });
        const counts: Record<string, number> = {};
        for (const sub of subs) {
          counts[sub.id] = assignments.filter(
            (a) => a.subject.toLowerCase() === sub.name.toLowerCase()
          ).length;
        }
        setSubjectCounts(counts);
        setShowBackup(false);
        e.target.value = "";
      } catch {
        // silent fail
      }
    };
    reader.readAsText(file);
  };

  const handleRemoveSubject = (id: string) => {
    const all = loadAssignments();
    const subjectName = subjects.find((s) => s.id === id)?.name ?? "";
    const count = all.filter((a) => a.subject.toLowerCase() === subjectName.toLowerCase()).length;
    if (count > 0) {
      setRemoveWarning({ ...removeWarning, [id]: `has ${count} entr${count === 1 ? "y" : "ies"}` });
      return;
    }
    const updated = subjects.filter((s) => s.id !== id);
    saveSubjects(updated);
    setSubjects(updated);
    const newCounts = { ...subjectCounts };
    delete newCounts[id];
    setSubjectCounts(newCounts);
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
    background: "rgba(200,160,80,0.05)",
    border: "1px solid rgba(200,160,80,0.2)",
    color: "var(--gold)",
    WebkitTextFillColor: "var(--gold)" as string,
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

      {/* Cover card */}
      <div style={{ maxWidth: "380px", width: "100%", padding: "0 24px" }}>
        <motion.div
          ref={scope}
          style={{
            border: "1.5px solid rgba(200,160,80,0.13)",
            borderRadius: "6px",
            margin: "16px",
            padding: "28px 24px",
            position: "relative",
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
          }}
        >
          {/* Corner ornaments */}
          {cornerStyles.map((style, i) => (
            <div
              key={i}
              style={{ position: "absolute", width: "14px", height: "14px", ...style }}
            />
          ))}

          {/* Year */}
          <p
            style={{
              fontFamily: "var(--font-hand)",
              fontSize: "9px",
              color: "rgba(200,160,80,0.38)",
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
              color: "var(--gold)",
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
              color: "rgba(200,160,80,0.38)",
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
              background: "rgba(200,160,80,0.2)",
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
              { label: "Total", value: stats.total, colour: "var(--gold)" },
              { label: "Overdue", value: stats.overdue, colour: stats.overdue > 0 ? "#e06060" : "var(--gold)" },
              { label: "Done", value: stats.done, colour: stats.done > 0 ? "#60a860" : "var(--gold)" },
            ].map(({ label, value, colour }) => (
              <div
                key={label}
                style={{
                  flex: 1,
                  border: "1px solid rgba(200,160,80,0.12)",
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
                    color: "rgba(200,160,80,0.5)",
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
              background: "rgba(200,160,80,0.12)",
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
                    borderBottom: "1px solid rgba(200,160,80,0.06)",
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
                      color: "rgba(200,160,80,0.4)",
                      marginRight: "8px",
                    }}
                  >
                    {toRoman(i + 1)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: "11px",
                      color: "var(--gold)",
                      flex: 1,
                    }}
                  >
                    {sub.name}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-hand)",
                      fontSize: "9px",
                      color: "rgba(200,160,80,0.4)",
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
              style={{
                background: "transparent",
                border: "1px solid rgba(200,160,80,0.3)",
                fontFamily: "var(--font-serif)",
                fontSize: "12px",
                color: "var(--gold)",
                padding: "10px 32px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                borderRadius: "2px",
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
                color: "rgba(200,160,80,0.4)",
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
                color: "rgba(200,160,80,0.4)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              backup / restore
            </button>
          </div>

          {/* Subject management panel */}
          {showManageSubjects && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderTop: "1px solid rgba(200,160,80,0.1)",
              }}
            >
              {/* Existing subjects */}
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
                      color: "var(--gold)",
                      flex: 1,
                    }}
                  >
                    {sub.name}
                  </span>
                  {removeWarning[sub.id] ? (
                    <span
                      style={{
                        fontFamily: "var(--font-hand)",
                        fontSize: "10px",
                        color: "rgba(200,160,80,0.5)",
                      }}
                    >
                      {removeWarning[sub.id]}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRemoveSubject(sub.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontFamily: "var(--font-hand)",
                        fontSize: "13px",
                        color: "rgba(200,160,80,0.4)",
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

                {/* Add button */}
                <button
                  onClick={handleAddSubject}
                  style={{
                    marginTop: "8px",
                    background: "rgba(200,160,80,0.1)",
                    border: "1px solid rgba(200,160,80,0.2)",
                    color: "var(--gold)",
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
                borderTop: "1px solid rgba(200,160,80,0.1)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-hand)",
                  fontSize: "9px",
                  color: "rgba(200,160,80,0.4)",
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
                  background: "rgba(200,160,80,0.1)",
                  border: "1px solid rgba(200,160,80,0.2)",
                  color: "var(--gold)",
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
                  color: "rgba(200,160,80,0.4)",
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
                  color: "var(--gold)",
                  WebkitTextFillColor: "var(--gold)",
                  width: "100%",
                }}
              />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
