"use client";

import { useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, animate } from "framer-motion";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { listAssignments, createAssignment, cycleAssignmentStatus } from "@/app/lib/db/assignments";
import { listSubjects } from "@/app/lib/db/subjects";
import { parseLocalDate } from "@/app/lib/dates";
import { toDateStr, urgencyColour, PRIORITY_ORDER } from "@/app/lib/utils";
import type { Subject } from "@/app/lib/subjects";
import { usePomodoro } from "@/app/lib/pomodoro-context";
import { useAuth } from "@/app/lib/auth-context";
import { Assignment } from "@/app/types";
import ParchmentPage from "@/app/components/journal/ParchmentPage";
import PageStack from "@/app/components/journal/PageStack";
import SideTabs from "@/app/components/journal/SideTabs";
import QuillTitle from "@/app/components/QuillTitle";

function formatDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
  });
}

function overdueByDays(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - parseLocalDate(dateStr).getTime()) / 86400000);
  return days === 1 ? "overdue by 1 day" : `overdue by ${days} days`;
}

function statusStyle(status: string) {
  if (status === "Done") return { background: "rgba(80,160,80,0.15)", color: "#2d7a2d" };
  if (status === "In progress") return { background: "rgba(80,120,200,0.15)", color: "#2d4a9a" };
  return { background: "rgba(140,100,60,0.1)", color: "var(--ink-medium)" };
}

function sortByPriorityThenDate(assignments: Assignment[]): Assignment[] {
  return [...assignments].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
  });
}

interface QuickForm {
  subjectId: string;
  title: string;
  dueDate: string;
  kind: "task" | "assessment";
  creditValue: string;
  targetGrade: string;
  standardCode: string;
}

const EMPTY_QUICK_FORM: QuickForm = {
  subjectId: "",
  title: "",
  dueDate: "",
  kind: "task",
  creditValue: "",
  targetGrade: "",
  standardCode: "",
};

