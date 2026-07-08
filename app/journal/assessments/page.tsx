"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { animate, motion } from "framer-motion";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { listAssignments, cycleAssignmentStatus, toggleCheckpoint } from "@/app/lib/db/assignments";
import { listSubjects } from "@/app/lib/db/subjects";
import { parseLocalDate, relativeDueLabel } from "@/app/lib/dates";
import { urgencyColour } from "@/app/lib/utils";
import type { Subject } from "@/app/lib/subjects";
import { usePomodoro } from "@/app/lib/pomodoro-context";
import { Assignment } from "@/app/types";
import ParchmentPage from "@/app/components/journal/ParchmentPage";
import PageStack from "@/app/components/journal/PageStack";
import SideTabs from "@/app/components/journal/SideTabs";

const STATUS_BG: Record<Assignment["status"], string> = {
  "To do": "rgba(140,100,60,0.1)",
  "In progress": "rgba(80,120,200,0.15)",
  "Done": "rgba(80,160,80,0.15)",
};

const STATUS_COLOR: Record<Assignment["status"], string> = {
  "To do": "var(--ink-medium)",
  "In progress": "#2d4a9a",
  "Done": "#2d7a2d",
};

export default function AssessmentsPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const { startTransition, endTransition } = usePageTransition();
  const { startFocusSession } = usePomodoro();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<string, Subject>>({});
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [items, setItems] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    const [subs, all] = await Promise.all([listSubjects(), listAssignments()]);
    setSubjects(subs);
    const subMap: Record<string, Subject> = {};
    for (const s of subs) subMap[s.id] = s;
    setSubjectMap(subMap);

    const assessments = all
      .filter((a) => a.kind === "assessment")
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
    setItems(assessments);

    const tabCountsMap: Record<string, number> = {};
    for (const sub of subs) {
      tabCountsMap[sub.id] = all.filter(
        (a) => a.status !== "Done" && a.subjectId === sub.id
      ).length;
    }
    setTabCounts(tabCountsMap);
    setIsLoading(false);
  };

  useEffect(() => {
    endTransition();
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = async () => {
    if (pageRef.current) {
      await animate(pageRef.current, { opacity: 0, x: -10 }, { duration: 0.13, ease: [0.4, 0, 1, 1] });
    }
    startTransition();
    router.push("/journal");
  };

  const handleTabNavigate = async (path: string) => {
    if (pageRef.current) {
      await animate(pageRef.current, { opacity: 0, x: -10 }, { duration: 0.13 });
    }
    startTransition();
    router.push(path);
  };

  const getColour = (subjectId: string) => subjectMap[subjectId]?.colour ?? "#8a6040";
  const subjectName = (subjectId: string) => subjectMap[subjectId]?.name ?? "";

  const handleCycleStatus = async (assignment: Assignment) => {
    await cycleAssignmentStatus(assignment);
    await loadData();
  };

  const handleToggleCheckpoint = async (assignmentId: string, checkpointId: string) => {
    const cp = items.find((a) => a.id === assignmentId)?.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return;
    await toggleCheckpoint(checkpointId, !cp.done);
    await loadData();
  };

  const creditsAtStake = items
    .filter((a) => a.status !== "Done")
    .reduce((sum, a) => sum + (a.creditValue ?? 0), 0);

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
            {isLoading ? (
              <div style={{ opacity: 0, minHeight: "100vh" }} />
            ) : (
            <>
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
              ← today
            </button>

            <div style={{ fontFamily: "var(--font-hand)", fontSize: "13px", color: "var(--ink-light)", marginBottom: "4px" }}>
              High Stakes
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "32px", color: "var(--ink-medium)", margin: "0 0 12px", lineHeight: 1.2 }}>
              Assessments &amp; Milestones
            </h1>
            <div style={{ height: "1px", background: "rgba(140,100,60,0.2)", marginBottom: "24px" }} />

            {items.length === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-light)", textAlign: "center", marginTop: "48px" }}>
                Nothing marked as an assessment yet — toggle &quot;Assessment&quot; when adding or editing an entry to track it here.
              </p>
            ) : (
              <>
                {creditsAtStake > 0 && (
                  <>
                    <div style={{ textAlign: "center", marginBottom: "20px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", color: "var(--ink-medium)", lineHeight: 1 }}>
                        {creditsAtStake}
                      </div>
                      <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "4px" }}>
                        credit{creditsAtStake !== 1 ? "s" : ""} at stake
                      </div>
                    </div>
                    <div style={{ height: "1px", background: "rgba(140,100,60,0.15)", marginBottom: "20px" }} />
                  </>
                )}

                {items.map((a) => {
                  const isDone = a.status === "Done";
                  const rel = relativeDueLabel(a.dueDate);
                  return (
                    <Link
                      key={a.id}
                      href={`/journal/${a.subjectId}`}
                      style={{ textDecoration: "none", display: "block" }}
                      onClick={() => startTransition()}
                    >
                      <div
                        style={{
                          borderLeft: `3px solid ${getColour(a.subjectId)}`,
                          padding: "12px 14px",
                          marginBottom: "10px",
                          background: "rgba(140,100,60,0.03)",
                          opacity: isDone ? 0.55 : 1,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-hand)",
                            fontSize: "9px",
                            color: `${getColour(a.subjectId)}cc`,
                            letterSpacing: "0.15em",
                            textTransform: "uppercase",
                            marginBottom: "3px",
                          }}
                        >
                          {subjectName(a.subjectId)}{a.standardCode ? ` · ${a.standardCode}` : ""}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 600,
                            fontSize: "17px",
                            color: "var(--ink-dark)",
                            textDecoration: isDone ? "line-through" : "none",
                            lineHeight: 1.25,
                          }}
                        >
                          {a.title}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                          <span style={{ fontFamily: "var(--font-hand)", fontSize: "12px", color: isDone ? "var(--ink-light)" : urgencyColour(a.dueDate) }}>
                            {rel ? `${rel} · ` : ""}
                            {parseLocalDate(a.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCycleStatus(a); }}
                            style={{
                              fontFamily: "var(--font-hand)",
                              fontSize: "10px",
                              background: STATUS_BG[a.status],
                              color: STATUS_COLOR[a.status],
                              padding: "2px 8px",
                              borderRadius: "10px",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {a.status}
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); startFocusSession({ id: a.id, title: a.title }); }}
                            style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0 }}
                            title="Start a focus session for this"
                          >
                            ⏱
                          </button>
                          {!!a.creditValue && (
                            <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)" }} title="NCEA credits">
                              🎖 {a.creditValue}cr
                            </span>
                          )}
                          {a.targetGrade && (
                            <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)" }}>
                              target {a.targetGrade}
                            </span>
                          )}
                        </div>

                        {a.checkpoints && a.checkpoints.length > 0 && (
                          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
                            {a.checkpoints.map((cp) => (
                              <li key={cp.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                                <input
                                  type="checkbox"
                                  checked={cp.done}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => { e.stopPropagation(); handleToggleCheckpoint(a.id, cp.id); }}
                                  style={{ cursor: "pointer", accentColor: getColour(a.subjectId) }}
                                />
                                <span
                                  style={{
                                    fontFamily: "var(--font-hand)",
                                    fontSize: "12px",
                                    color: "var(--ink-medium)",
                                    textDecoration: cp.done ? "line-through" : "none",
                                    opacity: cp.done ? 0.6 : 1,
                                  }}
                                >
                                  {cp.label}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </>
            )}

            <div style={{ marginTop: "40px" }}>
              <PageStack />
            </div>
            </>
            )}
          </div>
        </ParchmentPage>
      </motion.div>

      <SideTabs
        subjects={subjects}
        activeSubjectId="__assessments"
        onNavigate={handleTabNavigate}
        counts={tabCounts}
      />
    </div>
  );
}
