"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { MATIERES, TYPES_ETABLISSEMENT, VILLES } from "@/lib/constants";

type Kpi = {
  comptesActifs: number;
  comptesTotal: number;
  revenusMois: number;
  uploadsEnAttente: number;
  qcmActifs: number;
  pharmacies: number;
};

type Utilisateur = {
  id: string;
  nomWhatsapp: string;
  numeroWhatsapp: string;
  pack: string;
  statut: string;
  filiere: string;
  ville: string;
  createdAt: string;
};

type Pack = {
  id: string;
  nomPack: string;
  prixFcfa: number;
  dureeJours: number;
  lienPaiement: string;
  description: string | null;
};

type Upload = {
  id: string;
  titre: string;
  matiere: string | null;
  statut: string;
  auteur: string | null;
  createdAt: string;
};

type Session = {
  id: string;
  titre: string;
  module: string;
  dureeMinutes: number;
  nbQuestions: number;
  dateLancement: string;
  statut: string;
};

type Pharmacie = {
  id: string;
  nom: string;
  type: string;
  ville: string;
  commune: string;
  quartier: string | null;
  telephone: string | null;
  whatsapp: string | null;
  latitude: number;
  longitude: number;
  horaires: string | null;
  joursGarde: string[] | null;
  estDeGardeAujourdhui: boolean;
};

const ONGLETS = [
  { id: "kpi", label: "Tableau de bord" },
  { id: "comptes", label: "Comptes" },
  { id: "packs", label: "Packs & paiements" },
  { id: "uploads", label: "Validation uploads" },
  { id: "qcm", label: "QCM surveillés" },
  { id: "pharmacies", label: "Pharmacies" },
] as const;

type OngletId = (typeof ONGLETS)[number]["id"];