export default function TodayPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { startTransition, endTransition } = usePageTransition();
  const { startFocusSession } = usePomodoro();
  const { signOut } = useAuth();
  const [candlelight, setCandlelight] = useState(false);
  const [sounds, setSounds] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectMap, setSubjectMap] = useState<Record<string, Subject>>({});
  const [overdue, setOverdue] = useState<Assignment[]>([]);
  const [dueToday, setDueToday] = useState<Assignment[]>([]);
  const [thisWeek, setThisWeek] = useState<Assignment[]>([]);
  const [comingUp, setComingUp] = useState<Assignment[]>([]);
  const [allEmpty, setAllEmpty] = useState(false);
  const [totalActive, setTotalActive] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStrip, setWeekStrip] = useState<{ date: Date; count: number }[]>([]);
  const [urgentIds, setUrgentIds] = useState<string[]>([]);
  const [subjectProgress, setSubjectProgress] = useState<{ sub: Subject; done: number; total: number }[]>([]);

  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [allActive, setAllActive] = useState<Assignment[]>([]);
  const [selectedStripDay, setSelectedStripDay] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickForm>(EMPTY_QUICK_FORM);
  const [quickErrors, setQuickErrors] = useState({ title: false, dueDate: false, subject: false });
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = async () => {
    const subs = await listSubjects();
    setSubjects(subs);
    const subMap: Record<string, Subject> = {};
    for (const s of subs) subMap[s.id] = s;
    setSubjectMap(subMap);

    const all = await listAssignments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);

    const od = all.filter((a) => a.status !== "Done" && parseLocalDate(a.dueDate) < today);
    const dt = all.filter((a) => a.status !== "Done" && parseLocalDate(a.dueDate).getTime() === today.getTime());
    const tw = all.filter((a) => a.status !== "Done" && parseLocalDate(a.dueDate) > today && parseLocalDate(a.dueDate) <= in7);
    const cu = all.filter((a) => a.status !== "Done" && parseLocalDate(a.dueDate) > in7);
    setOverdue(sortByPriorityThenDate(od));
    setDueToday(sortByPriorityThenDate(dt));
    setThisWeek(sortByPriorityThenDate(tw));
    setComingUp(sortByPriorityThenDate(cu));
    const active = all.filter((a) => a.status !== "Done");
    setAllEmpty(od.length === 0 && dt.length === 0 && tw.length === 0 && cu.length === 0);
    setTotalActive(active.length);
    setAllActive(sortByPriorityThenDate(active));

    const strip = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const count = all.filter(
        (a) => a.status !== "Done" && parseLocalDate(a.dueDate).getTime() === d.getTime()
      ).length;
      return { date: d, count };
    });
    setWeekStrip(strip);

    const urgentSet = new Set<string>();
    for (const a of [...od, ...dt]) {
      urgentSet.add(a.subjectId);
    }
    setUrgentIds([...urgentSet]);

    const progress = subs
      .map((sub) => {
        const subAll = all.filter((a) => a.subjectId === sub.id);
        if (subAll.length === 0) return null;
        const done = subAll.filter((a) => a.status === "Done").length;
        return { sub, done, total: subAll.length };
      })
      .filter(Boolean) as { sub: Subject; done: number; total: number }[];
    setSubjectProgress(progress);

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
    setCandlelight(document.documentElement.classList.contains("candlelight"));
    setSounds(document.documentElement.classList.contains("sounds-on"));
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.key === "q" || e.key === "Q") {
        e.preventDefault();
        setShowQuickAdd((v) => !v);
      }
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowQuickAdd(false);
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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
      await animate(
        pageRef.current,
        { opacity: 0, x: -10 },
        { duration: 0.13, ease: [0.4, 0, 1, 1] }
      );
    }
    startTransition();
    router.push(path);
  };

  const handleQuickAdd = async () => {
    const errors = {
      title: !quickForm.title.trim(),
      dueDate: !quickForm.dueDate,
      subject: !quickForm.subjectId,
    };
    if (errors.title || errors.dueDate || errors.subject) {
      setQuickErrors(errors);
      return;
    }
    const sub = subjects.find((s) => s.id === quickForm.subjectId);
    if (!sub) return;
    const isAssessment = quickForm.kind === "assessment";
    await createAssignment({
      subjectId: sub.id,
      title: quickForm.title.trim(),
      dueDate: quickForm.dueDate,
      status: "To do",
      priority: "Medium",
      notes: "",
      checkpoints: [],
      kind: quickForm.kind,
      creditValue: isAssessment && quickForm.creditValue ? Number(quickForm.creditValue) : undefined,
      targetGrade: isAssessment && quickForm.targetGrade ? (quickForm.targetGrade as Assignment["targetGrade"]) : undefined,
      standardCode: isAssessment && quickForm.standardCode.trim() ? quickForm.standardCode.trim() : undefined,
    });
    setShowQuickAdd(false);
    setQuickForm(EMPTY_QUICK_FORM);
    setQuickErrors({ title: false, dueDate: false, subject: false });
    await loadData();
  };

  const handleCycleStatus = async (assignment: Assignment) => {
    await cycleAssignmentStatus(assignment);
    await loadData();
  };

  const isMobile = useIsMobile();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const mastheadDate = new Date().toLocaleDateString("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const getColour = (subjectId: string) => subjectMap[subjectId]?.colour ?? "#8a6040";
  const subjectName = (subjectId: string) => subjectMap[subjectId]?.name ?? "";

  const sectionLabel = (text: string) => (
    <div
      style={{
        fontFamily: "var(--font-hand)",
        fontSize: "10px",
        color: "var(--ink-light)",
        letterSpacing: "0.08em",
        textAlign: "center",
        margin: "20px 0 8px",
      }}
    >
      — {text} —
    </div>
  );

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
            <div style={{ maxWidth: "680px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "40px 32px 60px" }}>
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
                ← cover
              </button>

              {/* Search + Add row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "4px", alignItems: "center" }}>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (showQuickAdd) setShowQuickAdd(false);
                  }}
                  placeholder="Search assignments..."
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontFamily: "var(--font-serif)",
                    fontSize: "12px",
                    background: "transparent",
                    border: "1px solid rgba(140,100,60,0.25)",
                    borderRadius: "3px",
                    color: "var(--ink-dark)",
                    outline: "none",
                    WebkitTextFillColor: "var(--ink-dark)",
                    colorScheme: "light" as const,
                  }}
                />
                <button
                  onClick={() => {
                    setShowQuickAdd(!showQuickAdd);
                    setSearchQuery("");
                  }}
                  style={{
                    background: "rgba(140,100,60,0.12)",
                    border: "1px solid rgba(140,100,60,0.25)",
                    borderRadius: "3px",
                    padding: "5px 12px",
                    fontFamily: "var(--font-hand)",
                    fontSize: "12px",
                    color: "var(--ink-medium)",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {showQuickAdd ? "✕" : "+ add"}
                </button>
              </div>
              {!isMobile && (
                <div style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5, marginBottom: "8px", textAlign: "right" }}>
                  q — add · / — search · esc — close
                </div>
              )}

              {/* Search results */}
              {searchQuery.trim() && !showQuickAdd && (() => {
                const q = searchQuery.toLowerCase();
                const results = allActive.filter(
                  (a) => a.title.toLowerCase().includes(q) || subjectName(a.subjectId).toLowerCase().includes(q)
                );
                return (
                  <div style={{ marginBottom: "16px", borderLeft: "2px solid rgba(140,100,60,0.2)", paddingLeft: "12px" }}>
                    {results.length === 0 ? (
                      <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-light)", padding: "8px 0" }}>
                        No results.
                      </div>
                    ) : results.map((a) => (
                      <Link
                        key={a.id}
                        href={`/journal/${a.subjectId}`}
                        style={{ textDecoration: "none", display: "block" }}
                        onClick={() => startTransition()}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            padding: "6px 0",
                            borderBottom: "1px solid rgba(140,100,60,0.07)",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                        >
                          <div>
                            <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-dark)" }}>{a.title}</div>
                            <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: urgencyColour(a.dueDate), marginTop: "1px" }}>
                              {subjectName(a.subjectId)} · {formatDate(a.dueDate)}
                            </div>
                          </div>
                          <span
                            style={{
                              fontFamily: "var(--font-hand)",
                              fontSize: "10px",
                              padding: "2px 7px",
                              borderRadius: "10px",
                              ...statusStyle(a.status),
                              flexShrink: 0,
                              marginLeft: "12px",
                            }}
                          >
                            {a.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                );
              })()}

              {/* Quick add form */}
              {showQuickAdd && (
                <div
                  style={{
                    borderLeft: "3px solid rgba(140,100,60,0.3)",
                    padding: "12px 14px",
                    background: "rgba(140,100,60,0.03)",
                    marginBottom: "16px",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowQuickAdd(false);
                      setQuickForm(EMPTY_QUICK_FORM);
                    }
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ display: "flex", gap: "0", border: "1px solid rgba(140,100,60,0.25)", borderRadius: "3px", overflow: "hidden", width: "fit-content" }}>
                      {(["task", "assessment"] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setQuickForm({ ...quickForm, kind: k })}
                          style={{
                            background: quickForm.kind === k ? "rgba(140,100,60,0.18)" : "transparent",
                            border: "none",
                            padding: "5px 14px",
                            fontFamily: "var(--font-serif)",
                            fontSize: "12px",
                            color: quickForm.kind === k ? "var(--ink-dark)" : "var(--ink-light)",
                            cursor: "pointer",
                            textTransform: "capitalize",
                          }}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                    {quickForm.kind === "assessment" && (
                      <>
                        <input
                          type="number"
                          min="0"
                          value={quickForm.creditValue}
                          onChange={(e) => setQuickForm({ ...quickForm, creditValue: e.target.value })}
                          placeholder="Credits (optional)"
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontFamily: "var(--font-serif)",
                            fontSize: "12px",
                            background: "transparent",
                            border: "1px solid rgba(140,100,60,0.25)",
                            borderRadius: "3px",
                            color: "var(--ink-dark)",
                            boxSizing: "border-box" as const,
                          }}
                        />
                        <select
                          value={quickForm.targetGrade}
                          onChange={(e) => setQuickForm({ ...quickForm, targetGrade: e.target.value })}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontFamily: "var(--font-serif)",
                            fontSize: "12px",
                            background: "transparent",
                            border: "1px solid rgba(140,100,60,0.25)",
                            borderRadius: "3px",
                            color: "var(--ink-dark)",
                            appearance: "none",
                          }}
                        >
                          <option value="">Target grade (optional)</option>
                          <option value="Achieved">Achieved</option>
                          <option value="Merit">Merit</option>
                          <option value="Excellence">Excellence</option>
                        </select>
                        <input
                          type="text"
                          value={quickForm.standardCode}
                          onChange={(e) => setQuickForm({ ...quickForm, standardCode: e.target.value })}
                          placeholder="Standard code (optional), e.g. AS91098"
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontFamily: "var(--font-serif)",
                            fontSize: "12px",
                            background: "transparent",
                            border: "1px solid rgba(140,100,60,0.25)",
                            borderRadius: "3px",
                            color: "var(--ink-dark)",
                            boxSizing: "border-box" as const,
                          }}
                        />
                      </>
                    )}
                    <div>
                      <select
                        value={quickForm.subjectId}
                        onChange={(e) => {
                          setQuickForm({ ...quickForm, subjectId: e.target.value });
                          if (quickErrors.subject) setQuickErrors({ ...quickErrors, subject: false });
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontFamily: "var(--font-serif)",
                          fontSize: "12px",
                          background: "transparent",
                          border: quickErrors.subject ? "1px solid rgba(176,64,64,0.5)" : "1px solid rgba(140,100,60,0.25)",
                          borderRadius: "3px",
                          color: "var(--ink-dark)",
                          appearance: "none",
                        }}
                      >
                        <option value="">Subject...</option>
                        {subjects.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="text"
                        value={quickForm.title}
                        onChange={(e) => {
                          setQuickForm({ ...quickForm, title: e.target.value });
                          if (quickErrors.title) setQuickErrors({ ...quickErrors, title: false });
                        }}
                        placeholder="Assignment title"
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontFamily: "var(--font-serif)",
                          fontSize: "12px",
                          background: "transparent",
                          border: quickErrors.title ? "1px solid rgba(176,64,64,0.5)" : "1px solid rgba(140,100,60,0.25)",
                          borderRadius: "3px",
                          color: "var(--ink-dark)",
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleQuickAdd(); }}
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={quickForm.dueDate}
                        onChange={(e) => {
                          setQuickForm({ ...quickForm, dueDate: e.target.value });
                          if (quickErrors.dueDate) setQuickErrors({ ...quickErrors, dueDate: false });
                        }}
                        style={{
                          width: "100%",
                          padding: "6px 8px",
                          fontFamily: "var(--font-serif)",
                          fontSize: "12px",
                          background: "transparent",
                          border: quickErrors.dueDate ? "1px solid rgba(176,64,64,0.5)" : "1px solid rgba(140,100,60,0.25)",
                          borderRadius: "3px",
                          color: "var(--ink-dark)",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button
                        onClick={handleQuickAdd}
                        style={{
                          background: "rgba(140,100,60,0.15)",
                          border: "1px solid rgba(140,100,60,0.25)",
                          borderRadius: "3px",
                          padding: "5px 14px",
                          fontFamily: "var(--font-serif)",
                          fontSize: "12px",
                          color: "var(--ink-medium)",
                          cursor: "pointer",
                        }}
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowQuickAdd(false);
                          setQuickForm(EMPTY_QUICK_FORM);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          fontFamily: "var(--font-serif)",
                          fontSize: "12px",
                          color: "var(--ink-light)",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Masthead */}
              <div style={{ textAlign: "center", borderBottom: "1px solid rgba(140,100,60,0.2)", paddingBottom: "14px", marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)" }}>
                    Year 13 · Te Kura · Blenheim
                  </span>
                  <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)" }}>
                    Vol. I, No. 1 · 2026
                  </span>
                </div>
                <div style={{ height: "3px", background: "rgba(140,100,60,0.35)", margin: "0 0 4px" }} />
                <div style={{ fontFamily: "var(--font-hand)", fontSize: "13px", color: "var(--ink-light)", marginBottom: "2px" }}>
                  {greeting}
                </div>
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 700,
                    fontSize: "clamp(28px, 5vw, 48px)",
                    color: "var(--ink-dark)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    margin: "0",
                    lineHeight: 1.05,
                  }}
                >
                  <QuillTitle storageKey="schoolwork-title-quill-today" inkColour="var(--ink-dark)">
                    The Schoolwork Journal
                  </QuillTitle>
                </h1>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <button
                    onClick={() => signOut()}
                    title="Sign out"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "10px",
                      color: "var(--ink-light)",
                      opacity: 0.6,
                      padding: "0 4px",
                    }}
                  >
                    sign out
                  </button>
                  <button
                    onClick={toggleSounds}
                    title={sounds ? "Turn sounds off" : "Turn sounds on"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "15px",
                      opacity: sounds ? 0.9 : 0.4,
                      padding: "0 2px",
                      transition: "opacity 0.2s",
                    }}
                  >
                    🖋
                  </button>
                  <button
                    onClick={toggleCandlelight}
                    title={candlelight ? "Switch to daylight" : "Switch to candlelight"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "15px",
                      opacity: candlelight ? 0.9 : 0.4,
                      padding: "0 2px",
                      transition: "opacity 0.2s",
                    }}
                  >
                    🕯
                  </button>
                </div>
                <div style={{ height: "1px", background: "rgba(140,100,60,0.25)", margin: "6px 0 8px" }} />
                <div style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: isMobile ? "flex-start" : "baseline",
                  gap: isMobile ? "2px" : "0",
                }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "13px",
                      fontStyle: "italic",
                      color: "var(--ink-medium)",
                    }}
                  >
                    {mastheadDate}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-hand)",
                      fontSize: "11px",
                      color: "var(--ink-light)",
                    }}
                  >
                    {totalActive} assignment{totalActive !== 1 ? "s" : ""} to track
                  </span>
                </div>
              </div>

              {/* Week strip */}
              {weekStrip.length > 0 && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", margin: "0 0 4px" }}>
                    {weekStrip.map(({ date, count }, i) => {
                      const isToday = i === 0;
                      const ds = toDateStr(date);
                      const isSelected = selectedStripDay === ds;
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedStripDay(isSelected ? null : ds)}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "3px",
                            padding: "6px 2px",
                            borderRadius: "6px",
                            background: isSelected
                              ? "rgba(140,100,60,0.18)"
                              : isToday
                              ? "rgba(140,100,60,0.1)"
                              : "transparent",
                            border: isSelected
                              ? "1px solid rgba(140,100,60,0.4)"
                              : isToday
                              ? "1px solid rgba(140,100,60,0.2)"
                              : "1px solid transparent",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            {date.toLocaleDateString("en-NZ", { weekday: "short" }).slice(0, 3)}
                          </span>
                          <span style={{ fontFamily: "var(--font-hand)", fontSize: "13px", color: isToday ? "var(--ink-dark)" : "var(--ink-medium)", fontWeight: isToday ? 700 : 400 }}>
                            {date.getDate()}
                          </span>
                          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: count > 0 ? "var(--ink-medium)" : "transparent", border: count > 0 ? "none" : "1px solid rgba(140,100,60,0.2)" }} />
                        </div>
                      );
                    })}
                  </div>
                  {selectedStripDay && (() => {
                    const dayAssignments = allActive.filter((a) => a.dueDate === selectedStripDay);
                    const dayDate = weekStrip.find((s) => toDateStr(s.date) === selectedStripDay)?.date;
                    return (
                      <div
                        style={{
                          borderLeft: "2px solid rgba(140,100,60,0.25)",
                          paddingLeft: "12px",
                          marginBottom: "14px",
                          paddingTop: "8px",
                          paddingBottom: "8px",
                        }}
                      >
                        <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginBottom: "6px" }}>
                          {dayDate ? dayDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }) : selectedStripDay}
                        </div>
                        {dayAssignments.length === 0 ? (
                          <div style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "12px", color: "var(--ink-light)" }}>
                            Nothing due.
                          </div>
                        ) : dayAssignments.map((a) => (
                          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(140,100,60,0.07)" }}>
                            <div>
                              <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-dark)" }}>{a.title}</div>
                              <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: getColour(a.subjectId), marginTop: "1px" }}>{subjectName(a.subjectId)}</div>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCycleStatus(a); }}
                              style={{
                                fontFamily: "var(--font-hand)",
                                fontSize: "10px",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                border: "none",
                                cursor: "pointer",
                                flexShrink: 0,
                                marginLeft: "10px",
                                ...statusStyle(a.status),
                              }}
                            >
                              {a.status}
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}

              {allEmpty ? (
                <div style={{ textAlign: "center", marginTop: "60px" }}>
                  <p
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontStyle: "italic",
                      fontSize: "15px",
                      color: "var(--ink-light)",
                      margin: "0 0 8px",
                    }}
                  >
                    All clear — enjoy the quiet.
                  </p>
                  <p style={{ fontFamily: "var(--font-hand)", fontSize: "12px", color: "var(--ink-light)", margin: 0 }}>
                    Open a chapter to add your first entry.
                  </p>
                </div>
              ) : (
                <>
                  {/* Due Today */}
                  {dueToday.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-hand)",
                          fontSize: "9px",
                          color: "var(--ink-medium)",
                          textAlign: "center",
                          letterSpacing: "0.08em",
                          marginBottom: "10px",
                        }}
                      >
                        — Due Today —
                      </div>
                      {dueToday.map((a) => (
                        <Link
                          key={a.id}
                          href={`/journal/${a.subjectId}`}
                          style={{ textDecoration: "none", display: "block" }}
                          onClick={() => startTransition()}
                        >
                          <div
                            style={{
                              borderLeft: `3px solid ${getColour(a.subjectId)}`,
                              padding: "8px 14px",
                              marginBottom: "8px",
                              background: "rgba(140,100,60,0.06)",
                              cursor: "pointer",
                            }}
                          >
                            {a.priority === "High" && (
                              <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#b04040", marginBottom: "4px", opacity: 0.7 }} />
                            )}
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
                              {subjectName(a.subjectId)}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 600,
                                fontSize: "17px",
                                color: "var(--ink-dark)",
                                lineHeight: 1.25,
                              }}
                            >
                              {a.title}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-serif)",
                                fontStyle: "italic",
                                fontSize: "12px",
                                color: "#c06030",
                                marginTop: "3px",
                              }}
                            >
                              due today
                            </div>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCycleStatus(a); }}
                              style={{ ...statusStyle(a.status), fontFamily: "var(--font-hand)", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", border: "none", cursor: "pointer", marginTop: "4px", display: "inline-block" }}
                            >
                              {a.status}
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); startFocusSession({ id: a.id, title: a.title }); }}
                              style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0, marginLeft: "6px" }}
                              title="Start a focus session for this"
                            >
                              ⏱
                            </button>
                            {a.kind === "assessment" && (
                              <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginLeft: "6px" }} title="Assessment">
                                🎖{a.creditValue ? ` ${a.creditValue}cr` : ""}
                              </span>
                            )}
                            {a.recurring && (
                              <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", opacity: 0.6, marginLeft: "6px" }}>
                                ↻
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Overdue — headline treatment */}
                  {overdue.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-hand)",
                          fontSize: "9px",
                          color: "var(--ink-light)",
                          textAlign: "center",
                          marginBottom: "12px",
                          letterSpacing: "0.08em",
                        }}
                      >
                        — Overdue —
                      </div>
                      {overdue.map((a) => (
                        <Link
                          key={a.id}
                          href={`/journal/${a.subjectId}`}
                          style={{ textDecoration: "none", display: "block" }}
                          onClick={() => startTransition()}
                        >
                          <div
                            style={{
                              borderLeft: `4px solid ${getColour(a.subjectId)}`,
                              padding: "10px 14px",
                              marginBottom: "8px",
                              background: "rgba(140,100,60,0.05)",
                              cursor: "pointer",
                            }}
                          >
                            <div>
                              {a.priority === "High" && (
                                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#b04040", marginBottom: "4px", opacity: 0.7 }} />
                              )}
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
                                {subjectName(a.subjectId)}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontWeight: 700,
                                  fontSize: "21px",
                                  color: "var(--ink-dark)",
                                  lineHeight: 1.25,
                                }}
                              >
                                {a.title}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-serif)",
                                  fontStyle: "italic",
                                  fontSize: "13px",
                                  color: "#b04040",
                                  marginTop: "3px",
                                }}
                              >
                                {overdueByDays(a.dueDate)}
                              </div>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCycleStatus(a); }}
                                style={{ ...statusStyle(a.status), fontFamily: "var(--font-hand)", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", border: "none", cursor: "pointer", marginTop: "4px", display: "inline-block" }}
                              >
                                {a.status}
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); startFocusSession({ id: a.id, title: a.title }); }}
                                style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0, marginLeft: "6px" }}
                                title="Start a focus session for this"
                              >
                                ⏱
                              </button>
                              {a.kind === "assessment" && (
                                <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginLeft: "6px" }} title="Assessment">
                                  🎖{a.creditValue ? ` ${a.creditValue}cr` : ""}
                                </span>
                              )}
                              {a.recurring && (
                                <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", opacity: 0.6, marginLeft: "6px" }}>
                                  ↻
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* This Week — two-column grid */}
                  {thisWeek.length > 0 && (
                    <div style={{ marginBottom: "8px" }}>
                      {sectionLabel("This Week")}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                          marginTop: "8px",
                        }}
                      >
                        {thisWeek.map((a) => (
                          <Link
                            key={a.id}
                            href={`/journal/${a.subjectId}`}
                            style={{ textDecoration: "none" }}
                            onClick={() => startTransition()}
                          >
                            <div
                              style={{
                                border: "1px solid rgba(140,100,60,0.1)",
                                padding: "10px",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                                <div
                                  style={{
                                    width: "6px",
                                    height: "6px",
                                    borderRadius: "50%",
                                    background: getColour(a.subjectId),
                                    flexShrink: 0,
                                    marginTop: "5px",
                                  }}
                                />
                                <div
                                  style={{
                                    fontFamily: "var(--font-serif)",
                                    fontWeight: 500,
                                    fontSize: "14px",
                                    color: "var(--ink-dark)",
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {a.title}
                                </div>
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-hand)",
                                  fontSize: "12px",
                                  color: urgencyColour(a.dueDate),
                                  marginTop: "4px",
                                  paddingLeft: "14px",
                                }}
                              >
                                {formatDate(a.dueDate)}
                              </div>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCycleStatus(a); }}
                                style={{ ...statusStyle(a.status), fontFamily: "var(--font-hand)", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", border: "none", cursor: "pointer", marginTop: "4px", marginLeft: "14px", display: "inline-block" }}
                              >
                                {a.status}
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); startFocusSession({ id: a.id, title: a.title }); }}
                                style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0, marginLeft: "6px" }}
                                title="Start a focus session for this"
                              >
                                ⏱
                              </button>
                              {a.kind === "assessment" && (
                                <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginLeft: "6px" }} title="Assessment">
                                  🎖{a.creditValue ? ` ${a.creditValue}cr` : ""}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Coming Up — compact list */}
                  {comingUp.length > 0 && (
                    <div>
                      {sectionLabel("Coming Up")}
                      {comingUp.map((a, i) => (
                        <div key={a.id}>
                          {i > 0 && (
                            <div style={{ height: "1px", background: "rgba(140,100,60,0.08)" }} />
                          )}
                          <Link
                            href={`/journal/${a.subjectId}`}
                            style={{ textDecoration: "none", display: "block" }}
                            onClick={() => startTransition()}
                          >
                            <div style={{ padding: "8px 0", cursor: "pointer" }}>
                              <div
                                style={{
                                  fontFamily: "var(--font-serif)",
                                  fontSize: "13px",
                                  color: "var(--ink-dark)",
                                  lineHeight: 1.3,
                                }}
                              >
                                {a.title}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-hand)",
                                  fontSize: "11px",
                                  color: urgencyColour(a.dueDate),
                                  marginTop: "2px",
                                }}
                              >
                                {subjectName(a.subjectId)} · {formatDate(a.dueDate)}
                              </div>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCycleStatus(a); }}
                                style={{ ...statusStyle(a.status), fontFamily: "var(--font-hand)", fontSize: "10px", padding: "2px 8px", borderRadius: "10px", border: "none", cursor: "pointer", marginTop: "4px", display: "inline-block" }}
                              >
                                {a.status}
                              </button>
                              <button
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); startFocusSession({ id: a.id, title: a.title }); }}
                                style={{ background: "transparent", border: "none", fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", cursor: "pointer", padding: 0, marginLeft: "6px" }}
                                title="Start a focus session for this"
                              >
                                ⏱
                              </button>
                              {a.kind === "assessment" && (
                                <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginLeft: "6px" }} title="Assessment">
                                  🎖{a.creditValue ? ` ${a.creditValue}cr` : ""}
                                </span>
                              )}
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {subjectProgress.length > 0 && (
                <div style={{ marginTop: "32px" }}>
                  <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", letterSpacing: "0.08em", textAlign: "center", marginBottom: "12px" }}>
                    — by subject —
                  </div>
                  {subjectProgress.map(({ sub, done, total }) => {
                    const pct = Math.round((done / total) * 100);
                    return (
                      <div key={sub.id} style={{ marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                          <span style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: sub.colour }}>
                            {sub.name}
                          </span>
                          <span style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)" }}>
                            {done}/{total}
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

              {subjectProgress.length > 0 && (
                <button
                  onClick={() => handleTabNavigate("/journal/stats")}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "11px",
                    color: "var(--ink-light)",
                    cursor: "pointer",
                    padding: "6px 0 0",
                    display: "block",
                    textAlign: "right" as const,
                    width: "100%",
                  }}
                >
                  view all stats →
                </button>
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
        activeSubjectId={null}
        onNavigate={handleTabNavigate}
        urgentIds={urgentIds}
        counts={tabCounts}
      />
    </div>
  );
}
