"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

type Tuto = { id: string; titre: string; lien: string; description: string };

export default function AdminParametres() {
  const [groupe, setGroupe] = useState("");
  const [donLien, setDonLien] = useState("");
  const [donMessage, setDonMessage] = useState("");
  const [tutos, setTutos] = useState<Tuto[]>([]);
  const [titre, setTitre] = useState("");
  const [lien, setLien] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);

  const charger = useCallback(async () => {
    const [p, t] = await Promise.all([fetch("/api/admin/parametres"), fetch("/api/admin/tutos")]);
    if (p.ok) {
      const d = (await p.json()) as { parametres: Record<string, string> };
      setGroupe(d.parametres.groupe_whatsapp ?? "");
      setDonLien(d.parametres.don_lien ?? "");
      setDonMessage(d.parametres.don_message ?? "");
    }
    if (t.ok) setTutos(((await t.json()) as { tutos: Tuto[] }).tutos ?? []);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    setOccupe(true);
    const res = await fetch("/api/admin/parametres", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupe_whatsapp: groupe, don_lien: donLien, don_message: donMessage }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Paramètres enregistrés. Les étudiants les voient immédiatement." : (data.error ?? "Échec de l'enregistrement."));
    setOccupe(false);
  }

  async function ajouterTuto() {
    const res = await fetch("/api/admin/tutos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titre, lien, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setTitre("");
      setLien("");
      setDescription("");
      setMessage("Tuto ajouté.");
      void charger();
    } else {
      setMessage(data.error ?? "Ajout impossible.");
    }
  }

  async function supprimerTuto(t: Tuto) {
    if (!window.confirm("Supprimer le tuto \"" + t.titre + "\" ?")) return;
    const res = await fetch("/api/admin/tutos?id=" + encodeURIComponent(t.id), { method: "DELETE" });
    setMessage(res.ok ? "Tuto supprimé." : "Suppression impossible.");
    if (res.ok) void charger();
  }

  return (
    <div className="mt-4 space-y-4">
      {message ? <p className="rounded-lg bg-mp-bg px-3 py-2 text-xs">{message}</p> : null}

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Groupe WhatsApp</h2>
        <label className="mp-label mt-3">Lien d&apos;invitation du groupe</label>
        <input
          className="mp-input"
          value={groupe}
          onChange={(e) => setGroupe(e.target.value)}
          placeholder="https://chat.whatsapp.com/..."
          autoCapitalize="none"
          spellCheck={false}
        />
      </section>

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Soutenir le développeur</h2>
        <label className="mp-label mt-3">Lien de don (Wave, Orange Money, MTN MoMo)</label>
        <input
          className="mp-input"
          value={donLien}
          onChange={(e) => setDonLien(e.target.value)}
          placeholder="https://pay.wave.com/m/..."
          autoCapitalize="none"
          spellCheck={false}
        />
        <label className="mp-label mt-3">Message affiché aux étudiants</label>
        <textarea
          className="mp-input min-h-[88px]"
          value={donMessage}
          onChange={(e) => setDonMessage(e.target.value)}
        />
      </section>

      <button type="button" className="mp-btn-yellow min-h-[44px] md:w-56" onClick={enregistrer} disabled={occupe}>
        {occupe ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
      </button>

      <section className="mp-card p-4">
        <h2 className="text-sm font-bold">Tuto médical</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mp-label">Titre</label>
            <input className="mp-input" value={titre} onChange={(e) => setTitre(e.target.value)} />
          </div>
          <div>
            <label className="mp-label">Lien (vidéo, article, document)</label>
            <input
              className="mp-input"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              placeholder="https://..."
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </div>
        <label className="mp-label mt-3">Description courte (facultatif)</label>
        <input className="mp-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="button" className="mp-btn-blue mt-3 min-h-[44px]" onClick={ajouterTuto}>
          <Plus size={16} /> Ajouter ce tuto
        </button>
      </section>

      <section className="space-y-3">
        {tutos.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun tuto pour le moment.</p>
        ) : (
          tutos.map((t) => (
            <article key={t.id} className="mp-card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{t.titre}</p>
                <p className="truncate text-xs text-mp-grey">{t.lien}</p>
              </div>
              <button
                type="button"
                onClick={() => supprimerTuto(t)}
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