"use client";

import { createContext, useContext } from "react";

type RiffleFn = (onMidpoint: () => void) => void;

const RiffleContext = createContext<{ trigger: RiffleFn }>({
  trigger: (cb) => cb(),
});

export function useRiffle() {
  return useContext(RiffleContext);
}

export { RiffleContext };
