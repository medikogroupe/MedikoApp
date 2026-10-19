"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudUpload, Loader2, MessageSquare, Share2, ThumbsUp } from "lucide-react";
import PageShell from "@/components/PageShell";
import { MATIERES } from "@/lib/constants";

type Publication = {
  id: string;
  titre: string;
  matiere: string | null;
  description: string | null;
  createdAt: string;
  auteur: string | null;
  filiere: string | null;
};

export default function CommunautePage() {
  const [items, setItems] = useState<Publication[]>([]);
  const [titre, setTitre] = useState("");
  const [matiere, setMatiere] = useState(MATIERES[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/communaute");
    if (res.ok) setItems((await res.json()).publications ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function publier(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/communaute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, matiere, description }),
    });
    setSaving(false);
    if (res.ok) {
      setTitre("");
      setDescription("");
      setStatus("Publication envoyée. Elle sera visible après validation par l'équipe.");
      void load();
    } else {
      setStatus("Connectez-vous pour publier un cours.");
    }
  }

  return (
    <PageShell title="Communauté" subtitle="Partage de cours et QCM vérifiés">
      <form onSubmit={publier} className="mp-card space-y-3 p-4">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#cfd7e0] py-6">
          <CloudUpload size={28} className="text-mp-blue" />
          <p className="mt-2 text-sm font-semibold">Ajouter un cours</p>
          <p className="text-[11px] text-mp-grey">Contenu relu avant publication</p>
        </div>
        <div>
          <label className="mp-label">Titre du cours</label>
          <input className="mp-input" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Ex : Anatomie du cœur" />
        </div>
        <div>
          <label className="mp-label">Matière</label>
          <select className="mp-input" value={matiere} onChange={(e) => setMatiere(e.target.value)}>
            {MATIERES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mp-label">Description</label>
          <textarea
            className="mp-input h-24 resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ajouter une description"
          />
        </div>
        {status ? <p className="rounded-lg bg-mp-bg px-3 py-2 text-xs">{status}</p> : null}
        <button type="submit" className="mp-btn-yellow" disabled={saving || !titre}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : null} Publier le cours
        </button>
      </form>

      <section className="mt-4 space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-mp-grey">
            <Loader2 size={14} className="animate-spin" /> Chargement
          </p>
        ) : items.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">
            Aucune publication validée pour le moment. Soyez le premier à partager une fiche.
          </p>
        ) : (
          items.map((p) => (
            <article key={p.id} className="mp-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mp-blue text-sm font-bold text-white">
                  {(p.auteur ?? "M").slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold">{p.auteur ?? "Étudiant MEDIKO+"}</p>
                  <p className="text-[11px] text-mp-grey">
                    {p.filiere ?? ""} · {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{p.titre}</p>
              <p className="mt-1 text-xs text-mp-grey">
                {p.matiere} — {p.description}
              </p>
              <div className="mt-3 flex items-center gap-5 text-xs text-mp-grey">
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} /> Réponses
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp size={14} /> Utile
                </span>
                <span className="flex items-center gap-1">
                  <Share2 size={14} /> Partager
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </PageShell>
  );
}