const PHARMA_VIDE = {
  nom: "",
  type: "pharmacie",
  ville: "Abidjan",
  commune: "",
  quartier: "",
  adresse: "",
  telephone: "",
  whatsapp: "",
  latitude: "5.32",
  longitude: "-4.02",
  horaires: "08h - 20h",
  joursGarde: "",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<OngletId>("kpi");
  const [kpi, setKpi] = useState<Kpi | null>(null);
  const [revenus, setRevenus] = useState<{ semaine: string; montant: number }[]>([]);
  const [parPack, setParPack] = useState<{ pack: string; total: number }[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [recherche, setRecherche] = useState("");
  const [filtrePack, setFiltrePack] = useState("tous");
  const [filtreStatut, setFiltreStatut] = useState("tous");
  const [packs, setPacks] = useState<Pack[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [pharmaForm, setPharmaForm] = useState({ ...PHARMA_VIDE, id: "" });
  const [qcmForm, setQcmForm] = useState({
    titre: "",
    module: MATIERES[0],
    dureeMinutes: "30",
    nbQuestions: "10",
    dateLancement: new Date().toISOString().slice(0, 16),
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const csvRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    const [s, u, p, up, q, ph] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch(`/api/admin/users?q=${encodeURIComponent(recherche)}&pack=${filtrePack}&statut=${filtreStatut}`),
      fetch("/api/admin/packs"),
      fetch("/api/admin/uploads"),
      fetch("/api/admin/qcm"),
      fetch("/api/admin/pharmacies"),
    ]);
    if (s.ok) {
      const data = await s.json();
      setKpi(data.kpi);
      setRevenus(data.revenusSemaine ?? []);
      setParPack(data.parPack ?? []);
    }
    if (u.ok) setUsers((await u.json()).users ?? []);
    if (p.ok) setPacks((await p.json()).packs ?? []);
    if (up.ok) setUploads((await up.json()).uploads ?? []);
    if (q.ok) setSessions((await q.json()).sessions ?? []);
    if (ph.ok) setPharmacies((await ph.json()).pharmacies ?? []);
  }, [recherche, filtrePack, filtreStatut]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function flash(texte: string) {
    setMessage(texte);
    setTimeout(() => setMessage(""), 3000);
  }

  async function majUser(id: string, patch: Record<string, string>) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    flash("Compte mis à jour.");
    void loadAll();
  }

  async function savePack(pack: Pack) {
    await fetch("/api/admin/packs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pack),
    });
    flash("Pack enregistré. Le lien de paiement est actif immédiatement.");
    void loadAll();
  }

  async function lancerQcm() {
    setBusy(true);
    await fetch("/api/admin/qcm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qcmForm),
    });
    setBusy(false);
    flash("QCM surveillé lancé.");
    void loadAll();
  }

  async function savePharmacie() {
    const payload = {
      ...pharmaForm,
      latitude: Number(pharmaForm.latitude),
      longitude: Number(pharmaForm.longitude),
      joursGarde: pharmaForm.joursGarde
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean),
    };
    await fetch("/api/admin/pharmacies", {
      method: pharmaForm.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setPharmaForm({ ...PHARMA_VIDE, id: "" });
    flash("Établissement enregistré.");
    void loadAll();
  }

  async function actualiserGardes() {
    setBusy(true);
    const res = await fetch("/api/admin/pharmacies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh_gardes" }),
    });
    const data = await res.json();
    setBusy(false);
    flash(`Gardes actualisées : ${data.deGarde ?? 0} établissement(s) de garde aujourd'hui.`);
    void loadAll();
  }

  async function importerCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const Papa = (await import("papaparse")).default;
    const texte = await file.text();
    const parsed = Papa.parse<Record<string, string>>(texte, { header: true, skipEmptyLines: true });
    const bulk = parsed.data.map((row) => ({
      nom: row.nom ?? row.Nom ?? "",
      type: row.type ?? "pharmacie",
      ville: row.ville ?? "Abidjan",
      commune: row.commune ?? "",
      quartier: row.quartier ?? "",
      adresse: row.adresse ?? "",
      telephone: row.telephone ?? "",
      whatsapp: row.whatsapp ?? "",
      latitude: Number(row.latitude ?? 5.32),
      longitude: Number(row.longitude ?? -4.02),
      horaires: row.horaires ?? "08h - 20h",
      joursGarde: (row.jours_garde ?? "").split("|").filter(Boolean),
    }));
    const res = await fetch("/api/admin/pharmacies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk }),
    });
    const data = await res.json();
    setBusy(false);
    if (csvRef.current) csvRef.current.value = "";
    flash(`${data.inserted ?? 0} établissement(s) importé(s).`);
    void loadAll();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setOnglet(o.id)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              onglet === o.id ? "bg-mp-blue text-white" : "mp-card text-mp-grey"
            }`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          className="mp-card ml-auto rounded-lg px-3 py-2 text-xs font-semibold text-mp-grey"
          onClick={async () => {
            await fetch("/api/admin/login", { method: "DELETE" });
            router.refresh();
          }}
        >
          <LogOut size={14} className="mr-1 inline" /> Quitter
        </button>
      </div>

      {message ? <p className="mp-card mt-3 p-3 text-xs">{message}</p> : null}

      {onglet === "kpi" ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Comptes actifs", value: kpi?.comptesActifs ?? 0 },
              { label: "Revenus du mois", value: `${kpi?.revenusMois ?? 0} F` },
              { label: "Uploads en attente", value: kpi?.uploadsEnAttente ?? 0 },
              { label: "QCM actifs", value: kpi?.qcmActifs ?? 0 },
            ].map((c) => (
              <div key={c.label} className="mp-card p-4">
                <p className="text-xs uppercase tracking-wide text-mp-grey">{c.label}</p>
                <p className="mt-1 text-2xl font-bold text-mp-blue">{c.value}</p>
              </div>
            ))}
          </div>

          <section className="mp-card p-4">
            <h2 className="text-sm font-bold">Revenus par semaine</h2>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eceff3" />
                  <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="montant" fill="#0A4B8A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-mp-grey">
              Pack le plus vendu :{" "}
              {parPack.length > 0
                ? [...parPack].sort((a, b) => b.total - a.total)[0].pack
                : "aucune vente enregistrée"}
            </p>
          </section>
        </div>
      ) : null}

      {onglet === "comptes" ? (
        <section className="mp-card mt-4 p-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              className="mp-input"
              placeholder="Rechercher par numéro"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
            <select className="mp-input" value={filtrePack} onChange={(e) => setFiltrePack(e.target.value)}>
              <option value="tous">Tous les packs</option>
              <option value="FREE">FREE</option>
              <option value="MENSUEL">MENSUEL</option>
              <option value="A_VIE">A_VIE</option>
            </select>
            <select className="mp-input" value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
              <option value="tous">Tous les statuts</option>
              <option value="ACTIF">ACTIF</option>
              <option value="BLOQUE">BLOQUE</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-mp-grey">
                <tr>
                  <th className="py-2">Nom</th>
                  <th>Numéro</th>
                  <th>Filière</th>
                  <th>Pack</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-[#eef1f5]">
                    <td className="py-2 font-semibold">{u.nomWhatsapp}</td>
                    <td>{u.numeroWhatsapp}</td>
                    <td>{u.filiere}</td>
                    <td>
                      <select
                        className="rounded border border-[#dfe3e8] px-1 py-0.5"
                        value={u.pack}
                        onChange={(e) => majUser(u.id, { pack: e.target.value })}
                      >
                        <option value="FREE">FREE</option>
                        <option value="MENSUEL">MENSUEL</option>
                        <option value="A_VIE">A_VIE</option>
                      </select>
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {u.statut}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <button
                        type="button"
                        className="rounded bg-mp-yellow px-2 py-1 text-[10px] font-bold uppercase"
                        onClick={() => majUser(u.id, { statut: u.statut === "ACTIF" ? "BLOQUE" : "ACTIF" })}
                      >
                        {u.statut === "ACTIF" ? "Bloquer" : "Activer"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 text-mp-grey">
                      Aucun compte trouvé.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {onglet === "packs" ? (
        <div className="mt-4 space-y-3">
          {packs.map((p) => (
            <section key={p.id} className="mp-card p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <div>
                  <label className="mp-label">Nom du pack</label>
                  <input
                    className="mp-input"
                    value={p.nomPack}
                    onChange={(e) => setPacks(packs.map((x) => (x.id === p.id ? { ...x, nomPack: e.target.value } : x)))}
                  />
                </div>
                <div>
                  <label className="mp-label">Prix (FCFA)</label>
                  <input
                    className="mp-input"
                    value={p.prixFcfa}
                    onChange={(e) =>
                      setPacks(packs.map((x) => (x.id === p.id ? { ...x, prixFcfa: Number(e.target.value) || 0 } : x)))
                    }
                  />
                </div>
                <div>
                  <label className="mp-label">Durée (jours)</label>
                  <input
                    className="mp-input"
                    value={p.dureeJours}
                    onChange={(e) =>
                      setPacks(packs.map((x) => (x.id === p.id ? { ...x, dureeJours: Number(e.target.value) || 0 } : x)))
                    }
                  />
                </div>
                <div>
                  <label className="mp-label">Lien de paiement</label>
                  <input
                    className="mp-input"
                    value={p.lienPaiement}
                    onChange={(e) => setPacks(packs.map((x) => (x.id === p.id ? { ...x, lienPaiement: e.target.value } : x)))}
                    placeholder="https://pay.wave.com/..."
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mp-label">Description</label>
                <input
                  className="mp-input"
                  value={p.description ?? ""}
                  onChange={(e) => setPacks(packs.map((x) => (x.id === p.id ? { ...x, description: e.target.value } : x)))}
                />
              </div>
              <button type="button" className="mp-btn-yellow mt-3 md:w-48" onClick={() => savePack(p)}>
                <Save size={16} /> Enregistrer
              </button>
            </section>
          ))}
        </div>
      ) : null}

      {onglet === "uploads" ? (
        <section className="mp-card mt-4 p-4">
          <h2 className="text-sm font-bold">Publications à valider</h2>
          <ul className="mt-3 space-y-3">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-3 border-b border-[#eef1f5] pb-3 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{u.titre}</p>
                  <p className="text-xs text-mp-grey">
                    {u.matiere} · {u.auteur ?? "Inconnu"} · {new Date(u.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                    {u.statut}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/admin/uploads", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: u.id, statut: "VALIDE" }),
                    });
                    void loadAll();
                  }}
                  aria-label="Valider"
                >
                  <CheckCircle2 size={20} className="text-green-600" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await fetch("/api/admin/uploads", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: u.id, statut: "REFUSE" }),
                    });
                    void loadAll();
                  }}
                  aria-label="Refuser"
                >
                  <XCircle size={20} className="text-red-600" />
                </button>
              </li>
            ))}
            {uploads.length === 0 ? <li className="text-xs text-mp-grey">Aucun upload enregistré.</li> : null}
          </ul>
        </section>
      ) : null}

      {onglet === "qcm" ? (
        <div className="mt-4 space-y-4">
          <section className="mp-card p-4">
            <h2 className="text-sm font-bold">Lancer un QCM surveillé</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
              <div>
                <label className="mp-label">Titre</label>
                <input className="mp-input" value={qcmForm.titre} onChange={(e) => setQcmForm({ ...qcmForm, titre: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Module</label>
                <select className="mp-input" value={qcmForm.module} onChange={(e) => setQcmForm({ ...qcmForm, module: e.target.value })}>
                  {MATIERES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mp-label">Durée (min)</label>
                <input className="mp-input" value={qcmForm.dureeMinutes} onChange={(e) => setQcmForm({ ...qcmForm, dureeMinutes: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Nb questions</label>
                <input className="mp-input" value={qcmForm.nbQuestions} onChange={(e) => setQcmForm({ ...qcmForm, nbQuestions: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Date / heure</label>
                <input
                  type="datetime-local"
                  className="mp-input"
                  value={qcmForm.dateLancement}
                  onChange={(e) => setQcmForm({ ...qcmForm, dateLancement: e.target.value })}
                />
              </div>
            </div>
            <button type="button" className="mp-btn-yellow mt-3 md:w-48" onClick={lancerQcm} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Lancer
            </button>
          </section>

          <section className="mp-card p-4">
            <h2 className="text-sm font-bold">Sessions</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between border-b border-[#eef1f5] pb-2 last:border-0">
                  <span>
                    {s.titre}{" "}
                    <span className="text-xs text-mp-grey">
                      {s.module} · {s.nbQuestions} q · {s.dureeMinutes} min ·{" "}
                      {new Date(s.dateLancement).toLocaleString("fr-FR")}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="rounded bg-mp-bg px-2 py-1 text-[11px] font-semibold"
                    onClick={async () => {
                      await fetch("/api/admin/qcm", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: s.id, statut: s.statut === "ACTIF" ? "CLOTURE" : "ACTIF" }),
                      });
                      void loadAll();
                    }}
                  >
                    {s.statut === "ACTIF" ? "Clôturer" : "Réactiver"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}

      {onglet === "pharmacies" ? (
        <div className="mt-4 space-y-4">
          <section className="mp-card p-4">
            <h2 className="text-sm font-bold">{pharmaForm.id ? "Modifier" : "Ajouter"} un établissement</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div>
                <label className="mp-label">Nom</label>
                <input className="mp-input" value={pharmaForm.nom} onChange={(e) => setPharmaForm({ ...pharmaForm, nom: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Type</label>
                <select className="mp-input" value={pharmaForm.type} onChange={(e) => setPharmaForm({ ...pharmaForm, type: e.target.value })}>
                  {TYPES_ETABLISSEMENT.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mp-label">Ville</label>
                <select className="mp-input" value={pharmaForm.ville} onChange={(e) => setPharmaForm({ ...pharmaForm, ville: e.target.value })}>
                  {VILLES.map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mp-label">Commune</label>
                <input className="mp-input" value={pharmaForm.commune} onChange={(e) => setPharmaForm({ ...pharmaForm, commune: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Quartier</label>
                <input className="mp-input" value={pharmaForm.quartier} onChange={(e) => setPharmaForm({ ...pharmaForm, quartier: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Téléphone</label>
                <input className="mp-input" value={pharmaForm.telephone} onChange={(e) => setPharmaForm({ ...pharmaForm, telephone: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">WhatsApp</label>
                <input className="mp-input" value={pharmaForm.whatsapp} onChange={(e) => setPharmaForm({ ...pharmaForm, whatsapp: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Horaires</label>
                <input className="mp-input" value={pharmaForm.horaires} onChange={(e) => setPharmaForm({ ...pharmaForm, horaires: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Latitude</label>
                <input className="mp-input" value={pharmaForm.latitude} onChange={(e) => setPharmaForm({ ...pharmaForm, latitude: e.target.value })} />
              </div>
              <div>
                <label className="mp-label">Longitude</label>
                <input className="mp-input" value={pharmaForm.longitude} onChange={(e) => setPharmaForm({ ...pharmaForm, longitude: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="mp-label">Jours de garde (AAAA-MM-JJ séparés par virgule)</label>
                <input
                  className="mp-input"
                  value={pharmaForm.joursGarde}
                  onChange={(e) => setPharmaForm({ ...pharmaForm, joursGarde: e.target.value })}
                  placeholder="2026-01-12, 2026-01-19"
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <button type="button" className="mp-btn-yellow" onClick={savePharmacie}>
                <Save size={16} /> Enregistrer
              </button>
              <button type="button" className="mp-btn-ghost" onClick={() => setPharmaForm({ ...PHARMA_VIDE, id: "" })}>
                Réinitialiser
              </button>
              <button type="button" className="mp-btn-blue" onClick={() => csvRef.current?.click()} disabled={busy}>
                <FileSpreadsheet size={16} /> Import CSV
              </button>
              <button type="button" className="mp-btn-blue" onClick={actualiserGardes} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser gardes
              </button>
              <input ref={csvRef} type="file" accept=".csv,text/csv" hidden onChange={importerCsv} />
            </div>
            <p className="mt-2 text-[11px] text-mp-grey">
              Colonnes CSV attendues : nom, type, ville, commune, quartier, adresse, telephone, whatsapp, latitude,
              longitude, horaires, jours_garde (séparés par |).
            </p>
          </section>

          <section className="mp-card p-4">
            <h2 className="text-sm font-bold">{pharmacies.length} établissements enregistrés</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="text-mp-grey">
                  <tr>
                    <th className="py-2">Nom</th>
                    <th>Type</th>
                    <th>Ville</th>
                    <th>Commune</th>
                    <th>Téléphone</th>
                    <th>Garde</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacies.map((p) => (
                    <tr key={p.id} className="border-t border-[#eef1f5]">
                      <td className="py-2 font-semibold">{p.nom}</td>
                      <td>{p.type}</td>
                      <td>{p.ville}</td>
                      <td>{p.commune}</td>
                      <td>{p.telephone}</td>
                      <td>{p.estDeGardeAujourdhui ? "Oui" : "Non"}</td>
                      <td className="flex items-center gap-2 py-2">
                        <button
                          type="button"
                          className="rounded bg-mp-bg px-2 py-1 text-[10px] font-semibold"
                          onClick={() =>
                            setPharmaForm({
                              id: p.id,
                              nom: p.nom,
                              type: p.type,
                              ville: p.ville,
                              commune: p.commune,
                              quartier: p.quartier ?? "",
                              adresse: "",
                              telephone: p.telephone ?? "",
                              whatsapp: p.whatsapp ?? "",
                              latitude: String(p.latitude),
                              longitude: String(p.longitude),
                              horaires: p.horaires ?? "",
                              joursGarde: (p.joursGarde ?? []).join(", "),
                            })
                          }
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/pharmacies?id=${p.id}`, { method: "DELETE" });
                            void loadAll();
                          }}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={15} className="text-mp-grey" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
