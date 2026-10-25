"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Brain, Download, Puzzle, RotateCcw, Siren, Timer, Trophy } from "lucide-react";
import PageShell from "@/components/PageShell";
import Link from "next/link";

type Zone = { id: string; label: string; indice: string };

const ZONES: Zone[] = [
  { id: "coeur", label: "Cœur", indice: "Pompe centrale, médiastin" },
  { id: "poumon", label: "Poumon droit", indice: "3 lobes, hémithorax droit" },
  { id: "foie", label: "Foie", indice: "Hypocondre droit" },
  { id: "rein", label: "Rein gauche", indice: "Rétropéritoine, flanc gauche" },
  { id: "femur", label: "Fémur", indice: "Os le plus long du corps" },
  { id: "cerveau", label: "Cerveau", indice: "Boîte crânienne" },
];

const CAS_FLASH = [
  {
    enonce: "Homme 58 ans, douleur thoracique constrictive irradiant au bras gauche, sueurs.",
    options: ["Syndrome coronarien aigu", "Crise d'asthme", "Colique néphrétique", "Gastrite"],
    reponse: "Syndrome coronarien aigu",
  },
  {
    enonce: "Enfant 4 ans, fièvre 39,5 °C, convulsion brève, frottis positif.",
    options: ["Paludisme grave", "Otite externe", "Varicelle", "Rhinite allergique"],
    reponse: "Paludisme grave",
  },
  {
    enonce: "Femme 26 ans, 32 SA, céphalées, TA 170/110, protéinurie +++.",
    options: ["Pré-éclampsie sévère", "Migraine simple", "Anémie ferriprive", "Infection urinaire"],
    reponse: "Pré-éclampsie sévère",
  },
  {
    enonce: "Patient diabétique, haleine cétonique, polypnée, glycémie 4,5 g/L.",
    options: ["Acidocétose diabétique", "Hypoglycémie", "Pneumonie", "AVC"],
    reponse: "Acidocétose diabétique",
  },
];

const BLOC_URGENCE = [
  {
    etape: "Patient retrouvé inconscient dans le couloir du service. Premier geste ?",
    options: [
      { texte: "Évaluer la conscience et appeler à l'aide", bon: true },
      { texte: "Poser une perfusion immédiatement", bon: false },
      { texte: "Aller chercher le dossier médical", bon: false },
    ],
  },
  {
    etape: "Pas de réponse. Étape suivante ?",
    options: [
      { texte: "Libérer les voies aériennes et vérifier la respiration", bon: true },
      { texte: "Administrer du glucosé", bon: false },
      { texte: "Mettre en position assise", bon: false },
    ],
  },
  {
    etape: "Absence de respiration normale. Que faire ?",
    options: [
      { texte: "Débuter les compressions thoraciques 100-120/min", bon: true },
      { texte: "Attendre le médecin", bon: false },
      { texte: "Prendre la tension artérielle", bon: false },
    ],
  },
  {
    etape: "Le défibrillateur arrive. Conduite à tenir ?",
    options: [
      { texte: "Poser les électrodes et suivre les consignes vocales", bon: true },
      { texte: "Choquer sans analyser le rythme", bon: false },
      { texte: "Arrêter la réanimation", bon: false },
    ],
  },
];

