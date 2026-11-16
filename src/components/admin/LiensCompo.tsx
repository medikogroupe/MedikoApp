"use client";

import { useEffect, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

type Item = {
  id: string;
  code: string;
  titre: string;
  module: string;
  dureeMinutes: number;
  statut: string;
  invites: boolean;
  dateTexte: string;
};

function CarteLien({
  titre,
  detail,
  note,
  chemin,
  origin,
}: {
  titre: string;
  detail: string;
  note?: string;
  chemin: string;
  origin: string;
}) {
  const [copie, setCopie] = useState(false);
  const lien = `${origin}${chemin}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${titre} : compose ici, sans inscription obligatoire.\n${lien}`)}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
    } catch {
      const t = document.createElement("textarea");
      t.value = lien;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 1800);
  }

  return (
    <section className="mp-card p-4">
      <h2 className="text-sm font-bold">{titre}</h2>
      <p className="mt-0.5 text-xs text-mp-grey">{detail}</p>
      <p className="mt-3 break-all rounded-lg bg-mp-bg px-3 py-2 text-sm font-semibold text-mp-blue">{lien}</p>
      {note ? <p className="mt-2 text-[11px] text-mp-grey">{note}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void copier()}
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-mp-yellow px-3 py-2.5 text-xs font-bold uppercase"
        >
          {copie ? <Check size={14} /> : <Copy size={14} />}
          {copie ? "Copié" : "Copier le lien"}
        </button>
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2.5 text-xs font-bold uppercase"
        >
          <MessageCircle size={14} /> WhatsApp
        </a>
      </div>
    </section>
  );
}

export default function LiensCompo({ items }: { items: Item[] }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <div className="space-y-3">
      <CarteLien
        titre="QCM d'essai"
        detail="5 questions au hasard, sans compte, note non enregistrée."
        chemin="/visiteur"
        origin={origin}
      />
      {items.length === 0 ? (
        <p className="mp-card p-4 text-sm text-mp-grey">Aucune session lancée pour le moment.</p>
      ) : null}
      {items.map((s) => (
        <CarteLien
          key={s.id}
          titre={s.titre}
          detail={`${s.module} · ${s.dureeMinutes} min · lancée le ${s.dateTexte} · ${s.statut === "ACTIF" ? "ouverte" : "clôturée"}`}
          note={
            s.invites
              ? "Ouverte aux visiteurs : ils composent sans compte, leur note n'est pas enregistrée. Les inscrits composent normalement."
              : "Réservée à certaines filières : seuls les inscrits concernés peuvent composer après connexion."
          }
          chemin={`/e/${s.code}`}
          origin={origin}
        />
      ))}
    </div>
  );
}
