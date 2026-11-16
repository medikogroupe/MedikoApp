import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { qcmAdmin } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import LiensCompo from "@/components/admin/LiensCompo";

export const dynamic = "force-dynamic";

export default async function AdminLiensPage() {
  if (!(await isAdmin())) {
    return (
      <div className="min-h-dvh bg-mp-bg px-4 py-10">
        <div className="mp-card mx-auto max-w-sm space-y-3 p-5 text-center">
          <p className="text-sm font-bold">Accès réservé</p>
          <p className="text-xs text-mp-grey">Connecte-toi à l&apos;administration, puis reviens sur cette page.</p>
          <Link href="/admin" className="font-semibold text-mp-blue">
            Aller à l&apos;administration
          </Link>
        </div>
      </div>
    );
  }

  const rows = await db
    .select({
      id: qcmAdmin.id,
      titre: qcmAdmin.titre,
      module: qcmAdmin.module,
      dureeMinutes: qcmAdmin.dureeMinutes,
      dateLancement: qcmAdmin.dateLancement,
      statut: qcmAdmin.statut,
      filieres: qcmAdmin.filieres,
    })
    .from(qcmAdmin)
    .orderBy(desc(qcmAdmin.dateLancement))
    .limit(100);

  const avecHex = rows.map((r) => ({ ...r, hex: r.id.replace(/-/g, "") }));
  // Code court de 8 caractères, allongé seulement si deux sessions commencent pareil
  const items = avecHex.map((r) => {
    let n = 8;
    while (n < 32 && avecHex.some((o) => o.id !== r.id && o.hex.startsWith(r.hex.slice(0, n)))) n += 1;
    return {
      id: r.id,
      code: r.hex.slice(0, n),
      titre: r.titre,
      module: r.module,
      dureeMinutes: r.dureeMinutes,
      statut: r.statut,
      invites: r.filieres.length === 0,
      dateTexte: r.dateLancement.toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Africa/Abidjan",
      }),
    };
  });

  return (
    <div className="min-h-dvh bg-mp-bg">
      <header className="bg-mp-blue px-4 py-4 text-white">
        <div className="mx-auto max-w-2xl">
          <p className="text-base font-bold uppercase tracking-wide">Liens des compositions</p>
          <p className="text-xs text-white/75">Copie un lien court et partage-le sur WhatsApp</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-5">
        <LiensCompo items={items} />
      </main>
    </div>
  );
}