function ColleColle() {
  const [cibles, setCibles] = useState<Record<string, string>>({});
  const [reste, setReste] = useState(60);
  const [actif, setActif] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const melange = useMemo(() => [...ZONES].sort(() => Math.random() - 0.5), []);
  const score = Object.entries(cibles).filter(([zone, label]) => zone === label).length;

  useEffect(() => {
    if (!actif) return;
    const t = setInterval(() => {
      setReste((r) => {
        if (r <= 1) {
          setActif(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [actif]);

  function genererImage() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0A4B8A";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFC107";
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 28px Inter, sans-serif";
    ctx.fillText("MEDIKO+ — Colle-Colle Anatomie", 30, 60);
    ctx.font = "bold 64px Inter, sans-serif";
    ctx.fillText(`${score}/${ZONES.length}`, 30, 150);
    ctx.font = "20px Inter, sans-serif";
    ctx.fillText(`Temps restant : ${reste}s`, 30, 195);
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "bold 18px Inter, sans-serif";
    ctx.fillText("medikoplus.site", 30, canvas.height - 18);
    const link = document.createElement("a");
    link.download = "score-colle-colle.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div>
      <div className="mp-card flex items-center justify-between p-4">
        <span className="flex items-center gap-2 text-sm font-bold">
          <Timer size={16} className="text-mp-blue" /> {reste}s
        </span>
        <span className="text-sm font-bold text-mp-blue">
          {score}/{ZONES.length}
        </span>
        <button
          type="button"
          className="rounded-lg bg-mp-yellow px-3 py-1.5 text-xs font-bold uppercase"
          onClick={() => {
            setCibles({});
            setReste(60);
            setActif(true);
          }}
        >
          {actif ? "Recommencer" : "Mode défi"}
        </button>
      </div>

      <div className="mp-card mt-3 p-4">
        <p className="text-xs text-mp-grey">
          Faites glisser chaque étiquette d&apos;organe vers la zone anatomique correspondante.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {melange.map((z) => {
            const place = Object.values(cibles).includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                draggable={!place}
                onDragStart={(e) => e.dataTransfer.setData("text/plain", z.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                  place ? "bg-[#e9edf3] text-[#aab3bf]" : "bg-mp-blue text-white"
                }`}
              >
                {z.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {ZONES.map((z) => {
            const valeur = cibles[z.id];
            const juste = valeur === z.id;
            return (
              <div
                key={z.id}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = e.dataTransfer.getData("text/plain");
                  setCibles((c) => ({ ...c, [z.id]: data }));
                }}
                className={`rounded-xl border-2 border-dashed p-3 text-center text-xs ${
                  valeur ? (juste ? "border-green-500 bg-green-50" : "border-red-400 bg-red-50") : "border-[#cfd7e0]"
                }`}
              >
                <Activity size={18} className="mx-auto text-mp-blue" />
                <p className="mt-1 font-semibold">{z.indice}</p>
                <p className="mt-1 text-[11px] text-mp-grey">
                  {valeur ? ZONES.find((x) => x.id === valeur)?.label : "Déposer ici"}
                </p>
              </div>
            );
          })}
        </div>

        <canvas ref={canvasRef} width={640} height={320} className="hidden" />
        <button type="button" className="mp-btn-ghost mt-4" onClick={genererImage}>
          <Download size={16} /> Image de score partageable
        </button>
      </div>
    </div>
  );
}

function DiagnosticFlash() {
  const [index, setIndex] = useState(0);
  const [reste, setReste] = useState(15);
  const [score, setScore] = useState(0);
  const [reponse, setReponse] = useState<string | null>(null);
  const cas = CAS_FLASH[index % CAS_FLASH.length];

  useEffect(() => {
    setReste(15);
    setReponse(null);
    const t = setInterval(() => {
      setReste((r) => {
        if (r <= 1) {
          clearInterval(t);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [index]);

  function choisir(option: string) {
    if (reponse) return;
    setReponse(option);
    if (option === cas.reponse) setScore((s) => s + 1);
  }

  return (
    <div className="mp-card p-4">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1 text-mp-blue">
          <Timer size={14} /> {reste}s
        </span>
        <span>Score {score}</span>
      </div>
      <div className="mt-3 rounded-xl bg-mp-blue p-4 text-sm text-white">{cas.enonce}</div>
      <div className="mt-3 space-y-2">
        {cas.options.map((o) => {
          const choisi = reponse === o;
          const bon = reponse && o === cas.reponse;
          return (
            <button
              key={o}
              type="button"
              disabled={reste === 0 && !reponse}
              onClick={() => choisir(o)}
              className={`w-full rounded-[10px] border px-3 py-2.5 text-left text-sm ${
                bon
                  ? "border-green-500 bg-green-50"
                  : choisi
                    ? "border-red-400 bg-red-50"
                    : "border-[#dfe3e8] bg-white"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      <button type="button" className="mp-btn-yellow mt-4" onClick={() => setIndex((i) => i + 1)}>
        Cas suivant
      </button>
    </div>
  );
}

function BlocUrgence() {
  const [etape, setEtape] = useState(0);
  const [erreurs, setErreurs] = useState(0);
  const termine = etape >= BLOC_URGENCE.length;

  if (termine) {
    return (
      <div className="mp-card p-4 text-center">
        <Siren size={28} className="mx-auto text-mp-blue" />
        <p className="mt-2 text-sm font-bold">Cas clinique terminé</p>
        <p className="mt-1 text-xs text-mp-grey">
          {erreurs === 0
            ? "Arbre décisionnel parfaitement respecté."
            : `${erreurs} erreur(s) de décision. Revoyez la chaîne de survie.`}
        </p>
        <button
          type="button"
          className="mp-btn-yellow mt-4"
          onClick={() => {
            setEtape(0);
            setErreurs(0);
          }}
        >
          <RotateCcw size={16} /> Rejouer
        </button>
      </div>
    );
  }

  const cas = BLOC_URGENCE[etape];
  return (
    <div className="mp-card p-4">
      <p className="text-xs uppercase tracking-wide text-mp-grey">
        Étape {etape + 1}/{BLOC_URGENCE.length}
      </p>
      <p className="mt-2 text-sm font-semibold">{cas.etape}</p>
      <div className="mt-3 space-y-2">
        {cas.options.map((o) => (
          <button
            key={o.texte}
            type="button"
            onClick={() => {
              if (!o.bon) setErreurs((e) => e + 1);
              setEtape((e) => e + 1);
            }}
            className="w-full rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2.5 text-left text-sm"
          >
            {o.texte}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function JeuxPage() {
  const [onglet, setOnglet] = useState<"puzzle" | "flash" | "urgence">("puzzle");

  const onglets = [
    { id: "puzzle" as const, label: "Colle-Colle", icon: Puzzle },
    { id: "flash" as const, label: "Diagnostic Flash", icon: Brain },
    { id: "urgence" as const, label: "Bloc Urgence", icon: Siren },
  ];

  return (
    <PageShell title="Jeux pédagogiques" subtitle="Réviser en s'entraînant">
      <Link href="/jeux/super-docteur" className="mp-card mb-4 flex items-center gap-3 p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mp-yellow text-mp-text">
          <Trophy size={22} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold">Jeux Super Docteur</span>
          <span className="block text-xs text-mp-grey">15 questions de sant&eacute;, chrono et jokers. Gains fictifs.</span>
        </span>
      </Link>

      <div className="flex gap-2">
        {onglets.map((o) => {
          const Icon = o.icon;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnglet(o.id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-3 text-[11px] font-semibold ${
                onglet === o.id ? "bg-mp-blue text-white" : "mp-card text-mp-grey"
              }`}
            >
              <Icon size={18} />
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {onglet === "puzzle" ? <ColleColle /> : null}
        {onglet === "flash" ? <DiagnosticFlash /> : null}
        {onglet === "urgence" ? <BlocUrgence /> : null}
      </div>
    </PageShell>
  );
}
