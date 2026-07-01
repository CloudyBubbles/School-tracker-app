"use client";

import { use, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/app/hooks/useIsMobile";
import { useRiffle } from "@/app/lib/riffle-context";
import { useRouter } from "next/navigation";
import { motion, animate } from "framer-motion";
import { usePageTransition } from "@/app/components/PageTransitionProvider";
import { loadAssignments, saveAssignments, loadChapterNotes, saveChapterNote } from "@/app/lib/storage";
import { cycleAssignmentStatus } from "@/app/lib/assignments";
import { parseLocalDate, relativeDueLabel } from "@/app/lib/dates";
import { toDateStr, urgencyColour, PRIORITY_ORDER, toRoman } from "@/app/lib/utils";
import { getSubjects, Subject } from "@/app/lib/subjects";
import { Assignment, Checkpoint } from "@/app/types";
import ParchmentPage from "@/app/components/journal/ParchmentPage";
import PageStack from "@/app/components/journal/PageStack";
import SideTabs from "@/app/components/journal/SideTabs";

const STATUS_OPTIONS: Assignment["status"][] = ["To do", "In progress", "Done"];
const PRIORITY_OPTIONS: Assignment["priority"][] = ["Low", "Medium", "High"];

const PRIORITY_COLOUR: Record<Assignment["priority"], string> = {
  Low: "#a0a080",
  Medium: "#c8a050",
  High: "#b04040",
};

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

function timelineProgress(startDate: string, dueDate: string): number | null {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = parseLocalDate(startDate);
  const due = parseLocalDate(dueDate);
  const total = due.getTime() - start.getTime();
  if (total <= 0) return null;
  const elapsed = today.getTime() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

interface FormState {
  title: string;
  startDate?: string;
  dueDate: string;
  status: Assignment["status"];
  priority: Assignment["priority"];
  notes: string;
  estimatedTime?: string;
  recurring?: Assignment["recurring"];
}

const EMPTY_FORM: FormState = {
  title: "",
  startDate: "",
  dueDate: "",
  status: "To do",
  priority: "Medium",
  notes: "",
  estimatedTime: "",
  recurring: undefined,
};

export default function ChapterPage({
  params,
}: {
  params: Promise<{ subject: string }>;
}) {
  const { subject: subjectId } = use(params);
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const { startTransition, endTransition } = usePageTransition();
  const isMobile = useIsMobile();
  const { trigger: triggerRiffle } = useRiffle();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [formErrors, setFormErrors] = useState({ title: false, dueDate: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [editError, setEditError] = useState({ title: false, dueDate: false });
  const [editCheckpoints, setEditCheckpoints] = useState<Checkpoint[]>([]);
  const [newCheckpointInput, setNewCheckpointInput] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(true);
  const [sortMode, setSortMode] = useState<"date" | "priority" | "custom">("date");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [urgentIds, setUrgentIds] = useState<string[]>([]);
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [pinnedNote, setPinnedNote] = useState("");
  const [stampingId, setStampingId] = useState<string | null>(null);
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    endTransition();
    const subs = getSubjects();
    setSubjects(subs);
    const idx = subs.findIndex((s) => s.id === subjectId);
    if (idx === -1) {
      router.replace("/journal");
      return;
    }
    setSubject(subs[idx]);
    setChapterIndex(idx + 1);
    const notes = loadChapterNotes();
    setPinnedNote(notes[subjectId] ?? "");
    const all = loadAssignments();
    const filtered = all
      .filter((a) => a.subject.toLowerCase() === subs[idx].name.toLowerCase())
      .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime());
    if (filtered.some((a) => a.order != null)) {
      setSortMode("custom");
    }
    setAssignments(filtered);
    setEditingId(null);
    setDeleteConfirmId(null);
    setShowForm(false);
    setExpandedNotes(new Set());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const urgentSet = new Set<string>();
    for (const a of all) {
      if (a.status === "Done") continue;
      const due = parseLocalDate(a.dueDate);
      if (due <= today) {
        const subId = subs.find((s) => s.name.toLowerCase() === a.subject.toLowerCase())?.id;
        if (subId) urgentSet.add(subId);
      }
    }
    setUrgentIds([...urgentSet]);
    const tabCountsMap: Record<string, number> = {};
    for (const sub of subs) {
      tabCountsMap[sub.id] = all.filter(
        (a) => a.status !== "Done" && a.subject.toLowerCase() === sub.name.toLowerCase()
      ).length;
    }
    setTabCounts(tabCountsMap);
  }, [subjectId, router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        setShowForm((v) => !v);
      }
      if (e.key === "Escape") {
        setShowForm(false);
        setEditingId(null);
        setDeleteConfirmId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  const refreshAssignments = (all: Assignment[]) => {
    setAssignments(
      all
        .filter((a) => a.subject.toLowerCase() === (subject?.name ?? "").toLowerCase())
        .sort((a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime())
    );
    const subs = getSubjects();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const urgentSet = new Set<string>();
    for (const a of all) {
      if (a.status === "Done") continue;
      const due = parseLocalDate(a.dueDate);
      if (due <= today) {
        const subId = subs.find((s) => s.name.toLowerCase() === a.subject.toLowerCase())?.id;
        if (subId) urgentSet.add(subId);
      }
    }
    setUrgentIds([...urgentSet]);
  };

  const handleNoteChange = (val: string) => {
    setPinnedNote(val);
    saveChapterNote(subjectId, val);
  };

  const loadData = () => {
    const subs = getSubjects();
    const idx = subs.findIndex((s) => s.id === subjectId);
    if (idx === -1) return;
    const all = loadAssignments();
    const filtered = all.filter(
      (a) => a.subject.toLowerCase() === subs[idx].name.toLowerCase()
    );
    if (filtered.some((a) => a.order != null) && sortMode === "date") {
      setSortMode("custom");
    }
    setAssignments(filtered);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const urgentSet = new Set<string>();
    for (const a of all) {
      if (a.status === "Done") continue;
      const due = parseLocalDate(a.dueDate);
      if (due <= today) {
        const subId = subs.find((s) => s.name.toLowerCase() === a.subject.toLowerCase())?.id;
        if (subId) urgentSet.add(subId);
      }
    }
    setUrgentIds([...urgentSet]);
    const tabCountsMap: Record<string, number> = {};
    for (const sub of subs) {
      tabCountsMap[sub.id] = all.filter(
        (a) => a.status !== "Done" && a.subject.toLowerCase() === sub.name.toLowerCase()
      ).length;
    }
    setTabCounts(tabCountsMap);
  };

  const recomputeTabCounts = () => {
    const allFresh = loadAssignments();
    const fresh = getSubjects();
    const counts: Record<string, number> = {};
    for (const sub of fresh) {
      counts[sub.id] = allFresh.filter(
        (a) => a.status !== "Done" && a.subject.toLowerCase() === sub.name.toLowerCase()
      ).length;
    }
    setTabCounts(counts);
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
    router.push(path);
  };

  const handleChapterNav = (href: string) => {
    if (flipping) return;
    setFlipping(true);
    triggerRiffle(() => router.push(href));
    setTimeout(() => setFlipping(false), 400);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !isMobile || flipping) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

    const currentIdx = subjects.findIndex((s) => s.id === subjectId);
    if (dx < 0 && currentIdx < subjects.length - 1) {
      handleChapterNav(`/journal/${subjects[currentIdx + 1].id}`);
    } else if (dx > 0 && currentIdx > 0) {
      handleChapterNav(`/journal/${subjects[currentIdx - 1].id}`);
    }
  };

  const toggleNote = (id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleCheckpoint = (assignmentId: string, checkpointId: string) => {
    const all = loadAssignments();
    const updated = all.map((a) =>
      a.id === assignmentId
        ? { ...a, checkpoints: a.checkpoints.map((c) => c.id === checkpointId ? { ...c, done: !c.done } : c) }
        : a
    );
    saveAssignments(updated);
    refreshAssignments(updated);
  };

  const handleCycleStatus = (assignmentId: string) => {
    const updated = cycleAssignmentStatus(assignmentId);
    refreshAssignments(updated);
    recomputeTabCounts();
    if (updated.find((a) => a.id === assignmentId)?.status === "Done") {
      setStampingId(assignmentId);
      setTimeout(() => setStampingId(null), 700);
    }
  };

  const handleOpenEdit = (a: Assignment) => {
    setEditingId(a.id);
    setEditForm({ title: a.title, startDate: a.startDate ?? "", dueDate: a.dueDate, status: a.status, priority: a.priority, notes: a.notes, estimatedTime: a.estimatedTime ?? "", recurring: a.recurring });
    setEditError({ title: false, dueDate: false });
    setEditCheckpoints([...a.checkpoints]);
    setNewCheckpointInput("");
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editForm.title.trim() || !editForm.dueDate) {
      setEditError({ title: !editForm.title.trim(), dueDate: !editForm.dueDate });
      return;
    }
    const all = loadAssignments();
    const updated = all.map((a) =>
      a.id === editingId ? { ...a, ...editForm, estimatedTime: editForm.estimatedTime || undefined, checkpoints: editCheckpoints } : a
    );
    saveAssignments(updated);
    refreshAssignments(updated);
    recomputeTabCounts();
    setEditingId(null);
  };

  const handleDelete = (assignmentId: string) => {
    const all = loadAssignments();
    const updated = all.filter((a) => a.id !== assignmentId);
    saveAssignments(updated);
    refreshAssignments(updated);
    recomputeTabCounts();
    setDeleteConfirmId(null);
  };

  const handleSnooze = (id: string, currentDueDate: string) => {
    const due = parseLocalDate(currentDueDate);
    due.setDate(due.getDate() + 1);
    const all = loadAssignments();
    const updated = all.map((a) =>
      a.id === id ? { ...a, dueDate: toDateStr(due) } : a
    );
    saveAssignments(updated);
    refreshAssignments(updated);
    recomputeTabCounts();
  };

  const handleDropOnCard = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    const reordered = [...displayedAssignments];
    const fromIdx = reordered.findIndex((a) => a.id === draggingId);
    const toIdx   = reordered.findIndex((a) => a.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((a, i) => ({ ...a, order: i }));
    const all = loadAssignments();
    const orderMap = Object.fromEntries(withOrder.map((a) => [a.id, a.order]));
    const merged = all.map((a) => (a.id in orderMap ? { ...a, order: orderMap[a.id] } : a));
    saveAssignments(merged);
    setSortMode("custom");
    setDraggingId(null);
    loadData();
  };

  const handleAddEntry = () => {
    const errors = { title: !form.title.trim(), dueDate: !form.dueDate };
    if (errors.title || errors.dueDate) {
      setFormErrors(errors);
      return;
    }
    if (!subject) return;
    const newA: Assignment = {
      id: crypto.randomUUID(),
      subject: subject.name,
      title: form.title.trim(),
      startDate: form.startDate || undefined,
      dueDate: form.dueDate,
      status: form.status,
      priority: form.priority,
      notes: form.notes,
      checkpoints: [],
      estimatedTime: form.estimatedTime || undefined,
      recurring: form.recurring || undefined,
    };
    const all = loadAssignments();
    const updated = [...all, newA];
    saveAssignments(updated);
    refreshAssignments(updated);
    recomputeTabCounts();
    setForm(EMPTY_FORM);
    setFormErrors({ title: false, dueDate: false });
    setShowForm(false);
  };

  const baseInputStyle = {
    background: "var(--parchment)",
    borderRadius: "3px",
    padding: "6px 10px",
    fontFamily: "var(--font-serif)",
    fontSize: "13px",
    color: "var(--ink-dark)",
    WebkitTextFillColor: "var(--ink-dark)",
    width: "100%",
    boxSizing: "border-box" as const,
    outline: "none",
  };

  const inputStyle = (hasError: boolean) => ({
    ...baseInputStyle,
    border: hasError ? "1px solid #c04040" : "1px solid rgba(140,100,60,0.3)",
  });

  const labelStyle = {
    fontFamily: "var(--font-hand)" as const,
    fontSize: "10px",
    color: "var(--ink-light)",
    marginBottom: "3px",
  };

  const linkBtnStyle = {
    background: "transparent",
    border: "none",
    fontFamily: "var(--font-serif)" as const,
    fontStyle: "italic" as const,
    fontSize: "11px",
    color: "var(--ink-light)",
    cursor: "pointer",
    padding: 0,
  };

  const sortedAssignments = sortMode === "priority"
    ? [...assignments].sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 1;
        const pb = PRIORITY_ORDER[b.priority] ?? 1;
        if (pa !== pb) return pa - pb;
        return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
      })
    : sortMode === "custom"
    ? [...assignments].sort((a, b) => {
        const ao = a.order ?? Infinity;
        const bo = b.order ?? Infinity;
        if (ao !== bo) return ao - bo;
        return parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
      })
    : assignments;

  const displayedAssignments = showDone
    ? sortedAssignments
    : sortedAssignments.filter((a) => a.status !== "Done");

  if (!subject) return null;

  return (
    <div
      style={{ display: "flex", minHeight: "100vh", transformStyle: "preserve-3d" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <motion.div
        ref={pageRef}
        key={subjectId}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ flex: 1, transformOrigin: "left center", transformStyle: "preserve-3d" }}
      >
        <ParchmentPage showLines>
          <div style={{ maxWidth: "680px", margin: "0 auto", padding: isMobile ? "20px 16px 60px" : "40px 32px 60px" }}>
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
              Chapter {toRoman(chapterIndex)}
            </div>

            {/* Heading */}
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                fontSize: "32px",
                color: subject.colour,
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              {subject.name}
            </h1>

            {/* Rule + progress */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ height: "1px", background: subject.colour, opacity: 0.2 }} />
              {(() => {
                const total = assignments.length;
                if (total === 0) return null;
                const done = assignments.filter((a) => a.status === "Done").length;
                const pct = Math.round((done / total) * 100);
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
                    <div style={{ flex: 1, height: "3px", background: "rgba(140,100,60,0.12)", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: subject.colour, opacity: 0.6, borderRadius: "2px", transition: "width 0.4s ease" }} />
                    </div>
                    <span style={{ fontFamily: "var(--font-hand)", fontSize: "11px", color: "var(--ink-light)", whiteSpace: "nowrap" }}>
                      {done} of {total} done
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Pinned notes */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginBottom: "4px" }}>Notes</div>
              <textarea
                value={pinnedNote}
                onChange={(e) => handleNoteChange(e.target.value)}
                placeholder="Scratch-pad for this subject..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "transparent",
                  border: "1px solid rgba(140,100,60,0.2)",
                  borderRadius: "3px",
                  padding: "8px 10px",
                  fontFamily: "var(--font-hand)",
                  fontSize: "13px",
                  color: "var(--ink-dark)",
                  resize: "vertical",
                  minHeight: "56px",
                  outline: "none",
                  WebkitTextFillColor: "var(--ink-dark)",
                  colorScheme: "light" as const,
                }}
              />
            </div>

            {/* Show/hide done toggle + sort control */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "11px", color: "var(--ink-light)" }}>
                  {showDone ? "Showing all entries" : "Hiding completed"}
                </span>
                <span style={{ fontFamily: "var(--font-serif)", fontSize: "11px", color: "var(--ink-light)" }}>·</span>
                <button
                  onClick={() => setShowDone(!showDone)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontFamily: "var(--font-serif)",
                    fontStyle: "italic",
                    fontSize: "11px",
                    color: "var(--ink-light)",
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  {showDone ? "hide done" : "show all"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.7 }}>sort:</span>
                <button
                  onClick={() => {
                    if (sortMode === "custom") {
                      const all = loadAssignments();
                      const cleared = all.map((a) => a.subject.toLowerCase() === subject.name.toLowerCase() ? { ...a, order: undefined } : a);
                      saveAssignments(cleared);
                      loadData();
                    }
                    setSortMode("date");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontFamily: "var(--font-hand)",
                    fontSize: "9px",
                    color: sortMode === "date" ? "var(--ink-medium)" : "var(--ink-light)",
                    cursor: sortMode === "date" ? "default" : "pointer",
                    padding: 0,
                    textDecoration: sortMode === "date" ? "underline" : "none",
                    opacity: sortMode === "date" ? 1 : 0.6,
                  }}
                >
                  date
                </button>
                <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5 }}>/</span>
                <button
                  onClick={() => {
                    if (sortMode === "custom") {
                      const all = loadAssignments();
                      const cleared = all.map((a) => a.subject.toLowerCase() === subject.name.toLowerCase() ? { ...a, order: undefined } : a);
                      saveAssignments(cleared);
                      loadData();
                    }
                    setSortMode("priority");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontFamily: "var(--font-hand)",
                    fontSize: "9px",
                    color: sortMode === "priority" ? "var(--ink-medium)" : "var(--ink-light)",
                    cursor: sortMode === "priority" ? "default" : "pointer",
                    padding: 0,
                    textDecoration: sortMode === "priority" ? "underline" : "none",
                    opacity: sortMode === "priority" ? 1 : 0.6,
                  }}
                >
                  priority
                </button>
                {displayedAssignments.some((a) => a.order != null) && (
                  <>
                    <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.5 }}>·</span>
                    <button
                      onClick={() => setSortMode("custom")}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontFamily: "var(--font-hand)",
                        fontSize: "9px",
                        color: sortMode === "custom" ? "var(--ink-medium)" : "var(--ink-light)",
                        cursor: sortMode === "custom" ? "default" : "pointer",
                        padding: 0,
                        textDecoration: sortMode === "custom" ? "underline" : "none",
                        opacity: sortMode === "custom" ? 1 : 0.6,
                      }}
                    >
                      custom
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Add-entry form */}
            {showForm && (
              <div
                tabIndex={-1}
                onKeyDown={(e) => { if (e.key === "Escape") { setShowForm(false); setForm(EMPTY_FORM); setFormErrors({ title: false, dueDate: false }); }}}
                style={{
                  borderLeft: `3px solid ${subject.colour}`,
                  padding: "16px 14px 16px 16px",
                  background: "rgba(140,100,60,0.03)",
                  marginBottom: "8px",
                }}
              >
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ ...labelStyle, marginBottom: "4px" }}>Subject</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: "13px", color: "var(--ink-medium)" }}>
                    {subject.name}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <div style={labelStyle}>Title</div>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => {
                        setForm({ ...form, title: e.target.value });
                        if (formErrors.title) setFormErrors({ ...formErrors, title: false });
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("add-due-date")?.focus(); }}}
                      style={inputStyle(formErrors.title)}
                      placeholder="Assignment title"
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Due Date</div>
                    <input
                      id="add-due-date"
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => {
                        setForm({ ...form, dueDate: e.target.value });
                        if (formErrors.dueDate) setFormErrors({ ...formErrors, dueDate: false });
                      }}
                      style={inputStyle(formErrors.dueDate)}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Start Date <span style={{ opacity: 0.5 }}>(optional)</span></div>
                    <input
                      type="date"
                      value={form.startDate ?? ""}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      style={inputStyle(false)}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <div style={{ flex: 1 }}>
                      <div style={labelStyle}>Status</div>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value as Assignment["status"] })}
                        style={{ ...inputStyle(false), appearance: "none" as const }}
                      >
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={labelStyle}>Priority</div>
                      <select
                        value={form.priority}
                        onChange={(e) => setForm({ ...form, priority: e.target.value as Assignment["priority"] })}
                        style={{ ...inputStyle(false), appearance: "none" as const }}
                      >
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Notes</div>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      style={{ ...inputStyle(false), resize: "vertical", minHeight: "60px" }}
                      placeholder="Optional notes..."
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Est. Time <span style={{ opacity: 0.5 }}>(optional)</span></div>
                    <input
                      type="text"
                      value={form.estimatedTime ?? ""}
                      onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
                      placeholder="e.g. 2h 30m"
                      style={inputStyle(false)}
                    />
                  </div>
                  <div>
                    <div style={labelStyle}>Repeat <span style={{ opacity: 0.5 }}>(optional)</span></div>
                    <select
                      value={form.recurring ?? ""}
                      onChange={(e) => setForm({ ...form, recurring: (e.target.value as Assignment["recurring"]) || undefined })}
                      style={{ ...inputStyle(false), appearance: "none" as const }}
                    >
                      <option value="">Does not repeat</option>
                      <option value="weekly">Weekly</option>
                      <option value="fortnightly">Fortnightly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                    <button
                      onClick={handleAddEntry}
                      style={{
                        background: subject.colour,
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "7px 18px",
                        fontFamily: "var(--font-serif)",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Add Entry
                    </button>
                    <button
                      onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormErrors({ title: false, dueDate: false }); }}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontFamily: "var(--font-serif)",
                        fontSize: "13px",
                        color: "var(--ink-light)",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Assignments list */}
            <motion.div
              key={subjectId}
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.045 } },
              }}
              style={{
                transition: "transform 0.25s ease, opacity 0.25s ease",
                transform: showForm ? "translateY(8px)" : "translateY(0)",
                opacity: showForm ? 0.9 : 1,
              }}
            >
              {assignments.length === 0 && !showForm && (
                <div style={{ textAlign: "center", padding: "48px 0 32px" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "18px", color: "var(--ink-light)", marginBottom: "8px", opacity: 0.7 }}>
                    Nothing here yet.
                  </div>
                  <div style={{ fontFamily: "var(--font-hand)", fontSize: "13px", color: "var(--ink-light)", opacity: 0.5 }}>
                    — a blank page, a fresh start —
                  </div>
                </div>
              )}
              {displayedAssignments.length === 0 && assignments.length > 0 && !showForm && (
                <p style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "13px", color: "var(--ink-light)", marginBottom: "20px" }}>
                  All done — nothing more to show.
                </p>
              )}

              {displayedAssignments.map((a, i) => {
                const rel = relativeDueLabel(a.dueDate);
                const isDone = a.status === "Done";
                const rot = ((i * 7 + a.id.charCodeAt(0)) % 9) - 4;

                if (editingId === a.id) {
                  return (
                    <motion.div
                      key={a.id}
                      variants={{
                        hidden: { y: -18, rotate: rot, opacity: 0 },
                        visible: { y: 0, rotate: 0, opacity: 1, transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] } },
                      }}
                    >
                    <div
                      tabIndex={-1}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingId(null); }}
                      style={{
                        borderLeft: `3px solid ${subject.colour}`,
                        padding: "16px 14px 16px 16px",
                        marginBottom: "2px",
                        borderBottom: "1px solid rgba(140,100,60,0.1)",
                        background: "rgba(140,100,60,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <div style={labelStyle}>Title</div>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => {
                              setEditForm({ ...editForm, title: e.target.value });
                              if (editError.title) setEditError({ ...editError, title: false });
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("edit-due-date")?.focus(); }}}
                            style={inputStyle(editError.title)}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Due Date</div>
                          <input
                            id="edit-due-date"
                            type="date"
                            value={editForm.dueDate}
                            onChange={(e) => {
                              setEditForm({ ...editForm, dueDate: e.target.value });
                              if (editError.dueDate) setEditError({ ...editError, dueDate: false });
                            }}
                            style={inputStyle(editError.dueDate)}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Start Date <span style={{ opacity: 0.5 }}>(optional)</span></div>
                          <input
                            type="date"
                            value={editForm.startDate ?? ""}
                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                            style={inputStyle(false)}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={labelStyle}>Status</div>
                            <select
                              value={editForm.status}
                              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Assignment["status"] })}
                              style={{ ...inputStyle(false), appearance: "none" as const }}
                            >
                              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={labelStyle}>Priority</div>
                            <select
                              value={editForm.priority}
                              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as Assignment["priority"] })}
                              style={{ ...inputStyle(false), appearance: "none" as const }}
                            >
                              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <div style={labelStyle}>Notes</div>
                          <textarea
                            value={editForm.notes}
                            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            style={{ ...inputStyle(false), resize: "vertical", minHeight: "60px" }}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Est. Time <span style={{ opacity: 0.5 }}>(optional)</span></div>
                          <input
                            type="text"
                            value={editForm.estimatedTime ?? ""}
                            onChange={(e) => setEditForm({ ...editForm, estimatedTime: e.target.value })}
                            placeholder="e.g. 2h 30m"
                            style={inputStyle(false)}
                          />
                        </div>
                        <div>
                          <div style={labelStyle}>Repeat <span style={{ opacity: 0.5 }}>(optional)</span></div>
                          <select
                            value={editForm.recurring ?? ""}
                            onChange={(e) => setEditForm({ ...editForm, recurring: (e.target.value as Assignment["recurring"]) || undefined })}
                            style={{ ...inputStyle(false), appearance: "none" as const }}
                          >
                            <option value="">Does not repeat</option>
                            <option value="weekly">Weekly</option>
                            <option value="fortnightly">Fortnightly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>

                        {/* Checkpoint editor */}
                        <div>
                          <div style={labelStyle}>Checkpoints</div>
                          {editCheckpoints.map((cp) => (
                            <div key={cp.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                              <input
                                type="checkbox"
                                checked={cp.done}
                                onChange={() =>
                                  setEditCheckpoints(
                                    editCheckpoints.map((c) => c.id === cp.id ? { ...c, done: !c.done } : c)
                                  )
                                }
                                style={{ cursor: "pointer", accentColor: subject.colour }}
                              />
                              <span
                                style={{
                                  fontFamily: "var(--font-hand)",
                                  fontSize: "12px",
                                  color: "var(--ink-medium)",
                                  flex: 1,
                                  textDecoration: cp.done ? "line-through" : "none",
                                  opacity: cp.done ? 0.6 : 1,
                                }}
                              >
                                {cp.label}
                              </span>
                              <button
                                onClick={() => setEditCheckpoints(editCheckpoints.filter((c) => c.id !== cp.id))}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "var(--ink-light)",
                                  cursor: "pointer",
                                  padding: "0 2px",
                                  fontSize: "14px",
                                  lineHeight: 1,
                                  fontFamily: "var(--font-serif)",
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                            <input
                              type="text"
                              value={newCheckpointInput}
                              onChange={(e) => setNewCheckpointInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && newCheckpointInput.trim()) {
                                  setEditCheckpoints([
                                    ...editCheckpoints,
                                    { id: crypto.randomUUID(), label: newCheckpointInput.trim(), done: false },
                                  ]);
                                  setNewCheckpointInput("");
                                }
                              }}
                              placeholder="Add a checkpoint..."
                              style={{ ...baseInputStyle, flex: 1, width: "auto" }}
                            />
                            <button
                              onClick={() => {
                                if (!newCheckpointInput.trim()) return;
                                setEditCheckpoints([
                                  ...editCheckpoints,
                                  { id: crypto.randomUUID(), label: newCheckpointInput.trim(), done: false },
                                ]);
                                setNewCheckpointInput("");
                              }}
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(140,100,60,0.3)",
                                borderRadius: "3px",
                                padding: "6px 10px",
                                fontFamily: "var(--font-serif)",
                                fontSize: "12px",
                                color: "var(--ink-medium)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              add
                            </button>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "4px" }}>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              background: subject.colour,
                              color: "#fff",
                              border: "none",
                              borderRadius: "3px",
                              padding: "7px 18px",
                              fontFamily: "var(--font-serif)",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              background: "transparent",
                              border: "none",
                              fontFamily: "var(--font-serif)",
                              fontSize: "13px",
                              color: "var(--ink-light)",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={a.id}
                    variants={{
                      hidden: { y: -18, rotate: rot, opacity: 0 },
                      visible: { y: 0, rotate: 0, opacity: 1, transition: { duration: 0.38, ease: [0.34, 1.56, 0.64, 1] } },
                    }}
                  >
                  <div
                    draggable={true}
                    onDragStart={() => setDraggingId(a.id)}
                    onDragEnd={() => { setDraggingId(null); }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleDropOnCard(a.id); }}
                    style={{
                      borderLeft: `3px solid ${subject.colour}`,
                      padding: "12px 14px 12px 16px",
                      marginBottom: "2px",
                      borderBottom: "1px solid rgba(140,100,60,0.1)",
                      opacity: draggingId === a.id ? 0.4 : isDone ? 0.45 : 1,
                      background: "transparent",
                      transition: "background 0.15s, transform 0.3s ease-out",
                      cursor: draggingId === a.id ? "grabbing" : "default",
                      position: "relative",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(140,100,60,0.04)"; }}
                    onMouseMove={(e) => {
                      if (draggingId === a.id || isMobile) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
                      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
                      e.currentTarget.style.transform = `perspective(800px) rotateX(${-dy * 3}deg) rotateY(${dx * 3}deg)`;
                      e.currentTarget.style.transition = "background 0.15s, transform 0.08s ease-out";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
                      e.currentTarget.style.transition = "background 0.15s, transform 0.3s ease-out";
                    }}
                  >
                    {/* Title row + actions */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--ink-light)",
                          opacity: 0.35,
                          cursor: "grab",
                          paddingRight: "8px",
                          flexShrink: 0,
                          userSelect: "none",
                          lineHeight: 1,
                          alignSelf: "center",
                        }}
                      >
                        ⠿
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontWeight: 500,
                          fontSize: "15px",
                          color: "var(--ink-dark)",
                          textDecoration: isDone ? "line-through" : "none",
                          flex: 1,
                        }}
                      >
                        {a.title}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
                        {deleteConfirmId === a.id ? (
                          <span style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: "11px", color: "var(--ink-light)", whiteSpace: "nowrap" }}>
                            remove this entry?{" "}
                            <button onClick={() => handleDelete(a.id)} style={linkBtnStyle}>yes</button>
                            {" · "}
                            <button onClick={() => setDeleteConfirmId(null)} style={linkBtnStyle}>no</button>
                          </span>
                        ) : (
                          <>
                            {!isDone && (
                              <button
                                onClick={() => handleSnooze(a.id, a.dueDate)}
                                style={linkBtnStyle}
                                title="Push due date forward 1 day"
                              >
                                snooze
                              </button>
                            )}
                            <button onClick={() => handleOpenEdit(a)} style={linkBtnStyle}>edit</button>
                            <button
                              onClick={() => { setDeleteConfirmId(a.id); setEditingId(null); }}
                              style={linkBtnStyle}
                            >
                              delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badge row */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "5px", flexWrap: "wrap" }}>
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: PRIORITY_COLOUR[a.priority],
                          flexShrink: 0,
                        }}
                        title={`${a.priority} priority`}
                      />
                      <span style={{ fontFamily: "var(--font-hand)", fontSize: "12px", color: isDone ? "var(--ink-light)" : urgencyColour(a.dueDate) }}>
                        {rel ? `${rel} · ` : ""}
                        {parseLocalDate(a.dueDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCycleStatus(a.id); }}
                        style={{
                          fontFamily: "var(--font-hand)",
                          fontSize: "10px",
                          background: STATUS_BG[a.status],
                          color: STATUS_COLOR[a.status],
                          padding: "2px 8px",
                          borderRadius: "10px",
                          border: "none",
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                        }}
                      >
                        {a.status}
                      </button>
                      {a.checkpoints && a.checkpoints.length > 0 && (
                        (() => {
                          const done = a.checkpoints.filter((cp) => cp.done).length;
                          const total = a.checkpoints.length;
                          return (
                            <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: done === total ? "#2d7a2d" : "var(--ink-light)", marginLeft: "4px" }}>
                              {done}/{total}{done === total && " ✓"}
                            </span>
                          );
                        })()
                      )}
                      {a.estimatedTime && (
                        <span style={{ fontFamily: "var(--font-hand)", fontSize: "10px", color: "var(--ink-light)", marginLeft: "2px" }}>
                          ~ {a.estimatedTime}
                        </span>
                      )}
                      {a.recurring && (
                        <span
                          style={{
                            fontFamily: "var(--font-hand)",
                            fontSize: "10px",
                            color: "var(--ink-light)",
                            opacity: 0.7,
                          }}
                          title={`Repeats ${a.recurring}`}
                        >
                          ↻ {a.recurring}
                        </span>
                      )}
                    </div>

                    {/* Timeline bar */}
                    {a.startDate && !isDone && (() => {
                      const pct = timelineProgress(a.startDate, a.dueDate);
                      if (pct === null) return null;
                      const barColour = pct < 0.5 ? subject.colour : pct < 0.8 ? "#c8a050" : "#b04040";
                      return (
                        <div style={{ height: "2px", background: "rgba(140,100,60,0.1)", borderRadius: "1px", overflow: "hidden", marginTop: "6px", marginBottom: "2px" }}>
                          <div style={{ height: "100%", width: `${Math.round(pct * 100)}%`, background: barColour, opacity: 0.65, borderRadius: "1px", transition: "width 0.4s ease" }} />
                        </div>
                      );
                    })()}

                    {/* Start date */}
                    {a.startDate && (
                      <div
                        style={{
                          fontFamily: "var(--font-hand)",
                          fontSize: "11px",
                          color: "var(--ink-light)",
                          marginTop: "2px",
                          opacity: 0.7,
                        }}
                      >
                        {(() => {
                          const today = new Date(); today.setHours(0, 0, 0, 0);
                          const start = parseLocalDate(a.startDate!);
                          if (start > today) return `starts ${start.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`;
                          return `started ${start.toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}`;
                        })()}
                      </div>
                    )}

                    {/* Notes */}
                    {a.notes && (() => {
                      const isLong = a.notes.length > 80;
                      const isExpanded = expandedNotes.has(a.id);
                      return (
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-serif)",
                              fontStyle: "italic",
                              fontSize: "12px",
                              color: "var(--ink-light)",
                              marginTop: "6px",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: isLong && !isExpanded ? 2 : undefined,
                              WebkitBoxOrient: isLong && !isExpanded ? "vertical" as const : undefined,
                            }}
                          >
                            {a.notes}
                          </div>
                          {isLong && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleNote(a.id); }}
                              style={{
                                background: "transparent",
                                border: "none",
                                fontFamily: "var(--font-serif)",
                                fontStyle: "italic",
                                fontSize: "11px",
                                color: "var(--ink-light)",
                                cursor: "pointer",
                                padding: "2px 0 0",
                                opacity: 0.7,
                              }}
                            >
                              {isExpanded ? "show less" : "read more"}
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Checkpoints */}
                    {a.checkpoints && a.checkpoints.length > 0 && (
                      <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                        {a.checkpoints.map((cp) => (
                          <li key={cp.id} style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            <input
                              type="checkbox"
                              checked={cp.done}
                              onChange={() => handleToggleCheckpoint(a.id, cp.id)}
                              style={{ cursor: "pointer", accentColor: subject.colour }}
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
                    {isDone && (
                      <svg
                        viewBox="0 0 100 100"
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%) rotate(-15deg)",
                          width: "56px",
                          height: "56px",
                          pointerEvents: "none",
                        }}
                      >
                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(140,100,60,0.18)" strokeWidth="2.5" />
                        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(140,100,60,0.10)" strokeWidth="1.5" />
                        <text
                          x="50"
                          y="50"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontFamily="var(--font-display)"
                          fontSize="18"
                          fontWeight="700"
                          letterSpacing="4"
                          fill="rgba(140,100,60,0.25)"
                          textDecoration="none"
                        >
                          DONE
                        </text>
                      </svg>
                    )}
                    {stampingId === a.id && (
                      <motion.div
                        initial={{ scale: 0, opacity: 1 }}
                        animate={{ scale: [0, 1.15, 1], opacity: [1, 0.85, 0] }}
                        transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                          zIndex: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: "3px solid rgba(70, 110, 50, 0.75)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: "var(--font-hand)",
                            fontSize: "26px",
                            color: "rgba(70, 110, 50, 0.75)",
                          }}
                        >
                          ✓
                        </div>
                      </motion.div>
                    )}
                  </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* New entry trigger */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontSize: "13px",
                  color: "var(--ink-light)",
                  cursor: "pointer",
                  padding: "12px 0",
                  display: "block",
                }}
              >
                — add a new entry —
                {!isMobile && (
                  <span style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: "var(--ink-light)", opacity: 0.45, marginLeft: "8px" }}>
                    a — add · esc — close
                  </span>
                )}
              </button>
            )}

            <div style={{ marginTop: "40px" }}>
              <PageStack />
            </div>

            {isMobile && subjects.length > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  padding: "20px 0 8px",
                }}
              >
                {subjects.map((s) => {
                  const isActive = s.id === subjectId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !isActive && !flipping && handleChapterNav(`/journal/${s.id}`)}
                      style={{
                        width: isActive ? "20px" : "8px",
                        height: "8px",
                        borderRadius: "4px",
                        background: isActive ? s.colour : "rgba(140,100,60,0.2)",
                        border: "none",
                        padding: 0,
                        cursor: isActive ? "default" : "pointer",
                        transition: "width 0.2s ease, background 0.2s ease",
                        flexShrink: 0,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </ParchmentPage>
      </motion.div>

      <SideTabs
        subjects={subjects}
        activeSubjectId={subjectId}
        onNavigate={handleTabNavigate}
        onChapterNav={handleChapterNav}
        urgentIds={urgentIds}
        counts={tabCounts}
      />
    </div>
  );
}
