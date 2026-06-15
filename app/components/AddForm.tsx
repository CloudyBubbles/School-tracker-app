import { Assignment, Checkpoint } from "@/app/types";
import CheckpointList from "./CheckpointList";

interface AddFormProps {
  form: {
    subject: string;
    title: string;
    dueDate: string;
    status: Assignment["status"];
    notes: string;
  };
  checkpoints: Checkpoint[];
  errors: {
    subject?: string;
    title?: string;
    dueDate?: string;
  };
  editingId: string | null;
  onFormChange: (field: keyof AddFormProps["form"], value: string) => void;
  onErrorClear: (field: "subject" | "title" | "dueDate") => void;
  onAddCheckpoint: (label: string) => void;
  onToggleCheckpoint: (id: string) => void;
  onRemoveCheckpoint: (id: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function AddForm({
  form,
  checkpoints,
  errors,
  editingId,
  onFormChange,
  onErrorClear,
  onAddCheckpoint,
  onToggleCheckpoint,
  onRemoveCheckpoint,
  onSubmit,
  onCancel,
}: AddFormProps) {
  const inputClass =
    "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">
          {editingId ? "Edit Assignment" : "Add New Assignment"}
        </h2>
        {editingId && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Subject
            </label>
            <input
              type="text"
              placeholder="e.g., Math"
              value={form.subject}
              onChange={(e) => {
                onFormChange("subject", e.target.value);
                if (errors.subject) onErrorClear("subject");
              }}
              className={inputClass}
            />
            {errors.subject && (
              <p className="text-xs text-red-500 mt-1">{errors.subject}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => {
                onFormChange("dueDate", e.target.value);
                if (errors.dueDate) onErrorClear("dueDate");
              }}
              className={inputClass}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Title
          </label>
          <input
            type="text"
            placeholder="e.g., Chapter 5 Problem Set"
            value={form.title}
            onChange={(e) => {
              onFormChange("title", e.target.value);
              if (errors.title) onErrorClear("title");
            }}
            className={inputClass}
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-1">{errors.title}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                onFormChange("status", e.target.value)
              }
              className={inputClass}
            >
              <option>To do</option>
              <option>In progress</option>
              <option>Done</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes (optional)
            </label>
            <textarea
              placeholder="Any notes about this assignment..."
              value={form.notes}
              onChange={(e) => onFormChange("notes", e.target.value)}
              rows={3}
              className={inputClass}
            />
          </div>
        </div>

        {editingId && (
          <CheckpointList
            checkpoints={checkpoints}
            onAddCheckpoint={onAddCheckpoint}
            onToggleCheckpoint={onToggleCheckpoint}
            onRemoveCheckpoint={onRemoveCheckpoint}
          />
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold py-2.5 px-4 rounded-lg transition-colors"
        >
          {editingId ? "Save Changes" : "Add Assignment"}
        </button>
      </form>
    </div>
  );
}
