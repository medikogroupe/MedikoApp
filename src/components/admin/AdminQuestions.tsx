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