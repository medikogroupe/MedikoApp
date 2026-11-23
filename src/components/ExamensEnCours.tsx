"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, Loader2 } from "lucide-react";

type Examen = { id: string; titre: string; module: string; dureeMinutes: number; nbQuestions: number };

export default function ExamensEnCours() {
  const [examens, setExamens] = useState<Examen[] | null>(null);

  useEffect(() => {
    let actif = true;
    fetch("/api/visiteur/sessions", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (actif) setExamens(Array.isArray(d.sessions) ? d.sessions : []);
      })
      .catch(() => {
        if (actif) setExamens([]);
      });
    return () => {
      actif = false;
    };
  }, []);

  return (
    <section className="mp-card p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <ClipboardList size={16} className="text-mp-blue" />
        {examens === null ? "Questionnaires en cours" : `${examens.length} questionnaire(s) en cours`}
      </h2>
      <p className="mt-1 text-xs text-mp-grey">Ouverts à tous, sans compte. Choisis-en un et commence directement.</p>
      {examens === null ? (
        <div className="mt-3 flex justify-center">
          <Loader2 size={18} className="animate-spin text-mp-blue" />
        </div>
      ) : examens.length === 0 ? (
        <p className="mt-3 text-xs text-mp-grey">Aucun questionnaire en cours pour le moment.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {examens.map((e) => (
            <li key={e.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-semibold">{e.titre}</p>
                <p className="text-xs text-mp-grey">
                  {e.module} · {e.nbQuestions} questions · {e.dureeMinutes} min
                </p>
              </div>
              <Link href={`/visiteur/session?id=${e.id}`} className="flex min-h-[44px] items-center rounded-lg bg-mp-yellow px-3 text-xs font-bold uppercase">
                Répondre
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}