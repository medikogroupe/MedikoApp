"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import type { DetailCorrection, QuestionPublique } from "@/components/qcm/types";

type Res = { noteSur20: number; nbJustes: number; details: DetailCorrection[] };

async function recupererQuestions(): Promise<{ ok: boolean; data: { questions?: QuestionPublique[]; error?: string } }> {
  const r = await fetch("/api/visiteur/qcm", { cache: "no-store" });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

export default function DecouvrirPage() {
  const [questions, setQuestions] = useState<QuestionPublique[]>([]);
  const [reponses, setReponses] = useState<Record<string, number[]>>({});
  const [res, setRes] = useState<Res | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let actif = true;
    recupererQuestions()
      .then(({ ok, data }) => {
        if (!actif) return;
        if (ok) setQuestions(data.questions ?? []);
        else setErreur(data.error ?? "Impossible de charger le mini-QCM.");
      })
      .catch(() => {
        if (actif) setErreur("Impossible de charger le mini-QCM.");
      });
    return () => {
      actif = false;
    };
  }, []);

  async function rejouer() {
    setRes(null);
    setReponses({});
    setErreur("");
    try {
      const { ok, data } = await recupererQuestions();
      if (ok) setQuestions(data.questions ?? []);
      else setErreur(data.error ?? "Impossible de charger le mini-QCM.");
    } catch {
      setErreur("Impossible de charger le mini-QCM.");
    }
  }

  function cocher(q: QuestionPublique, idx: number) {
    setReponses((c) => {
      const a = c[q.id] ?? [];
      const s = q.type === "QCU" ? [idx] : a.includes(idx) ? a.filter((i) => i !== idx) : [...a, idx];
      return { ...c, [q.id]: s };
    });
  }

  async function corriger() {
    try {
      const r = await fetch("/api/visiteur/qcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: questions.map((q) => q.id), reponses }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setRes(d as Res);
      else setErreur(d.error ?? "Correction impossible.");
    } catch {
      setErreur("Correction impossible. Vérifiez votre connexion.");
    }
  }

  return (
    <PageShell title="Mini-QCM" subtitle="Sans compte" back={false}>
      {erreur ? <p className="mp-card p-4 text-xs font-semibold text-red-700">{erreur}</p> : null}

      {!res &&
        questions.map((q, n) => (
          <section key={q.id} className="mp-card mb-3 p-4">
            <p className="text-xs font-bold text-mp-blue">Question {n + 1}/{questions.length}</p>
            <h2 className="mt-1 text-sm font-bold">{q.question}</h2>
            <div className="mt-3 space-y-2">
              {q.propositions.map((p) => {
                const on = (reponses[q.id] ?? []).includes(p.idx);
                return (
                  <button
                    key={p.idx}
                    type="button"
                    onClick={() => cocher(q, p.idx)}
                    className={`min-h-[44px] w-full rounded-[10px] border px-3 py-2 text-left text-sm ${
                      on ? "border-mp-blue bg-[#eaf1f8]" : "border-[#dfe3e8] bg-white"
                    }`}
                  >
                    {p.texte}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

      {!res && questions.length > 0 ? (
        <button type="button" className="mp-btn-yellow" onClick={() => void corriger()}>Corriger</button>
      ) : null}

      {res ? (
        <>
          <section className="mp-card p-4 text-center">
            <p className="text-2xl font-bold text-mp-blue">{String(res.noteSur20).replace(".", ",")}/20</p>
            <p className="text-xs text-mp-grey">{res.nbJustes} bonne(s) réponse(s)</p>
          </section>
          {res.details.map((d) => (
            <section key={d.id} className="mp-card mt-3 p-4">
              <p className="text-sm font-bold">{d.question}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {d.propositions.map((p) => (
                  <li
                    key={p.idx}
                    className={d.bonnes.includes(p.idx) ? "font-bold text-green-700" : d.choisies.includes(p.idx) ? "text-red-600" : ""}
                  >
                    {d.bonnes.includes(p.idx) ? "✓ " : d.choisies.includes(p.idx) ? "✗ " : "• "}
                    {p.texte}
                  </li>
                ))}
              </ul>
              {d.explication ? <p className="mt-2 text-xs text-mp-grey">{d.explication}</p> : null}
            </section>
          ))}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="mp-btn-ghost" onClick={() => void rejouer()}>Rejouer</button>
            <Link href="/inscription" className="mp-btn-yellow">Créer un compte</Link>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}