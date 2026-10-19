"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PiggyBank, Plus, Save, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";

type Depense = { poste: string; montant: number };

const OBJECTIFS = [
  "Infirmier(e) diplômé(e) d'État",
  "Sage-femme / Maïeuticien",
  "Médecin généraliste",
  "Spécialiste (cardiologie, pédiatrie...)",
  "Technicien de laboratoire",
  "Kinésithérapeute",
  "Cadre de santé / Administration hospitalière",
];

const SALAIRES: Record<string, [number, number]> = {
  "Infirmier(e) diplômé(e) d'État": [150000, 320000],
  "Sage-femme / Maïeuticien": [180000, 350000],
  "Médecin généraliste": [400000, 900000],
  "Spécialiste (cardiologie, pédiatrie...)": [700000, 1800000],
  "Technicien de laboratoire": [140000, 300000],
  Kinésithérapeute: [160000, 400000],
  "Cadre de santé / Administration hospitalière": [300000, 700000],
};

export default function CarrierePage() {
  const [objectif, setObjectif] = useState(OBJECTIFS[0]);
  const [specialite, setSpecialite] = useState("");
  const [bourse, setBourse] = useState("0");
  const [epargne, setEpargne] = useState("0");
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [poste, setPoste] = useState("");
  const [montant, setMontant] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/carriere");
      if (res.ok) {
        const data = await res.json();
        if (data.carriere) {
          setObjectif(data.carriere.objectif || OBJECTIFS[0]);
          setSpecialite(data.carriere.specialite ?? "");
          setBourse(String(data.carriere.bourseMontant ?? 0));
          setEpargne(String(data.carriere.epargne ?? 0));
          setDepenses(data.carriere.depensesJson ?? []);
        }
      }
      setLoading(false);
    })();
  }, []);

  const totalDepenses = useMemo(() => depenses.reduce((a, d) => a + d.montant, 0), [depenses]);
  const reste = (Number(bourse) || 0) - totalDepenses - (Number(epargne) || 0);
  const salaire = SALAIRES[objectif] ?? [150000, 400000];

  async function save() {
    setSaving(true);
    const res = await fetch("/api/carriere", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objectif,
        specialite,
        bourseMontant: Number(bourse) || 0,
        epargne: Number(epargne) || 0,
        depensesJson: depenses,
      }),
    });
    setSaving(false);
    setMessage(res.ok ? "Projet enregistré." : "Enregistrement impossible.");
    setTimeout(() => setMessage(""), 2500);
  }

  return (
    <PageShell title="Projet carrière & finance" subtitle="Objectif professionnel et budget">
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-mp-grey">
          <Loader2 size={14} className="animate-spin" /> Chargement
        </p>
      ) : null}

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Mon objectif professionnel</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mp-label">Métier visé</label>
            <select className="mp-input" value={objectif} onChange={(e) => setObjectif(e.target.value)}>
              {OBJECTIFS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Spécialisation souhaitée</label>
            <input className="mp-input" value={specialite} onChange={(e) => setSpecialite(e.target.value)} placeholder="Cardiologie, urgences, santé publique..." />
          </div>
        </div>
        <div className="mt-4 rounded-lg bg-mp-bg p-3">
          <p className="text-xs uppercase tracking-wide text-mp-grey">Simulateur de revenu (indicatif)</p>
          <p className="mt-1 text-lg font-bold text-mp-blue">
            {salaire[0].toLocaleString("fr-FR")} - {salaire[1].toLocaleString("fr-FR")} FCFA / mois
          </p>
          <p className="mt-1 text-[11px] text-mp-grey">
            Fourchette observée en Côte d&apos;Ivoire selon secteur public ou privé et ancienneté.
          </p>
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <PiggyBank size={16} className="text-mp-blue" /> Budget mensuel
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mp-label">Bourse / revenus (FCFA)</label>
            <input className="mp-input" inputMode="numeric" value={bourse} onChange={(e) => setBourse(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Épargne visée (FCFA)</label>
            <input className="mp-input" inputMode="numeric" value={epargne} onChange={(e) => setEpargne(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input className="mp-input flex-1" value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Poste de dépense" />
          <input className="mp-input w-28" inputMode="numeric" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant" />
          <button
            type="button"
            className="mp-btn-blue px-3"
            onClick={() => {
              if (!poste || !montant) return;
              setDepenses([...depenses, { poste, montant: Number(montant) || 0 }]);
              setPoste("");
              setMontant("");
            }}
          >
            <Plus size={16} />
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {depenses.map((d, i) => (
            <li key={`${d.poste}-${i}`} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 text-sm last:border-0">
              <span>{d.poste}</span>
              <span className="flex items-center gap-3">
                <span className="font-semibold">{d.montant.toLocaleString("fr-FR")} F</span>
                <button type="button" onClick={() => setDepenses(depenses.filter((_, j) => j !== i))} aria-label="Supprimer">
                  <Trash2 size={15} className="text-mp-grey" />
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-mp-bg p-2">
            <p className="text-[11px] text-mp-grey">Dépenses</p>
            <p className="text-sm font-bold">{totalDepenses.toLocaleString("fr-FR")} F</p>
          </div>
          <div className="rounded-lg bg-mp-bg p-2">
            <p className="text-[11px] text-mp-grey">Épargne</p>
            <p className="text-sm font-bold">{(Number(epargne) || 0).toLocaleString("fr-FR")} F</p>
          </div>
          <div className={`rounded-lg p-2 ${reste < 0 ? "bg-red-50" : "bg-green-50"}`}>
            <p className="text-[11px] text-mp-grey">Reste</p>
            <p className="text-sm font-bold">{reste.toLocaleString("fr-FR")} F</p>
          </div>
        </div>
      </section>

      {message ? <p className="mt-3 rounded-lg bg-mp-bg px-3 py-2 text-xs">{message}</p> : null}

      <button type="button" className="mp-btn-yellow mt-4" onClick={save} disabled={saving}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
      </button>
    </PageShell>
  );
}
