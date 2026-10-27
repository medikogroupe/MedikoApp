"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export default function PdfViewer({ url }: { url: string }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const [etat, setEtat] = useState<"chargement" | "ok" | "erreur">("chargement");

  useEffect(() => {
    let annule = false;
    let tache: { destroy: () => Promise<void> } | null = null;

    async function lire() {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const chargement = pdfjs.getDocument({ url, withCredentials: true });
        tache = chargement;
        const pdf = await chargement.promise;
        
        if (annule) return;
        const zone = conteneur.current;
        if (!zone) return;
        zone.innerHTML = "";
        const largeur = zone.clientWidth || 360;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          if (annule) return;
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (largeur / base.width) * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.className = "mb-3 rounded-lg border border-[#dfe3e8] bg-white";
          zone.appendChild(canvas);
          const contexte = canvas.getContext("2d");
          if (!contexte) throw new Error("canvas");
          await page.render({ canvas, canvasContext: contexte, viewport }).promise;
          if (n === 1) setEtat("ok");
        }
      } catch {
        if (!annule) setEtat("erreur");
      }
    }

    void lire();
    return () => {
      annule = true;
      void tache?.destroy();
    };
  }, [url]);

  return (
    <div>
      {etat === "chargement" ? (
        <p className="flex items-center gap-2 text-xs text-mp-grey">
          <Loader2 size={14} className="animate-spin" /> Chargement du document
        </p>
      ) : null}
      {etat === "erreur" ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Impossible d&apos;afficher ce document. Vérifiez votre connexion et réessayez.
        </p>
      ) : null}
      <div ref={conteneur} />
    </div>
  );
}