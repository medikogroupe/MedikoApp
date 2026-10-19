"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import { LogoIcon } from "@/components/Logo";
import { FILIERES, VILLES } from "@/lib/constants";

export default function InscriptionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nomWhatsapp: "",
    numeroWhatsapp: "",
    password: "",
    confirmation: "",
    filiere: "infirmier",
    ville: "Abidjan",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Inscription impossible");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const okNom = form.nomWhatsapp.trim().length >= 3;
  const okNum = form.numeroWhatsapp.replace(/\D/g, "").length >= 8;
  const okPwd = /^\d{6}$/.test(form.password);
  const okConf = okPwd && form.password === form.confirmation;

  return (
    <div className="flex min-h-dvh flex-col bg-mp-bg">
      <header className="bg-mp-blue px-4 py-4 text-white">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <LogoIcon size={40} />
          <div>
            <p className="text-base font-bold uppercase tracking-wide">Créer un compte</p>
            <p className="text-xs text-white/75">MEDIKO+ Côte d&apos;Ivoire</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        <form onSubmit={submit} className="mp-card space-y-4 p-4">
          <div>
            <label className="mp-label">Nom &amp; prénoms (WhatsApp)</label>
            <div className="relative">
              <input className="mp-input pr-9" value={form.nomWhatsapp} onChange={set("nomWhatsapp")} placeholder="Kouassi Aya" />
              {okNom ? <Check size={16} className="absolute right-3 top-3.5 text-green-600" /> : null}
            </div>
          </div>

          <div>
            <label className="mp-label">Numéro WhatsApp</label>
            <div className="flex gap-2">
              <span className="flex items-center rounded-[10px] border border-[#dfe3e8] bg-white px-3 text-sm font-semibold text-mp-blue">
                +225
              </span>
              <div className="relative flex-1">
                <input
                  className="mp-input pr-9"
                  inputMode="numeric"
                  value={form.numeroWhatsapp}
                  onChange={set("numeroWhatsapp")}
                  placeholder="07 00 00 00 00"
                />
                {okNum ? <Check size={16} className="absolute right-3 top-3.5 text-green-600" /> : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mp-label">Mot de passe (6 chiffres)</label>
              <input
                className="mp-input"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={form.password}
                onChange={set("password")}
                placeholder="******"
              />
            </div>
            <div>
              <label className="mp-label">Confirmation</label>
              <div className="relative">
                <input
                  className="mp-input pr-9"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={form.confirmation}
                  onChange={set("confirmation")}
                  placeholder="******"
                />
                {okConf ? <Check size={16} className="absolute right-3 top-3.5 text-green-600" /> : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mp-label">Filière</label>
              <select className="mp-input" value={form.filiere} onChange={set("filiere")}>
                {FILIERES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mp-label">Ville</label>
              <select className="mp-input" value={form.ville} onChange={set("ville")}>
                {VILLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}

          <button type="submit" className="mp-btn-yellow" disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Créer le compte
          </button>

          <p className="text-center text-xs text-mp-grey">
            Déjà inscrit ?{" "}
            <Link href="/connexion" className="font-semibold text-mp-blue">
              Se connecter
            </Link>
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
