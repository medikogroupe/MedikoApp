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
  const [importMsg, setImportMsg] = useState("");

  async function importerDevoir(fichier: File | undefined) {
    if (!fichier) return;
    setImportMsg("Import en cours...");
    try {
      const donnees = JSON.parse(await fichier.text());
      const res = await fetch("/api/admin/qcm/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setImportMsg(`Devoir import\u00e9 (${data.nbQuestions} question(s)). Il est cl\u00f4tur\u00e9 : cliquez sur R\u00e9activer pour l'ouvrir.`);
        await charger();
      } else {
        setImportMsg(data.error ?? "Import impossible.");
      }
    } catch {
      setImportMsg("Fichier invalide.");
    }
  }

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Devoirs cr&eacute;&eacute;s</h2>
          <label className="mp-btn-ghost min-h-[44px] cursor-pointer md:w-auto md:px-4">
            Importer un devoir (.json)
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                void importerDevoir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {importMsg ? <p className="mt-2 text-xs font-semibold text-mp-blue">{importMsg}</p> : null}
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
                  <a href={`/api/admin/qcm/export?id=${s.id}`} download className="flex min-h-[44px] items-center rounded-lg bg-mp-bg px-3 text-xs font-semibold">Exporter</a>
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
          {sessions.length === 0 ? <li className="text-xs text-mp-grey">Aucun devoir.</li> : null}
        </ul>
      </section>
    </div>
  );
}
