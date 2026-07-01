"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion } from "framer-motion";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { loadAssignments, saveAssignments } from "@/app/lib/storage";
import { parseLocalDate } from "@/app/lib/dates";
import { getSubjects, Subject } from "@/app/lib/subjects";
import { Assignment } from "@/app/types";
import ParchmentPage from "@/app/components/journal/ParchmentPage";
import PageStack from "@/app/components/journal/PageStack";
import SideTabs from "@/app/components/journal/SideTabs";

interface Group {
  subject: Subject;
  assignments: Assignment[];
}

export default function ArchivePage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const { startTransition, endTransition } = usePageTransition();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grouped, setGrouped] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

  const loadData = () => {
    const subs = getSubjects();
    setSubjects(subs);
    const all = loadAssignments();
    const done = all.filter((a) => a.status === "Done");
    setTotal(done.length);
    const groups: Group[] = subs
      .map((sub) => ({
        subject: sub,
        assignments: done
          .filter((a) => a.subject.toLowerCase() === sub.name.toLowerCase())
          .sort((a, b) => parseLocalDate(b.dueDate).getTime() - parseLocalDate(a.dueDate).getTime()),
      }))
      .filter((g) => g.assignments.length > 0);
    setGrouped(groups);
    const tabCountsMap: Record<string, number> = {};
    for (const sub of subs) {
      tabCountsMap[sub.id] = all.filter(
        (a) => a.status !== "Done" && a.subject.toLowerCase() === sub.name.toLowerCase()
      ).length;
    }
    setTabCounts(tabCountsMap);
  };

  useEffect(() => {
    endTransition();
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    if (pageRef.current) {
      await animate(
        pageRef.current,
        { rotateY: -90, opacity: 0 },
        { duration: 0.4, ease: [0.4, 0, 0.9, 0.5] }
      );
    }
    startTransition();
    router.push("/");
  };

  const handleTabNavigate = async (path: string) => {
    if (pageRef.current) {
      await animate(pageRef.current, { opacity: 0, x: -10 }, { duration: 0.13 });
    }
    router.push(path);
  };

  const handleRestore = (id: string) => {
    const all = loadAssignments();
    const updated = all.map((a) =>
      a.id === id ? { ...a, status: "To do" as const } : a
    );
    saveAssignments(updated);
    loadData();
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <motion.div
        ref={pageRef}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ flex: 1, transformOrigin: "left center", transformStyle: "preserve-3d" }}
      >
        <ParchmentPage showLines={false}>
          <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 32px 60px" }}>
            {/* Close button */}
            <button
              onClick={handleClose}
              style={{
                background: "transparent",
                border: "none",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "11px",
                color: "var(--ink-light)",
                cursor: "pointer",
                padding: "0 0 20px",
                display: "block",
              }}
            >
              ← cover
            </button>

            {/* Chapter label */}
            <div style={{ fontFamily: "var(--font-hand)", fontSize: "13px", color: "var(--ink-light)", marginBottom: "4px" }}>
              Back Pages
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "32px",
                color: "var(--ink-medium)",
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              Completed
            </h1>

            {/* Rule */}
            <div style={{ height: "1px", background: "rgba(140,100,60,0.2)", marginBottom: "0" }} />

            {/* Filter bar */}
            <div style={{ position: "relative", marginTop: "10px", marginBottom: "4px" }}>
              <input
                type="text"
                value={archiveQuery}
                onChange={(e) => setArchiveQuery(e.target.value)}
                placeholder="filter completed..."
                style={{
                  width: "100%",
                  padding: "5px 28px 5px 8px",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "12px",
                  background: "transparent",
                  border: "1px solid rgba(140,100,60,0.18)",
                  borderRadius: "3px",
                  color: "var(--ink-dark)",
                  outline: "none",
                  boxSizing: "border-box" as const,
                  WebkitTextFillColor: "var(--ink-dark)",
                  colorScheme: "light" as const,
                }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.35)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(140,100,60,0.18)"; }}
              />
              {archiveQuery && (
                <button
                  onClick={() => setArchiveQuery("")}
                  style={{
                    position: "absolute",
                    right: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-light)",
                    fontSize: "14px",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>

            {/* Count */}
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: "12px",
                color: "var(--ink-light)",
                marginTop: "6px",
                marginBottom: "4px",
              }}
            >
              {archiveQuery.trim()
                ? `${grouped.reduce((s, g) => s + g.assignments.filter((a) => a.title.toLowerCase().includes(archiveQuery.trim().toLowerCase()) || g.subject.name.toLowerCase().includes(archiveQuery.trim().toLowerCase())).length, 0)} of ${total} completed assignment${total !== 1 ? "s" : ""}`
                : `${total} completed assignment${total !== 1 ? "s" : ""}`
              }
            </div>

            {(() => {
              const q = archiveQuery.trim().toLowerCase();
              const filteredGroups = q
                ? grouped
                    .map((g) => ({
                      ...g,
                      assignments: g.assignments.filter(
                        (a) => a.title.toLowerCase().includes(q) || g.subject.name.toLowerCase().includes(q)
                      ),
                    }))
                    .filter((g) => g.assignments.length > 0)
                : grouped;

              if (filteredGroups.length === 0) return (
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-light)", marginTop: q ? "32px" : "48px", textAlign: "center" }}>
                  {q ? "nothing found" : "Nothing archived yet — completed assignments appear here."}
                </p>
              );

              return filteredGroups.map((group, gi) => (
                <div key={group.subject.id}>
                  <div
                    style={{
                      fontFamily: "var(--font-hand)",
                      fontSize: "10px",
                      color: "var(--ink-light)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      marginTop: gi === 0 ? "16px" : "28px",
                      paddingBottom: "6px",
                      borderBottom: "1px solid rgba(140,100,60,0.12)",
                    }}
                  >
                    {group.subject.name}
                  </div>

                  {group.assignments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        justifyContent: "space-between",
                        padding: "8px 0 8px 12px",
                        borderLeft: `2px solid ${group.subject.colour}40`,
                        marginBottom: "1px",
                        opacity: 0.55,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "14px",
                            color: "var(--ink-medium)",
                            textDecoration: "line-through",
                          }}
                        >
                          {a.title}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-hand)",
                            fontSize: "11px",
                            color: "var(--ink-light)",
                            marginTop: "2px",
                          }}
                        >
                          {parseLocalDate(a.dueDate).toLocaleDateString("en-NZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(a.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: "11px",
                          color: "var(--ink-light)",
                          cursor: "pointer",
                          padding: "0 0 0 12px",
                          flexShrink: 0,
                        }}
                      >
                        restore
                      </button>
                    </div>
                  ))}
                </div>
              ));
            })()}

            <div style={{ marginTop: "40px" }}>
              <PageStack />
            </div>
          </div>
        </ParchmentPage>
      </motion.div>

      <SideTabs
        subjects={subjects}
        activeSubjectId="__archive"
        onNavigate={handleTabNavigate}
        counts={tabCounts}
      />
    </div>
  );
}
