import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { jeuCas } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import type { Cas } from "@/lib/parcours-cas";
import { assurerCasParDefaut, enregistrerCas, validerCas, versCas } from "@/lib/parcours-serveur";
import { messageDetaille } from "@/lib/schema-securite";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Liste de tous les cas (actifs et brouillons). */
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  try {
    await assurerCasParDefaut();
    const rows = await db.select().from(jeuCas).orderBy(asc(jeuCas.ordre), asc(jeuCas.createdAt));
    return NextResponse.json({
      cas: rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        titre: r.titre,
        gravite: r.gravite,
        patient: r.patient,
        icone: r.icone,
        statut: r.statut,
        nbEtapes: versCas(r).etapes.length,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? messageDetaille(e) : "Erreur." }, { status: 500 });
  }
}

/** Corps : { action: "statut", id, statut } | { action: "supprimer", id } | { action: "importer", donnees } */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => null);
  const action = String(b?.action ?? "");
  try {
    if (action === "statut" || action === "supprimer") {
      const id = String(b?.id ?? "");
      if (!UUID.test(id)) return NextResponse.json({ error: "Cas invalide." }, { status: 400 });
      const [r] = await db.select().from(jeuCas).where(eq(jeuCas.id, id)).limit(1);
      if (!r) return NextResponse.json({ error: "Cas introuvable." }, { status: 404 });
      if (action === "supprimer") {
        await db.delete(jeuCas).where(eq(jeuCas.id, id));
        return NextResponse.json({ ok: true });
      }
      const statut = String(b?.statut ?? "");
      if (statut !== "ACTIF" && statut !== "BROUILLON") return NextResponse.json({ error: "Statut invalide." }, { status: 400 });
      if (statut === "ACTIF" && versCas(r).etapes.length === 0) {
        return NextResponse.json({ error: "Ce cas n'a aucune étape : impossible de l'activer." }, { status: 400 });
      }
      await db.update(jeuCas).set({ statut }).where(eq(jeuCas.id, id));
      return NextResponse.json({ ok: true });
    }

    if (action === "importer") {
      let donnees: unknown = b?.donnees;
      if (typeof donnees === "string") {
        try {
          donnees = JSON.parse(donnees);
        } catch (e) {
          return NextResponse.json({ error: "JSON invalide : " + (e instanceof Error ? e.message : "lecture impossible") }, { status: 400 });
        }
      }
      const liste = Array.isArray(donnees) ? donnees : [donnees];
      if (liste.length === 0 || liste.length > 30) return NextResponse.json({ error: "Importez entre 1 et 30 cas à la fois." }, { status: 400 });
      const valides: Cas[] = [];
      const erreurs: string[] = [];
      liste.forEach((x, i) => {
        const r = validerCas(x);
        if ("erreur" in r) erreurs.push("Cas " + (i + 1) + " : " + r.erreur);
        else valides.push(r.cas);
      });
      if (erreurs.length > 0) return NextResponse.json({ error: erreurs.join(" ") }, { status: 400 });
      // Un cas importe (ou reimporte) reste en brouillon tant que l'admin ne l'a pas relu et active.
      for (const c of valides) await enregistrerCas(c, "BROUILLON");
      return NextResponse.json({ ok: true, importes: valides.length });
    }
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? messageDetaille(e) : "Erreur." }, { status: 500 });
  }
}