"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface LinkedTask {
  id: string;
  title: string;
}

interface PomodoroCtx {
  linkedTask: LinkedTask | null;
  startFocusSession: (task: LinkedTask) => void;
  clearLinkedTask: () => void;
}

const Ctx = createContext<PomodoroCtx>({
  linkedTask: null,
  startFocusSession: () => {},
  clearLinkedTask: () => {},
});

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [linkedTask, setLinkedTask] = useState<LinkedTask | null>(null);

  const startFocusSession = useCallback((task: LinkedTask) => {
    setLinkedTask(task);
  }, []);

  const clearLinkedTask = useCallback(() => {
    setLinkedTask(null);
  }, []);

  return (
    <Ctx.Provider value={{ linkedTask, startFocusSession, clearLinkedTask }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePomodoro = () => useContext(Ctx);
