"use client";

import { useEffect, useState } from "react";
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
    dueDate: string;
    status: Assignment["status"];
    notes: string;
  }>({
    subject: "",
    title: "",
    dueDate: "",
    status: "To do",
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

  const sortedAssignments = [...assignments].sort(
    (a, b) =>
      parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()
  );

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
                dueDate: form.dueDate,
                status: form.status,
                notes: form.notes,
                checkpoints: editingCheckpoints,
              }
            : a
        )
      );
      setEditingId(null);
    } else {
      const newAssignment: Assignment = {
        id: Date.now().toString(),
        subject: form.subject,
        title: form.title,
        dueDate: form.dueDate,
        status: form.status,
        notes: form.notes,
        checkpoints: [],
      };
      setAssignments([...assignments, newAssignment]);
    }

    setForm({ subject: "", title: "", dueDate: "", status: "To do", notes: "" });
    setEditingCheckpoints([]);
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
      dueDate: assignment.dueDate,
      status: assignment.status,
      notes: assignment.notes,
    });
    setEditingCheckpoints(assignment.checkpoints || []);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ subject: "", title: "", dueDate: "", status: "To do", notes: "" });
    setErrors({});
    setEditingCheckpoints([]);
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
      id: Date.now().toString(),
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

            <div className="h-4" />
          </div>
        </main>
      </div>
    </div>
  );
}
