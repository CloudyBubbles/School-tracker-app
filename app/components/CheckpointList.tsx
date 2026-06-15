import { Checkpoint } from "@/app/types";
import { useState } from "react";

interface CheckpointListProps {
  checkpoints: Checkpoint[];
  onAddCheckpoint: (label: string) => void;
  onToggleCheckpoint: (id: string) => void;
  onRemoveCheckpoint: (id: string) => void;
  compact?: boolean;
}

export default function CheckpointList({
  checkpoints,
  onAddCheckpoint,
  onToggleCheckpoint,
  onRemoveCheckpoint,
  compact = false,
}: CheckpointListProps) {
  const [newCheckpointLabel, setNewCheckpointLabel] = useState("");
  const doneCount = checkpoints.filter((c) => c.done).length;
  const total = checkpoints.length;

  const handleAddCheckpoint = () => {
    if (newCheckpointLabel.trim()) {
      onAddCheckpoint(newCheckpointLabel);
      setNewCheckpointLabel("");
    }
  };

  if (compact) {
    return (
      <div>
        {total > 0 && (
          <p className="text-xs text-slate-500 mb-2">
            Checkpoints: <span className="font-semibold">{doneCount}/{total}</span>
          </p>
        )}
        {total > 0 && (
          <div className="space-y-1">
            {checkpoints.map((checkpoint) => (
              <div key={checkpoint.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleCheckpoint(checkpoint.id)}
                  className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                    checkpoint.done
                      ? "bg-green-500 border-green-500"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  {checkpoint.done && (
                    <span className="text-white text-xs font-bold">✓</span>
                  )}
                </button>
                <span
                  className={`text-xs flex-1 ${
                    checkpoint.done
                      ? "text-slate-400 line-through"
                      : "text-slate-600"
                  }`}
                >
                  {checkpoint.label}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveCheckpoint(checkpoint.id)}
                  className="text-slate-400 hover:text-red-500 text-xs transition px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 pt-3">
      <p className="text-xs font-semibold text-slate-600 mb-3">
        Checkpoints {total > 0 && `(${doneCount}/${total})`}
      </p>

      {total > 0 && (
        <div className="space-y-2 mb-3">
          {checkpoints.map((checkpoint) => (
            <div key={checkpoint.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleCheckpoint(checkpoint.id)}
                className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition ${
                  checkpoint.done
                    ? "bg-green-500 border-green-500"
                    : "border-slate-300 hover:border-slate-400"
                }`}
              >
                {checkpoint.done && (
                  <span className="text-white text-xs font-bold">✓</span>
                )}
              </button>
              <span
                className={`text-sm flex-1 ${
                  checkpoint.done
                    ? "text-slate-400 line-through"
                    : "text-slate-700"
                }`}
              >
                {checkpoint.label}
              </span>
              <button
                type="button"
                onClick={() => onRemoveCheckpoint(checkpoint.id)}
                className="text-slate-400 hover:text-red-500 text-sm transition px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a checkpoint..."
          value={newCheckpointLabel}
          onChange={(e) => setNewCheckpointLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCheckpoint();
            }
          }}
          className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handleAddCheckpoint}
          className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded-lg transition"
        >
          +
        </button>
      </div>
    </div>
  );
}
