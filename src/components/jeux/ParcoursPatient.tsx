"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2, RotateCcw, Stethoscope } from "lucide-react";

type CasInfo = { id: string; titre: string; gravite: string; duree: string; patient: string; icone: string; resume: string; nbEtapes: number };
type Vue = {
  cas: { id: string; titre: string; gravite: string; patient: string; icone: string };
  etape: number;
  total: number;
  moment: string;
  situation: string;
  options: string[];
  sante: number;
};
type Niveau = "BON" | "MOYEN" | "MAUVAIS";
type Retour = { niveau: Niveau; retour: string; attendu: string; sante: number };
type Fin = {
  termine: true;
  issue: "GUERISON" | "SEQUELLES" | "DECES" | "ABANDON";
  niveau: Niveau | null;
  retour: string;
  attendu: string;
  sante: number;
  erreurs: number;
  bilan: string;
};
type Reponse = Fin | (Retour & { termine: false; token: string; vue: Vue });

function Icone({ nom, taille = 56, gris = false }: { nom: string; taille?: number; gris?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/jeux/icones/${nom}.png`}
      alt=""
      width={taille}
      height={taille}
      draggable={false}
      className={`shrink-0 object-contain drop-shadow-md ${gris ? "grayscale opacity-70" : ""}`}
    />
  );
}
const GRAVITE: Record<string, { label: string; classe: string }> = {
  LEGER: { label: "Léger", classe: "bg-green-100 text-green-800" },
  MODERE: { label: "Modéré", classe: "bg-yellow-100 text-yellow-800" },
  GRAVE: { label: "Grave", classe: "bg-orange-100 text-orange-800" },
  CRITIQUE: { label: "Critique", classe: "bg-red-100 text-red-800" },
};

const NIVEAU: Record<Niveau, { label: string; classe: string }> = {
  BON: { label: "Bonne décision", classe: "bg-green-100 text-green-800" },
  MOYEN: { label: "Décision discutable", classe: "bg-yellow-100 text-yellow-800" },
  MAUVAIS: { label: "Erreur de prise en charge", classe: "bg-red-100 text-red-800" },
};

const ISSUE: Record<Fin["issue"], { titre: string; classe: string }> = {
  GUERISON: { titre: "Guérison", classe: "text-green-700" },
  SEQUELLES: { titre: "Guérison avec complications", classe: "text-orange-600" },
  DECES: { titre: "Le patient est décédé", classe: "text-red-700" },
  ABANDON: { titre: "Parcours abandonné", classe: "text-mp-grey" },
};

async function appel<T>(corps: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/jeux/parcours", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur du jeu.");
  return data as T;
}

function Jauge({ valeur }: { valeur: number }) {
  const couleur = valeur >= 70 ? "bg-green-500" : valeur >= 40 ? "bg-orange-400" : "bg-red-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-1 text-mp-blue">
          <HeartPulse size={14} /> État du patient
        </span>
        <span>{valeur}/100</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#e9edf3]">
        <div className={`h-full rounded-full transition-all ${couleur}`} style={{ width: `${valeur}%` }} />
      </div>
    </div>
  );
}

function Correction({ retour }: { retour: Retour }) {
  return (
    <div className="mp-card mt-3 p-4">
      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${NIVEAU[retour.niveau].classe}`}>
        {NIVEAU[retour.niveau].label}
      </span>
      <p className="mt-2 text-sm">{retour.retour}</p>
      {retour.attendu ? (
        <div className="mt-3 rounded-lg bg-mp-bg p-3 text-xs">
          <p className="font-bold">Ce qu&apos;il fallait faire</p>
          <p className="mt-1 text-mp-grey">{retour.attendu}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function ParcoursPatient() {
  const [liste, setListe] = useState<CasInfo[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [token, setToken] = useState("");
  const [vue, setVue] = useState<Vue | null>(null);
  const [retour, setRetour] = useState<Retour | null>(null);
  const [suite, setSuite] = useState<{ token: string; vue: Vue } | null>(null);
  const [fin, setFin] = useState<Fin | null>(null);

  useEffect(() => {
    let actif = true;
    appel<{ cas: CasInfo[] }>({ action: "cas" })
      .then((d) => {
        if (actif) setListe(d.cas);
      })
      .catch((e: Error) => {
        if (actif) setErreur(e.message);
      })
      .finally(() => {
        if (actif) setChargement(false);
      });
    return () => {
      actif = false;
    };
  }, []);

  function reinitialiser() {
    setVue(null);
    setRetour(null);
    setSuite(null);
    setFin(null);
    setToken("");
    setErreur("");
  }

  async function demarrer(id: string) {
    setOccupe(true);
    setErreur("");
    try {
      const d = await appel<{ token: string; vue: Vue }>({ action: "start", cas: id });
      setToken(d.token);
      setVue(d.vue);
      setRetour(null);
      setSuite(null);
      setFin(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur du jeu.");
    }
    setOccupe(false);
  }

  async function choisir(i: number) {
    if (occupe || retour || fin) return;
    setOccupe(true);
    setErreur("");
    try {
      const d = await appel<Reponse>({ action: "choose", token, choix: i });
      if (d.termine) {
        setFin(d);
      } else {
        setRetour({ niveau: d.niveau, retour: d.retour, attendu: d.attendu, sante: d.sante });
        setSuite({ token: d.token, vue: d.vue });
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur du jeu.");
    }
    setOccupe(false);
  }

  function continuer() {
    if (!suite) return;
    setToken(suite.token);
    setVue(suite.vue);
    setRetour(null);
    setSuite(null);
  }

  if (vue) {
    const sante = fin ? fin.sante : retour ? retour.sante : vue.sante;
    return (
      <div>
        <div className="mp-card p-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-bold text-mp-blue">
              <Icone nom={vue.cas.icone} taille={40} />
              {vue.cas.patient}
            </span>
            <span className="text-mp-grey">
              Étape {vue.etape}/{vue.total}
            </span>
          </div>
          <div className="mt-3">
            <Jauge valeur={sante} />
          </div>
        </div>

        <div className="mp-card mt-3 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-mp-grey">{vue.moment}</p>
          <p className="mt-2 text-sm">{vue.situation}</p>
        </div>

        {!retour && !fin ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-mp-grey">Que faites-vous ?</p>
            {vue.options.map((o, i) => (
              <button
                key={i}
                type="button"
                disabled={occupe}
                onClick={() => void choisir(i)}
                className="min-h-[44px] w-full rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2.5 text-left text-sm"
              >
                {o}
              </button>
            ))}
            <button type="button" className="mp-btn-ghost mt-2" onClick={reinitialiser}>
              Abandonner ce parcours
            </button>
          </div>
        ) : null}

        {retour ? (
          <>
            <Correction retour={retour} />
            <button type="button" className="mp-btn-yellow mt-3" onClick={continuer}>
              Continuer
            </button>
          </>
        ) : null}

        {fin ? (
          <>
            {fin.niveau ? (
              <Correction retour={{ niveau: fin.niveau, retour: fin.retour, attendu: fin.attendu, sante: fin.sante }} />
            ) : null}
            <div className="mp-card mt-3 p-4 text-center">
              <div className="mb-2 flex justify-center">
                <Icone nom={vue.cas.icone} taille={72} gris={fin.issue === "DECES"} />
              </div>
              <p className={`text-base font-bold ${ISSUE[fin.issue].classe}`}>{ISSUE[fin.issue].titre}</p>
              <p className="mt-2 text-sm">{fin.bilan}</p>
              <p className="mt-2 text-xs text-mp-grey">
                {fin.erreurs === 0 ? "Aucune erreur de prise en charge." : `${fin.erreurs} décision(s) à améliorer.`}
              </p>
              <button type="button" className="mp-btn-yellow mt-4" onClick={reinitialiser}>
                <RotateCcw size={16} /> Choisir un patient
              </button>
            </div>
          </>
        ) : null}

        {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mp-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Stethoscope size={16} className="text-mp-blue" /> Choisissez un patient
        </p>
        <p className="mt-1 text-xs text-mp-grey">
          Prenez en charge un patient de l&apos;accueil jusqu&apos;à la guérison. Chaque décision compte : une erreur grave
          peut entraîner le décès. Jeu de révision : il ne remplace pas les protocoles officiels.
        </p>
      </div>

      {chargement ? (
        <p className="mp-card mt-3 flex items-center gap-2 p-4 text-sm text-mp-grey">
          <Loader2 size={16} className="animate-spin" /> Chargement...
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {liste.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={occupe}
              onClick={() => void demarrer(c.id)}
              className="mp-card block min-h-[44px] w-full p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-3 text-sm font-bold">
                  <Icone nom={c.icone} taille={48} />
                  {c.titre}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${(GRAVITE[c.gravite] ?? GRAVITE.MODERE).classe}`}>
                  {(GRAVITE[c.gravite] ?? GRAVITE.MODERE).label}
                </span>
              </div>
              <p className="mt-1 text-xs text-mp-grey">
                {c.patient} · {c.nbEtapes} étapes · {c.duree}
              </p>
              <p className="mt-2 text-xs">{c.resume}</p>
            </button>
          ))}
        </div>
      )}
      {erreur ? <p className="mt-3 text-xs font-semibold text-red-700">{erreur}</p> : null}
    </div>
  );
}