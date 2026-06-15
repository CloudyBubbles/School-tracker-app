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
  const filteredAssignments = filterSubject
    ? sortedAssignments.filter((a) => a.subject === filterSubject)
    : sortedAssignments;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          Assignments
          <span className="ml-1 font-normal text-slate-400">
            ({filteredAssignments.length})
          </span>
        </p>
        {filterSubject && (
          <button
            onClick={onClearFilter}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear filter
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
      ) : (
        <div className="space-y-2">
          {filteredAssignments.map((assignment) => {
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
