"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { MATIERES } from "@/lib/constants";

type Note = {
  id: string;
  matiere: string;
  note: number;
  coef: number;
  createdAt: string;
};

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ matiere: MATIERES[0], note: "", coef: "1" });
  const [cible, setCible] = useState("10");
  const [prochaineMatiere, setProchaineMatiere] = useState(MATIERES[0]);
  const [prochainCoef, setProchainCoef] = useState("2");

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) {
      const data = await res.json();
      setNotes(data.notes ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const moyenne = useMemo(() => {
    const totalCoef = notes.reduce((a, n) => a + n.coef, 0);
    if (totalCoef === 0) return 0;
    return notes.reduce((a, n) => a + n.note * n.coef, 0) / totalCoef;
  }, [notes]);

  const courbe = useMemo(
    () =>
      notes.map((n, i) => ({
        index: `#${i + 1}`,
        note: n.note,
        matiere: n.matiere,
      })),
    [notes],
  );

  const parMatiere = useMemo(() => {
    const map = new Map<string, { somme: number; coef: number }>();
    notes.forEach((n) => {
      const cur = map.get(n.matiere) ?? { somme: 0, coef: 0 };
      map.set(n.matiere, { somme: cur.somme + n.note * n.coef, coef: cur.coef + n.coef });
    });
    return Array.from(map.entries()).map(([matiere, v]) => ({
      matiere: matiere.slice(0, 8),
      moyenne: Number((v.somme / v.coef).toFixed(2)),
    }));
  }, [notes]);

  const prediction = useMemo(() => {
    const totalCoef = notes.reduce((a, n) => a + n.coef, 0);
    const totalPoints = notes.reduce((a, n) => a + n.note * n.coef, 0);
    const c = Math.max(1, Number(prochainCoef) || 1);
    const objectif = Number(cible) || 10;
    const requis = (objectif * (totalCoef + c) - totalPoints) / c;
    return Math.round(requis * 100) / 100;
  }, [notes, cible, prochainCoef]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matiere: form.matiere, note: Number(form.note), coef: Number(form.coef) }),
    });
    if (res.ok) {
      setForm({ ...form, note: "" });
      void load();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <PageShell title="Mes notes" subtitle="Moyenne pondérée et progression">
      <section className="mp-card p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-mp-grey">Moyenne générale</p>
            <p className="text-3xl font-bold text-mp-blue">{moyenne.toFixed(2)}/20</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              moyenne >= 10 ? "bg-green-100 text-green-700" : "bg-mp-yellow text-mp-text"
            }`}
          >
            {moyenne >= 10 ? "Validé" : "À renforcer"}
          </span>
        </div>
        <div className="mt-4 h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={courbe}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
              <XAxis dataKey="index" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="note" stroke="#0A4B8A" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="text-sm font-bold">Moyennes par matière</h2>
        <div className="mt-3 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parMatiere}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
              <XAxis dataKey="matiere" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="moyenne" fill="#FFC107" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Target size={16} className="text-mp-blue" /> Prédiction de validation
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mp-label">Objectif</label>
            <input className="mp-input" inputMode="decimal" value={cible} onChange={(e) => setCible(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Matière</label>
            <select className="mp-input" value={prochaineMatiere} onChange={(e) => setProchaineMatiere(e.target.value)}>
              {MATIERES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Coef</label>
            <input className="mp-input" inputMode="numeric" value={prochainCoef} onChange={(e) => setProchainCoef(e.target.value)} />
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-mp-bg px-3 py-2 text-sm">
          {prediction <= 0
            ? `Objectif déjà atteint : votre moyenne reste au-dessus de ${cible}/20.`
            : prediction > 20
              ? `Objectif non atteignable avec ce seul coefficient. Augmentez le coefficient ou visez plusieurs évaluations.`
              : `Il te faut ${prediction}/20 en ${prochaineMatiere} pour valider à ${cible}/20.`}
        </p>
      </section>

      <form onSubmit={add} className="mp-card mt-4 space-y-3 p-4">
        <h2 className="text-sm font-bold">Ajouter une note</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="mp-label">Matière</label>
            <select className="mp-input" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })}>
              {MATIERES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Note /20</label>
            <input className="mp-input" inputMode="decimal" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="14" />
          </div>
          <div>
            <label className="mp-label">Coefficient</label>
            <input className="mp-input" inputMode="numeric" value={form.coef} onChange={(e) => setForm({ ...form, coef: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="mp-btn-yellow">
          <Plus size={16} /> Enregistrer la note
        </button>
      </form>

      <section className="mp-card mt-4 p-4">
        <h2 className="text-sm font-bold">Historique</h2>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-mp-grey">
            <Loader2 size={14} className="animate-spin" /> Chargement
          </p>
        ) : notes.length === 0 ? (
          <p className="mt-3 text-xs text-mp-grey">Aucune note enregistrée.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 text-sm last:border-0">
                <span>
                  {n.matiere} <span className="text-xs text-mp-grey">coef {n.coef}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-semibold text-mp-blue">{n.note}/20</span>
                  <button type="button" onClick={() => remove(n.id)} aria-label="Supprimer">
                    <Trash2 size={15} className="text-mp-grey" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
