"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import Footer from "@/components/Footer";
import { LogoIcon } from "@/components/Logo";

export default function ConnexionPage() {
  const router = useRouter();
  const [numeroWhatsapp, setNumero] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroWhatsapp, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Connexion impossible");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <header className="bg-mp-blue px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <LogoIcon size={40} />
          <div>
            <p className="text-base font-bold uppercase tracking-wide">Connexion</p>
            <p className="text-xs text-white/75">Accédez à votre espace MEDIKO+</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <form onSubmit={submit} className="mp-card space-y-4 p-4">
          <div>
            <label className="mp-label">Numéro WhatsApp</label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-[10px] border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-mp-blue">
                +225
              </span>
              <input
                className="mp-input flex-1"
                inputMode="numeric"
                value={numeroWhatsapp}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="07 00 00 00 00"
              />
            </div>
          </div>
          <div>
            <label className="mp-label">Mot de passe (6 chiffres)</label>
            <input
              className="mp-input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="******"
            />
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <button type="submit" className="mp-btn-yellow" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
            Se connecter
          </button>

          <p className="text-center text-xs text-mp-grey">
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-semibold text-mp-blue">
              Créer un compte
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
