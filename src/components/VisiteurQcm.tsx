"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Loader2, Timer } from "lucide-react";
import type { QuestionPublique } from "@/components/qcm/types";

type Etape = "accueil" | "cours" | "resultat";
type Note = { noteSur20: number; points: number; pointsMax: number; nbJustes: number; nbQuestions: number };
type Meta = { titre: string; module: string; dureeMinutes: number | null; consignes: string; ignorees: number };

const fmt = (n: number) => String(n).replace(".", ",");

function chrono(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function consigne(q: QuestionPublique): string {
  if (q.type === "QCU") return "Une seule réponse";
  if (q.type === "QCD") return "Vrai ou Faux : une seule réponse, ou aucune";
  return "Choix multiple : une ou plusieurs réponses";
}

/**
 * Passer un QCM sans compte. Sans sessionId : QCM d'essai (5 questions au hasard).
 * Avec sessionId : examen lancé par l'admin. La note s'affiche mais n'est jamais enregistrée.
 */
export default function VisiteurQcm({ sessionId }: { sessionId?: string }) {
  const [etape, setEtape] = useState<Etape>("accueil");
  const [questions, setQuestions] = useState<QuestionPublique[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<Record<string, number[]>>({});
  const [restant, setRestant] = useState<number | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [chargement, setChargement] = useState(Boolean(sessionId));
  const [erreur, setErreur] = useState("");

  const limiteRef = useRef<number | null>(null);
  const envoye = useRef(false);
  const reponsesRef = useRef(reponses);
  const questionsRef = useRef(questions);
  reponsesRef.current = reponses;
  questionsRef.current = questions;

  const charger = useCallback(async (): Promise<{ duree: number | null } | null> => {
    setChargement(true);
    setErreur("");
    try {
      const res = await fetch(
        sessionId ? `/api/visiteur/session?id=${encodeURIComponent(sessionId)}` : "/api/visiteur/qcm",
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible.");
      const qs = (data.questions ?? []) as QuestionPublique[];
      if (qs.length === 0) throw new Error("Aucune question disponible.");
      const duree = sessionId ? Number(data.dureeMinutes) || null : null;
      setQuestions(qs);
      setMeta({
        titre: sessionId ? String(data.titre ?? "Examen") : "QCM d'essai",
        module: sessionId ? String(data.module ?? "") : "",
        dureeMinutes: duree,
        consignes: sessionId ? String(data.consignes ?? "") : "",
        ignorees: Number(data.ignorees) || 0,
      });
      return { duree };
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      return null;
    } finally {
      setChargement(false);
    }
  }, [sessionId]);

  // Pour un examen, on charge la session dès l'arrivée pour afficher titre, durée et éventuelles restrictions.
  useEffect(() => {
    if (sessionId) void charger();
  }, [sessionId, charger]);

  const rendre = useCallback(async () => {
    if (envoye.current) return;
    envoye.current = true;
    setChargement(true);
    setErreur("");
    try {
      const res = await fetch(sessionId ? "/api/visiteur/session" : "/api/visiteur/qcm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          sessionId
            ? { id: sessionId, reponses: reponsesRef.current }
            : { ids: questionsRef.current.map((q) => q.id), reponses: reponsesRef.current },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible.");
      setNote({
        noteSur20: Number(data.noteSur20),
        points: Number(data.points),
        pointsMax: Number(data.pointsMax),
        nbJustes: Number(data.nbJustes),
        nbQuestions: Number(data.nbQuestions) || questionsRef.current.length,
      });
      setEtape("resultat");
    } catch (e) {
      envoye.current = false;
      setErreur(e instanceof Error ? e.message : "Envoi impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setChargement(false);
    }
  }, [sessionId]);

  // Compte à rebours (examen chronométré) : la copie est rendue automatiquement à zéro.
  useEffect(() => {
    if (etape !== "cours") return;
    const limite = limiteRef.current;
    if (limite === null) return;
    const tick = () => {
      const s = Math.max(0, Math.floor((limite - Date.now()) / 1000));
      setRestant(s);
      if (s === 0) void rendre();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [etape, rendre]);

  async function commencer() {
    let duree = meta?.dureeMinutes ?? null;
    if (questions.length === 0) {
      const r = await charger();
      if (!r) return;
      duree = r.duree;
    }
    limiteRef.current = duree ? Date.now() + duree * 60_000 : null;
    envoye.current = false;
    setReponses({});
    setIndex(0);
    setRestant(null);
    setEtape("cours");
  }

  function recommencer() {
    setQuestions([]);
    setMeta(null);
    setNote(null);
    setErreur("");
    setEtape("accueil");
  }

  function choisir(q: QuestionPublique, idx: number) {
    setReponses((r) => {
      const cur = r[q.id] ?? [];
      const multiple = q.type !== "QCU" && q.type !== "QCD";
      const suite = multiple
        ? cur.includes(idx)
          ? cur.filter((i) => i !== idx)
          : [...cur, idx]
        : cur.includes(idx)
          ? []
          : [idx];
      return { ...r, [q.id]: suite };
    });
  }

  const encart = (
    <section className="mp-card space-y-3 p-4">
      <p className="text-sm font-bold">Tu as déjà un compte ?</p>
      <p className="text-xs text-mp-grey">
        Connecte-toi pour que ta note soit enregistrée. En mode invité, ta note s&apos;affiche à la fin mais n&apos;est pas
        sauvegardée.
      </p>
      <Link href="/connexion" className="mp-btn-yellow">
        Se connecter
      </Link>
    </section>
  );

  // ---------- Résultat ----------
  if (etape === "resultat" && note) {
    const pourcentage = note.pointsMax > 0 ? Math.round((Math.max(0, note.points) / note.pointsMax) * 100) : 0;
    return (
      <div className="space-y-3">
        <section className="mp-card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-mp-grey">Résultat : {meta?.titre}</p>
          <p className="mt-2 text-5xl font-bold text-mp-blue">
            {fmt(note.noteSur20)}
            <span className="text-xl text-mp-grey">/20</span>
          </p>
          <p className="mt-1 text-sm font-semibold">
            {fmt(note.points)} / {fmt(note.pointsMax)} points ({pourcentage}%)
          </p>
          <p className="mt-1 text-xs text-mp-grey">
            {note.nbJustes} question(s) entièrement juste(s) sur {note.nbQuestions}
          </p>
        </section>

        <section className="mp-card space-y-3 p-4">
          <p className="text-sm font-bold">Cette note n&apos;est pas enregistrée</p>
          <p className="text-xs text-mp-grey">
            Crée un compte gratuit pour sauvegarder tes résultats, voir la correction détaillée et accéder à l&apos;emploi
            du temps, aux notes, aux cours en PDF et à tous les QCM.
          </p>
          <Link href="/inscription" className="mp-btn-yellow">
            Créer un compte
          </Link>
          <Link href="/connexion" className="block text-center text-xs font-semibold text-mp-blue">
            J&apos;ai déjà un compte : me connecter
          </Link>
        </section>

        {!sessionId ? (
          <button type="button" onClick={recommencer} className="w-full text-center text-xs font-semibold text-mp-blue">
            Refaire un QCM d&apos;essai
          </button>
        ) : null}
      </div>
    );
  }

  // ---------- Épreuve en cours ----------
  if (etape === "cours" && questions.length > 0) {
    const q = questions[index];
    const choisies = reponses[q.id] ?? [];
    const repondues = (Object.values(reponses) as number[][]).filter((r) => r.length > 0).length;
    const derniere = index === questions.length - 1;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-mp-grey">
          <span>
            Question {index + 1} / {questions.length} · {repondues} répondue(s)
          </span>
          {restant !== null ? (
            <span className="flex items-center gap-1 font-bold text-mp-blue">
              <Timer size={14} /> {chrono(restant)}
            </span>
          ) : null}
        </div>

        <section className="mp-card p-4">
          <p className="text-sm font-semibold">{q.question}</p>
          <p className="mt-1 text-[11px] text-mp-grey">{consigne(q)}</p>
          <ul className="mt-3 space-y-2">
            {q.propositions.map((p) => {
              const coche = choisies.includes(p.idx);
              return (
                <li key={p.idx}>
                  <button
                    type="button"
                    onClick={() => choisir(q, p.idx)}
                    className={`w-full rounded-[10px] border-2 px-3 py-2 text-left text-sm ${
                      coche ? "border-mp-blue bg-white font-semibold text-mp-blue" : "border-[#dfe3e8] bg-white"
                    }`}
                  >
                    {p.texte}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {erreur ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p> : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="flex items-center gap-1 rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-3 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Précédent
          </button>
          {derniere ? (
            <button type="button" onClick={() => void rendre()} disabled={chargement} className="mp-btn-yellow flex-1">
              {chargement ? <Loader2 size={16} className="animate-spin" /> : null}
              Rendre ma copie
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="mp-btn-yellow flex-1"
            >
              Suivant <ChevronRight size={16} />
            </button>
          )}
        </div>
        {!derniere ? (
          <button
            type="button"
            onClick={() => void rendre()}
            disabled={chargement}
            className="w-full text-center text-xs font-semibold text-mp-grey"
          >
            Rendre ma copie maintenant
          </button>
        ) : null}
      </div>
    );
  }

  // ---------- Accueil ----------
  const description = sessionId
    ? meta
      ? `${meta.module ? `${meta.module} · ` : ""}${questions.length} question(s)${meta.dureeMinutes ? ` · ${meta.dureeMinutes} min` : ""}`
      : "Chargement de l'examen..."
    : "5 questions tirées au hasard, sans compte. Ta note s'affiche à la fin mais n'est pas enregistrée.";

  return (
    <div className="space-y-3">
      <section className="mp-card p-4">
        <span className="rounded-full bg-mp-yellow px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-mp-text">
          Mode invité
        </span>
        <h1 className="mt-2 text-base font-bold">{meta?.titre ?? (sessionId ? "Examen" : "QCM d'essai")}</h1>
        <p className="mt-1 text-xs text-mp-grey">{description}</p>
        {meta?.consignes ? <p className="mt-3 whitespace-pre-line text-xs">{meta.consignes}</p> : null}
        {meta && meta.ignorees > 0 ? (
          <p className="mt-3 text-xs text-mp-grey">
            {meta.ignorees} question(s) avec image sont réservées aux inscrits et ne sont pas incluses.
          </p>
        ) : null}
        {erreur ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{erreur}</p> : null}

        {sessionId && !meta ? (
          chargement ? (
            <div className="mt-4 flex justify-center">
              <Loader2 size={20} className="animate-spin text-mp-blue" />
            </div>
          ) : null
        ) : (
          <button type="button" onClick={() => void commencer()} disabled={chargement} className="mp-btn-yellow mt-4">
            {chargement ? <Loader2 size={16} className="animate-spin" /> : null}
            {sessionId ? "Continuer sans compte" : "Commencer le QCM"}
          </button>
        )}
      </section>

      {encart}

      <section className="mp-card p-4 text-xs text-mp-grey">
        Sans compte, tu n&apos;as accès qu&apos;à cette épreuve. L&apos;emploi du temps, les notes, les cours en PDF, la
        correction détaillée et l&apos;historique sont réservés aux inscrits.{" "}
        <Link href="/inscription" className="font-semibold text-mp-blue">
          Créer un compte
        </Link>
      </section>
    </div>
  );
}
