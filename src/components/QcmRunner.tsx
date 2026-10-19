"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Timer, XCircle } from "lucide-react";

export type Question = {
  id: string;
  matiere: string;
  question: string;
  propositions: string[];
  bonneReponse: string;
  explication: string;
  niveau: string;
};

export default function QcmRunner({
  questions,
  dureeMinutes,
  titre,
  qcmAdminId,
  onFinish,
}: {
  questions: Question[];
  dureeMinutes: number;
  titre: string;
  qcmAdminId?: string;
  onFinish?: (score: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [termine, setTermine] = useState(false);
  const [restant, setRestant] = useState(dureeMinutes * 60);
  const [saved, setSaved] = useState(false);

  const score = useMemo(
    () => questions.filter((q) => answers[q.id] === q.bonneReponse).length,
    [answers, questions],
  );

  useEffect(() => {
    if (termine) return;
    const t = setInterval(() => {
      setRestant((r) => {
        if (r <= 1) {
          setTermine(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [termine]);

  useEffect(() => {
    if (!termine || saved) return;
    setSaved(true);
    const temps = dureeMinutes * 60 - restant;
    void fetch("/api/qcm/resultats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qcmAdminId,
        matiere: questions[0]?.matiere ?? "",
        score,
        total: questions.length,
        temps,
      }),
    }).catch(() => undefined);
    onFinish?.(score);
  }, [termine, saved, score, questions, dureeMinutes, restant, qcmAdminId, onFinish]);

  if (questions.length === 0) {
    return <p className="mp-card p-4 text-sm text-mp-grey">Aucune question disponible pour cette sélection.</p>;
  }

  const current = questions[index];
  const minutes = String(Math.floor(restant / 60)).padStart(2, "0");
  const seconds = String(restant % 60).padStart(2, "0");

  if (termine) {
    const pourcentage = Math.round((score / questions.length) * 100);
    return (
      <div className="space-y-3">
        <section className="mp-card p-4 text-center">
          <p className="text-xs uppercase tracking-wide text-mp-grey">Résultat — {titre}</p>
          <p className="mt-1 text-4xl font-bold text-mp-blue">
            {score}/{questions.length}
          </p>
          <p className="mt-1 text-sm font-semibold">{pourcentage}% de bonnes réponses</p>
        </section>
        {questions.map((q, i) => {
          const juste = answers[q.id] === q.bonneReponse;
          return (
            <section key={q.id} className="mp-card p-4">
              <div className="flex items-start gap-2">
                {juste ? (
                  <CheckCircle2 size={18} className="mt-0.5 text-green-600" />
                ) : (
                  <XCircle size={18} className="mt-0.5 text-red-600" />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {i + 1}. {q.question}
                  </p>
                  <p className="mt-1 text-xs text-mp-grey">
                    Votre réponse : {answers[q.id] ?? "aucune"} — Bonne réponse : {q.bonneReponse}
                  </p>
                  <p className="mt-1 text-xs">{q.explication}</p>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <section className="mp-card p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-mp-grey">
          <span>
            Question {index + 1}/{questions.length}
          </span>
          <span className="flex items-center gap-1 text-mp-blue">
            <Timer size={14} /> {minutes}:{seconds}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e9edf3]">
          <div
            className="h-full rounded-full bg-mp-yellow"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>
        <h2 className="mt-4 text-sm font-bold leading-relaxed">{current.question}</h2>
        <div className="mt-4 space-y-2">
          {current.propositions.map((p, i) => {
            const selected = answers[current.id] === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setAnswers({ ...answers, [current.id]: p })}
                className={`flex w-full items-center gap-3 rounded-[10px] border px-3 py-3 text-left text-sm ${
                  selected ? "border-mp-blue bg-[#eaf1f8]" : "border-[#dfe3e8] bg-white"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                    selected ? "border-mp-blue bg-mp-blue text-white" : "border-[#c9d2dc] text-mp-grey"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {p}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          className="mp-btn-ghost"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          <ChevronLeft size={16} /> Précédent
        </button>
        {index === questions.length - 1 ? (
          <button type="button" className="mp-btn-yellow" onClick={() => setTermine(true)}>
            Terminer
          </button>
        ) : (
          <button type="button" className="mp-btn-yellow" onClick={() => setIndex((i) => i + 1)}>
            Suivant <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
