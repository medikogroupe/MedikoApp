import { NextResponse } from "next/server";
import { db } from "@/db";
import { qcmImages } from "@/db/schema";
import { isAdmin } from "@/lib/auth";

const MAX_OCTETS = 500 * 1024;

function typeReel(octets: Buffer): string | null {
  if (octets.length > 3 && octets[0] === 0xff && octets[1] === 0xd8) return "image/jpeg";
  if (octets.length > 8 && octets.subarray(0, 4).toString("hex") === "89504e47") return "image/png";
  if (octets.length > 12 && octets.subarray(0, 4).toString() === "RIFF" && octets.subarray(8, 12).toString() === "WEBP") {
    return "image/webp";
  }
  return null;
}

/** Corps : { dataUrl: "data:image/jpeg;base64,..." } (déjà compressée côté navigateur). */
export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const b = await request.json().catch(() => ({}));
  const m = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.dataUrl ?? ""));
  if (!m) return NextResponse.json({ error: "Image invalide (JPEG, PNG ou WebP)." }, { status: 400 });
  const octets = Buffer.from(m[1], "base64");
  if (octets.length > MAX_OCTETS) {
    return NextResponse.json({ error: "Image trop lourde (500 Ko maximum après compression)." }, { status: 413 });
  }
  const mime = typeReel(octets);
  if (!mime) return NextResponse.json({ error: "Le fichier n'est pas une vraie image." }, { status: 400 });
  const [img] = await db.insert(qcmImages).values({ mime, contenu: m[1] }).returning({ id: qcmImages.id });
  return NextResponse.json({ id: img.id });
}
