"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, MapPin, MessageCircle, Navigation, Phone, Search } from "lucide-react";
import PageShell from "@/components/PageShell";
import MapLoader from "@/components/MapLoader";
import { TYPES_ETABLISSEMENT, VILLES } from "@/lib/constants";

type Pharmacie = {
  id: string;
  nom: string;
  type: string;
  ville: string;
  commune: string;
  quartier: string | null;
  adresse: string | null;
  telephone: string | null;
  whatsapp: string | null;
  latitude: number;
  longitude: number;
  horaires: string | null;
  estDeGardeAujourdhui: boolean;
};

const CACHE_KEY = "mp_pharmacies_cache";

function haversine(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function PharmaciesPage() {
  const [items, setItems] = useState<Pharmacie[]>([]);
  const [q, setQ] = useState("");
  const [ville, setVille] = useState("toutes");
  const [commune, setCommune] = useState("toutes");
  const [type, setType] = useState("tous");
  const [gardeOnly, setGardeOnly] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as { date: string; data: Pharmacie[] };
      if (parsed.date === today) setItems(parsed.data);
    }
    fetch("/api/pharmacies")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.pharmacies ?? []);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: d.pharmacies ?? [] }));
      })
      .catch(() => setMessage("Mode hors connexion : données du jour en cache."));
  }, []);

  const communes = useMemo(
    () => Array.from(new Set(items.filter((i) => ville === "toutes" || i.ville === ville).map((i) => i.commune))).sort(),
    [items, ville],
  );

  const liste = useMemo(() => {
    const filtered = items.filter(
      (i) =>
        (ville === "toutes" || i.ville === ville) &&
        (commune === "toutes" || i.commune === commune) &&
        (type === "tous" || i.type === type) &&
        (!gardeOnly || i.estDeGardeAujourdhui) &&
        i.nom.toLowerCase().includes(q.toLowerCase()),
    );
    if (!position) return filtered;
    return filtered
      .map((i) => ({ ...i, distance: haversine(position, [i.latitude, i.longitude]) }))
      .sort((a, b) => a.distance - b.distance);
  }, [items, ville, commune, type, gardeOnly, q, position]);

  const center: [number, number] = position ?? (liste[0] ? [liste[0].latitude, liste[0].longitude] : [5.345, -4.024]);

  function autourDeMoi() {
    if (!navigator.geolocation) {
      setMessage("Géolocalisation indisponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setMessage("Liste triée par distance depuis votre position.");
      },
      () => setMessage("Position refusée. Activez la localisation pour trier par distance."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <PageShell title="Pharmacies & santé" subtitle="Annuaire de proximité Côte d'Ivoire" back={false}>
      <section className="mp-card p-3">
        <div className="flex items-center gap-2 rounded-lg bg-mp-bg px-3 py-2">
          <Search size={16} className="text-mp-grey" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder="Rechercher une pharmacie, un centre..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <select className="mp-input" value={ville} onChange={(e) => { setVille(e.target.value); setCommune("toutes"); }}>
            <option value="toutes">Toutes villes</option>
            {VILLES.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
          <select className="mp-input" value={commune} onChange={(e) => setCommune(e.target.value)}>
            <option value="toutes">Communes</option>
            {communes.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="mp-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="tous">Tous types</option>
            {TYPES_ETABLISSEMENT.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGardeOnly((g) => !g)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              gardeOnly ? "bg-mp-yellow text-mp-text" : "bg-mp-bg text-mp-grey"
            }`}
          >
            De garde aujourd&apos;hui
          </button>
          <button type="button" onClick={autourDeMoi} className="mp-btn-blue px-3 py-1.5 text-xs">
            <Crosshair size={14} /> Autour de moi
          </button>
        </div>
        {message ? <p className="mt-2 text-[11px] text-mp-grey">{message}</p> : null}
      </section>

      <section className="mp-card mt-4 h-64 overflow-hidden p-0">
        <MapLoader points={liste} center={center} />
      </section>

      <section className="mt-4 space-y-3">
        {liste.length === 0 ? (
          <p className="mp-card p-4 text-xs text-mp-grey">Aucun établissement ne correspond à ces filtres.</p>
        ) : (
          liste.map((p) => {
            const distance = "distance" in p ? (p as Pharmacie & { distance: number }).distance : null;
            return (
              <article key={p.id} className="mp-card p-4">
                <div className="flex items-start gap-3">
                  <MapPin size={20} className={p.estDeGardeAujourdhui ? "text-mp-yellow" : "text-mp-blue"} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold">{p.nom}</p>
                      {distance !== null ? (
                        <span className="text-xs font-semibold text-mp-blue">{distance.toFixed(1)} km</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-mp-grey">
                      {TYPES_ETABLISSEMENT.find((t) => t.value === p.type)?.label ?? p.type} · {p.commune}
                      {p.quartier ? `, ${p.quartier}` : ""} · {p.ville}
                    </p>
                    <p className="mt-1 text-xs">
                      {p.horaires}
                      {p.estDeGardeAujourdhui ? (
                        <span className="ml-2 rounded-full bg-mp-yellow px-2 py-0.5 text-[10px] font-bold uppercase">
                          De garde
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={`tel:${p.telephone ?? ""}`} className="mp-btn-ghost px-2 py-2 text-xs">
                    <Phone size={14} /> Appeler
                  </a>
                  <a
                    href={`https://wa.me/${(p.whatsapp ?? "").replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mp-btn-ghost px-2 py-2 text-xs"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mp-btn-yellow px-2 py-2 text-xs"
                  >
                    <Navigation size={14} /> Itinéraire
                  </a>
                </div>
              </article>
            );
          })
        )}
      </section>
    </PageShell>
  );
}
