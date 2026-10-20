"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";

async function recadrer(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Image illisible."));
      i.src = url;
    });
    const taille = 256;
    const canvas = document.createElement("canvas");
    canvas.width = taille;
    canvas.height = taille;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Traitement impossible.");
    const cote = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote, 0, 0, taille, taille);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function PhotoProfil({ photo, initiale }: { photo: string; initiale: string }) {
  const router = useRouter();
  const entree = useRef<HTMLInputElement>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");

  async function envoyer(valeur: string) {
    setOccupe(true);
    setErreur("");
    const res = await fetch("/api/profil/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo: valeur }),
    });
    const data = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) {
      setErreur(data.error ?? "Enregistrement impossible.");
      return;
    }
    router.refresh();
  }

  async function choisir(fichier: File | undefined) {
    if (!fichier) return;
    try {
      await envoyer(await recadrer(fichier));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Photo impossible \u00e0 traiter.");
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button type="button" aria-label="Changer la photo de profil" className="relative" onClick={() => entree.current?.click()} disabled={occupe}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Photo de profil" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-mp-blue text-xl font-bold text-white">{initiale}</span>
        )}
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-mp-yellow text-black shadow">
          {occupe ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </span>
      </button>
      <input
        ref={entree}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          void choisir(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {photo ? (
        <button type="button" className="mt-1 min-h-[44px] text-xs font-semibold text-red-700" onClick={() => void envoyer("")} disabled={occupe}>
          Retirer la photo
        </button>
      ) : null}
      {erreur ? <p className="mt-1 text-xs font-semibold text-red-700">{erreur}</p> : null}
    </div>
  );
}