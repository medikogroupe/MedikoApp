"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Loader2, Plus } from "lucide-react";
import { FILIERES, MATIERES } from "@/lib/constants";

type Session = {
  id: string;
  titre: string;
  module: string;
  dureeMinutes: number;
  nbQuestions: number;
  dateLancement: string;
  statut: string;
  filieres?: string[] | null;
  sortiesMax: number;
};

type QuestionCourte = { id: string; question: string; type: string; points: number };

type Resultats = {
  session: { titre: string };
  stats: { copies: number; enCours: number; moyenne: number; meilleure: number; plusBasse: number; reussite: number };
  copies: {
    id: string;
    nom: string | null;
    numero: string | null;
    filiere: string | null;
    statut: string;
    points: number;
    pointsMax: number;
    noteSur20: number;
    sorties: number;
  }[];
  parQuestion: { id: string; question: string; type: string; tauxReussite: number; sansReponse: number }[];
};

function libelleFiliere(f: string) {
  return f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ");
}

function heureLocale(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ChoixFilieres({ valeur, onChange }: { valeur: string[]; onChange: (v: string[]) => void }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILIERES.map((f) => {
          const actif = valeur.includes(f);
          return (
            <button
              key={f}
              type="button"
              aria-pressed={actif}
              onClick={() => onChange(actif ? valeur.filter((x) => x !== f) : [...valeur, f])}
              className={`min-h-[44px] rounded-lg border px-3 text-xs font-semibold ${
                actif ? "border-mp-blue bg-mp-blue text-white" : "border-[#dfe3e8] bg-white text-mp-grey"
              }`}
            >
              {libelleFiliere(f)}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-mp-grey">
        {valeur.length === 0 ? "Aucune filière cochée : la session est ouverte à toutes les filières." : `Ouverte uniquement aux filières cochées (${valeur.length}).`}
      </p>
    </div>
  );
}

export default function QcmSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState({
    titre: "",
    module: MATIERES[0] as string,
    dureeMinutes: "30",
    nbQuestions: "10",
    dateLancement: heureLocale(),
    filieres: [] as string[],
    sortiesMax: "3",
    melanger: true,
    choix: false,
    niveau: "",
    consignes: "",
  });
  const [disponibles, setDisponibles] = useState<QuestionCourte[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [ouvertId, setOuvertId] = useState("");
  const [resultats, setResultats] = useState<Resultats | null>(null);

  const charger = useCallback(async () => {
    const res = await fetch("/api/admin/qcm");
    if (res.ok) setSessions((await res.json()).sessions ?? []);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!form.choix) return;
    void (async () => {
      const res = await fetch(`/api/admin/questions?matiere=${encodeURIComponent(form.module)}`);
      if (res.ok) setDisponibles((await res.json()).questions ?? []);
      setSelection([]);
    })();
  }, [form.choix, form.module]);

  async function lancer() {
    setErreur("");
    setMessage("");
    setOccupe(true);
    const res = await fetch("/api/admin/qcm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: form.titre,
        module: form.module,
        dureeMinutes: Number(form.dureeMinutes),
        nbQuestions: Number(form.nbQuestions),
        dateLancement: form.dateLancement ? new Date(form.dateLancement).toISOString() : undefined,
        filieres: form.filieres,
        sortiesMax: Number(form.sortiesMax) || 0,
        melanger: form.melanger,
        questionIds: form.choix ? selection : [],
        niveau: form.niveau,
        consignes: form.consignes,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) {
      setErreur(data.error ?? "Impossible de lancer la session.");
      return;
    }
    setMessage(`Session lancée avec ${data.nbQuestions} question(s).`);
    void charger();
  }

  async function patch(id: string, corps: Record<string, unknown>) {
    await fetch("/api/admin/qcm", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...corps }),
    });
    void charger();
  }

  async function voirResultats(id: string) {
    if (ouvertId === id) {
      setOuvertId("");
      setResultats(null);
      return;
    }
    setOuvertId(id);
    setResultats(null);
    const res = await fetch(`/api/admin/qcm/resultats?id=${id}`);
    if (res.ok) setResultats(await res.json());
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Lancer un QCM surveillé</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mp-label">Titre</label>
            <input className="mp-input" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Module</label>
            <select className="mp-input" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
              {MATIERES.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Date et heure d&apos;ouverture</label>
            <input type="datetime-local" className="mp-input" value={form.dateLancement} onChange={(e) => setForm({ ...form, dateLancement: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Durée (minutes)</label>
            <input className="mp-input" inputMode="numeric" value={form.dureeMinutes} onChange={(e) => setForm({ ...form, dureeMinutes: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Nombre de questions (tirage au sort)</label>
            <input className="mp-input" inputMode="numeric" value={form.nbQuestions} disabled={form.choix} onChange={(e) => setForm({ ...form, nbQuestions: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Sorties d&apos;écran tolérées (0 = illimité)</label>
            <input className="mp-input" inputMode="numeric" value={form.sortiesMax} onChange={(e) => setForm({ ...form, sortiesMax: e.target.value })} />
          </div>
        </div>

        <div className="mt-4">
          <label className="mp-label">Filières concernées</label>
          <ChoixFilieres valeur={form.filieres} onChange={(v) => setForm({ ...form, filieres: v })} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mp-label">Niveau des questions</label>
            <select className="mp-input" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
              <option value="">Tous les niveaux</option>
              {["L1", "L2", "L3", "M1", "M2"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="mp-label">Consignes et libell&eacute; (affich&eacute;s &agrave; l&apos;&eacute;tudiant avant de commencer)</label>
          <textarea className="mp-input" rows={4} maxLength={2000} value={form.consignes} onChange={(e) => setForm({ ...form, consignes: e.target.value })} />
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6">
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5" checked={form.melanger} onChange={(e) => setForm({ ...form, melanger: e.target.checked })} />
            Mélanger l&apos;ordre des questions et des propositions
          </label>
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5" checked={form.choix} onChange={(e) => setForm({ ...form, choix: e.target.checked })} />
            Choisir les questions moi-même
          </label>
        </div>

        {form.choix ? (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-[10px] border border-[#dfe3e8] p-2">
            {disponibles.length === 0 ? <p className="p-2 text-xs text-mp-grey">Aucune question dans ce module.</p> : null}
            {disponibles.map((q) => (
              <label key={q.id} className="flex min-h-[44px] items-start gap-2 border-b border-[#eef1f5] py-2 text-xs last:border-0">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0"
                  checked={selection.includes(q.id)}
                  onChange={(e) => setSelection(e.target.checked ? [...selection, q.id] : selection.filter((x) => x !== q.id))}
                />
                <span>
                  <span className="mr-1 font-bold text-mp-blue">{q.type}</span>
                  {q.question} <span className="text-mp-grey">({q.points} pt)</span>
                </span>
              </label>
            ))}
            <p className="p-2 text-xs font-semibold text-mp-blue">{selection.length} question(s) sélectionnée(s)</p>
          </div>
        ) : null}

        {erreur ? <p className="mt-2 text-xs font-semibold text-red-700">{erreur}</p> : null}
        {message ? <p className="mt-2 text-xs font-semibold text-green-700">{message}</p> : null}
        <button type="button" className="mp-btn-yellow mt-3 min-h-[44px] md:w-48" onClick={lancer} disabled={occupe}>
          {occupe ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Lancer
        </button>
      </section>

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Sessions</h2>
        <ul className="mt-3 space-y-3">
          {sessions.map((s) => {
            const filieres = Array.isArray(s.filieres) ? s.filieres : [];
            return (
            <li key={s.id} className="rounded-[10px] border border-[#eef1f5] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{s.titre}</p>
                  <p className="text-xs text-mp-grey">
                    {s.module} · {s.nbQuestions} q · {s.dureeMinutes} min · {new Date(s.dateLancement).toLocaleString("fr-FR")} ·{" "}
                    {s.statut === "ACTIF" ? "Active" : "Clôturée"}
                  </p>
                  <p className="mt-1 text-xs text-mp-grey">
                    Filières : {filieres.length === 0 ? "toutes" : filieres.map(libelleFiliere).join(", ")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="flex min-h-[44px] items-center gap-1 rounded-lg bg-mp-bg px-3 text-xs font-semibold" onClick={() => voirResultats(s.id)}>
                    <BarChart3 size={14} /> Résultats
                  </button>
                  <button
                    type="button"
                    className="min-h-[44px] rounded-lg bg-mp-bg px-3 text-xs font-semibold"
                    onClick={() => patch(s.id, { statut: s.statut === "ACTIF" ? "CLOTURE" : "ACTIF" })}
                  >
                    {s.statut === "ACTIF" ? "Clôturer" : "Réactiver"}
                  </button>
                </div>
              </div>

              <details className="mt-2">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-xs font-semibold text-mp-blue">Modifier les filières concernées</summary>
                <div className="mt-2">
                  <ChoixFilieres valeur={filieres} onChange={(v) => void patch(s.id, { filieres: v })} />
                </div>
              </details>

              {ouvertId === s.id ? (
                <div className="mt-3 border-t border-[#eef1f5] pt-3">
                  {!resultats ? (
                    <p className="flex items-center gap-2 text-xs text-mp-grey">
                      <Loader2 size={14} className="animate-spin" /> Chargement...
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                        {[
                          ["Copies rendues", resultats.stats.copies],
                          ["Moyenne /20", resultats.stats.moyenne],
                          ["Meilleure", resultats.stats.meilleure],
                          ["Plus basse", resultats.stats.plusBasse],
                          ["Note >= 10", `${resultats.stats.reussite}%`],
                        ].map(([label, valeur]) => (
                          <div key={String(label)} className="rounded-lg bg-mp-bg p-2 text-center">
                            <p className="text-lg font-bold text-mp-blue">{valeur}</p>
                            <p className="text-xs text-mp-grey">{label}</p>
                          </div>
                        ))}
                      </div>
                      {resultats.stats.enCours > 0 ? <p className="mt-2 text-xs text-mp-grey">{resultats.stats.enCours} copie(s) en cours.</p> : null}

                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-xs">
                          <thead className="text-mp-grey">
                            <tr>
                              <th className="py-1">Étudiant</th>
                              <th>Numéro</th>
                              <th>Filière</th>
                              <th>Points</th>
                              <th>Note /20</th>
                              <th>Sorties</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultats.copies.map((c) => (
                              <tr key={c.id} className="border-t border-[#eef1f5]">
                                <td className="py-2">{c.nom}</td>
                                <td>{c.numero}</td>
                                <td>{c.filiere}</td>
                                <td>{c.statut === "TERMINE" ? `${c.points} / ${c.pointsMax}` : "en cours"}</td>
                                <td className="font-bold text-mp-blue">{c.statut === "TERMINE" ? c.noteSur20 : "-"}</td>
                                <td className={c.sorties > 0 ? "font-bold text-red-700" : ""}>{c.sorties}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className="mt-4 text-xs font-bold text-mp-grey">Taux de réussite par question</p>
                      <ul className="mt-2 space-y-2">
                        {resultats.parQuestion.map((q, i) => (
                          <li key={q.id}>
                            <div className="flex justify-between gap-2 text-xs">
                              <span className="truncate">
                                {i + 1}. [{q.type}] {q.question}
                              </span>
                              <span className="shrink-0 font-semibold text-mp-blue">{q.tauxReussite}%</span>
                            </div>
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#e9edf3]">
                              <div className="h-full rounded-full bg-mp-blue" style={{ width: `${q.tauxReussite}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
          })}
          {sessions.length === 0 ? <li className="text-xs text-mp-grey">Aucune session.</li> : null}
        </ul>
      </section>
    </div>
  );
}
