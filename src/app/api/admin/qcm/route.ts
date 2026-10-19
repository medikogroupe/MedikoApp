import { NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { qcm, qcmAdmin } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { FILIERES } from "@/lib/constants";
import { UUID_RE } from "@/lib/qcm";
import { colonnesSession } from "@/lib/qcm-server";

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const rows = await db.select(colonnesSession).from(qcmAdmin).orderBy(desc(qcmAdmin.dateLancement)).limit(50);
  return NextResponse.json({ sessions: rows });
}

/**
 * Crée une session. Les questions sont figées au lancement : soit la liste `questionIds`
 * choisie par l'admin, soit un tirage au sort de `nbQuestions` dans le module.
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const moduleNom = String(b.module ?? "").trim();
  if (!moduleNom) return NextResponse.json({ error: "Module obligatoire" }, { status: 400 });
  const niveau = ["L1", "L2", "L3", "M1", "M2"].includes(String(b.niveau ?? "")) ? String(b.niveau) : "";

  const dureeMinutes = Math.min(Math.max(Number(b.dureeMinutes) || 30, 1), 300);
  const nbDemande = Math.min(Math.max(Number(b.nbQuestions) || 10, 1), 100);
  const filieres = Array.isArray(b.filieres)
    ? b.filieres.map(String).filter((f: string) => (FILIERES as readonly string[]).includes(f))
    : [];

  type SectionIn = { titre: string; description: string; questionIds: string[] };
  const sectionsClean: SectionIn[] = [];
  let ids: string[] = [];
  if (Array.isArray(b.sections) && b.sections.length > 0) {
    const deja = new Set<string>();
    for (const s of b.sections.slice(0, 20)) {
      let sel: string[] = Array.isArray(s?.questionIds) ? s.questionIds.map(String).filter((i: string) => UUID_RE.test(i)) : [];
      const nb = Math.min(Math.max(Number(s?.nb) || 0, 0), 100);
      if (sel.length === 0 && nb > 0) {
        const tir = await db
          .select({ id: qcm.id })
          .from(qcm)
          .where(and(eq(qcm.matiere, moduleNom), eq(qcm.actif, true), ...(niveau ? [eq(qcm.niveau, niveau)] : [])))
          .orderBy(sql`random()`)
          .limit(nb + deja.size);
        sel = tir.map((r) => r.id).filter((i) => !deja.has(i)).slice(0, nb);
      }
      sel = sel.filter((i) => !deja.has(i));
      sel.forEach((i) => deja.add(i));
      sectionsClean.push({
        titre: String(s?.titre ?? "").slice(0, 120),
        description: String(s?.description ?? "").slice(0, 500),
        questionIds: sel,
      });
    }
    ids = sectionsClean.flatMap((s) => s.questionIds);
  } else {
    ids = Array.isArray(b.questionIds) ? b.questionIds.map(String).filter((i: string) => UUID_RE.test(i)) : [];
  }
  if (ids.length > 0) {
    const existantes = await db.select({ id: qcm.id }).from(qcm).where(and(inArray(qcm.id, ids), eq(qcm.actif, true)));
    const ok = new Set(existantes.map((r) => r.id));
    ids = ids.filter((i) => ok.has(i));
  } else {
    const tirage = await db
      .select({ id: qcm.id })
      .from(qcm)
      .where(and(eq(qcm.matiere, moduleNom), eq(qcm.actif, true), ...(niveau ? [eq(qcm.niveau, niveau)] : [])))
      .orderBy(sql`random()`)
      .limit(nbDemande);
    ids = tirage.map((r) => r.id);
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: `Aucune question active dans le module "${moduleNom}". Ajoutez-en dans la banque.` }, { status: 400 });
  }

  let dateLancement = new Date();
  if (b.dateLancement) {
    const d = new Date(String(b.dateLancement));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    dateLancement = d;
  }

  const [row] = await db
    .insert(qcmAdmin)
    .values({
      titre: String(b.titre || `QCM surveillé ${moduleNom}`).slice(0, 120),
      module: moduleNom,
      dureeMinutes,
      nbQuestions: ids.length,
      dateLancement,
      statut: "ACTIF",
      filieres,
      questionIds: ids,
      sortiesMax: Math.min(Math.max(Math.round(Number(b.sortiesMax)) || 0, 0), 50),
      melanger: b.melanger === undefined ? true : Boolean(b.melanger),
      niveau,
      consignes: String(b.consignes ?? "").slice(0, 2000),
      sections: sectionsClean,
    })
    .returning();
  return NextResponse.json({ session: row, nbQuestions: ids.length });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  if (!UUID_RE.test(String(b.id ?? ""))) return NextResponse.json({ error: "id invalide" }, { status: 400 });
  const patch: Partial<typeof qcmAdmin.$inferInsert> = {};
  if (b.statut !== undefined) patch.statut = b.statut === "ACTIF" ? "ACTIF" : "CLOTURE";
  if (Array.isArray(b.filieres)) {
    patch.filieres = b.filieres.map(String).filter((f: string) => (FILIERES as readonly string[]).includes(f));
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Rien à mettre à jour." }, { status: 400 });
  const [row] = await db.update(qcmAdmin).set(patch).where(eq(qcmAdmin.id, String(b.id))).returning();
  return NextResponse.json({ session: row });
}
