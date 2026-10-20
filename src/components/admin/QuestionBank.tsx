"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, ImagePlus, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { MATIERES } from "@/lib/constants";
import { TYPES_QUESTION } from "@/lib/qcm";

type Question = {
  id: string;
  matiere: string;
  question: string;
  propositions: string[];
  propositionsImages: (string | null)[];
  bonnes: number[];
  bonneReponse: string;
  type: string;
  points: number;
  penalite: number;
  obligatoire?: boolean;
  mode: string;
  explication: string;
  niveau: string;
  imageId: string | null;
  actif: boolean;
};

type Formulaire = {
  id: string;
  matiere: string;
  niveau: string;
  type: string;
  question: string;
  imageId: string | null;
  lignes: { texte: string; image: string | null; bonne: boolean }[];
  points: string;
  penalite: string;
  obligatoire: boolean;
  mode: string;
  explication: string;
  actif: boolean;
};

const NIVEAUX = ["L1", "L2", "L3", "M1", "M2"];

function vide(): Formulaire {
  return {
    id: "",
    matiere: MATIERES[0],
    niveau: "L1",
    type: "QCM",
    question: "",
    imageId: null,
    lignes: [0, 1, 2, 3].map(() => ({ texte: "", image: null, bonne: false })),
    points: "1",
    penalite: "0",
    obligatoire: false,
    mode: "TOUT_OU_RIEN",
    explication: "",
    actif: true,
  };
}

function depuis(q: Question): Formulaire {
  const bonnes = q.bonnes.length > 0 ? q.bonnes : [q.propositions.indexOf(q.bonneReponse)];
  return {
    id: q.id,
    matiere: q.matiere,
    niveau: q.niveau,
    type: q.type,
    question: q.question,
    imageId: q.imageId,
    lignes: q.propositions.map((texte, i) => ({
      texte,
      image: q.propositionsImages?.[i] ?? null,
      bonne: bonnes.includes(i),
    })),
    points: String(q.points),
    penalite: String(q.penalite),
    obligatoire: Boolean(q.obligatoire),
    mode: q.mode,
    explication: q.explication,
    actif: q.actif,
  };
}

