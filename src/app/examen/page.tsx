"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import PageShell from "@/components/PageShell";

type Matiere = { id: string; nom: string; semestre: number; total: number };
type Question = {
  id: string;
  type: string;
  contexte: string;
  question: string;
  options: string[];
  bonnesReponses: number[];
  explication: string;
};

const NOMS: Record<string, string> = {
  QCU: "QCU : une seule bonne réponse",
  QCM: "QCM : une ou plusieurs bonnes réponses",
  QCD: "QCD : vrai ou faux",
  CAS: "Cas clinique",
};

function identiques(a: number[], b: number[]) {
  return a.length === b.length && a.every((x) => b.includes(x));
}

export default function ExamenPage() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [chargement, setChargement] = useState(true);
  const [matiere, setMatiere] = useState<Matiere | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [choix, setChoix] = useState<number[]>([]);
  const [corrige, setCorrige] = useState(false);
  const [bonnes, setBonnes] = useState(0);
  const [fini, setFini] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/examen/matieres")
      .then((r) => (r.ok ? r.json() : { matieres: [] }))
      .then((d: { matieres?: Matiere[] }) => setMatieres(d.matieres ?? []))
      .catch(() => undefined)
      .finally(() => setChargement(false));
  }, []);

  async function demarrer(m: Matiere) {
    setErreur("");
    setOccupe(true);
    try {
      const res = await fetch("/api/examen?matiereId=" + encodeURIComponent(m.id));
      if (!res.ok) throw new Error("chargement");
      const d = (await res.json()) as { questions?: Question[] };
      const liste = d.questions ?? [];
      if (liste.length === 0) {
        setErreur("Aucune question disponible pour cette matière.");
      } else {
        setMatiere(m);
        setQuestions(liste);
        setIndex(0);
        setChoix([]);
        setCorrige(false);
        setBonnes(0);
        setFini(false);
      }
    } catch {
      setErreur("Impossible de charger l'examen. Vérifiez votre connexion.");
    }
    setOccupe(false);
  }

  function choisir(i: number) {
    if (corrige) return;
    if (questions[index].type === "QCM") {
      setChoix((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
    } else {
      setChoix([i]);
    }
  }

  function valider() {
    if (choix.length === 0) return;
    if (identiques(choix, questions[index].bonnesReponses)) setBonnes((b) => b + 1);
    setCorrige(true);
  }

  function suivant() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setChoix([]);
      setCorrige(false);
      return;
    }
    setFini(true);
    if (matiere) {
      void fetch("/api/examen/resultat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matiereId: matiere.id, score: Math.round((bonnes / questions.length) * 100) }),
      }).catch(() => undefined);
    }
  }

  function quitter() {
    setMatiere(null);
    setQuestions([]);
    setFini(false);
  }

  if (matiere && fini) {
    const pct = Math.round((bonnes / questions.length) * 100);
    return (
      <PageShell title="Résultat" subtitle={matiere.nom}>
        <section className="mp-card p-6 text-center">
          <p className="text-4xl font-bold text-mp-blue">{pct} %</p>
          <p className="mt-2 text-sm">
            {bonnes} bonnes réponses sur {questions.length}
          </p>
          <p className="mt-2 text-xs text-mp-grey">
            {pct >= 70
              ? "Très bien, continuez ainsi."
              : pct >= 50
                ? "C'est correct, révisez les points manqués."
                : "Relisez le cours, puis refaites l'examen."}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <button type="button" className="mp-btn-yellow min-h-[44px]" onClick={() => demarrer(matiere)}>
              Nouvel examen
            </button>
            <button type="button" className="mp-btn-ghost min-h-[44px]" onClick={quitter}>
              Changer de matière
            </button>
          </div>
        </section>
      </PageShell>
    );
  }

  if (matiere && questions.length > 0) {
    const q = questions[index];
    const progression = Math.round(((index + (corrige ? 1 : 0)) / questions.length) * 100);
    return (
      <PageShell title={matiere.nom} subtitle={"Question " + (index + 1) + " sur " + questions.length}>
        <div className="h-2 w-full rounded-full bg-mp-bg">
          <div className="h-2 rounded-full bg-mp-blue" style={{ width: progression + "%" }} />
        </div>
        <section className="mp-card mt-4 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-mp-blue">{NOMS[q.type] ?? q.type}</p>
          {q.contexte ? <p className="mt-2 rounded-lg bg-mp-bg p-3 text-xs leading-relaxed">{q.contexte}</p> : null}
          <p className="mt-3 text-sm font-semibold">{q.question}</p>
          <ul className="mt-3 space-y-2">
            {q.options.map((o, i) => {
              const choisi = choix.includes(i);
              const bonne = q.bonnesReponses.includes(i);
              let style = "border-[#dfe3e8] bg-white";
              if (corrige && bonne) style = "border-green-600 bg-green-50 text-green-900";
              else if (corrige && choisi) style = "border-red-500 bg-red-50 text-red-900";
              else if (choisi) style = "border-mp-blue bg-blue-50";
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => choisir(i)}
                    className={"flex min-h-[44px] w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm " + style}
                  >
                    <span className="font-bold">{"ABCDEFG"[i]}</span>
                    <span className="flex-1">{o}</span>
                    {corrige && bonne ? <CheckCircle2 size={18} /> : null}
                    {corrige && choisi && !bonne ? <XCircle size={18} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
          {q.type === "QCM" && !corrige ? (
            <p className="mt-2 text-xs text-mp-grey">Plusieurs réponses peuvent être correctes.</p>
          ) : null}
          {corrige && q.explication ? <p className="mt-3 rounded-lg bg-mp-bg p-3 text-xs">{q.explication}</p> : null}
          <div className="mt-4">
            {corrige ? (
              <button type="button" className="mp-btn-yellow min-h-[44px] w-full" onClick={suivant}>
                {index + 1 < questions.length ? "Question suivante" : "Voir le résultat"}
              </button>
            ) : (
              <button
                type="button"
                className="mp-btn-yellow min-h-[44px] w-full"
                onClick={valider}
                disabled={choix.length === 0}
              >
                Valider
              </button>
            )}
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell title="Examen" subtitle="50 questions tirées au hasard">
      {erreur ? <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p> : null}
      {chargement ? (
        <p className="flex items-center gap-2 text-xs text-mp-grey">
          <Loader2 size={14} className="animate-spin" /> Chargement
        </p>
      ) : matieres.length === 0 ? (
        <p className="mp-card p-4 text-xs text-mp-grey">Aucun examen disponible pour le moment.</p>
      ) : (
        <section className="space-y-3">
          {matieres.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={occupe}
              onClick={() => demarrer(m)}
              className="mp-card flex min-h-[44px] w-full items-center gap-3 p-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{m.nom}</p>
                <p className="text-xs text-mp-grey">
                  Semestre {m.semestre} | {Math.min(m.total, 50)} questions
                </p>
              </div>
              {occupe ? <Loader2 size={16} className="animate-spin" /> : null}
            </button>
          ))}
        </section>
      )}
    </PageShell>
  );
}