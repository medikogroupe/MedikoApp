"use client";

import { useEffect } from "react";

interface AntiCheatProps {
  onCheatDetected: () => void;
}

export default function AntiCheat({ onCheatDetected }: AntiCheatProps) {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert("⚠️ Anti-triche : vous avez quitté l'examen !");
        onCheatDetected();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [onCheatDetected]);

  return null;
}
