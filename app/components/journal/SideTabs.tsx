"use client";

import { Subject } from "@/app/lib/subjects";

interface Props {
  subjects: Subject[];
  activeSubjectId: string | null;
  onNavigate: (path: string) => void;
  urgentIds?: string[];
  counts?: Record<string, number>;
}

export default function SideTabs({ subjects, activeSubjectId, onNavigate, urgentIds = [], counts = {} }: Props) {
  const tabs = [
    { id: "__home", label: "Today", path: "/journal", colour: "#8a6040" },
    ...subjects.map((s) => ({ id: s.id, label: s.name, path: `/journal/${s.id}`, colour: s.colour })),
    { id: "__archive", label: "Archive", path: "/journal/archive", colour: "#8a6040" },
  ];

  return (
    <div
      className="sidetabs-container"
      style={{
        position: "fixed",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        zIndex: 5,
        gap: "2px",
      }}
    >
      {tabs.map((tab) => {
        const displayCount = tab.id === "__home"
          ? Object.values(counts).reduce((sum, n) => sum + n, 0)
          : tab.id === "__archive"
            ? 0
            : (counts[tab.id] ?? 0);
        const isActive = tab.id === activeSubjectId || (tab.id === "__home" && activeSubjectId === null);
        return (
          <button
            key={tab.id}
            onClick={() => { if (!isActive) onNavigate(tab.path); }}
            title={tab.label}
            className="sidetab-btn"
            data-active={isActive ? "true" : "false"}
            style={{
              "--active-colour": tab.colour,
              writingMode: "vertical-rl",
              textOrientation: "mixed",
              background: isActive
                ? `${tab.colour}40`
                : `${tab.colour}26`,
              color: tab.colour,
              border: "none",
              borderLeft: isActive ? `3px solid ${tab.colour}` : "3px solid transparent",
              borderRight: "none",
              padding: isActive ? "12px 6px 12px 10px" : "12px 6px",
              fontSize: "10px",
              fontFamily: "var(--font-hand)",
              cursor: "pointer",
              letterSpacing: "0.05em",
              boxShadow: "-2px 0 6px rgba(0,0,0,0.15)",
              width: isActive ? "32px" : "28px",
              maxHeight: "120px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              transition: "width 0.15s",
            } as React.CSSProperties}
          >
            {tab.label}
            {urgentIds.includes(tab.id) && (
              <div
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: tab.colour,
                  flexShrink: 0,
                  marginTop: "3px",
                  opacity: 0.85,
                }}
              />
            )}
            {displayCount > 0 && (
              <div style={{ fontFamily: "var(--font-hand)", fontSize: "9px", color: tab.colour, opacity: 0.75, marginTop: "2px" }}>
                {displayCount}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
