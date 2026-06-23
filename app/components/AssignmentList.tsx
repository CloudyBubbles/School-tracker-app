import { useState } from "react";
import { Assignment } from "@/app/types";
import AssignmentCard from "./AssignmentCard";

interface AssignmentListProps {
  assignments: Assignment[];
  sortedAssignments: Assignment[];
  filterSubject: string | null;
  deleteConfirmId: string | null;
  isOverdue: (dueDate: string, status: string) => boolean;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onStatusChange: (id: string, status: Assignment["status"]) => void;
  onToggleCheckpoint: (assignmentId: string, checkpointId: string) => void;
  onClearFilter: () => void;
  formatDate: (dateStr: string) => string;
}

export default function AssignmentList({
  assignments,
  sortedAssignments,
  filterSubject,
  deleteConfirmId,
  isOverdue,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onStatusChange,
  onToggleCheckpoint,
  onClearFilter,
  formatDate,
}: AssignmentListProps) {
  const [showDone, setShowDone] = useState(false);
  const [search, setSearch] = useState("");

  const subjectFiltered = filterSubject
    ? sortedAssignments.filter((a) => a.subject === filterSubject)
    : sortedAssignments;

  const searchFiltered = search.trim()
    ? subjectFiltered.filter((a) => {
        const q = search.toLowerCase();
        return a.title.toLowerCase().includes(q) || a.subject.toLowerCase().includes(q);
      })
    : subjectFiltered;

  const visibleAssignments = showDone
    ? searchFiltered
    : searchFiltered.filter((a) => a.status !== "Done");

  const hiddenDoneCount = searchFiltered.filter((a) => a.status === "Done").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Assignments
          <span className="ml-1 font-normal text-slate-400">
            ({visibleAssignments.length})
          </span>
        </p>
        <div className="flex items-center gap-3">
          {hiddenDoneCount > 0 && (
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150"
            >
              {showDone ? "Hide done" : `Show done (${hiddenDoneCount})`}
            </button>
          )}
          {filterSubject && (
            <button
              onClick={onClearFilter}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors duration-150"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assignments..."
          className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-150 leading-none"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {filterSubject && (
        <p className="text-xs text-slate-500 mb-3 px-1">
          Showing {filterSubject} assignments
        </p>
      )}

      {sortedAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-slate-400 text-sm">
            No assignments yet. Add one above to get started.
          </p>
        </div>
      ) : visibleAssignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center">
          <p className="text-slate-400 text-sm">
            {search.trim()
              ? "No assignments match your search."
              : hiddenDoneCount > 0
              ? "All done! Use \"Show done\" above to review them."
              : "No assignments match the current filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleAssignments.map((assignment) => {
            const overdue = isOverdue(assignment.dueDate, assignment.status);
            return (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                isOverdue={overdue}
                deleteConfirmId={deleteConfirmId}
                onEdit={onEdit}
                onDelete={onDelete}
                onConfirmDelete={onConfirmDelete}
                onCancelDelete={onCancelDelete}
                onStatusChange={onStatusChange}
                onToggleCheckpoint={onToggleCheckpoint}
                formatDate={formatDate}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
