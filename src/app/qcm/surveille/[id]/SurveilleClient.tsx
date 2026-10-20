"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Maximize2 } from "lucide-react";
import QcmRunner from "@/components/QcmRunner";
import QcmResultat from "@/components/qcm/QcmResultat";
import type { Charge, ResultatFinal } from "@/components/qcm/types";

type Etat = "NOUVEAU" | "EN_COURS" | "TERMINE";

export default function SurveilleClient({
  sessionId,
  dureeMinutes,
  nbQuestions,
  sortiesMax,
  consignes,
  etat,
  tentativeId,
  filigrane,
}: {
  sessionId: string;
  dureeMinutes: number;
  nbQuestions: number;
  sortiesMax: number;
  consignes: string;
  etat: Etat;
  tentativeId: string | null;
  filigrane: string;
}) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [correction, setCorrection] = useState<ResultatFinal | null>(null);
  const [chargement, setChargement] = useState(etat === "TERMINE");
  const [erreur, setErreur] = useState("");
  const conteneur = useRef<HTMLDivElement>(null);

  const chargerCorrection = useCallback(async (id: string) => {
    setChargement(true);
    const res = await fetch(`/api/qcm/tentatives/${id}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.resultat) setCorrection(data as ResultatFinal);
    else setErreur(data.error ?? "Correction indisponible.");
    setChargement(false);
  }, []);

  useEffect(() => {
    if (etat === "TERMINE" && tentativeId) void chargerCorrection(tentativeId);
  }, [etat, tentativeId, chargerCorrection]);

  async function demarrer() {
    setChargement(true);
    setErreur("");
    try {
      await conteneur.current?.requestFullscreen?.();
    } catch {
      // plein écran refusé : la session continue
    }
    const res = await fetch("/api/qcm/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErreur(data.error ?? "Impossible de démarrer la session.");
    } else if (data.deja && data.tentativeId) {
      await chargerCorrection(data.tentativeId);
      return;
    } else {
      setCharge(data as Charge);
    }
    setChargement(false);
  }

  return (
    <div ref={conteneur} className="bg-mp-bg">
      {correction ? (
        <QcmResultat data={correction} filigrane={filigrane} />
      ) : charge ? (
        <QcmRunner charge={charge} />
      ) : etat === "TERMINE" && chargement ? (
        <p className="mp-card flex items-center gap-2 p-4 text-sm text-mp-grey">
          <Loader2 size={16} className="animate-spin" /> Chargement de votre correction...
        </p>
      ) : (
        <section className="mp-card p-4">
          <h2 className="text-sm font-bold">Règles de la session surveillée</h2>
          {consignes ? (
            <div className="mt-3 rounded-lg bg-mp-bg p-3 text-xs">
              <p className="font-bold">Consignes de l&apos;enseignant</p>
              <p className="mt-1 whitespace-pre-line text-mp-grey">{consignes}</p>
            </div>
          ) : null}
          <ul className="mt-3 space-y-2 text-xs text-mp-grey">
            <li>Une seule tentative est autorisée. Si vous quittez la page, vous pouvez reprendre tant que le temps n&apos;est pas écoulé.</li>
            <li>Le chronomètre est géré par le serveur : il démarre immédiatement et ne peut pas être mis en pause.</li>
            <li>
              Chaque sortie de l&apos;écran est comptée et le contenu est masqué
              {sortiesMax > 0 ? `. Au-delà de ${sortiesMax} sortie(s), votre copie est rendue automatiquement` : ""}.
            </li>
            <li>Vos réponses sont sauvegardées automatiquement. Une question sans réponse vaut 0 point.</li>
            <li>Votre note et la correction détaillée s&apos;affichent dès que vous avez rendu votre copie.</li>
            <li>
              Durée : {dureeMinutes} minutes · {nbQuestions} questions. Votre nom est affiché en filigrane sur chaque
              écran.
            </li>
          </ul>
          {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
          <button type="button" className="mp-btn-yellow mt-4" onClick={demarrer} disabled={chargement}>
            {chargement ? <Loader2 size={16} className="animate-spin" /> : <Maximize2 size={16} />}
            {etat === "EN_COURS" ? "Reprendre ma copie" : "Démarrer en plein écran"}
          </button>
        </section>
      )}
    </div>
  );
}
