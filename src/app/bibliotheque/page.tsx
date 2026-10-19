"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, FolderOpen, Loader2, ScanLine, Search, Trash2, Upload } from "lucide-react";
import PageShell from "@/components/PageShell";

type Document = {
  id: string;
  nomFichier: string;
  urlStorage: string;
  dossier: string;
  taille: number;
  createdAt: string;
};

const DOSSIERS = ["Général", "Semestre 1", "Semestre 2", "Stage", "Examens"];

export default function BibliothequePage() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dossier, setDossier] = useState("Tous");
  const [uploadDossier, setUploadDossier] = useState(DOSSIERS[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/bibliotheque");
    if (res.ok) {
      const data = await res.json();
      setDocs(data.documents ?? []);
      localStorage.setItem("mp_biblio_cache", JSON.stringify(data.documents ?? []));
    } else {
      const cached = localStorage.getItem("mp_biblio_cache");
      if (cached) setDocs(JSON.parse(cached) as Document[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      docs.filter(
        (d) =>
          (dossier === "Tous" || d.dossier === dossier) &&
          d.nomFichier.toLowerCase().includes(q.toLowerCase()),
      ),
    [docs, q, dossier],
  );

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > 8 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 8 Mo).");
      return;
    }
    setUploading(true);
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    const res = await fetch("/api/bibliotheque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomFichier: file.name,
        dossier: uploadDossier,
        taille: file.size,
        mime: file.type || "application/pdf",
        contenu: btoa(binary),
      }),
    });
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload impossible");
      return;
    }
    void load();
  }

  async function remove(id: string) {
    await fetch(`/api/bibliotheque?id=${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <PageShell title="Bibliothèque perso" subtitle={`${docs.length} documents enregistrés`}>
      <section className="mp-card p-4">
        <div className="flex items-center gap-2 rounded-lg bg-mp-bg px-3 py-2">
          <Search size={16} className="text-mp-grey" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Rechercher un document"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Tous", ...DOSSIERS].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDossier(d)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                dossier === d ? "bg-mp-blue text-white" : "bg-mp-bg text-mp-grey"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="text-sm font-bold">Ajouter un document</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mp-label">Dossier</label>
            <select className="mp-input" value={uploadDossier} onChange={(e) => setUploadDossier(e.target.value)}>
              {DOSSIERS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mp-label">Fichier PDF / image</label>
            <input ref={inputRef} type="file" accept="application/pdf,image/*" className="mp-input" onChange={onFile} />
          </div>
        </div>
        {error ? <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button type="button" className="mp-btn-ghost" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Importer
          </button>
          <Link href="/scanner" className="mp-btn-yellow">
            <ScanLine size={16} /> Scanner
          </Link>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        {loading ? (
          <p className="flex items-center gap-2 text-xs text-mp-grey">
            <Loader2 size={14} className="animate-spin" /> Chargement
          </p>
        ) : filtered.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun document dans ce dossier.</p>
        ) : (
          filtered.map((d) => (
            <article key={d.id} className="mp-card flex items-center gap-3 p-4">
              <FolderOpen size={20} className="text-mp-blue" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{d.nomFichier}</p>
                <p className="text-xs text-mp-grey">
                  {d.dossier} · {(d.taille / 1024).toFixed(0)} Ko ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <a href={d.urlStorage} target="_blank" rel="noreferrer" aria-label="Ouvrir">
                <Download size={18} className="text-mp-grey" />
              </a>
              <button type="button" onClick={() => remove(d.id)} aria-label="Supprimer">
                <Trash2 size={18} className="text-mp-grey" />
              </button>
            </article>
          ))
        )}
      </section>
    </PageShell>
  );
}
