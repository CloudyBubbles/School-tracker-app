"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { animate, motion } from "framer-motion";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { listAssignments } from "@/app/lib/db/assignments";
import { listSubjects } from "@/app/lib/db/subjects";
import { parseLocalDate } from "@/app/lib/dates";
import type { Subject } from "@/app/lib/subjects";
import { toDateStr } from "@/app/lib/utils";
import { Assignment } from "@/app/types";
import ParchmentPage from "@/app/components/journal/ParchmentPage";
import PageStack from "@/app/components/journal/PageStack";
import SideTabs from "@/app/components/journal/SideTabs";

function calcCurrentStreak(dates: string[], today: string): number {
  const set = new Set(dates);
  let streak = 0;
  const d = parseLocalDate(today);
  if (!set.has(today)) d.setDate(d.getDate() - 1);
  while (true) {
    const ds = toDateStr(d);
    if (!set.has(ds)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function calcBestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseLocalDate(dates[i - 1]);
    prev.setDate(prev.getDate() + 1);
    if (dates[i] === toDateStr(prev)) { current++; best = Math.max(best, current); }
    else current = 1;
  }
  return best;
}

interface SubjectBreakdown { sub: Subject; done: number; total: number; focusMinutes: number; }
interface HeatmapDay { ds: string; count: number; }

function formatFocusTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export default function StatsPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const { startTransition, endTransition } = usePageTransition();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [totalDone, setTotalDone] = useState(0);
  const [totalFocusMinutes, setTotalFocusMinutes] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectBreakdown[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapDay[]>([]);
  const [recentCompletions, setRecentCompletions] = useState<Assignment[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<string, Subject>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [todayStr] = useState(() => toDateStr(new Date()));

  useEffect(() => {
    endTransition();
    (async () => {
    const [subs, all] = await Promise.all([listSubjects(), listAssignments()]);
    setSubjects(subs);
    const subMap: Record<string, Subject> = {};
    for (const s of subs) subMap[s.id] = s;
    setSubjectMap(subMap);

    setTotalDone(all.filter((a) => a.status === "Done").length);
    setTotalFocusMinutes(all.reduce((sum, a) => sum + (a.focusMinutes ?? 0), 0));

    const completedWithDate = all
      .filter((a) => a.completedAt)
      .sort((a, b) => a.completedAt!.localeCompare(b.completedAt!));

    const completionDates = [...new Set(completedWithDate.map((a) => a.completedAt!))].sort();

    setCurrentStreak(calcCurrentStreak(completionDates, todayStr));
    setBestStreak(calcBestStreak(completionDates));

    setSubjectBreakdown(
      subs.map((sub) => {
        const subAll = all.filter((a) => a.subjectId === sub.id);
        return {
          sub,
          done: subAll.filter((a) => a.status === "Done").length,
          total: subAll.length,
          focusMinutes: subAll.reduce((sum, a) => sum + (a.focusMinutes ?? 0), 0),
        };
      }).filter((s) => s.total > 0)
    );

    setHeatmap(
      Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - (20 - i));
        const ds = toDateStr(d);
        return { ds, count: completedWithDate.filter((a) => a.completedAt === ds).length };
      })
    );

    setRecentCompletions([...completedWithDate].reverse().slice(0, 5));

    const tabCountsMap: Record<string, number> = {};
    for (const sub of subs) {
      tabCountsMap[sub.id] = all.filter(
        (a) => a.status !== "Done" && a.subjectId === sub.id
      ).length;
    }
    setTabCounts(tabCountsMap);
    setIsLoading(false);
    })();
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
      await animate(pageRef.current, { opacity: 0, x: -10 }, { duration: 0.13, ease: [0.4, 0, 1, 1] });
    }
    startTransition();
    router.push(path);
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
              Field Notes
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "32px", color: "var(--ink-medium)", margin: "0 0 12px", lineHeight: 1.2 }}>
              Your Progress
            </h1>
            <div style={{ height: "1px", background: "rgba(140,100,60,0.2)", marginBottom: "24px" }} />

            {isLoading ? (
              <div style={{ opacity: 0, minHeight: "100vh" }} />
            ) : totalDone === 0 ? (
              <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-light)", textAlign: "center", marginTop: "48px" }}>
                No completed assignments yet — they&apos;ll appear here once you&apos;ve crossed one off.
              </p>
            ) : (
              <>
                {/* Stats row */}
                <div style={{ display: "flex", gap: "24px", justifyContent: "center", marginBottom: "24px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", color: "var(--ink-medium)", lineHeight: 1 }}>
                      {totalDone}
                    </div>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "4px" }}>
                      all time
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", color: "var(--ink-medium)", lineHeight: 1 }}>
                      {currentStreak > 0 ? "🔥" : ""}{currentStreak}
                    </div>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "4px" }}>
                      day streak
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", color: "var(--ink-medium)", lineHeight: 1 }}>
                      {bestStreak > 0 ? "🔥" : ""}{bestStreak}
                    </div>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "4px" }}>
                      best streak
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "40px", color: "var(--ink-medium)", lineHeight: 1 }}>
                      {formatFocusTime(totalFocusMinutes)}
                    </div>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "4px" }}>
                      focus time
                    </div>
                  </div>
                </div>

                <div style={{ height: "1px", background: "rgba(140,100,60,0.15)", marginBottom: "20px" }} />

                {/* Subject breakdown */}
                {subjectBreakdown.length > 0 && (
                  <div style={{ marginBottom: "24px" }}>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                      by subject
                    </div>
                    {subjectBreakdown.map(({ sub, done, total, focusMinutes }) => {
                      const pct = Math.round((done / total) * 100);
                      return (
                        <div key={sub.id} style={{ marginBottom: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                            <span style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: sub.colour }}>
                              {sub.name}
                            </span>
                            <span style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)" }}>
                              {done} / {total}
                              {focusMinutes > 0 ? ` · ${formatFocusTime(focusMinutes)}` : ""}
                            </span>
                          </div>
                          <div style={{ height: "3px", background: "rgba(140,100,60,0.1)", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: sub.colour, opacity: 0.55, borderRadius: "2px", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ height: "1px", background: "rgba(140,100,60,0.15)", marginBottom: "20px" }} />

                {/* 21-day heatmap */}
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    last 21 days
                  </div>
                  <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                    {heatmap.map(({ ds, count }) => (
                      <div
                        key={ds}
                        title={`${ds}: ${count} completed`}
                        style={{
                          width: "16px",
                          height: "16px",
                          borderRadius: "2px",
                          background: count > 0 ? "rgba(140,100,60,0.55)" : "rgba(140,100,60,0.1)",
                          outline: ds === todayStr ? "1px solid rgba(140,100,60,0.4)" : "none",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ height: "1px", background: "rgba(140,100,60,0.15)", marginBottom: "20px" }} />

                {/* Recent completions */}
                {recentCompletions.length > 0 && (
                  <div>
                    <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", letterSpacing: "0.08em", marginBottom: "12px" }}>
                      recently completed
                    </div>
                    {recentCompletions.map((a) => (
                      <div key={a.id} style={{ marginBottom: "8px", opacity: 0.65 }}>
                        <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-medium)", textDecoration: "line-through" }}>
                          {a.title}
                        </div>
                        <div style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", marginTop: "2px" }}>
                          due {parseLocalDate(a.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })} · {subjectMap[a.subjectId]?.name ?? ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: "40px" }}>
              <PageStack />
            </div>
          </div>
        </ParchmentPage>
      </motion.div>

      <SideTabs
        subjects={subjects}
        activeSubjectId="__stats"
        onNavigate={handleTabNavigate}
        counts={tabCounts}
      />
    </div>
  );
}
