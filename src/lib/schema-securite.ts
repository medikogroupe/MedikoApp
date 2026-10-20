import { sql } from "drizzle-orm";
import { db } from "@/db";

/** Colonnes ajoutees apres la creation initiale : sans effet si elles existent deja. */
const INSTRUCTIONS = [
  "alter table qcm add column if not exists obligatoire boolean not null default false",
  "alter table qcm_admin add column if not exists consignes text not null default ''",
  "alter table qcm_admin add column if not exists niveau text not null default ''",
  "alter table qcm_admin add column if not exists sections jsonb not null default '[]'::jsonb",
  "alter table qcm_admin add column if not exists fige_at timestamptz",
  "alter table qcm_admin add column if not exists snapshot jsonb not null default '{}'::jsonb",
];

let fait: Promise<void> | null = null;

/** Applique une seule fois par demarrage du serveur les colonnes manquantes. */
export function assurerSchema(): Promise<void> {
  if (!fait) {
    fait = (async () => {
      for (const instruction of INSTRUCTIONS) {
        try {
          await db.execute(sql.raw(instruction));
        } catch {
          // droits insuffisants ou colonne deja presente : on continue
        }
      }
    })();
  }
  return fait;
}

/** Message lisible : la vraie cause renvoyee par la base, quand elle existe. */
export function messageDetaille(e: Error): string {
  const cause = (e as { cause?: unknown }).cause;
  const detail = cause instanceof Error ? cause.message : "";
  return detail ? `Base de donnees : ${detail}` : e.message;
}