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
    <>
      {/* Mobile: horizontal scrollable pill strip */}
      <div className="md:hidden bg-white border-b border-slate-200 overflow-x-auto flex-shrink-0">
        {subjects.length === 0 ? (
          <p className="text-xs text-slate-400 italic px-4 py-3">No subjects yet</p>
        ) : (
          <div className="flex gap-2 px-3 py-2.5 w-max">
            {subjects.map((subject) => {
              const subjectAssignments = getAssignmentsBySubject(subject);
              const todoCount = subjectAssignments.filter((a) => a.status === "To do").length;
              const isFiltered = filterSubject === subject;
              return (
                <button
                  key={subject}
                  onClick={() => onToggleSubject(subject)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                    isFiltered
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 active:bg-slate-200"
                  }`}
                >
                  {subject}
                  {todoCount > 0 && (
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold leading-none ${
                        isFiltered ? "bg-white text-blue-600" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {todoCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden md:block bg-white border-r border-slate-200 w-52 flex-shrink-0 overflow-y-auto">
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
                      className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors duration-150 flex items-center justify-between text-sm ${
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
    </>
  );
}