/** Réduit l'image (1000 px max, JPEG) pour rester sous la limite de 500 Ko. */
async function compresser(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Image illisible."));
      i.src = url;
    });
    const ratio = Math.min(1, 1000 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Compression impossible.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const qualite of [0.85, 0.72, 0.6, 0.5, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", qualite);
      if (data.length * 0.75 < 450 * 1024) return data;
    }
    throw new Error("Image trop lourde même après compression.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function televerser(fichier: File): Promise<string> {
  const dataUrl = await compresser(fichier);
  const res = await fetch("/api/admin/qcm-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Envoi de l'image impossible.");
  return data.id as string;
}

const MODELE_CSV =
  "matiere,niveau,type,question,A,B,C,D,E,F,bonnes,points,penalite,mode,explication\n" +
  'Cardiologie,L2,QCU,"La valve entre l\'oreillette gauche et le ventricule gauche est :",Mitrale,Tricuspide,Aortique,Pulmonaire,,,A,1,0,TOUT_OU_RIEN,La valve mitrale est bicuspide.\n' +
  'Anatomie,L1,QCD,"Quels sont deux os du carpe ?",Scaphoide,Femur,Pisiforme,Tibia,,,A;C,2,0.5,PARTIEL,Le scaphoide et le pisiforme sont des os du carpe.\n';

export default function QuestionBank() {
  const [liste, setListe] = useState<Question[]>([]);
  const [form, setForm] = useState<Formulaire>(vide());
  const [matiereFiltre, setMatiereFiltre] = useState("toutes");
  const [typeFiltre, setTypeFiltre] = useState("tous");
  const [recherche, setRecherche] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [rapport, setRapport] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    const params = new URLSearchParams({ matiere: matiereFiltre, type: typeFiltre, q: recherche });
    const res = await fetch(`/api/admin/questions?${params}`);
    if (res.ok) setListe((await res.json()).questions ?? []);
  }, [matiereFiltre, typeFiltre, recherche]);

  useEffect(() => {
    const t = setTimeout(() => void charger(), 250);
    return () => clearTimeout(t);
  }, [charger]);

  function flash(texte: string) {
    setMessage(texte);
    setTimeout(() => setMessage(""), 4000);
  }

  const nbBonnes = form.lignes.filter((l) => l.bonne).length;
  const attendu = form.type === "QCU" ? "exactement 1" : "au moins 1";

  function changerType(type: string) {
    setForm((f) => {
      if (type === "QCD") {
        return {
          ...f,
          type,
          mode: "TOUT_OU_RIEN",
          penalite: "1",
          lignes: [
            { texte: "Vrai", image: null, bonne: false },
            { texte: "Faux", image: null, bonne: false },
          ],
        };
      }
      const etaitVraiFaux = f.type === "QCD";
      return {
        ...f,
        type,
        mode: type === "QCU" ? "TOUT_OU_RIEN" : f.mode,
        penalite: type === "QCM" ? "0" : "1",
        lignes: etaitVraiFaux ? [0, 1, 2, 3].map(() => ({ texte: "", image: null, bonne: false })) : type === "QCU" ? f.lignes.map((l, i) => ({ ...l, bonne: l.bonne && i === f.lignes.findIndex((x) => x.bonne) })) : f.lignes,
      };
    });
  }
  function majLigne(i: number, patch: Partial<Formulaire["lignes"][number]>) {
    setForm((f) => ({
      ...f,
      lignes: f.lignes.map((l, n) => {
        if (n === i) return { ...l, ...patch };
        // QCU : cocher une réponse décoche les autres.
        if (patch.bonne && f.type === "QCU") return { ...l, bonne: false };
        return l;
      }),
    }));
  }

  async function ajouterImage(cible: "enonce" | number, fichier: File | undefined) {
    if (!fichier) return;
    setErreur("");
    setOccupe(true);
    try {
      const id = await televerser(fichier);
      if (cible === "enonce") setForm((f) => ({ ...f, imageId: id }));
      else majLigne(cible, { image: id });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Échec de l'envoi de l'image.");
    }
    setOccupe(false);
  }

  async function enregistrer() {
    setErreur("");
    setOccupe(true);
    const corps = {
      id: form.id || undefined,
      matiere: form.matiere,
      niveau: form.niveau,
      type: form.type,
      question: form.question,
      imageId: form.imageId,
      propositions: form.lignes.map((l) => l.texte),
      propositionsImages: form.lignes.map((l) => l.image),
      bonnes: form.lignes.map((l, i) => (l.bonne ? i : -1)).filter((i) => i >= 0),
      points: Number(form.points.replace(",", ".")),
      penalite: Number(form.penalite.replace(",", ".")),
      obligatoire: form.obligatoire,
      mode: form.mode,
      explication: form.explication,
      actif: form.actif,
    };
    const res = await fetch("/api/admin/questions", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const data = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) {
      setErreur(data.error ?? "Enregistrement impossible.");
      return;
    }
    flash(form.id ? "Question modifiée." : "Question ajoutée à la banque.");
    setForm(vide());
    void charger();
  }

  async function supprimer(q: Question) {
    if (!window.confirm("Supprimer définitivement cette question ?")) return;
    await fetch(`/api/admin/questions?id=${q.id}`, { method: "DELETE" });
    if (form.id === q.id) setForm(vide());
    void charger();
  }

  async function importer(fichier: File | undefined) {
    if (!fichier) return;
    setRapport("");
    const Papa = (await import("papaparse")).default;
    const texte = await fichier.text();
    const parsed = Papa.parse<Record<string, string>>(texte, { header: true, skipEmptyLines: true });
    const lettres = ["A", "B", "C", "D", "E", "F"];
    const questions = parsed.data.map((ligne) => {
      const propositions = lettres.map((l) => (ligne[l] ?? "").trim());
      const bonnes = (ligne.bonnes ?? "")
        .split(/[;,\s]+/)
        .map((x) => lettres.indexOf(x.trim().toUpperCase()))
        .filter((i) => i >= 0);
      return {
        matiere: ligne.matiere,
        niveau: ligne.niveau || "L1",
        type: (ligne.type || "QCU").toUpperCase(),
        question: ligne.question,
        propositions,
        bonnes,
        points: Number((ligne.points || "1").replace(",", ".")),
        penalite: Number((ligne.penalite || "0").replace(",", ".")),
        mode: (ligne.mode || "TOUT_OU_RIEN").toUpperCase(),
        explication: ligne.explication || "",
      };
    });
    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setRapport(data.error ?? "Import impossible.");
    } else {
      const rejets = (data.rejets as string[]).join("\n");
      setRapport(`${data.importees} question(s) importée(s), ${data.nbRejets} rejetée(s).${rejets ? `\n${rejets}` : ""}`);
      void charger();
    }
    if (csvRef.current) csvRef.current.value = "";
  }

  function telechargerModele() {
    const blob = new Blob([MODELE_CSV], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "modele-questions-mediko.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">{form.id ? "Modifier la question" : "Nouvelle question"}</h2>

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mp-label">Matière / module</label>
            <select className="mp-input" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })}>
              {MATIERES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Niveau</label>
            <select className="mp-input" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
              {NIVEAUX.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Type</label>
            <select
              className="mp-input"
              value={form.type}
              onChange={(e) => changerType(e.target.value)}
            >
              {TYPES_QUESTION.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mp-label">Énoncé</label>
          <textarea className="mp-input min-h-[88px]" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <label className="mp-btn-ghost min-h-[44px] cursor-pointer md:w-auto md:px-4">
              <ImagePlus size={16} /> {form.imageId ? "Remplacer l'image" : "Ajouter une image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void ajouterImage("enonce", e.target.files?.[0])} />
            </label>
            {form.imageId ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qcm/images/${form.imageId}`} alt="Aperçu" className="h-16 w-auto rounded border border-[#dfe3e8]" />
                <button type="button" className="min-h-[44px] px-2 text-xs font-semibold text-red-700" onClick={() => setForm({ ...form, imageId: null })}>
                  Retirer
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="mp-label">Propositions (cochez les bonnes réponses)</label>
            <span className={`text-xs font-semibold ${nbBonnes === 0 || (form.type === "QCU" && nbBonnes !== 1) ? "text-red-700" : "text-mp-grey"}`}>
              {nbBonnes} cochée(s) · il en faut {attendu}
            </span>
          </div>
          <div className="mt-2 space-y-2">
            {form.lignes.map((l, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-[10px] border border-[#dfe3e8] p-2">
                <label className="flex min-h-[44px] items-center gap-2 text-xs font-bold">
                  <input type="checkbox" className="h-5 w-5" checked={l.bonne} onChange={(e) => majLigne(i, { bonne: e.target.checked })} />
                  {String.fromCharCode(65 + i)}
                </label>
                <input
                  className="mp-input min-w-[160px] flex-1"
                  value={l.texte}
                  onChange={(e) => majLigne(i, { texte: e.target.value })}
                  placeholder={`Proposition ${String.fromCharCode(65 + i)}`}
                />
                <label className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg border border-[#dfe3e8]" title="Ajouter une image à cette proposition">
                  <ImagePlus size={16} />
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void ajouterImage(i, e.target.files?.[0])} />
                </label>
                {l.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/qcm/images/${l.image}`} alt="" className="h-10 w-auto rounded border border-[#dfe3e8]" />
                    <button type="button" className="min-h-[44px] px-2 text-xs font-semibold text-red-700" onClick={() => majLigne(i, { image: null })}>
                      Retirer
                    </button>
                  </>
                ) : null}
                {form.lignes.length > 2 ? (
                  <button
                    type="button"
                    aria-label="Supprimer la proposition"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-mp-grey"
                    onClick={() => setForm({ ...form, lignes: form.lignes.filter((_, n) => n !== i) })}
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {form.lignes.length < 8 && form.type !== "QCD" ? (
            <button
              type="button"
              className="mp-btn-ghost mt-2 min-h-[44px] md:w-auto md:px-4"
              onClick={() => setForm({ ...form, lignes: [...form.lignes, { texte: "", image: null, bonne: false }] })}
            >
              <Plus size={16} /> Ajouter une proposition
            </button>
          ) : null}
        </div>

                <label className="mt-4 flex min-h-[44px] items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={form.obligatoire} onChange={(e) => setForm({ ...form, obligatoire: e.target.checked })} />
          Question obligatoire (l&apos;&eacute;tudiant doit y r&eacute;pondre pour rendre sa copie)
        </label>
        <div className="mt-4 rounded-xl border border-dashed border-[#cfd7e0] p-3">
          <p className="mp-label">Notation de cette question</p>
          <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mp-label">Points si juste</label>
              <input className="mp-input" inputMode="decimal" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
            </div>
            <div>
              <label className="mp-label">Pénalité si faux (points perdus)</label>
              <input className="mp-input" inputMode="decimal" value={form.penalite} onChange={(e) => setForm({ ...form, penalite: e.target.value })} />
            </div>
            <div>
              <label className="mp-label">Mode</label>
              <select className="mp-input" value={form.mode} disabled={form.type === "QCU"} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option value="TOUT_OU_RIEN">Tout ou rien</option>
                <option value="PARTIEL">Points partiels (QCD / QCM)</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-mp-grey">
            Sans réponse : toujours 0 point. Tout ou rien : sélection exacte = points, sinon = pénalité. Partiel : points proportionnels aux bonnes
            cases cochées, moins la pénalité proportionnelle aux mauvaises ; jamais moins que la pénalité ni plus que les points.
          </p>
        </div>

        <div className="mt-3">
          <label className="mp-label">Explication (montrée à l&apos;étudiant après avoir rendu sa copie)</label>
          <textarea className="mp-input min-h-[72px]" value={form.explication} onChange={(e) => setForm({ ...form, explication: e.target.value })} />
        </div>

        <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={form.actif} onChange={(e) => setForm({ ...form, actif: e.target.checked })} />
          Question active (utilisable dans les QCM)
        </label>

        {erreur ? <p className="mt-2 text-xs font-semibold text-red-700">{erreur}</p> : null}
        {message ? <p className="mt-2 text-xs font-semibold text-green-700">{message}</p> : null}

        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className="mp-btn-yellow min-h-[44px] md:w-56" onClick={enregistrer} disabled={occupe}>
            {occupe ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {form.id ? "Enregistrer" : "Ajouter la question"}
          </button>
          {form.id ? (
            <button type="button" className="mp-btn-ghost min-h-[44px] md:w-auto md:px-4" onClick={() => setForm(vide())}>
              Annuler la modification
            </button>
          ) : null}
        </div>
      </section>

      <section className="mp-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileSpreadsheet size={16} className="text-mp-blue" /> Import CSV
        </h2>
        <p className="mt-1 text-xs text-mp-grey">
          Colonnes : matiere, niveau, type (QCU/QCD/QCM), question, A à F, bonnes (ex. A ou A;C), points, penalite, mode, explication.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="mp-btn-blue min-h-[44px] cursor-pointer md:w-auto md:px-4">
            Importer un fichier CSV
            <input ref={csvRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void importer(e.target.files?.[0])} />
          </label>
          <button type="button" className="mp-btn-ghost min-h-[44px] md:w-auto md:px-4" onClick={telechargerModele}>
            Télécharger le modèle
          </button>
        </div>
        {rapport ? <pre className="mt-3 whitespace-pre-wrap text-xs text-mp-grey">{rapport}</pre> : null}
      </section>

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Banque de questions ({liste.length})</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <select className="mp-input" value={matiereFiltre} onChange={(e) => setMatiereFiltre(e.target.value)}>
            <option value="toutes">Toutes les matières</option>
            {MATIERES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <select className="mp-input" value={typeFiltre} onChange={(e) => setTypeFiltre(e.target.value)}>
            <option value="tous">Tous les types</option>
            <option value="QCU">QCU</option>
            <option value="QCD">QCD</option>
            <option value="QCM">QCM</option>
          </select>
          <input className="mp-input" placeholder="Rechercher dans l'énoncé" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        <ul className="mt-3 space-y-2">
          {liste.map((q) => (
            <li key={q.id} className="rounded-[10px] border border-[#eef1f5] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-mp-grey">
                    <span className="mr-1 rounded bg-mp-bg px-1.5 py-0.5 font-bold text-mp-blue">{q.type}</span>
                    {q.matiere} · {q.niveau} · {q.points} pt · pénalité {q.penalite}
                    {q.mode === "PARTIEL" ? " · partiel" : ""}
                    {q.imageId ? " · image" : ""}
                    {!q.actif ? " · inactive" : ""}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{q.question}</p>
                </div>
                <div className="flex shrink-0">
                  <button type="button" aria-label="Modifier" className="flex min-h-[44px] min-w-[44px] items-center justify-center text-mp-blue" onClick={() => { setForm(depuis(q)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="Supprimer" className="flex min-h-[44px] min-w-[44px] items-center justify-center text-red-700" onClick={() => supprimer(q)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {liste.length === 0 ? <li className="text-xs text-mp-grey">Aucune question.</li> : null}
        </ul>
      </section>
    </div>
  );
}
