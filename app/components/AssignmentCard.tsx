import { Assignment, Checkpoint } from "@/app/types";
import CheckpointList from "./CheckpointList";

const STATUS_STYLES: Record<Assignment["status"], string> = {
  "To do": "bg-slate-100 text-slate-600 border-slate-200",
  "In progress": "bg-blue-50 text-blue-700 border-blue-200",
  "Done": "bg-green-50 text-green-700 border-green-200",
};

const BORDER_STYLES: Record<string, string> = {
  overdue: "border-l-red-500",
  done: "border-l-green-400",
  "In progress": "border-l-blue-400",
  "To do": "border-l-slate-200",
};

interface AssignmentCardProps {
  assignment: Assignment;
  isOverdue: boolean;
  deleteConfirmId: string | null;
  onEdit: (assignment: Assignment) => void;
  onDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onStatusChange: (id: string, status: Assignment["status"]) => void;
  onToggleCheckpoint: (assignmentId: string, checkpointId: string) => void;
  formatDate: (dateStr: string) => string;
}

export default function AssignmentCard({
  assignment,
  isOverdue,
  deleteConfirmId,
  onEdit,
  onDelete,
  onConfirmDelete,
  onCancelDelete,
  onStatusChange,
  onToggleCheckpoint,
  formatDate,
}: AssignmentCardProps) {
  const borderKey = isOverdue
    ? "overdue"
    : assignment.status === "Done"
      ? "done"
      : assignment.status;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm border-l-4 ${BORDER_STYLES[borderKey]} px-4 py-3`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              {assignment.subject}
            </span>
            {isOverdue && (
              <span className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md leading-none">
                Overdue
              </span>
            )}
          </div>
          <h3
            className={`text-base font-semibold leading-snug ${
              assignment.status === "Done"
                ? "text-slate-400 line-through"
                : "text-slate-900"
            }`}
          >
            {assignment.title}
          </h3>
          <p className="text-xs text-slate-400 mt-1 tabular-nums">
            Due {formatDate(assignment.dueDate)}
          </p>
          {assignment.notes && (
            <p className="text-xs text-slate-500 mt-1.5 italic">{assignment.notes}</p>
          )}

          {assignment.checkpoints && assignment.checkpoints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <CheckpointList
                checkpoints={assignment.checkpoints}
                onAddCheckpoint={() => {}}
                onToggleCheckpoint={(cpId) =>
                  onToggleCheckpoint(assignment.id, cpId)
                }
                onRemoveCheckpoint={() => {}}
                compact
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <select
            value={assignment.status}
            onChange={(e) =>
              onStatusChange(assignment.id, e.target.value as Assignment["status"])
            }
            className={`text-xs px-2 py-1 rounded-lg font-medium border cursor-pointer transition-opacity hover:opacity-70 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_STYLES[assignment.status]}`}
          >
            <option>To do</option>
            <option>In progress</option>
            <option>Done</option>
          </select>

          {deleteConfirmId === assignment.id ? (
            <div className="flex items-center gap-1">
              <p className="text-xs text-slate-500">Delete this?</p>
              <button
                type="button"
                onClick={() => onConfirmDelete(assignment.id)}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-1 py-0.5"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="text-xs text-slate-400 hover:text-slate-600 px-1 py-0.5"
              >
                No
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(assignment)}
                className="text-xs text-slate-400 hover:text-blue-500 transition-colors px-1 py-0.5"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(assignment.id)}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors px-1 py-0.5"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
