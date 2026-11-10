"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpen, ListChecks, Loader2, Trash2, Upload } from "lucide-react";

type Matiere = { id: string; nom: string; semestre: number };
type Pdf = { id: string; titre: string; nomFichier: string; taille: number; createdAt: string; matiere: string | null };
type Mode = "generer" | "extraire";
type Reponse = { ajoutees?: number; doublons?: number; incertaines?: number; error?: string };

const MAX_OCTETS = 3_000_000;
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

function decouper(texte: string, taille: number, chevauchement: number): string[] {
  const morceaux: string[] = [];
  for (let i = 0; i < texte.length; i += taille - chevauchement) {
    morceaux.push(texte.slice(i, i + taille));
    if (i + taille >= texte.length) break;
  }
  return morceaux;
}

async function lireTexte(id: string, garderLignes: boolean): Promise<string> {
  const res = await fetch(`/api/pdf-cours/${id}`);
  if (!res.ok) throw new Error("lecture");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await res.arrayBuffer()) }).promise;
  let texte = "";
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const contenu = await page.getTextContent();
    texte += contenu.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : " ") : "")).join("") + "\n";
  }
  // Pour recopier des questions, les retours à la ligne séparent l'énoncé des propositions.
  return garderLignes ? texte.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : texte.replace(/\s+/g, " ").trim();
}

