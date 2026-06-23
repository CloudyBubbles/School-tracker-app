"use client";

import { useEffect, useRef, useState } from "react";
import { Assignment, Checkpoint } from "@/app/types";
import { loadAssignments, saveAssignments } from "@/app/lib/storage";
import Sidebar from "@/app/components/Sidebar";
import ProgressCard from "@/app/components/ProgressCard";
import AddForm from "@/app/components/AddForm";
import AssignmentList from "@/app/components/AssignmentList";

export default function Home() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set()
  );
  const [form, setForm] = useState<{
    subject: string;
    title: string;
    startDate: string;
    dueDate: string;
    status: Assignment["status"];
    priority: Assignment["priority"];
    notes: string;
  }>({
    subject: "",
    title: "",
    startDate: "",
    dueDate: "",
    status: "To do",
    priority: "Medium",
    notes: "",
  });
  const [errors, setErrors] = useState<{
    subject?: string;
    title?: string;
    dueDate?: string;
  }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [editingCheckpoints, setEditingCheckpoints] = useState<Checkpoint[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    setAssignments(loadAssignments());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveAssignments(assignments);
  }, [assignments, loaded]);

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === "Done") return false;
    return parseLocalDate(dueDate) < new Date();
  };

  const isDueSoon = (dueDate: string, status: string) => {
    if (status === "Done") return false;
    const due = parseLocalDate(dueDate);
    const now = new Date();
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  };

  const PRIORITY_ORDER: Record<Assignment["priority"], number> = { High: 0, Medium: 1, Low: 2 };

  const sortedAssignments = [...assignments].sort((a, b) => {
    const dateDiff = parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!form.subject) newErrors.subject = "Subject is required";
    if (!form.title) newErrors.title = "Title is required";
    if (!form.dueDate) newErrors.dueDate = "Due date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    if (editingId) {
      setAssignments(
        assignments.map((a) =>
          a.id === editingId
            ? {
                ...a,
                subject: form.subject,
                title: form.title,
                startDate: form.startDate || undefined,
                dueDate: form.dueDate,
                status: form.status,
                priority: form.priority,
                notes: form.notes,
                checkpoints: editingCheckpoints,
              }
            : a
        )
      );
      setEditingId(null);
    } else {
      const newAssignment: Assignment = {
        id: crypto.randomUUID(),
        subject: form.subject,
        title: form.title,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate,
        status: form.status,
        priority: form.priority,
        notes: form.notes,
        checkpoints: editingCheckpoints,
      };
      setAssignments([...assignments, newAssignment]);
    }

    setForm({ subject: "", title: "", startDate: "", dueDate: "", status: "To do", priority: "Medium", notes: "" });
    setEditingCheckpoints([]);
    setIsFormOpen(false);
  };

  const handleFormChange = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm({ ...form, [field]: value });
  };

  const handleErrorClear = (field: "subject" | "title" | "dueDate") => {
    setErrors({ ...errors, [field]: undefined });
  };

  const startEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setForm({
      subject: assignment.subject,
      title: assignment.title,
      startDate: assignment.startDate ?? "",
      dueDate: assignment.dueDate,
      status: assignment.status,
      priority: assignment.priority,
      notes: assignment.notes,
    });
    setEditingCheckpoints(assignment.checkpoints || []);
    setErrors({});
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ subject: "", title: "", startDate: "", dueDate: "", status: "To do", priority: "Medium", notes: "" });
    setErrors({});
    setEditingCheckpoints([]);
    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = (id: string) => {
    setAssignments(assignments.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
  };

  const handleStatusChange = (
    id: string,
    newStatus: Assignment["status"]
  ) => {
    setAssignments(
      assignments.map((a) =>
        a.id === id ? { ...a, status: newStatus } : a
      )
    );
  };

  const toggleSubject = (subject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subject)) newExpanded.delete(subject);
    else newExpanded.add(subject);
    setExpandedSubjects(newExpanded);
    setFilterSubject(subject);
  };

  const formatDate = (dateStr: string) =>
    parseLocalDate(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const handleAddCheckpoint = (label: string) => {
    const newCheckpoint: Checkpoint = {
      id: crypto.randomUUID(),
      label,
      done: false,
    };
    setEditingCheckpoints([...editingCheckpoints, newCheckpoint]);
  };

  const handleToggleCheckpointInEdit = (id: string) => {
    setEditingCheckpoints(
      editingCheckpoints.map((c) =>
        c.id === id ? { ...c, done: !c.done } : c
      )
    );
  };

  const handleRemoveCheckpoint = (id: string) => {
    setEditingCheckpoints(
      editingCheckpoints.filter((c) => c.id !== id)
    );
  };

  const handleToggleCheckpointInCard = (assignmentId: string, checkpointId: string) => {
    setAssignments(
      assignments.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              checkpoints: a.checkpoints.map((c) =>
                c.id === checkpointId ? { ...c, done: !c.done } : c
              ),
            }
          : a
      )
    );
  };

  const importRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(assignments, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `schoolwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Assignment[];
        if (!Array.isArray(parsed)) throw new Error("Not an array");
        if (!window.confirm(`Replace all ${assignments.length} assignment(s) with ${parsed.length} from file?`)) return;
        setAssignments(parsed);
        saveAssignments(parsed);
      } catch {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if (!loaded) return null;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-2 border-blue-600 px-5 py-4 flex-shrink-0">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Schoolwork Tracker
          </h1>
          {assignments.length > 0 && (
            <span className="text-sm text-slate-400 font-medium">
              {assignments.filter((a) => a.status === "Done").length}/{assignments.length} done
            </span>
          )}
        </div>
        <p className="text-slate-400 text-xs mt-0.5">
          Stay on top of your deadlines
        </p>
      </header>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <Sidebar
          assignments={assignments}
          expandedSubjects={expandedSubjects}
          onToggleSubject={toggleSubject}
          filterSubject={filterSubject}
          isOverdue={isOverdue}
        />

        {/* Main */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-5">
            <ProgressCard
              assignments={assignments}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              formatDate={formatDate}
              onToggleCheckpoint={handleToggleCheckpointInCard}
            />

            <AddForm
              form={form}
              checkpoints={editingCheckpoints}
              errors={errors}
              editingId={editingId}
              isFormOpen={isFormOpen}
              onOpenForm={() => setIsFormOpen(true)}
              onFormChange={handleFormChange}
              onErrorClear={handleErrorClear}
              onAddCheckpoint={handleAddCheckpoint}
              onToggleCheckpoint={handleToggleCheckpointInEdit}
              onRemoveCheckpoint={handleRemoveCheckpoint}
              onSubmit={handleSubmit}
              onCancel={cancelEdit}
            />

            <AssignmentList
              assignments={assignments}
              sortedAssignments={sortedAssignments}
              filterSubject={filterSubject}
              deleteConfirmId={deleteConfirmId}
              isOverdue={isOverdue}
              onEdit={startEdit}
              onDelete={handleDelete}
              onConfirmDelete={confirmDelete}
              onCancelDelete={() => setDeleteConfirmId(null)}
              onStatusChange={handleStatusChange}
              onToggleCheckpoint={handleToggleCheckpointInCard}
              onClearFilter={() => setFilterSubject(null)}
              formatDate={formatDate}
            />

            <div className="flex items-center justify-end gap-3 pt-2 pb-4 border-t border-slate-200">
              <span className="text-xs text-slate-400 mr-auto">Data saved in browser</span>
              <button
                type="button"
                onClick={handleExport}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150 px-2 py-1 rounded hover:bg-slate-100"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150 px-2 py-1 rounded hover:bg-slate-100"
              >
                Import JSON
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
