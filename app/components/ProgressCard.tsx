import { Assignment } from "@/app/types";
import { relativeDueLabel } from "@/app/lib/dates";

interface ProgressCardProps {
  assignments: Assignment[];
  isOverdue: (dueDate: string, status: string) => boolean;
  isDueSoon: (dueDate: string, status: string) => boolean;
  formatDate: (dateStr: string) => string;
  onToggleCheckpoint: (assignmentId: string, checkpointId: string) => void;
}

export default function ProgressCard({
  assignments,
  isOverdue,
  isDueSoon,
  formatDate,
  onToggleCheckpoint,
}: ProgressCardProps) {
  const doneCount = assignments.filter((a) => a.status === "Done").length;
  const total = assignments.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const sortedAssignments = [...assignments].sort(
    (a, b) => parseLocalDate(a.dueDate).getTime() - parseLocalDate(b.dueDate).getTime()
  );

  const upcoming = sortedAssignments.filter((a) => a.status !== "Done");

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Stat row */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Overall Progress
            </p>
            <p className="text-3xl font-bold text-slate-900 leading-none">
              {pct}
              <span className="text-lg font-medium text-slate-400">%</span>
            </p>
          </div>
          <p className="text-sm text-slate-500 sm:mb-0.5">
            {doneCount} of {total} assignments done
          </p>
        </div>
        {/* Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Upcoming
          </p>
          <div className="space-y-1">
            {upcoming.map((a) => {
              const overdue = isOverdue(a.dueDate, a.status);
              const soon = isDueSoon(a.dueDate, a.status);
              const cpDone = a.checkpoints.filter((c) => c.done).length;
              const cpTotal = a.checkpoints.length;
              return (
                <div key={a.id}>
                  <div
                    className={`flex items-center justify-between py-1.5 text-sm ${
                      overdue ? "text-red-700" : soon ? "text-amber-800" : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                          overdue ? "bg-red-500" : soon ? "bg-amber-400" : "bg-slate-300"
                        }`}
                      />
                      <span className="font-medium truncate">{a.title}</span>
                      <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                        · {a.subject}
                      </span>
                    </div>
                    <div className="ml-4 shrink-0 flex items-center gap-2">
                      {(() => {
                        const rel = relativeDueLabel(a.dueDate);
                        return rel ? (
                          <div className="text-right">
                            <span className="block text-xs font-medium text-slate-600">{rel}</span>
                            <span className="block text-xs tabular-nums text-slate-400">{formatDate(a.dueDate)}</span>
                          </div>
                        ) : (
                          <span className="text-xs tabular-nums text-slate-400">
                            {formatDate(a.dueDate)}
                          </span>
                        );
                      })()}
                      {overdue && (
                        <span className="hidden sm:inline text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                          Overdue
                        </span>
                      )}
                      {soon && !overdue && (
                        <span className="hidden sm:inline text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-md">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                  {cpTotal > 0 && (
                    <div className="ml-3 mt-1.5 space-y-0.5">
                      {a.checkpoints.map((cp) => (
                        <button
                          key={cp.id}
                          onClick={() => onToggleCheckpoint(a.id, cp.id)}
                          className="flex items-center gap-1.5 text-xs hover:opacity-70 transition w-full"
                        >
                          <input
                            type="checkbox"
                            checked={cp.done}
                            onChange={() => {}}
                            className="w-3 h-3 cursor-pointer"
                          />
                          <span className={cp.done ? "line-through text-slate-400" : "text-slate-600"}>
                            {cp.label}
                          </span>
                        </button>
                      ))}
                      <p className="text-xs text-slate-400 mt-1">
                        {cpDone}/{cpTotal} done
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {upcoming.length === 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <p className="text-sm text-green-600 font-medium">All assignments complete!</p>
        </div>
      )}
    </div>
  );
}