export default function AdminPdf() {
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [liste, setListe] = useState<Pdf[]>([]);
  const [titre, setTitre] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [fichier, setFichier] = useState<File | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [genId, setGenId] = useState("");
  const [ouvertId, setOuvertId] = useState("");
  const [mode, setMode] = useState<Mode>("generer");
  const [quantite, setQuantite] = useState("20");
  const arret = useRef(false);

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

  /** Un passage de génération, avec pause et nouvel essai quand le service gratuit sature. */
  async function appeler(corps: { pdfId: string; texte: string; mode: Mode }): Promise<{ ok: boolean; data: Reponse }> {
    for (let essai = 0; essai < 3; essai++) {
      const r = await fetch("/api/admin/generer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const data = (await r.json().catch(() => ({}))) as Reponse;
      if (r.ok) return { ok: true, data };
      if ((r.status === 429 || r.status === 503) && essai < 2 && !arret.current) {
        setMessage("Limite du service atteinte : pause de 20 secondes puis nouvel essai...");
        await attendre(20000);
        continue;
      }
      return { ok: false, data };
    }
    return { ok: false, data: { error: "Service indisponible." } };
  }

  async function traiter(p: Pdf) {
    if (genId) return;
    if (!p.matiere) {
      setMessage("Ce document n'a pas de matière. Supprimez-le puis ajoutez-le en choisissant une matière.");
      return;
    }
    arret.current = false;
    setGenId(p.id);
    setMessage("Lecture du document...");
    try {
      const texte = await lireTexte(p.id, mode === "extraire");
      if (texte.length < 500) {
        setMessage("Ce PDF ne contient pas de texte lisible (probablement un scan).");
        return;
      }
      let morceaux: string[];
      let remarque = "";
      if (mode === "extraire") {
        morceaux = decouper(texte, 6000, 500).filter((m) => m.length >= 300);
        if (morceaux.length > 25) {
          morceaux = morceaux.slice(0, 25);
          remarque = " Document très long : seuls les 25 premiers passages ont été traités.";
        }
      } else {
        morceaux = decouper(texte, 3500, 0).filter((m) => m.length >= 300);
        const voulus = Math.min(12, Math.max(1, Math.ceil((Number(quantite) || 20) / 5)));
        if (morceaux.length > voulus) {
          const pas = morceaux.length / voulus;
          morceaux = Array.from({ length: voulus }, (_, k) => morceaux[Math.floor(k * pas)]);
        }
      }
      let ajoutees = 0;
      let doublons = 0;
      let incertaines = 0;
      for (let k = 0; k < morceaux.length; k++) {
        if (arret.current) {
          remarque = " Traitement arrêté.";
          break;
        }
        setMessage(`Passage ${k + 1} sur ${morceaux.length} : ${ajoutees} question(s) ajoutée(s)...`);
        const r = await appeler({ pdfId: p.id, texte: morceaux[k], mode });
        if (!r.ok) {
          setMessage((r.data.error ?? "Traitement impossible.") + ` (${ajoutees} question(s) déjà ajoutée(s).)`);
          return;
        }
        ajoutees += Number(r.data.ajoutees) || 0;
        doublons += Number(r.data.doublons) || 0;
        incertaines += Number(r.data.incertaines) || 0;
        if (k < morceaux.length - 1) await attendre(4000);
      }
      setMessage(
        `${ajoutees} question(s) ajoutée(s) en brouillon` +
          (doublons > 0 ? `, ${doublons} doublon(s) ignoré(s)` : "") +
          (incertaines > 0 ? `, dont ${incertaines} à vérifier (réponse absente du document)` : "") +
          `.${remarque} Elles attendent votre relecture.`,
      );
    } catch {
      setMessage("Traitement impossible. Vérifiez votre connexion.");
    } finally {
      setGenId("");
    }
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
        <h2 className="text-sm font-bold">Ajouter un cours ou un sujet en PDF</h2>
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
        <button type="button" className="mp-btn-yellow mt-3 min-h-[44px] md:w-56" onClick={envoyer} disabled={envoi}>
          {envoi ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Ajouter
        </button>
      </section>

      <section className="space-y-3">
        {liste.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun cours en PDF pour le moment.</p>
        ) : (
          liste.map((p) => (
            <article key={p.id} className="mp-card p-4">
              <div className="flex items-center gap-3">
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
                  onClick={() => setOuvertId(ouvertId === p.id ? "" : p.id)}
                  aria-label="Créer des questions"
                  aria-expanded={ouvertId === p.id}
                  className="flex h-11 w-11 items-center justify-center"
                >
                  {genId === p.id ? <Loader2 size={18} className="animate-spin" /> : <ListChecks size={18} className="text-mp-blue" />}
                </button>
                <button
                  type="button"
                  onClick={() => supprimer(p)}
                  aria-label="Supprimer"
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <Trash2 size={18} className="text-mp-grey" />
                </button>
              </div>

              {ouvertId === p.id ? (
                <div className="mt-3 border-t border-[#eef1f5] pt-3">
                  <p className="mp-label">Que contient ce document ?</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                    {(
                      [
                        ["generer", "C'est un cours", "L'IA écrit de nouvelles questions à partir du contenu."],
                        ["extraire", "Il contient déjà des questions", "L'IA les recopie et reprend la correction quand elle figure dans le document."],
                      ] as [Mode, string, string][]
                    ).map(([valeur, nom, aide]) => (
                      <button
                        key={valeur}
                        type="button"
                        aria-pressed={mode === valeur}
                        onClick={() => setMode(valeur)}
                        disabled={genId !== ""}
                        className={`min-h-[44px] rounded-[10px] border p-3 text-left ${
                          mode === valeur ? "border-mp-blue bg-[#eaf1f8]" : "border-[#dfe3e8] bg-white"
                        }`}
                      >
                        <span className="block text-sm font-bold">{nom}</span>
                        <span className="mt-0.5 block text-xs text-mp-grey">{aide}</span>
                      </button>
                    ))}
                  </div>

                  {mode === "generer" ? (
                    <div className="mt-3 md:w-64">
                      <label className="mp-label">Nombre de questions visé</label>
                      <select className="mp-input" value={quantite} onChange={(e) => setQuantite(e.target.value)} disabled={genId !== ""}>
                        {["10", "20", "40", "60"].map((n) => (
                          <option key={n} value={n}>
                            {n} questions
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-mp-grey">
                      Les questions dont la réponse n&apos;est pas dans le document sont marquées « À vérifier » : vous devrez confirmer la
                      réponse avant leur publication.
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="mp-btn-yellow min-h-[44px] md:w-56"
                      onClick={() => void traiter(p)}
                      disabled={genId !== ""}
                    >
                      {genId === p.id ? <Loader2 size={16} className="animate-spin" /> : <ListChecks size={16} />}
                      {mode === "extraire" ? "Extraire les questions" : "Générer les questions"}
                    </button>
                    {genId === p.id ? (
                      <button type="button" className="mp-btn-ghost min-h-[44px] md:w-auto md:px-4" onClick={() => (arret.current = true)}>
                        Arrêter
                      </button>
                    ) : null}
                  </div>
                  {genId === p.id ? (
                    <p className="mt-2 text-xs text-mp-grey">Gardez cette page ouverte jusqu&apos;à la fin du traitement.</p>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
