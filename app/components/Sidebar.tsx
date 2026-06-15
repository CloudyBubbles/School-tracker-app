import { Assignment } from "@/app/types";

interface SidebarProps {
  assignments: Assignment[];
  expandedSubjects: Set<string>;
  onToggleSubject: (subject: string) => void;
  filterSubject: string | null;
  isOverdue: (dueDate: string, status: string) => boolean;
}

export default function Sidebar({
  assignments,
  expandedSubjects,
  onToggleSubject,
  filterSubject,
  isOverdue,
}: SidebarProps) {
  const getSubjects = () =>
    Array.from(new Set(assignments.map((a) => a.subject))).sort();

  const sortedAssignments = [...assignments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const getAssignmentsBySubject = (subject: string) =>
    sortedAssignments.filter((a) => a.subject === subject);

  const subjects = getSubjects();

  return (
    <aside className="bg-white border-b md:border-b-0 md:border-r border-slate-200 md:w-52 flex-shrink-0 max-h-44 md:max-h-none overflow-y-auto">
      <div className="p-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 px-1">
          Subjects
        </p>
        {subjects.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-1">No subjects yet</p>
        ) : (
          <div className="space-y-0.5">
            {subjects.map((subject) => {
              const isExpanded = expandedSubjects.has(subject);
              const subjectAssignments = getAssignmentsBySubject(subject);
              const todoCount = subjectAssignments.filter(
                (a) => a.status === "To do"
              ).length;
              const isFiltered = filterSubject === subject;

              return (
                <div key={subject}>
                  <button
                    onClick={() => onToggleSubject(subject)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-center justify-between text-sm ${
                      isFiltered
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-800 font-medium"
                    }`}
                  >
                    <span className="truncate">{subject}</span>
                    <span className="flex items-center gap-1.5 ml-1 shrink-0">
                      {todoCount > 0 && (
                        <span className="inline-flex items-center justify-center w-4 h-4 bg-amber-100 text-amber-700 rounded-full text-xs font-bold leading-none">
                          {todoCount}
                        </span>
                      )}
                      <span
                        className={`text-slate-400 text-xs transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        ▾
                      </span>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="ml-3 mt-0.5 mb-1 space-y-0.5 border-l-2 border-slate-100 pl-2">
                      {subjectAssignments.map((a) => (
                        <div
                          key={a.id}
                          className={`px-2 py-1 text-xs rounded-md ${
                            a.status === "Done"
                              ? "text-green-600 line-through"
                              : isOverdue(a.dueDate, a.status)
                                ? "text-red-600 font-medium"
                                : "text-slate-500"
                          }`}
                        >
                          {a.title}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
