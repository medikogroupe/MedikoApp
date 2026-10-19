"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Mot de passe administrateur incorrect");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mp-card mx-auto max-w-sm space-y-3 p-5">
      <h2 className="text-sm font-bold">Accès réservé</h2>
      <p className="text-xs text-mp-grey">Saisissez le mot de passe administrateur pour continuer.</p>
      <div>
        <label className="mp-label">Mot de passe</label>
        <input
          className="mp-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      <button type="submit" className="mp-btn-yellow" disabled={loading}>
        {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />} Se connecter
      </button>
    </form>
  );
}
