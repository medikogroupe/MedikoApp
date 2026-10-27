"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2 } from "lucide-react";
import PageShell from "@/components/PageShell";

type Pdf = { id: string; titre: string; taille: number; createdAt: string; matiere: string | null };

export default function CoursPdfPage() {
  const [liste, setListe] = useState<Pdf[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pdf-cours")
      .then((r) => (r.ok ? r.json() : { pdf: [] }))
      .then((d) => setListe(d.pdf ?? []))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Cours en PDF" subtitle={`${liste.length} documents disponibles`}>
      <section className="space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-mp-grey">
            <Loader2 size={14} className="animate-spin" /> Chargement
          </p>
        ) : liste.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun cours en PDF pour le moment.</p>
        ) : (
          liste.map((p) => (
            <Link
              key={p.id}
              href={`/lecteur?url=${encodeURIComponent(`/api/pdf-cours/${p.id}`)}&titre=${encodeURIComponent(p.titre)}`}
              className="mp-card flex min-h-[44px] items-center gap-3 p-4"
            >
              <BookOpen size={20} className="shrink-0 text-mp-blue" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.titre}</p>
                <p className="text-xs text-mp-grey">
                  {p.matiere ?? "Général"} · {(p.taille / 1024).toFixed(0)} Ko
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </PageShell>
  );
}