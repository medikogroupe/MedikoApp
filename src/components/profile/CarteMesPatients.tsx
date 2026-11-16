"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Stethoscope } from "lucide-react";

type Suivi = {
  id: string;
  cas: string;
  patient: string;
  titre: string;
  statut: string;
  jour: number;
  consultations: number;
  issue: string | null;
};

const ISSUE: Record<string, string> = {
  GUERISON: "Guérison",
  SEQUELLES: "Suivi incomplet",
  DECES: "Patient décédé",
  ABANDON: "Abandonné",
};

/** Carte du profil : suivis de simulation de l'etudiant, avec reprise en un clic. */
export default function CarteMesPatients() {
  const [suivis, setSuivis] = useState<Suivi[] | null>(null);

  useEffect(() => {
    let actif = true;
    fetch("/api/jeux/suivi/liste", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { suivis?: Suivi[] }) => {
        if (actif) setSuivis(d.suivis ?? []);
      })
      .catch(() => {
        if (actif) setSuivis([]);
      });
    return () => {
      actif = false;
    };
  }, []);

  const enCours = (suivis ?? []).filter((s) => s.statut === "EN_COURS");
  const termines = (suivis ?? []).filter((s) => s.statut !== "EN_COURS").slice(0, 3);

  return (
    <section className="mp-card mt-4 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Stethoscope size={16} className="text-mp-blue" /> Mes patients
      </h2>

      {suivis === null ? (
        <p className="mt-2 text-xs text-mp-grey">Chargement...</p>
      ) : enCours.length === 0 ? (
        <p className="mt-2 text-xs text-mp-grey">Aucun patient en suivi. Choisissez un patient pour commencer une simulation.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {enCours.map((s) => (
            <li key={s.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
              <div className="flex-1">
                <p className="text-sm font-semibold">{s.patient}</p>
                <p className="text-xs text-mp-grey">
                  Jour {s.jour} · {s.consultations} consultation(s)
                </p>
              </div>
              <Link
                href={`/jeux/consultation?cas=${s.cas}`}
                className="flex min-h-[44px] items-center rounded-lg bg-mp-yellow px-3 text-xs font-bold uppercase"
              >
                Reprendre
              </Link>
            </li>
          ))}
        </ul>
      )}

      {termines.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {termines.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-mp-grey">
              <span>{s.patient}</span>
              <span className="font-semibold text-mp-blue">{ISSUE[s.issue ?? ""] ?? "Terminé"}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link href="/jeux/parcours" className="mp-btn-yellow inline-flex items-center justify-center">
          Choisir un patient
        </Link>
        <Link href="/plus" className="mp-btn-ghost inline-flex items-center justify-center">
          Plus de services
        </Link>
      </div>
    </section>
  );
}