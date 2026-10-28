"use client";

import { useCallback, useEffect, useState } from "react";

type Question = {
  id: string;
  type: "QCU" | "QCM" | "QCD" | "CAS";
  contexte: string;
  question: string;
  options: string[];
  bonnesReponses: number[];
  explication: string;
  statut: string;
  matiere: string | null;
};

const ONGLETS = [
  { id: "BROUILLON", label: "À relire" },
  { id: "VALIDE", label: "Validées" },
  { id: "REJETE", label: "Rejetées" },
];
const NOMS = { QCU: "QCU (choix unique)", QCM: "QCM (choix multiple)", QCD: "QCD (vrai ou faux)", CAS: "Cas clinique" };
const BTN = "min-h-[44px] rounded-lg px-3 text-xs font-bold uppercase";

export default function AdminQuestions() {
  const [statut, setStatut] = useState("BROUILLON");
  const [liste, setListe] = useState<Question[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [matieres, setMatieres] = useState<{ id: string; nom: string; semestre: number }[]>([]);
  const [matiereId, setMatiereId] = useState("");
  const [duree, setDuree] = useState("60");
  const [publication, setPublication] = useState(false);

  useEffect(() => {
    fetch("/api/matieres")
      .then((r) => (r.ok ? r.json() : { matieres: [] }))
      .then((d: { matieres?: { id: string; nom: string; semestre: number }[] }) => setMatieres(d.matieres ?? []))
      .catch(() => undefined);
  }, []);

  const charger = useCallback(async (s: string) => {
    setChargement(true);
    const res = await fetch("/api/admin/questions?statut=" + s);
    if (res.ok) setListe(((await res.json()) as { questions: Question[] }).questions ?? []);
    setChargement(false);
  }, []);

  useEffect(() => {
    void charger(statut);
  }, [charger, statut]);

  async function changer(ids: string[], nouveau: string) {
    const res = await fetch("/api/admin/questions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, statut: nouveau }),
    });
    setMessage(res.ok ? "Mise à jour effectuée." : "Action impossible.");
    if (res.ok) void charger(statut);
  }

  async function supprimer(id: string) {
    if (!window.confirm("Supprimer définitivement cette question ?")) return;
    const res = await fetch("/api/admin/questions?id=" + encodeURIComponent(id), { method: "DELETE" });
    setMessage(res.ok ? "Question supprimée." : "Suppression impossible.");
    if (res.ok) void charger(statut);
  }

  async function publier() {
    if (!matiereId) return;
    setPublication(true);
    const res = await fetch("/api/admin/publier-devoir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matiereId, dureeMinutes: Number(duree) || 60 }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(
      res.ok
        ? "Devoir publié avec " + data.nbQuestions + " questions. Les étudiants le voient dans QCM & Examens."
        : (data.error ?? "Publication impossible."),
    );
    setPublication(false);
  }

  function toutValider() {
    if (liste.length === 0) return;
    if (!window.confirm("Valider les " + liste.length + " questions affichées ? Relisez-les d'abord.")) return;
    void changer(liste.map((q) => q.id), "VALIDE");
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setStatut(o.id)}
            className={"min-h-[44px] rounded-full px-4 text-xs font-semibold " + (statut === o.id ? "bg-mp-blue text-white" : "mp-card text-mp-grey")}
          >
            {o.label}
          </button>
        ))}
        {statut === "BROUILLON" && liste.length > 0 ? (
          <button type="button" onClick={toutValider} className={BTN + " ml-auto bg-mp-yellow"}>
            Tout valider
          </button>
        ) : null}
      </div>

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Publier un devoir pour les étudiants</h2>
        <p className="mt-1 text-xs text-mp-grey">
          Le devoir reprend jusqu&apos;à 50 questions validées de la matière, tirées au hasard. Il apparaît tout de suite
          dans l&apos;espace des étudiants.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className="mp-label">Matière</label>
            <select className="mp-input" value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
              <option value="">Choisir une matière</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  S{m.semestre} : {m.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Durée (minutes)</label>
            <input
              className="mp-input"
              type="number"
              min={5}
              inputMode="numeric"
              value={duree}
              onChange={(e) => setDuree(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          className="mp-btn-yellow mt-3 min-h-[44px] md:w-56"
          onClick={publier}
          disabled={publication || !matiereId}
        >
          {publication ? "Publication..." : "Publier le devoir"}
        </button>
      </section>

      {message ? <p className="rounded-lg bg-mp-bg px-3 py-2 text-xs">{message}</p> : null}

      {chargement ? (
        <p className="text-xs text-mp-grey">Chargement...</p>
      ) : liste.length === 0 ? (
        <p className="mp-card p-4 text-xs text-mp-grey">Aucune question dans cette liste.</p>
      ) : (
        liste.map((q) => (
          <article key={q.id} className="mp-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-mp-blue">
              {NOMS[q.type]} | {q.matiere ?? "Sans matière"}
            </p>
            {q.contexte ? <p className="mt-2 rounded-lg bg-mp-bg p-3 text-xs leading-relaxed">{q.contexte}</p> : null}
            <p className="mt-2 text-sm font-semibold">{q.question}</p>
            <ul className="mt-2 space-y-1">
              {q.options.map((o, i) => (
                <li
                  key={i}
                  className={"rounded-lg px-3 py-2 text-xs " + (q.bonnesReponses.includes(i) ? "bg-green-50 font-semibold text-green-800" : "bg-mp-bg")}
                >
                  {"ABCDEFG"[i]}. {o}
                </li>
              ))}
            </ul>
            {q.explication ? <p className="mt-2 text-xs text-mp-grey">{q.explication}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {statut !== "VALIDE" ? (
                <button type="button" onClick={() => changer([q.id], "VALIDE")} className={BTN + " bg-mp-yellow"}>
                  Valider
                </button>
              ) : null}
              {statut !== "REJETE" ? (
                <button type="button" onClick={() => changer([q.id], "REJETE")} className={BTN + " border border-[#dfe3e8]"}>
                  Rejeter
                </button>
              ) : null}
              <button type="button" onClick={() => supprimer(q.id)} className={BTN + " text-mp-grey"}>
                Supprimer
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}