"use client";

import { useEffect, useState } from "react";

interface ExamTimerProps {
  duree: number;
  onTimeUp: () => void;
}

export default function ExamTimer({ duree, onTimeUp }: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(duree * 60);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div>
      Temps restant : {minutes}:{seconds.toString().padStart(2, "0")}
    </div>
  );
}
