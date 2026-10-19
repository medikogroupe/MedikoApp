"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Flag, Loader2, Timer } from "lucide-react";
import ProtectedZone from "@/components/qcm/ProtectedZone";
import QcmResultat from "@/components/qcm/QcmResultat";
import type { Charge, QuestionPublique, ResultatFinal } from "@/components/qcm/types";

function consigne(q: QuestionPublique): string {
  if (q.type === "QCU") return "Une seule réponse";
  if (q.type === "QCD") return "Vrai ou Faux : une seule réponse, ou aucune";
  return "Choix multiple : une ou plusieurs réponses";
}

function bareme(q: QuestionPublique): string {
  const fmt = (n: number) => String(n).replace(".", ",");
  const erreur = q.penalite > 0 ? `erreur : -${fmt(q.penalite)} pt` : "erreur : 0 pt";
  const partiel = q.mode === "PARTIEL" && q.type !== "QCU" ? " · points partiels" : "";
  return `${fmt(q.points)} pt · ${erreur} · sans réponse : 0 pt${partiel}`;
}

export default function QcmRunner({
  charge,
  onClose,
  onFinish,
}: {
  charge: Charge;
  onClose?: () => void;
  onFinish?: () => void;
}) {
  const { tentative, questions } = charge;
  const decalage = useRef(Date.parse(tentative.serverNow) - Date.now());
  const limite = Date.parse(tentative.limiteAt);
  const calculerRestant = useCallback(
    () => Math.max(0, Math.floor((limite - (Date.now() + decalage.current)) / 1000)),
    [limite],
  );

  const [index, setIndex] = useState(0);
  const [reponses, setReponses] = useState<Record<string, number[]>>(charge.reponses ?? {});
  const [marques, setMarques] = useState<string[]>([]);
  const [restant, setRestant] = useState(calculerRestant);
  const [sorties, setSorties] = useState(charge.sorties ?? 0);
  const [masque, setMasque] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [final, setFinal] = useState<ResultatFinal | null>(null);

  const dejaEnvoye = useRef(false);
  const reponsesRef = useRef(reponses);
  const sortiesRef = useRef(sorties);
  reponsesRef.current = reponses;
  sortiesRef.current = sorties;

  const rendre = useCallback(async () => {
    if (dejaEnvoye.current) return;
    dejaEnvoye.current = true;
    setEnvoi(true);
    setErreur("");
    try {
      const res = await fetch("/api/qcm/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tentativeId: tentative.id,
          reponses: reponsesRef.current,
          sorties: sortiesRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Envoi impossible.");
      setFinal(data as ResultatFinal);
      onFinish?.();
    } catch (e) {
      dejaEnvoye.current = false;
      setErreur(e instanceof Error ? e.message : "Envoi impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoi(false);
    }
  }, [tentative.id, onFinish]);

  // Chronomètre calé sur l'heure du serveur : un rechargement ne le remet pas à zéro.
  useEffect(() => {
    if (final) return;
    const t = setInterval(() => {
      const r = calculerRestant();
      setRestant(r);
      if (r <= 0) void rendre();
    }, 1000);
    return () => clearInterval(t);
  }, [final, calculerRestant, rendre]);

  // Sauvegarde automatique (reprise possible après coupure).
  useEffect(() => {
    if (final) return;
    const t = setTimeout(() => {
      void fetch(`/api/qcm/tentatives/${tentative.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reponses, sorties }),
      }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(t);
  }, [reponses, sorties, final, tentative.id]);

  // Sorties d'écran (sessions surveillées uniquement) : comptées, contenu masqué.
  useEffect(() => {
    if (final || !tentative.surveille) return;
    let dernier = 0;
    const quitter = () => {
      const maintenant = Date.now();
      if (maintenant - dernier > 1500) {
        dernier = maintenant;
        setSorties((s) => s + 1);
      }
      setMasque(true);
    };
    const revenir = () => setMasque(false);
    const visibilite = () => (document.visibilityState === "hidden" ? quitter() : revenir());
    window.addEventListener("blur", quitter);
    window.addEventListener("focus", revenir);
    document.addEventListener("visibilitychange", visibilite);
    return () => {
      window.removeEventListener("blur", quitter);
      window.removeEventListener("focus", revenir);
      document.removeEventListener("visibilitychange", visibilite);
    };
  }, [final, tentative.surveille]);

  const depassement = tentative.sortiesMax > 0 && sorties > tentative.sortiesMax;
  useEffect(() => {
    if (depassement && !final) void rendre();
  }, [depassement, final, rendre]);

  if (final) {
    return (
      <div>
        <QcmResultat data={final} filigrane={tentative.filigrane} />
        {onClose ? (
          <button type="button" className="mp-btn-ghost mt-4" onClick={onClose}>
            Revenir aux QCM
          </button>
        ) : null}
      </div>
    );
  }

  if (questions.length === 0) {
    return <p className="mp-card p-4 text-sm text-mp-grey">Aucune question disponible pour cette sélection.</p>;
  }

  const q = questions[index];
  const choisies = reponses[q.id] ?? [];
  const minutes = String(Math.floor(restant / 60)).padStart(2, "0");
  const secondes = String(restant % 60).padStart(2, "0");
  const nbRepondues = questions.filter((x) => (reponses[x.id] ?? []).length > 0).length;

  function cocher(idx: number) {
    setReponses((courant) => {
      const actuel = courant[q.id] ?? [];
      let suivant: number[];
      if (q.type === "QCD") {
        suivant = actuel.includes(idx) ? [] : [idx];
      } else if (q.type === "QCU") {
        suivant = [idx];
      } else if (actuel.includes(idx)) {
        suivant = actuel.filter((i) => i !== idx);
      } else {
        suivant = [...actuel, idx];
      }
      return { ...courant, [q.id]: suivant };
    });
  }

  function confirmerRendu() {
    const sansReponse = questions.length - nbRepondues;
    const message =
      sansReponse > 0
        ? `${sansReponse} question(s) sans réponse (0 point chacune). Rendre quand même votre copie ?`
        : "Rendre votre copie ? Vous ne pourrez plus la modifier.";
    if (window.confirm(message)) void rendre();
  }

  return (
    <ProtectedZone filigrane={tentative.filigrane} masque={masque}>
      <div>
        {sorties > 0 && tentative.surveille ? (
          <div className="mp-card mb-3 flex items-start gap-2 border-l-4 border-red-500 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-xs text-red-700">
              {sorties} sortie(s) d&apos;écran détectée(s)
              {tentative.sortiesMax > 0
                ? `. Au-delà de ${tentative.sortiesMax}, votre copie est rendue automatiquement.`
                : ". Elles sont communiquées à l'enseignant."}
            </p>
          </div>
        ) : null}

        <section className="mp-card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-mp-grey">
            <span>
              Question {index + 1}/{questions.length} · {nbRepondues} répondue(s)
            </span>
            <span className={`flex items-center gap-1 ${restant < 60 ? "text-red-600" : "text-mp-blue"}`}>
              <Timer size={14} /> {minutes}:{secondes}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#e9edf3]">
            <div className="h-full rounded-full bg-mp-blue" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-wide text-mp-blue">{consigne(q)}</p>
          <p className="mt-0.5 text-xs text-mp-grey">{bareme(q)}</p>
          <h2 className="mt-3 text-sm font-bold leading-relaxed">{q.question}</h2>
          {q.imageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/qcm/images/${q.imageId}`}
              alt="Illustration de la question"
              draggable={false}
              className="mt-3 max-h-72 w-auto max-w-full rounded-lg border border-[#dfe3e8]"
            />
          ) : null}

          <div className="mt-4 space-y-2">
            {q.propositions.map((p, position) => {
              const selection = choisies.includes(p.idx);
              return (
                <button
                  key={p.idx}
                  type="button"
                  onClick={() => cocher(p.idx)}
                  aria-pressed={selection}
                  className={`flex min-h-[44px] w-full items-start gap-3 rounded-[10px] border px-3 py-3 text-left text-sm ${
                    selection ? "border-mp-blue bg-[#eaf1f8]" : "border-[#dfe3e8] bg-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center border text-xs font-bold ${
                      q.type === "QCU" ? "rounded-full" : "rounded-md"
                    } ${selection ? "border-mp-blue bg-mp-blue text-white" : "border-[#c9d2dc] text-mp-grey"}`}
                  >
                    {String.fromCharCode(65 + position)}
                  </span>
                  <span className="flex-1">
                    {p.texte}
                    {p.imageId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/qcm/images/${p.imageId}`}
                        alt={`Proposition ${String.fromCharCode(65 + position)}`}
                        draggable={false}
                        className="mt-2 max-h-40 w-auto max-w-full rounded border border-[#dfe3e8]"
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 flex min-h-[44px] items-center gap-2 text-xs font-semibold text-mp-grey"
            onClick={() =>
              setMarques((m) => (m.includes(q.id) ? m.filter((x) => x !== q.id) : [...m, q.id]))
            }
          >
            <Flag size={14} className={marques.includes(q.id) ? "text-mp-blue" : ""} />
            {marques.includes(q.id) ? "Question marquée pour révision" : "Marquer pour révision"}
          </button>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" className="mp-btn-ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
            <ChevronLeft size={16} /> Précédent
          </button>
          {index === questions.length - 1 ? (
            <button type="button" className="mp-btn-yellow" onClick={confirmerRendu} disabled={envoi}>
              {envoi ? <Loader2 size={16} className="animate-spin" /> : null} Rendre ma copie
            </button>
          ) : (
            <button type="button" className="mp-btn-yellow" onClick={() => setIndex((i) => i + 1)}>
              Suivant <ChevronRight size={16} />
            </button>
          )}
        </div>

        <section className="mp-card mt-4 p-4">
          <p className="text-xs font-bold text-mp-grey">Navigation</p>
          <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-10">
            {questions.map((x, i) => {
              const repondue = (reponses[x.id] ?? []).length > 0;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`min-h-[44px] rounded-lg border text-xs font-bold ${
                    i === index ? "ring-2 ring-mp-blue" : ""
                  } ${repondue ? "border-mp-blue bg-mp-blue text-white" : "border-[#dfe3e8] bg-white text-mp-grey"} ${
                    marques.includes(x.id) ? "border-dashed border-2 border-mp-blue" : ""
                  }`}
                  aria-label={`Question ${i + 1}${repondue ? ", répondue" : ""}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <button type="button" className="mp-btn-ghost mt-3" onClick={confirmerRendu} disabled={envoi}>
            Rendre ma copie maintenant
          </button>
        </section>

        {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
      </div>
    </ProtectedZone>
  );
}
