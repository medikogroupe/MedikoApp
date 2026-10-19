"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import ProtectedZone from "@/components/qcm/ProtectedZone";
import type { ResultatFinal } from "@/components/qcm/types";

function formatPoints(n: number) {
  return `${n > 0 ? "+" : ""}${String(n).replace(".", ",")}`;
}

function formatDuree(s: number) {
  const m = Math.floor(s / 60);
  return `${m} min ${String(s % 60).padStart(2, "0")} s`;
}

export default function QcmResultat({ data, filigrane }: { data: ResultatFinal; filigrane: string }) {
  const { resultat: r, details } = data;
  const pourcentage = r.pointsMax > 0 ? Math.round((Math.max(0, r.points) / r.pointsMax) * 100) : 0;

  return (
    <ProtectedZone filigrane={filigrane}>
      <div className="space-y-3">
        <section className="mp-card p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-mp-grey">Résultat : {r.titre}</p>
          <p className="mt-2 text-5xl font-bold text-mp-blue">
            {String(r.noteSur20).replace(".", ",")}
            <span className="text-xl text-mp-grey">/20</span>
          </p>
          <p className="mt-1 text-sm font-semibold">
            {String(r.points).replace(".", ",")} / {String(r.pointsMax).replace(".", ",")} points ({pourcentage}%)
          </p>
          <p className="mt-1 text-xs text-mp-grey">
            {r.nbJustes} question(s) entièrement juste(s) sur {r.nbQuestions} · {formatDuree(r.dureeSecondes)}
            {r.surveille ? ` · ${r.sorties} sortie(s) d'écran` : ""}
          </p>
        </section>

        {details.map((d, i) => (
          <section key={d.id} className="mp-card p-4">
            <div className="flex items-start gap-2">
              {d.juste ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              ) : d.repondu ? (
                <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
              ) : (
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-mp-grey" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {i + 1}. {d.question}
                  </p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                      d.points > 0 ? "bg-green-50 text-green-700" : d.points < 0 ? "bg-red-50 text-red-700" : "bg-mp-bg text-mp-grey"
                    }`}
                  >
                    {formatPoints(d.points)} / {String(d.pointsMax).replace(".", ",")}
                  </span>
                </div>
                {d.imageId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/qcm/images/${d.imageId}`}
                    alt="Illustration de la question"
                    draggable={false}
                    className="mt-2 max-h-64 w-auto rounded-lg border border-[#dfe3e8]"
                  />
                ) : null}
                {!d.repondu ? <p className="mt-1 text-xs font-semibold text-mp-grey">Non répondu : 0 point.</p> : null}

                <ul className="mt-3 space-y-2">
                  {d.propositions.map((p) => {
                    const bonne = d.bonnes.includes(p.idx);
                    const cochee = d.choisies.includes(p.idx);
                    const etat = bonne && cochee ? "ok" : bonne ? "manquee" : cochee ? "faute" : "neutre";
                    const style = {
                      ok: "border-green-600 bg-green-50",
                      manquee: "border-green-600 border-dashed bg-white",
                      faute: "border-red-600 bg-red-50",
                      neutre: "border-[#dfe3e8] bg-white",
                    }[etat];
                    const libelle = { ok: "Bonne réponse cochée", manquee: "Bonne réponse à cocher", faute: "Erreur", neutre: "" }[etat];
                    return (
                      <li key={p.idx} className={`rounded-[10px] border px-3 py-2 text-sm ${style}`}>
                        <div className="flex items-start gap-2">
                          <span className="font-bold">{String.fromCharCode(65 + p.idx)}.</span>
                          <div className="flex-1">
                            {p.texte ? <span>{p.texte}</span> : null}
                            {p.imageId ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/qcm/images/${p.imageId}`}
                                alt={`Proposition ${String.fromCharCode(65 + p.idx)}`}
                                draggable={false}
                                className="mt-1 max-h-40 w-auto rounded border border-[#dfe3e8]"
                              />
                            ) : null}
                          </div>
                          {libelle ? <span className="shrink-0 text-xs font-semibold">{libelle}</span> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {d.explication ? (
                  <p className="mt-3 rounded-lg bg-mp-bg p-3 text-xs leading-relaxed">
                    <span className="font-bold">Explication : </span>
                    {d.explication}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        ))}
      </div>
    </ProtectedZone>
  );
}
