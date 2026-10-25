"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Phone, Timer, Trophy, Users } from "lucide-react";

type Jokers = { c50: boolean; pub: boolean; ami: boolean };
type Vue = {
  etape: number;
  total: number;
  gains: number[];
  question: string;
  theme: string;
  options: string[];
  retirees: number[];
  jokers: Jokers;
  limite: number;
  maintenant: number;
};
type Fin = {
  termine: true;
  correct: boolean;
  bonne: number | null;
  gain: number;
  raison: "mauvaise" | "temps" | "victoire" | "abandon";
};

const LETTRES = ["A", "B", "C", "D", "E"];
const PALIERS = [5, 10];

function fcfa(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n)} FCFA`;
}

async function appeler(corps: Record<string, unknown>) {
  const res = await fetch("/api/jeux/millionnaire", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Erreur du jeu.");
  return data;
}

export default function Millionnaire() {
  const [phase, setPhase] = useState<"intro" | "jeu" | "fin">("intro");
  const [token, setToken] = useState("");
  const [vue, setVue] = useState<Vue | null>(null);
  const [choisi, setChoisi] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<{ bonne: number; correct: boolean } | null>(null);
  const [pct, setPct] = useState<number[] | null>(null);
  const [ami, setAmi] = useState("");
  const [fin, setFin] = useState<Fin | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [restant, setRestant] = useState(0);
  const decalage = useRef(0);
  const verrou = useRef(false);

  const calculerRestant = useCallback(
    (v: Vue) => Math.max(0, Math.ceil((v.limite - (Date.now() + decalage.current)) / 1000)),
    [],
  );

  function appliquerVue(v: Vue) {
    decalage.current = v.maintenant - Date.now();
    setVue(v);
    setRestant(calculerRestant(v));
  }

  async function demarrer() {
    setErreur("");
    setOccupe(true);
    try {
      const data = await appeler({ action: "start" });
      verrou.current = false;
      setToken(data.token);
      appliquerVue(data.vue);
      setChoisi(null);
      setVerdict(null);
      setPct(null);
      setAmi("");
      setFin(null);
      setPhase("jeu");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de lancer la partie.");
    }
    setOccupe(false);
  }

  const repondre = useCallback(
    async (indice: number) => {
      if (verrou.current || !vue) return;
      verrou.current = true;
      setChoisi(indice >= 0 ? indice : null);
      setOccupe(true);
      setErreur("");
      try {
        const data = await appeler({ action: "answer", token, choix: indice });
        setVerdict({ bonne: data.bonne, correct: Boolean(data.correct) });
        if (data.termine) {
          setTimeout(() => {
            setFin(data as Fin);
            setPhase("fin");
            setOccupe(false);
          }, 1800);
        } else {
          setTimeout(() => {
            verrou.current = false;
            setToken(data.token);
            appliquerVue(data.vue);
            setChoisi(null);
            setVerdict(null);
            setPct(null);
            setAmi("");
            setOccupe(false);
          }, 1500);
        }
      } catch (e) {
        verrou.current = false;
        setChoisi(null);
        setErreur(e instanceof Error ? e.message : "Envoi impossible.");
        setOccupe(false);
      }
    },
    [token, vue],
  );

  // Chronomètre calé sur l'heure du serveur.
  useEffect(() => {
    if (phase !== "jeu" || !vue) return;
    const t = setInterval(() => {
      const r = calculerRestant(vue);
      setRestant(r);
      if (r <= 0 && !verrou.current) void repondre(-1);
    }, 250);
    return () => clearInterval(t);
  }, [phase, vue, calculerRestant, repondre]);

  async function joker(nom: "c50" | "pub" | "ami") {
    if (verrou.current || !vue) return;
    setErreur("");
    try {
      const data = await appeler({ action: "joker", token, joker: nom });
      setToken(data.token);
      appliquerVue(data.vue);
      if (data.pourcentages) setPct(data.pourcentages as number[]);
      if (data.ami) setAmi(data.ami as string);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Joker impossible.");
    }
  }

  async function abandonner() {
    if (verrou.current || !vue) return;
    if (!window.confirm("Abandonner et garder vos gains actuels ?")) return;
    try {
      const data = await appeler({ action: "quit", token });
      verrou.current = true;
      setFin(data as Fin);
      setPhase("fin");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Abandon impossible.");
    }
  }

  if (phase === "intro") {
    return (
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Les règles</h2>
        <ul className="mt-3 space-y-2 text-xs text-mp-grey">
          <li>15 questions de santé, de plus en plus difficiles, avec 4 propositions de réponse.</li>
          <li>Un chronomètre par question : 30 secondes (1 à 5), 45 secondes (6 à 10), 60 secondes (11 à 15).</li>
          <li>Une mauvaise réponse ou un temps écoulé arrête la partie. Les paliers des questions 5 et 10 sont garantis.</li>
          <li>Trois jokers, utilisables une fois chacun : 50:50, avis du public et appel à un ami (+10 secondes).</li>
          <li>Vous pouvez abandonner à tout moment et garder vos gains actuels.</li>
          <li>Les gains sont fictifs : c&apos;est un jeu d&apos;entraînement.</li>
        </ul>
        {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
        <button type="button" className="mp-btn-yellow mt-4" onClick={demarrer} disabled={occupe}>
          {occupe ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />} Commencer la partie
        </button>
      </section>
    );
  }

  if (phase === "fin" && fin) {
    const titre =
      fin.raison === "victoire"
        ? "Bravo, vous êtes millionnaire !"
        : fin.raison === "abandon"
          ? "Vous avez abandonné"
          : fin.raison === "temps"
            ? "Temps écoulé"
            : "Mauvaise réponse";
    const bonneTexte = fin.bonne !== null && vue ? vue.options[fin.bonne] : null;
    return (
      <section className="mp-card p-4 text-center">
        <Trophy size={32} className="mx-auto text-mp-blue" />
        <h2 className="mt-2 text-base font-bold">{titre}</h2>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-mp-grey">Vos gains</p>
        <p className="text-3xl font-bold text-mp-blue">{fcfa(fin.gain)}</p>
        {bonneTexte && fin.raison !== "victoire" ? (
          <p className="mt-3 rounded-lg bg-mp-bg p-3 text-xs">
            <span className="font-bold">Bonne réponse : </span>
            {bonneTexte}
          </p>
        ) : null}
        <button type="button" className="mp-btn-yellow mt-4" onClick={demarrer} disabled={occupe}>
          {occupe ? <Loader2 size={16} className="animate-spin" /> : null} Rejouer
        </button>
      </section>
    );
  }

  if (!vue) return null;
  const gainActuel = vue.etape > 1 ? vue.gains[vue.etape - 2] : 0;

  return (
    <div>
      <section className="mp-card p-4">
        <div className="flex items-center justify-between text-xs font-semibold text-mp-grey">
          <span>
            Question {vue.etape}/{vue.total} · {fcfa(vue.gains[vue.etape - 1])}
          </span>
          <span className={`flex items-center gap-1 text-sm ${restant <= 10 ? "text-red-600" : "text-mp-blue"}`}>
            <Timer size={14} /> {restant}s
          </span>
        </div>
        <p className="mt-1 text-xs text-mp-grey">
          Gains actuels : {fcfa(gainActuel)} · {vue.theme}
        </p>

        <h2 className="mt-4 text-sm font-bold leading-relaxed">{vue.question}</h2>

        <div className="mt-4 space-y-2">
          {vue.options.map((texte, i) => {
            const retiree = vue.retirees.includes(i);
            let style = "border-[#dfe3e8] bg-white";
            if (verdict) {
              if (i === verdict.bonne) style = "border-green-600 bg-green-50";
              else if (i === choisi) style = "border-red-600 bg-red-50";
            } else if (i === choisi) {
              style = "border-mp-blue bg-[#eaf1f8]";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={retiree || occupe || Boolean(verdict)}
                onClick={() => void repondre(i)}
                className={`flex min-h-[52px] w-full items-start gap-3 rounded-[10px] border px-3 py-3 text-left text-sm ${style} ${
                  retiree ? "opacity-30 line-through" : ""
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#c9d2dc] text-xs font-bold text-mp-grey">
                  {LETTRES[i]}
                </span>
                <span className="flex-1">
                  {retiree ? "" : texte}
                  {pct && !retiree ? (
                    <span className="mt-2 flex items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#e9edf3]">
                        <span className="block h-full rounded-full bg-mp-blue" style={{ width: `${pct[i]}%` }} />
                      </span>
                      <span className="text-xs font-semibold text-mp-blue">{pct[i]}%</span>
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {ami ? (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-mp-bg p-3 text-xs">
            <Phone size={14} className="mt-0.5 shrink-0 text-mp-blue" /> {ami}
          </p>
        ) : null}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button type="button" className="mp-btn-ghost min-h-[44px]" disabled={vue.jokers.c50 || occupe} onClick={() => void joker("c50")}>
            50:50
          </button>
          <button type="button" className="mp-btn-ghost min-h-[44px]" disabled={vue.jokers.pub || occupe} onClick={() => void joker("pub")}>
            <Users size={14} /> Public
          </button>
          <button type="button" className="mp-btn-ghost min-h-[44px]" disabled={vue.jokers.ami || occupe} onClick={() => void joker("ami")}>
            <Phone size={14} /> Ami
          </button>
        </div>
        {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
        <button type="button" className="mt-3 min-h-[44px] w-full text-xs font-semibold text-mp-grey" onClick={() => void abandonner()} disabled={occupe}>
          Abandonner et garder {fcfa(gainActuel)}
        </button>
      </section>

      <details className="mp-card mt-4 p-4">
        <summary className="flex min-h-[44px] cursor-pointer items-center text-xs font-bold text-mp-blue">Échelle des gains</summary>
        <ol className="mt-2 space-y-1 text-xs">
          {vue.gains
            .map((g, i) => ({ g, n: i + 1 }))
            .reverse()
            .map(({ g, n }) => (
              <li
                key={n}
                className={`flex justify-between rounded-lg px-3 py-1.5 ${
                  n === vue.etape ? "bg-mp-yellow font-bold text-mp-text" : PALIERS.includes(n) ? "font-bold text-mp-blue" : "text-mp-grey"
                }`}
              >
                <span>{n}</span>
                <span>{fcfa(g)}</span>
              </li>
            ))}
        </ol>
      </details>
    </div>
  );
}
