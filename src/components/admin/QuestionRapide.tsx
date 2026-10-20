"use client";

import { useState } from "react";
import { ImagePlus, Loader2, PenLine, X } from "lucide-react";
import { televerserImage } from "@/lib/televerser-image";

type Ligne = { texte: string; image: string | null; bonne: boolean };
export type QuestionCreee = { id: string; question: string; type: string; points: number };

const lignesVides = (): Ligne[] => [0, 1, 2, 3].map(() => ({ texte: "", image: null, bonne: false }));
const vraiFaux = (): Ligne[] => [
  { texte: "Vrai", image: null, bonne: false },
  { texte: "Faux", image: null, bonne: false },
];

export default function QuestionRapide({
  matiere,
  niveau,
  onCreated,
  actif,
}: {
  matiere: string;
  niveau: string;
  onCreated: (q: QuestionCreee) => void;
  actif?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [type, setType] = useState("QCM");
  const [enonce, setEnonce] = useState("");
  const [imageId, setImageId] = useState<string | null>(null);
  const [lignes, setLignes] = useState<Ligne[]>(lignesVides());
  const [points, setPoints] = useState("1");
  const [penalite, setPenalite] = useState("0");
  const [obligatoire, setObligatoire] = useState(false);
  const [explication, setExplication] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);

  function changerType(t: string) {
    setPenalite(t === "QCM" ? "0" : "1");
    if (t === "QCD") setLignes(vraiFaux());
    else if (type === "QCD") setLignes(lignesVides());
    else if (t === "QCU") {
      const premiere = lignes.findIndex((l) => l.bonne);
      setLignes(lignes.map((l, i) => ({ ...l, bonne: i === premiere })));
    }
    setType(t);
  }

  function cocher(i: number, bonne: boolean) {
    setLignes((ls) =>
      ls.map((l, n) => (n === i ? { ...l, bonne } : bonne && type !== "QCM" ? { ...l, bonne: false } : l)),
    );
  }

  async function ajouterImage(cible: "enonce" | number, fichier: File | undefined) {
    if (!fichier) return;
    setErreur("");
    setOccupe(true);
    try {
      const id = await televerserImage(fichier);
      if (cible === "enonce") setImageId(id);
      else setLignes((ls) => ls.map((l, n) => (n === cible ? { ...l, image: id } : l)));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Echec de l'envoi de l'image.");
    }
    setOccupe(false);
  }

  async function enregistrer() {
    setErreur("");
    setOccupe(true);
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matiere,
        niveau: niveau || "L1",
        type,
        question: enonce,
        imageId,
        propositions: lignes.map((l) => l.texte),
        propositionsImages: lignes.map((l) => l.image),
        bonnes: lignes.map((l, i) => (l.bonne ? i : -1)).filter((i) => i >= 0),
        points: Number(points.replace(",", ".")),
        penalite: Number(penalite.replace(",", ".")),
        mode: "TOUT_OU_RIEN",
        explication,
        obligatoire,
        actif: actif ?? true,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) {
      setErreur(data.error ?? "Enregistrement impossible.");
      return;
    }
    onCreated(data.question as QuestionCreee);
    setEnonce("");
    setImageId(null);
    setLignes(type === "QCD" ? vraiFaux() : lignesVides());
    setExplication("");
    setObligatoire(false);
  }

  if (!ouvert) {
    return (
      <button type="button" className="mp-btn-ghost mt-2 min-h-[44px] md:w-auto md:px-4" onClick={() => setOuvert(true)}>
        <PenLine size={16} /> R&eacute;diger une question pour cette section
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-dashed border-[#cfd7e0] p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-mp-blue">Nouvelle question ({matiere})</p>
        <button type="button" aria-label="Fermer" className="flex min-h-[44px] min-w-[44px] items-center justify-center text-mp-grey" onClick={() => setOuvert(false)}>
          <X size={16} />
        </button>
      </div>

      <label className="mp-label">Type</label>
      <select className="mp-input" value={type} onChange={(e) => changerType(e.target.value)}>
        <option value="QCU">QCU - une seule bonne r&eacute;ponse</option>
        <option value="QCD">QCD - Vrai / Faux</option>
        <option value="QCM">QCM - choix multiple</option>
      </select>

      <label className="mp-label mt-3">&Eacute;nonc&eacute;</label>
      <textarea className="mp-input min-h-[72px]" value={enonce} onChange={(e) => setEnonce(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <label className="mp-btn-ghost min-h-[44px] cursor-pointer md:w-auto md:px-4">
          <ImagePlus size={16} /> {imageId ? "Remplacer l'image" : "Ajouter une image (sch\u00e9ma, figure)"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void ajouterImage("enonce", e.target.files?.[0])} />
        </label>
        {imageId ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/qcm/images/${imageId}`} alt="Apercu" className="h-14 w-auto rounded border border-[#dfe3e8]" />
            <button type="button" className="min-h-[44px] px-2 text-xs font-semibold text-red-700" onClick={() => setImageId(null)}>
              Retirer
            </button>
          </>
        ) : null}
      </div>

      <p className="mp-label mt-3">Propositions (cochez la ou les bonnes r&eacute;ponses)</p>
      <div className="space-y-2">
        {lignes.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#dfe3e8] p-2">
            <input type="checkbox" className="h-5 w-5" checked={l.bonne} onChange={(e) => cocher(i, e.target.checked)} aria-label="Bonne r&eacute;ponse" />
            <input
              className="mp-input min-w-[140px] flex-1"
              value={l.texte}
              readOnly={type === "QCD"}
              placeholder={`Proposition ${String.fromCharCode(65 + i)}`}
              onChange={(e) => setLignes((ls) => ls.map((x, n) => (n === i ? { ...x, texte: e.target.value } : x)))}
            />
            {type !== "QCD" ? (
              <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#dfe3e8]" title="Image pour cette proposition">
                <ImagePlus size={16} />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void ajouterImage(i, e.target.files?.[0])} />
              </label>
            ) : null}
            {l.image ? <span className="text-xs text-mp-grey">image ajout&eacute;e</span> : null}
            {type !== "QCD" && lignes.length > 2 ? (
              <button type="button" aria-label="Supprimer" className="flex min-h-[44px] min-w-[44px] items-center justify-center text-mp-grey" onClick={() => setLignes((ls) => ls.filter((_, n) => n !== i))}>
                <X size={16} />
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {type !== "QCD" && lignes.length < 8 ? (
        <button type="button" className="mt-2 min-h-[44px] text-xs font-semibold text-mp-blue" onClick={() => setLignes((ls) => [...ls, { texte: "", image: null, bonne: false }])}>
          + Ajouter une proposition
        </button>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mp-label">Points si juste</label>
          <input className="mp-input" inputMode="decimal" value={points} onChange={(e) => setPoints(e.target.value)} />
        </div>
        <div>
          <label className="mp-label">Points perdus si faux</label>
          <input className="mp-input" inputMode="decimal" value={penalite} onChange={(e) => setPenalite(e.target.value)} />
        </div>
      </div>
      <p className="mt-1 text-xs text-mp-grey">Sans r&eacute;ponse : 0 point. QCU et QCD : -1 si faux par d&eacute;faut. QCM : 0 si faux par d&eacute;faut.</p>

      <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={obligatoire} onChange={(e) => setObligatoire(e.target.checked)} />
        Question obligatoire
      </label>

      <label className="mp-label mt-2">Explication (montr&eacute;e apr&egrave;s la copie)</label>
      <textarea className="mp-input" rows={2} value={explication} onChange={(e) => setExplication(e.target.value)} />

      {erreur ? <p className="mt-2 text-xs font-semibold text-red-700">{erreur}</p> : null}
      <button type="button" className="mp-btn-yellow mt-3 min-h-[44px] md:w-64" onClick={enregistrer} disabled={occupe}>
        {occupe ? <Loader2 size={16} className="animate-spin" /> : null} Ajouter &agrave; la section
      </button>
    </div>
  );
}