"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, Trash2, Upload } from "lucide-react";

type Ligne = {
  id: string;
  slug: string;
  titre: string;
  gravite: string;
  patient: string;
  icone: string;
  statut: "ACTIF" | "BROUILLON";
  nbEtapes: number;
};

const etapeModele = (n: number) => ({
  moment: "Jour 0 · Étape " + n,
  situation: "Décrivez la situation du patient à cette étape.",
  choix: [
    { texte: "La bonne décision.", effet: 5, retour: "Pourquoi c'est juste." },
    { texte: "Une décision discutable.", effet: -10, retour: "Pourquoi c'est insuffisant." },
    { texte: "Une erreur grave.", effet: -30, fatal: true, retour: "Pourquoi c'est dangereux." },
  ],
});

const MODELE = JSON.stringify(
  {
    id: "exemple-pneumonie-enfant",
    titre: "Toux et difficultés respiratoires chez un enfant",
    gravite: "MODERE",
    avatar: "enfant",
    icone: "poumons",
    patient: "Awa, 3 ans",
    duree: "5 jours de suivi",
    resume: "Une phrase qui donne envie de soigner ce patient.",
    finBonne: "Texte affiché en cas de guérison.",
    finMoyenne: "Texte affiché en cas de guérison avec complications.",
    finMauvaise: "Texte affiché en cas de décès.",
    etapes: [1, 2, 3].map(etapeModele),
  },
  null,
  2,
);

const GRAVITE: Record<string, string> = { LEGER: "Léger", MODERE: "Modéré", GRAVE: "Grave", CRITIQUE: "Critique" };

async function appel(corps: Record<string, unknown>) {
  const res = await fetch("/api/admin/cas-cliniques", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur.");
  return data as Record<string, unknown>;
}

export default function AdminCasCliniques() {
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState(false);
  const [texte, setTexte] = useState("");

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/cas-cliniques");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Chargement impossible.");
      setLignes((data as { cas: Ligne[] }).cas);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Chargement impossible.");
      setErreur(true);
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(corps: Record<string, unknown>, ok: string) {
    setOccupe(true);
    setMessage("");
    setErreur(false);
    try {
      await appel(corps);
      setMessage(ok);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur.");
      setErreur(true);
    }
    setOccupe(false);
  }

  async function importer() {
    if (!texte.trim()) {
      setMessage("Collez un cas au format JSON ou choisissez un fichier.");
      setErreur(true);
      return;
    }
    setOccupe(true);
    setMessage("");
    setErreur(false);
    try {
      const d = await appel({ action: "importer", donnees: texte });
      setMessage(String(d.importes) + " cas importé(s) en brouillon. Testez-les, faites-les relire, puis activez-les.");
      setTexte("");
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import impossible.");
      setErreur(true);
    }
    setOccupe(false);
  }

  async function lireFichier(f: File | undefined) {
    if (!f) return;
    setTexte(await f.text());
  }

  const actifs = lignes.filter((l) => l.statut === "ACTIF").length;

  return (
    <div>
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Cas cliniques du jeu « Parcours patient »</h2>
        <p className="mt-1 text-xs text-mp-grey">
          Seuls les cas <b>Actifs</b> sont visibles par les étudiants. Un cas importé arrive en <b>Brouillon</b> : testez-le, faites-le
          relire par un médecin ou un enseignant, puis activez-le.
        </p>
        <p className="mt-2 text-xs font-semibold text-mp-blue">
          {actifs} actif(s) sur {lignes.length}
        </p>
        {message ? <p className={`mt-2 text-xs font-semibold ${erreur ? "text-red-700" : "text-green-700"}`}>{message}</p> : null}
      </section>

      <section className="mp-card mt-3 p-4">
        {chargement ? (
          <p className="flex items-center gap-2 text-sm text-mp-grey">
            <Loader2 size={16} className="animate-spin" /> Chargement...
          </p>
        ) : lignes.length === 0 ? (
          <p className="text-xs text-mp-grey">Aucun cas pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {lignes.map((l) => (
              <li key={l.id} className="border-b border-[#eef1f5] pb-3 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{l.titre}</p>
                    <p className="text-xs text-mp-grey">
                      {l.patient} · {GRAVITE[l.gravite] ?? l.gravite} · {l.nbEtapes} étapes
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      l.statut === "ACTIF" ? "bg-green-100 text-green-800" : "bg-[#e9edf3] text-mp-grey"
                    }`}
                  >
                    {l.statut === "ACTIF" ? "Actif" : "Brouillon"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/jeux/parcours?cas=${l.slug}`}
                    target="_blank"
                    className="flex min-h-[44px] items-center gap-1 rounded-lg bg-mp-bg px-3 text-xs font-bold text-mp-blue"
                  >
                    <Play size={14} /> Tester
                  </Link>
                  <button
                    type="button"
                    disabled={occupe}
                    onClick={() =>
                      void agir(
                        { action: "statut", id: l.id, statut: l.statut === "ACTIF" ? "BROUILLON" : "ACTIF" },
                        l.statut === "ACTIF" ? "Cas retiré de la liste des étudiants." : "Cas activé : les étudiants peuvent le jouer.",
                      )
                    }
                    className={`min-h-[44px] rounded-lg px-3 text-xs font-bold ${
                      l.statut === "ACTIF" ? "border border-[#dfe3e8] bg-white text-mp-grey" : "bg-mp-yellow"
                    }`}
                  >
                    {l.statut === "ACTIF" ? "Désactiver" : "Activer"}
                  </button>
                  <button
                    type="button"
                    disabled={occupe}
                    aria-label="Supprimer"
                    onClick={() => {
                      if (window.confirm("Supprimer définitivement « " + l.titre + " » ?")) void agir({ action: "supprimer", id: l.id }, "Cas supprimé.");
                    }}
                    className="flex h-11 w-11 items-center justify-center"
                  >
                    <Trash2 size={18} className="text-mp-grey" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mp-card mt-3 p-4">
        <h2 className="text-sm font-bold">Importer des cas</h2>
        <p className="mt-1 text-xs text-mp-grey">
          Collez un cas (ou une liste de cas) au format JSON, ou choisissez un fichier .json. Les cas arrivent en brouillon.
        </p>
        <textarea
          className="mp-input mt-3 h-48 font-mono text-xs"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Collez le JSON ici"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="mp-btn-ghost flex min-h-[44px] cursor-pointer items-center gap-2 md:w-auto md:px-4">
            <Upload size={16} /> Choisir un fichier
            <input type="file" accept=".json,application/json" className="hidden" onChange={(e) => void lireFichier(e.target.files?.[0])} />
          </label>
          <button type="button" className="mp-btn-ghost min-h-[44px] md:w-auto md:px-4" onClick={() => setTexte(MODELE)}>
            Insérer un modèle
          </button>
          <button type="button" className="mp-btn-yellow min-h-[44px] md:w-48" onClick={() => void importer()} disabled={occupe}>
            {occupe ? <Loader2 size={16} className="animate-spin" /> : null} Importer
          </button>
        </div>
      </section>
    </div>
  );
}