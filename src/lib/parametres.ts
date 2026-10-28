import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { parametres } from "@/db/schema";

export const CLES = ["groupe_whatsapp", "don_lien", "don_message"] as const;
export type Cle = (typeof CLES)[number];

export async function lireParametres(): Promise<Record<Cle, string>> {
  const rows = await db
    .select()
    .from(parametres)
    .where(inArray(parametres.cle, [...CLES]));
  const sortie: Record<Cle, string> = { groupe_whatsapp: "", don_lien: "", don_message: "" };
  for (const r of rows) sortie[r.cle as Cle] = r.valeur;
  return sortie;
}