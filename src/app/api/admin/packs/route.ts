import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { packsConfig } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

type Corps = Record<string, unknown>;
type Champs = Partial<typeof packsConfig.$inferInsert>;

/** Vide = accepté (le pack redirige alors vers WhatsApp). Sinon https:// obligatoire. */
function validerLien(valeur: unknown): string {
  const lien = String(valeur ?? "").trim();
  if (lien === "") return "";
  if (lien.length > 500) throw new Error("Le lien de paiement est trop long (500 caractères max).");
  let url: URL;
  try {
    url = new URL(lien);
  } catch {
    throw new Error("Le lien de paiement n'est pas une adresse valide.");
  }
  if (url.protocol !== "https:") {
    throw new Error("Le lien de paiement doit commencer par https://");
  }
  return lien;
}

/** Ne retient que les champs présents dans le corps et les valide. */
function lireChamps(b: Corps): Champs {
  const champs: Champs = {};
  if (b.nomPack !== undefined) {
    const nom = String(b.nomPack).trim();
    if (!nom) throw new Error("Le nom du pack est obligatoire.");
    champs.nomPack = nom.slice(0, 80);
  }
  if (b.prixFcfa !== undefined) {
    const prix = Number(b.prixFcfa);
    if (!Number.isFinite(prix) || prix < 0) throw new Error("Le prix doit être un nombre positif.");
    champs.prixFcfa = Math.round(prix);
  }
  if (b.dureeJours !== undefined) {
    const duree = Number(b.dureeJours);
    if (!Number.isFinite(duree) || duree < 1) throw new Error("La durée doit être d'au moins 1 jour.");
    champs.dureeJours = Math.round(duree);
  }
  if (b.lienPaiement !== undefined) champs.lienPaiement = validerLien(b.lienPaiement);
  if (b.description !== undefined) champs.description = String(b.description ?? "").slice(0, 500);
  if (b.noteAdmin !== undefined) champs.noteAdmin = String(b.noteAdmin ?? "").slice(0, 500);
  if (b.estActif !== undefined) champs.estActif = Boolean(b.estActif);
  if (b.ordre !== undefined) champs.ordre = Math.round(Number(b.ordre)) || 0;
  return champs;
}

function erreur(e: unknown) {
  const message = e instanceof Error ? e.message : "Requête invalide.";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db
    .select()
    .from(packsConfig)
    .orderBy(asc(packsConfig.ordre), asc(packsConfig.prixFcfa));
  return NextResponse.json({ packs: rows });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b: Corps = await request.json().catch(() => ({}));
  try {
    const champs = lireChamps(b);
    const rows = await db
      .insert(packsConfig)
      .values({
        nomPack: champs.nomPack ?? "Nouveau pack",
        prixFcfa: champs.prixFcfa ?? 0,
        dureeJours: champs.dureeJours ?? 30,
        lienPaiement: champs.lienPaiement ?? "",
        description: champs.description ?? "",
        noteAdmin: champs.noteAdmin ?? "",
        estActif: champs.estActif ?? false,
        ordre: champs.ordre ?? 99,
      })
      .returning();
    return NextResponse.json({ pack: rows[0] });
  } catch (e) {
    return erreur(e);
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b: Corps = await request.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  try {
    const champs = lireChamps(b);
    if (Object.keys(champs).length === 0) {
      return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
    }
    const rows = await db
      .update(packsConfig)
      .set(champs)
      .where(eq(packsConfig.id, String(b.id)))
      .returning();
    if (!rows[0]) return NextResponse.json({ error: "Pack introuvable." }, { status: 404 });
    return NextResponse.json({ pack: rows[0] });
  } catch (e) {
    return erreur(e);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await db.delete(packsConfig).where(eq(packsConfig.id, id));
  return NextResponse.json({ ok: true });
}
