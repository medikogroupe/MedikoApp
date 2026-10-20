import { NextResponse } from "next/server";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { FILIERES } from "@/lib/constants";
import { construireDevoir, supprimerQuestions } from "@/lib/devoir";

/**
 * Cree un devoir complet en un seul appel (comme un formulaire) :
 * { titre, module, niveau, consignes, dureeMinutes, dateLancement, filieres, sortiesMax, melanger,
 *   ajouterBanque, sections: [{ titre, description, questions: [...], tirage? }] }
 */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const moduleNom = String(b.module ?? "").trim();
  if (!moduleNom) return NextResponse.json({ error: "Module obligatoire" }, { status: 400 });
  const niveau = ["L1", "L2", "L3", "M1", "M2"].includes(String(b.niveau ?? "")) ? String(b.niveau) : "";
  const dureeMinutes = Math.min(Math.max(Number(b.dureeMinutes) || 30, 1), 300);
  const filieres = Array.isArray(b.filieres)
    ? b.filieres.map(String).filter((f: string) => (FILIERES as readonly string[]).includes(f))
    : [];

  let dateLancement = new Date();
  if (b.dateLancement) {
    const d = new Date(String(b.dateLancement));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "Date invalide." }, { status: 400 });
    dateLancement = d;
  }

  let devoir: Awaited<ReturnType<typeof construireDevoir>>;
  try {
    devoir = await construireDevoir(b.sections, moduleNom, niveau, Boolean(b.ajouterBanque));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Devoir invalide." }, { status: 400 });
  }

  try {
    const [row] = await db
      .insert(qcmAdmin)
      .values({
        titre: String(b.titre || `QCM surveille ${moduleNom}`).slice(0, 120),
        module: moduleNom,
        dureeMinutes,
        nbQuestions: devoir.ids.length,
        dateLancement,
        statut: "ACTIF",
        filieres,
        questionIds: devoir.ids,
        sortiesMax: Math.min(Math.max(Math.round(Number(b.sortiesMax)) || 0, 0), 50),
        melanger: b.melanger === undefined ? true : Boolean(b.melanger),
        niveau,
        consignes: String(b.consignes ?? "").slice(0, 2000),
        sections: devoir.sections,
      })
      .returning();
    return NextResponse.json({ session: row, nbQuestions: devoir.ids.length });
  } catch {
    await supprimerQuestions(devoir.idsNouvelles);
    return NextResponse.json({ error: "Enregistrement du devoir impossible." }, { status: 500 });
  }
}