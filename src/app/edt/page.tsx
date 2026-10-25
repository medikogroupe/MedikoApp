"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, Loader2, Plus, Trash2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { TYPES_EVENEMENT } from "@/lib/constants";

type Evenement = {
  id: string;
  titre: string;
  lieu: string | null;
  date: string;
  heureDebut: string;
  heureFin: string;
  type: string;
};

const CACHE_KEY = "mp_edt_cache";
const JOURS = ["L", "M", "M", "J", "V", "S", "D"];

function monthMatrix(ref: Date) {
  const first = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const start = (first.getDay() + 6) % 7;
  const days = new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = Array.from({ length: start }, () => null);
  for (let d = 1; d <= days; d += 1) cells.push(d);
  return cells;
}

export default function EdtPage() {
  const [events, setEvents] = useState<Evenement[]>([]);
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date().toISOString().slice(0, 10));
  const [vue, setVue] = useState<"mois" | "semaine">("mois");
  const [form, setForm] = useState({
    titre: "",
    lieu: "",
    date: new Date().toISOString().slice(0, 10),
    heureDebut: "08:00",
    heureFin: "10:00",
    type: "cours",
  });
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/edt");
      if (!res.ok) throw new Error("offline");
      const data = await res.json();
      setEvents(data.events ?? []);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data.events ?? []));
    } catch {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setEvents(JSON.parse(cached) as Evenement[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") void Notification.requestPermission();
    const timer = setInterval(() => {
      const now = new Date();
      events.forEach((e) => {
        const start = new Date(`${e.date}T${e.heureDebut}`);
        const diff = (start.getTime() - now.getTime()) / 60000;
        const key = `mp_notif_${e.id}`;
        if (diff > 14 && diff <= 15 && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          setNotif(`Rappel : ${e.titre} débute dans 15 minutes`);
          if (Notification.permission === "granted") {
            new Notification("MEDIKO+ : Rappel", { body: `${e.titre} à ${e.heureDebut.slice(0, 5)}` });
          }
        }
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [events]);

  const cells = useMemo(() => monthMatrix(ref), [ref]);
  const byDay = useMemo(() => {
    const map = new Map<string, Evenement[]>();
    events.forEach((e) => {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    });
    return map;
  }, [events]);

  const semaine = useMemo(() => {
    const base = new Date(selected);
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [selected]);

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titre) return;
    setSaving(true);
    const res = await fetch("/api/edt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ ...form, titre: "", lieu: "" });
      void load();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/edt?id=${id}`, { method: "DELETE" });
    void load();
  }

  const monthLabel = ref.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }).toUpperCase();
  const jourEvents = byDay.get(selected) ?? [];

  return (
    <PageShell title="Emploi du temps" subtitle="Planning personnel et rappels" back={false}>
      {notif ? (
        <div className="mp-card mb-3 flex items-center gap-2 border-l-4 border-mp-yellow p-3 text-xs">
          <Bell size={16} className="text-mp-yellow" /> {notif}
        </div>
      ) : null}

      <section className="mp-card p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-sm font-semibold text-mp-blue"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() - 1, 1))}
          >
            Précédent
          </button>
          <p className="text-sm font-bold">{monthLabel}</p>
          <button
            type="button"
            className="text-sm font-semibold text-mp-blue"
            onClick={() => setRef(new Date(ref.getFullYear(), ref.getMonth() + 1, 1))}
          >
            Suivant
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          {(["mois", "semaine"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVue(v)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize ${
                vue === v ? "bg-mp-blue text-white" : "bg-mp-bg text-mp-grey"
              }`}
            >
              Vue {v}
            </button>
          ))}
        </div>

        {vue === "mois" ? (
          <>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-mp-grey">
              {JOURS.map((j, i) => (
                <span key={`${j}-${i}`}>{j}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (!d) return <span key={`e-${i}`} />;
                const iso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const has = (byDay.get(iso) ?? []).length > 0;
                const active = iso === selected;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setSelected(iso);
                      setForm((f) => ({ ...f, date: iso }));
                    }}
                    className={`relative aspect-square rounded-lg text-xs font-semibold ${
                      active ? "bg-mp-blue text-white" : "bg-mp-bg text-mp-text"
                    }`}
                  >
                    {d}
                    {has ? (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-mp-yellow" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            {semaine.map((iso) => (
              <button
                key={iso}
                type="button"
                onClick={() => {
                  setSelected(iso);
                  setForm((f) => ({ ...f, date: iso }));
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs ${
                  iso === selected ? "bg-mp-blue text-white" : "bg-mp-bg"
                }`}
              >
                <span className="font-semibold">
                  {new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "short" })}
                </span>
                <span>{(byDay.get(iso) ?? []).length} évènement(s)</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mp-card mt-4 p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <CalendarDays size={16} className="text-mp-blue" />
          Programme du {new Date(selected).toLocaleDateString("fr-FR")}
        </h2>
        {loading ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-mp-grey">
            <Loader2 size={14} className="animate-spin" /> Chargement
          </p>
        ) : jourEvents.length === 0 ? (
          <p className="mt-3 text-xs text-mp-grey">Aucun évènement enregistré pour cette date.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {jourEvents.map((e) => (
              <li key={e.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
                <span className="h-2 w-2 rounded-full bg-mp-yellow" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{e.titre}</p>
                  <p className="text-xs text-mp-grey">
                    {e.heureDebut.slice(0, 5)} - {e.heureFin.slice(0, 5)} · {e.type}
                    {e.lieu ? ` · ${e.lieu}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => remove(e.id)} aria-label="Supprimer">
                  <Trash2 size={16} className="text-mp-grey" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={addEvent} className="mp-card mt-4 space-y-3 p-4">
        <h2 className="text-sm font-bold">Nouvel évènement</h2>
        <div>
          <label className="mp-label">Titre</label>
          <input className="mp-input" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Cours d'anatomie" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mp-label">Lieu</label>
            <input className="mp-input" value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Amphi A" />
          </div>
          <div>
            <label className="mp-label">Type</label>
            <select className="mp-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES_EVENEMENT.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mp-label">Date</label>
            <input type="date" className="mp-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Début</label>
            <input type="time" className="mp-input" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} />
          </div>
          <div>
            <label className="mp-label">Fin</label>
            <input type="time" className="mp-input" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="mp-btn-yellow" disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Ajouter au planning
        </button>
      </form>
    </PageShell>
  );
}
