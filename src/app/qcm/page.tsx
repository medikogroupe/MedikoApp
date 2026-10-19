"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Clock, Info, Loader2, Play, ShieldCheck } from "lucide-react";
import PageShell from "@/components/PageShell";
import QcmRunner, { type Question } from "@/components/QcmRunner";
import { MATIERES } from "@/lib/constants";

type Session = {
  id: string;
  titre: string;
  module: string;
  dureeMinutes: number;
  nbQuestions: number;
  dateLancement: string;
  statut: string;
};

type Resultat = {
  id: string;
  matiere: string | null;
  score: number;
  total: number;
  createdAt: string;
};

export default function QcmPage() {
  const [matiere, setMatiere] = useState("toutes");
  const [nb, setNb] = useState("10");
  const [duree, setDuree] = useState("15");
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMeta = useCallback(async () => {
    const [s, r] = await Promise.all([fetch("/api/qcm/surveille"), fetch("/api/qcm/resultats")]);
    if (s.ok) setSessions((await s.json()).sessions ?? []);
    if (r.ok) setResultats((await r.json()).resultats ?? []);
  }, []);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const stats = useMemo(() => {
    const map = new Map<string, { score: number; total: number }>();
    resultats.forEach((r) => {
      const key = r.matiere || "Général";
      const cur = map.get(key) ?? { score: 0, total: 0 };
      map.set(key, { score: cur.score + r.score, total: cur.total + r.total });
    });
    return Array.from(map.entries()).map(([k, v]) => ({
      matiere: k,
      pourcentage: v.total ? Math.round((v.score / v.total) * 100) : 0,
    }));
  }, [resultats]);

  async function demarrer() {
    setLoading(true);
    const res = await fetch(`/api/qcm?matiere=${matiere}&limit=${nb}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setLoading(false);
  }

  if (questions) {
    return (
      <PageShell title="Examen blanc" subtitle={matiere === "toutes" ? "Toutes matières" : matiere}>
        <QcmRunner
          questions={questions}
          dureeMinutes={Number(duree) || 15}
          titre={matiere === "toutes" ? "Examen blanc" : matiere}
          onFinish={() => void loadMeta()}
        />
        <button type="button" className="mp-btn-ghost mt-4" onClick={() => setQuestions(null)}>
          Revenir aux QCM
        </button>
      </PageShell>
    );
  }

  return (
    <PageShell title="QCM & examens" subtitle="Entraînement et sessions surveillées" back={false}>
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Examen blanc chronométré</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mp-label">Matière</label>
            <select className="mp-input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
              <option value="toutes">Toutes</option>
              {MATIERES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Questions</label>
            <input className="mp-input" inputMode="numeric" value={nb} onChange={(e) => setNb(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Durée (min)</label>
            <input className="mp-input" inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
        </div>
        <button type="button" className="mp-btn-yellow mt-4" onClick={demarrer} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Commencer le QCM
        </button>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={16} className="text-mp-blue" /> QCM surveillés
        </h2>
        {sessions.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">Aucune session programmée pour le moment.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
                <Bell size={18} className="text-mp-yellow" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.titre}</p>
                  <p className="text-xs text-mp-grey">
                    {s.module} · {s.nbQuestions} questions · {s.dureeMinutes} min ·{" "}
                    {new Date(s.dateLancement).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
                {s.statut === "ACTIF" ? (
                  <Link href={`/qcm/surveille/${s.id}`} className="rounded-lg bg-mp-yellow px-3 py-1.5 text-xs font-bold uppercase">
                    Entrer
                  </Link>
                ) : (
                  <span className="text-xs text-mp-grey">Clôturé</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="text-sm font-bold">Statistiques par matière</h2>
        {stats.length === 0 ? (
          <p className="mt-2 text-xs text-mp-grey">Terminez un QCM pour voir vos statistiques.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {stats.map((s) => (
              <li key={s.matiere}>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>{s.matiere}</span>
                  <span className="text-mp-blue">{s.pourcentage}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e9edf3]">
                  <div className="h-full rounded-full bg-mp-blue" style={{ width: `${s.pourcentage}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mp-card mt-4 flex items-start gap-3 p-4">
        <Info size={18} className="mt-0.5 text-mp-blue" />
        <p className="text-xs text-mp-grey">
          Contenu vérifié par l&apos;équipe pédagogique MEDIKO+. Les sessions surveillées n&apos;autorisent
          qu&apos;une seule tentative et détectent les sorties d&apos;écran.
        </p>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Clock size={16} className="text-mp-blue" /> Derniers passages
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {resultats.slice(0, 6).map((r) => (
            <li key={r.id} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 last:border-0">
              <span>{r.matiere || "QCM"}</span>
              <span className="font-semibold text-mp-blue">
                {r.score}/{r.total}
              </span>
            </li>
          ))}
          {resultats.length === 0 ? <li className="text-xs text-mp-grey">Aucun passage enregistré.</li> : null}
        </ul>
      </section>
    </PageShell>
  );
}
