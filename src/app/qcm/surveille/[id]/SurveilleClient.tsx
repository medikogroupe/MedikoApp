"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Maximize2 } from "lucide-react";
import QcmRunner, { type Question } from "@/components/QcmRunner";

export default function SurveilleClient({
  questions,
  dureeMinutes,
  titre,
  sessionId,
}: {
  questions: Question[];
  dureeMinutes: number;
  titre: string;
  sessionId: string;
}) {
  const [started, setStarted] = useState(false);
  const [alertes, setAlertes] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!started) return;
    const onBlur = () => setAlertes((a) => a + 1);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") setAlertes((a) => a + 1);
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [started]);

  async function demarrer() {
    setStarted(true);
    try {
      await containerRef.current?.requestFullscreen?.();
    } catch {
      // mode plein écran refusé : la session continue
    }
  }

  return (
    <div ref={containerRef} className="bg-mp-bg">
      {!started ? (
        <section className="mp-card p-4">
          <h2 className="text-sm font-bold">Règles de la session surveillée</h2>
          <ul className="mt-3 space-y-2 text-xs text-mp-grey">
            <li>Une seule tentative est autorisée pour cette session.</li>
            <li>La sortie de l&apos;écran (changement d&apos;onglet) est détectée et comptabilisée.</li>
            <li>Le chronomètre démarre immédiatement et ne peut pas être mis en pause.</li>
            <li>Durée : {dureeMinutes} minutes · {questions.length} questions.</li>
          </ul>
          <button type="button" className="mp-btn-yellow mt-4" onClick={demarrer}>
            <Maximize2 size={16} /> Démarrer en plein écran
          </button>
        </section>
      ) : (
        <>
          {alertes > 0 ? (
            <div className="mp-card mb-3 flex items-start gap-2 border-l-4 border-red-500 p-3">
              <AlertTriangle size={16} className="mt-0.5 text-red-600" />
              <p className="text-xs text-red-700">
                Avertissement : {alertes} sortie(s) d&apos;écran détectée(s). Toute nouvelle sortie peut
                invalider votre session.
              </p>
            </div>
          ) : null}
          <QcmRunner
            questions={questions}
            dureeMinutes={dureeMinutes}
            titre={titre}
            qcmAdminId={sessionId}
          />
        </>
      )}
    </div>
  );
}
