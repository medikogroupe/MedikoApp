async function compresser(fichier: File): Promise<string> {
  const url = URL.createObjectURL(fichier);
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => ko(new Error("Image illisible."));
      i.src = url;
    });
    const ratio = Math.min(1, 1000 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Compression impossible.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    for (const qualite of [0.85, 0.72, 0.6, 0.5, 0.4]) {
      const data = canvas.toDataURL("image/jpeg", qualite);
      if (data.length * 0.75 < 450 * 1024) return data;
    }
    throw new Error("Image trop lourde meme apres compression.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reduit l'image puis l'envoie au serveur. Retourne l'identifiant de l'image. */
export async function televerserImage(fichier: File): Promise<string> {
  const dataUrl = await compresser(fichier);
  const res = await fetch("/api/admin/qcm-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Envoi de l'image impossible.");
  return data.id as string;
}