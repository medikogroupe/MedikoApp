"use client";

import { useCallback, useEffect, useState } from "react";
import { FILIERES } from "@/lib/constants";
import { estAVerifier, retirerMarqueur } from "@/lib/generation";

type TypeQuestion = "QCU" | "QCM" | "QCD" | "CAS";

type Question = {
  id: string;
  type: TypeQuestion;
  contexte: string;
  question: string;
  options: string[];
  bonnesReponses: number[];
  explication: string;
  statut: string;
  matiere: string | null;
};

type Edition = {
  id: string;
  type: TypeQuestion;
  contexte: string;
  question: string;
  options: string[];
  bonnes: number[];
  explication: string;
};

const ONGLETS = [
  { id: "BROUILLON", label: "À relire" },
  { id: "VALIDE", label: "Validées" },
  { id: "REJETE", label: "Rejetées" },
];
const NOMS = { QCU: "QCU (choix unique)", QCM: "QCM (choix multiple)", QCD: "QCD (vrai ou faux)", CAS: "Cas clinique" };
const BTN = "min-h-[44px] rounded-lg px-3 text-xs font-bold uppercase";

function heureLocale(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function libelleFiliere(f: string) {
  return f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ");
}

export default function AdminQuestions() {
  const [statut, setStatut] = useState("BROUILLON");
  const [liste, setListe] = useState<Question[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [matieres, setMatieres] = useState<{ id: string; nom: string; semestre: number }[]>([]);
  const [matiereId, setMatiereId] = useState("");
  const [titre, setTitre] = useState("");
  const [nbQuestions, setNbQuestions] = useState("50");
  const [duree, setDuree] = useState("60");
  const [dateProg, setDateProg] = useState("");
  const [filieres, setFilieres] = useState<string[]>([]);
  const [sortiesMax, setSortiesMax] = useState("0");
  const [antiTriche, setAntiTriche] = useState(false);
  const [publication, setPublication] = useState(false);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [erreurEdition, setErreurEdition] = useState("");

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
      body: JSON.stringify({
        matiereId,
        titre: titre.trim() || undefined,
        nbQuestions: Number(nbQuestions) || 50,
        dureeMinutes: Number(duree) || 60,
        dateLancement: dateProg ? new Date(dateProg).toISOString() : undefined,
        filieres,
        sortiesMax: Number(sortiesMax) || 0,
        antiTriche,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const quand = data.programme
        ? "Devoir programmé avec " + data.nbQuestions + " questions : il s'ouvrira le " +
          new Date(data.dateLancement).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" }) + "."
        : "Devoir publié avec " + data.nbQuestions + " questions. Les étudiants le voient dans QCM & Examens.";
      const reste = data.ignorees > 0 ? " " + data.ignorees + " question(s) à vérifier n'ont pas été incluses." : "";
      setMessage(quand + reste);
    } else {
      setMessage(data.error ?? "Publication impossible.");
    }
    setPublication(false);
  }

  function toutValider() {
    if (liste.length === 0) return;
    const aVerifier = liste.filter((q) => estAVerifier(q.explication)).length;
    const alerte =
      aVerifier > 0
        ? "\n\n" + aVerifier + " question(s) ont une réponse proposée par l'IA et restent à confirmer avec Modifier : elles ne seront pas publiées tant que vous ne les confirmez pas."
        : "";
    if (!window.confirm("Valider les " + liste.length + " questions affichées ? Relisez-les d'abord." + alerte)) return;
    void changer(liste.map((q) => q.id), "VALIDE");
  }

  function ouvrirEdition(q: Question) {
    setErreurEdition("");
    setEdition({
      id: q.id,
      type: q.type,
      contexte: q.contexte,
      question: q.question,
      options: [...q.options],
      bonnes: [...q.bonnesReponses],
      explication: retirerMarqueur(q.explication),
    });
  }

  function cocher(i: number) {
    setEdition((e) => {
      if (!e) return e;
      if (e.type !== "QCM") return { ...e, bonnes: [i] };
      return { ...e, bonnes: e.bonnes.includes(i) ? e.bonnes.filter((x) => x !== i) : [...e.bonnes, i].sort((a, b) => a - b) };
    });
  }

  async function enregistrerEdition() {
    if (!edition) return;
    setErreurEdition("");
    const res = await fetch("/api/admin/questions/modifier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: edition.id,
        type: edition.type,
        contexte: edition.contexte,
        question: edition.question,
        options: edition.options,
        bonnesReponses: edition.bonnes,
        explication: edition.explication,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErreurEdition(data.error ?? "Enregistrement impossible.");
      return;
    }
    setEdition(null);
    setMessage("Question enregistrée et confirmée.");
    void charger(statut);
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
        <h2 className="text-sm font-bold">Publier ou programmer un devoir</h2>
        <p className="mt-1 text-xs text-mp-grey">
          Le devoir reprend jusqu&apos;à 50 questions validées de la matière, tirées au hasard. Laissez la date vide pour le publier tout de
          suite, ou choisissez un jour et une heure : les étudiants le voient « bientôt » puis il s&apos;ouvre à l&apos;heure prévue.
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
            <label className="mp-label">Titre (facultatif)</label>
            <input className="mp-input" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Nombre de questions (5 à 50)</label>
            <input className="mp-input" type="number" min={5} max={50} inputMode="numeric" value={nbQuestions} onChange={(e) => setNbQuestions(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Durée (minutes)</label>
            <input className="mp-input" type="number" min={5} inputMode="numeric" value={duree} onChange={(e) => setDuree(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Sorties d&apos;écran tolérées (0 = illimité)</label>
            <input className="mp-input" type="number" min={0} inputMode="numeric" value={sortiesMax} onChange={(e) => setSortiesMax(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="mp-label">Date et heure de publication (vide = maintenant)</label>
            <input
              className="mp-input"
              type="datetime-local"
              min={heureLocale()}
              value={dateProg}
              onChange={(e) => setDateProg(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="mp-label">Filières concernées</label>
          <div className="flex flex-wrap gap-2">
            {FILIERES.map((f) => {
              const actif = filieres.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => setFilieres(actif ? filieres.filter((x) => x !== f) : [...filieres, f])}
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
            {filieres.length === 0 ? "Aucune filière cochée : ouvert à toutes les filières." : "Ouvert uniquement aux filières cochées."}
          </p>
        </div>

        <label className="mt-3 flex min-h-[44px] items-start gap-3 rounded-lg border border-[#dfe3e8] bg-white p-3 text-xs">
          <input type="checkbox" className="mt-0.5 h-5 w-5" checked={antiTriche} onChange={(e) => setAntiTriche(e.target.checked)} />
          <span>
            <span className="block text-sm font-bold">Activer l&apos;anti-triche</span>
            <span className="block text-mp-grey">Filigrane au nom de l&apos;&eacute;tudiant sur tout le sujet, copier-coller et menu clic long d&eacute;sactiv&eacute;s.</span>
          </span>
        </label>

        <button type="button" className="mp-btn-yellow mt-3 min-h-[44px] md:w-64" onClick={publier} disabled={publication || !matiereId}>
          {publication ? "Enregistrement..." : dateProg ? "Programmer le devoir" : "Publier le devoir"}
        </button>
      </section>

      {message ? <p className="rounded-lg bg-mp-bg px-3 py-2 text-xs">{message}</p> : null}

      {chargement ? (
        <p className="text-xs text-mp-grey">Chargement...</p>
      ) : liste.length === 0 ? (
        <p className="mp-card p-4 text-xs text-mp-grey">Aucune question dans cette liste.</p>
      ) : (
        liste.map((q) => {
          const aVerifier = estAVerifier(q.explication);
          const enEdition = edition?.id === q.id;
          return (
            <article key={q.id} className="mp-card p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-mp-blue">
                {NOMS[q.type]} | {q.matiere ?? "Sans matière"}
              </p>
              {aVerifier ? (
                <p className="mt-2 rounded-lg border border-mp-blue bg-[#eaf1f8] px-3 py-2 text-xs font-semibold text-mp-blue">
                  À vérifier : la réponse n&apos;est pas indiquée dans le document, elle est proposée par l&apos;IA. Confirmez-la avec Modifier.
                </p>
              ) : null}

              {enEdition && edition ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="mp-label">Type</label>
                    <select
                      className="mp-input"
                      value={edition.type}
                      onChange={(e) => {
                        const type = e.target.value as TypeQuestion;
                        setEdition({ ...edition, type, bonnes: type === "QCM" ? edition.bonnes : edition.bonnes.slice(0, 1) });
                      }}
                    >
                      {(Object.keys(NOMS) as TypeQuestion[]).map((t) => (
                        <option key={t} value={t}>
                          {NOMS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  {edition.type === "CAS" ? (
                    <div>
                      <label className="mp-label">Cas clinique (contexte)</label>
                      <textarea className="mp-input min-h-[88px]" value={edition.contexte} onChange={(e) => setEdition({ ...edition, contexte: e.target.value })} />
                    </div>
                  ) : null}
                  <div>
                    <label className="mp-label">Question</label>
                    <textarea className="mp-input min-h-[72px]" value={edition.question} onChange={(e) => setEdition({ ...edition, question: e.target.value })} />
                  </div>
                  <div>
                    <label className="mp-label">Propositions (cochez {edition.type === "QCM" ? "les bonnes réponses" : "la bonne réponse"})</label>
                    <div className="space-y-2">
                      {edition.options.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <label className="flex min-h-[44px] min-w-[44px] items-center justify-center">
                            <input
                              type={edition.type === "QCM" ? "checkbox" : "radio"}
                              name={"bonne-" + q.id}
                              className="h-5 w-5"
                              checked={edition.bonnes.includes(i)}
                              onChange={() => cocher(i)}
                              aria-label={"Bonne réponse " + "ABCDEFG"[i]}
                            />
                          </label>
                          <span className="w-4 text-xs font-bold">{"ABCDEFG"[i]}</span>
                          <input
                            className="mp-input flex-1"
                            value={o}
                            onChange={(e) => setEdition({ ...edition, options: edition.options.map((x, n) => (n === i ? e.target.value : x)) })}
                          />
                          {edition.type !== "QCD" && edition.options.length > 3 ? (
                            <button
                              type="button"
                              aria-label="Retirer la proposition"
                              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-xs font-bold text-mp-grey"
                              onClick={() =>
                                setEdition({
                                  ...edition,
                                  options: edition.options.filter((_, n) => n !== i),
                                  bonnes: edition.bonnes.filter((b) => b !== i).map((b) => (b > i ? b - 1 : b)),
                                })
                              }
                            >
                              X
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {edition.type !== "QCD" && edition.options.length < 7 ? (
                      <button
                        type="button"
                        className="mt-2 min-h-[44px] text-xs font-semibold text-mp-blue"
                        onClick={() => setEdition({ ...edition, options: [...edition.options, ""] })}
                      >
                        Ajouter une proposition
                      </button>
                    ) : null}
                  </div>
                  <div>
                    <label className="mp-label">Explication</label>
                    <textarea className="mp-input min-h-[64px]" value={edition.explication} onChange={(e) => setEdition({ ...edition, explication: e.target.value })} />
                  </div>
                  {erreurEdition ? <p className="text-xs font-semibold text-red-700">{erreurEdition}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={BTN + " bg-mp-yellow"} onClick={() => void enregistrerEdition()}>
                      Enregistrer et confirmer
                    </button>
                    <button type="button" className={BTN + " border border-[#dfe3e8]"} onClick={() => setEdition(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                  {retirerMarqueur(q.explication) ? <p className="mt-2 text-xs text-mp-grey">{retirerMarqueur(q.explication)}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => ouvrirEdition(q)} className={BTN + " border border-mp-blue text-mp-blue"}>
                      Modifier
                    </button>
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
                </>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
