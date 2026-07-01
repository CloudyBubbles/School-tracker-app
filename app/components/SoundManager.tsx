"use client";

import { useEffect } from "react";
import { playTypewriterClick } from "@/app/lib/sounds";

export default function SoundManager() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) &&
        !e.metaKey && !e.ctrlKey && e.key.length === 1
      ) {
        if (document.documentElement.classList.contains("sounds-on")) {
          playTypewriterClick();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null;
}
