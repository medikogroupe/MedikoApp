"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, Loader2, Trash2, Upload } from "lucide-react";

type Matiere = { id: string; nom: string; semestre: number };
type Pdf = { id: string; titre: string; nomFichier: string; taille: number; createdAt: string; matiere: string | null };

const MAX_OCTETS = 3_000_000;

export default function AdminPdf() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [liste, setListe] = useState<Pdf[]>([]);
  const [titre, setTitre] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const charger = useCallback(async () => {
    const [m, p] = await Promise.all([fetch("/api/matieres"), fetch("/api/admin/pdf")]);
    if (m.ok) setMatieres(((await m.json()) as { matieres: Matiere[] }).matieres ?? []);
    if (p.ok) setListe(((await p.json()) as { pdf: Pdf[] }).pdf ?? []);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  function lireBase64(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
      r.onerror = () => reject(new Error("lecture"));
      r.readAsDataURL(f);
    });
  }

  async function envoyer() {
    setMessage("");
    if (!titre.trim()) return setMessage("Donnez un titre au document.");
    if (!fichier) return setMessage("Choisissez un fichier PDF.");
    if (!fichier.name.toLowerCase().endsWith(".pdf")) return setMessage("Le fichier doit être un PDF.");
    if (fichier.size > MAX_OCTETS) return setMessage("PDF trop volumineux (3 Mo maximum).");
    setEnvoi(true);
    try {
      const contenu = await lireBase64(fichier);
      const res = await fetch("/api/admin/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: titre.trim(),
          matiereId: matiereId || null,
          nomFichier: fichier.name,
          taille: fichier.size,
          contenu,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error ?? "Envoi impossible.");
      } else {
        setMessage("Document ajouté. Les étudiants le voient immédiatement.");
        setTitre("");
        setMatiereId("");
        setFichier(null);
        if (inputRef.current) inputRef.current.value = "";
        void charger();
      }
    } catch {
      setMessage("Envoi impossible. Vérifiez votre connexion.");
    }
    setEnvoi(false);
  }

  async function supprimer(p: Pdf) {
    if (!window.confirm(`Supprimer "${p.titre}" ?`)) return;
    const res = await fetch(`/api/admin/pdf?id=${encodeURIComponent(p.id)}`, { method: "DELETE" });
    setMessage(res.ok ? "Document supprimé." : "Suppression impossible.");
    if (res.ok) void charger();
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Ajouter un cours en PDF</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mp-label">Titre</label>
            <input className="mp-input" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Matière</label>
            <select className="mp-input" value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
              <option value="">Général (aucune matière)</option>
              {matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  S{m.semestre} : {m.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <label className="mp-label">Fichier PDF (3 Mo maximum)</label>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="mp-input"
            onChange={(e) => setFichier(e.target.files?.[0] ?? null)}
          />
        </div>
        {message ? <p className="mt-3 rounded-lg bg-mp-bg px-3 py-2 text-xs">{message}</p> : null}
        <button
          type="button"
          className="mp-btn-yellow mt-3 min-h-[44px] md:w-56"
          onClick={envoyer}
          disabled={envoi}
        >
          {envoi ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Ajouter
        </button>
      </section>

      <section className="space-y-3">
        {liste.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun cours en PDF pour le moment.</p>
        ) : (
          liste.map((p) => (
            <article key={p.id} className="mp-card flex items-center gap-3 p-4">
              <BookOpen size={20} className="shrink-0 text-mp-blue" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.titre}</p>
                <p className="text-xs text-mp-grey">
                  {p.matiere ?? "Général"} · {(p.taille / 1024).toFixed(0)} Ko ·{" "}
                  {new Date(p.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Link
                href={`/lecteur?url=${encodeURIComponent(`/api/pdf-cours/${p.id}`)}&titre=${encodeURIComponent(p.titre)}`}
                className="flex h-11 w-11 items-center justify-center"
                aria-label="Lire"
              >
                <BookOpen size={18} className="text-mp-blue" />
              </Link>
              <button
                type="button"
                onClick={() => supprimer(p)}
                aria-label="Supprimer"
                className="flex h-11 w-11 items-center justify-center"
              >
                <Trash2 size={18} className="text-mp-grey" />
              </button>
            </article>
          ))
        )}
      </section>
    </div>
  );
}