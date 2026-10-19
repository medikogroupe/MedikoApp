"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileDown, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";

const MAX_PAGES = 10;

function enhance(canvas: HTMLCanvasElement, contrast: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const gris = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = Math.max(0, Math.min(255, factor * (gris - 128) + 128));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
}

export default function ScannerPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [contrast, setContrast] = useState(40);
  const [nom, setNom] = useState(`Scan-${new Date().toISOString().slice(0, 10)}`);
  const [dossier, setDossier] = useState("Général");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const startCamera = useCallback(async () => {
    setStatus("");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1600 } },
        audio: false,
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch {
      setStatus("Caméra indisponible. Utilisez l'import depuis la galerie.");
    }
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  function capture() {
    const video = videoRef.current;
    if (!video || pages.length >= MAX_PAGES) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1200;
    canvas.height = video.videoHeight || 1600;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    enhance(canvas, contrast);
    setPages((p) => [...p, canvas.toDataURL("image/jpeg", 0.85)]);
  }

  function importImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PAGES - pages.length);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          enhance(canvas, contrast);
          setPages((p) => (p.length >= MAX_PAGES ? p : [...p, canvas.toDataURL("image/jpeg", 0.85)]));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function genererPdf() {
    if (pages.length === 0) return;
    setBusy(true);
    setStatus("Génération du PDF...");
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    pages.forEach((dataUrl, index) => {
      if (index > 0) pdf.addPage();
      const props = pdf.getImageProperties(dataUrl);
      const ratio = Math.min(pageW / props.width, pageH / props.height);
      const w = props.width * ratio;
      const h = props.height * ratio;
      pdf.addImage(dataUrl, "JPEG", (pageW - w) / 2, (pageH - h) / 2, w, h);
    });
    const base64 = pdf.output("datauristring").split(",")[1];
    const res = await fetch("/api/bibliotheque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomFichier: `${nom || "Scan"}.pdf`,
        dossier,
        mime: "application/pdf",
        taille: Math.round((base64.length * 3) / 4),
        contenu: base64,
      }),
    });
    setBusy(false);
    if (res.ok) {
      setStatus("Document enregistré dans votre bibliothèque.");
      setPages([]);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(data.error ?? "Enregistrement impossible.");
    }
  }

  return (
    <PageShell title="Scanner documents" subtitle={`${pages.length}/${MAX_PAGES} pages capturées`}>
      <section className="mp-card overflow-hidden p-0">
        <div className="relative aspect-[3/4] w-full bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
          {!stream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-mp-blue/90 px-6 text-center text-white">
              <Camera size={30} strokeWidth={2} />
              <p className="text-sm">Activez la caméra pour numériser vos polycopiés.</p>
              <button type="button" className="mp-btn-yellow w-auto px-6" onClick={startCamera}>
                Activer la caméra
              </button>
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <button type="button" className="mp-btn-blue" onClick={capture} disabled={!stream || pages.length >= MAX_PAGES}>
            <Camera size={16} /> Capturer
          </button>
          <button type="button" className="mp-btn-ghost" onClick={() => fileRef.current?.click()}>
            <ImageIcon size={16} /> Galerie
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={importImages} />
        </div>
      </section>

      <section className="mp-card mt-4 p-4">
        <label className="mp-label">Contraste du redressement ({contrast})</label>
        <input
          type="range"
          min={0}
          max={120}
          value={contrast}
          onChange={(e) => setContrast(Number(e.target.value))}
          className="w-full accent-[#0A4B8A]"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mp-label">Nom du document</label>
            <input className="mp-input" value={nom} onChange={(e) => setNom(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Dossier</label>
            <select className="mp-input" value={dossier} onChange={(e) => setDossier(e.target.value)}>
              {["Général", "Semestre 1", "Semestre 2", "Stage", "Examens"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {pages.length > 0 ? (
        <section className="mp-card mt-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Pages</h2>
            <button type="button" className="text-xs font-semibold text-mp-blue" onClick={() => setPages([])}>
              <RefreshCw size={13} className="mr-1 inline" /> Réinitialiser
            </button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {pages.map((p, i) => (
              <div key={`${i}-${p.slice(30, 40)}`} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`Page ${i + 1}`} className="h-28 w-full rounded-lg object-cover" />
                <button
                  type="button"
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1"
                  onClick={() => setPages(pages.filter((_, j) => j !== i))}
                  aria-label="Retirer la page"
                >
                  <Trash2 size={13} className="text-mp-grey" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {status ? <p className="mt-3 rounded-lg bg-mp-bg px-3 py-2 text-xs">{status}</p> : null}

      <button type="button" className="mp-btn-yellow mt-4" onClick={genererPdf} disabled={busy || pages.length === 0}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Générer le PDF
      </button>
    </PageShell>
  );
}
