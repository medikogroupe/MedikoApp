"use client";
import AdminPdf from "@/components/admin/AdminPdf";
import AdminQuestions from "@/components/admin/AdminQuestions";
import AdminParametres from "@/components/admin/AdminParametres";

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
  Info,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import Questionnaires from "@/components/admin/Questionnaires";
import QuestionBank from "@/components/admin/QuestionBank";
import { CONTACT, TYPES_ETABLISSEMENT, VILLES } from "@/lib/constants";

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
  packExpireAt: string | null;
  createdAt: string;
};

type Pack = {
  id: string;
  nomPack: string;
  prixFcfa: number;
  dureeJours: number;
  lienPaiement: string;
  description: string | null;
  noteAdmin: string;
  estActif: boolean;
  ordre: number;
};

type Upload = {
  id: string;
  titre: string;
  matiere: string | null;
  statut: string;
  auteur: string | null;
  createdAt: string;
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
  { id: "banque", label: "Banque de questions" },
  { id: "qcm", label: "Devoirs" },
  { id: "pdf", label: "Cours PDF" },
  { id: "questions", label: "Questions à relire" },
  { id: "parametres", label: "Paramètres" },
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
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([]);
  const [pharmaForm, setPharmaForm] = useState({ ...PHARMA_VIDE, id: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  const loadAll = useCallback(async () => {
    const [s, u, p, up, ph] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch(`/api/admin/users?q=${encodeURIComponent(recherche)}&pack=${filtrePack}&statut=${filtreStatut}`),
      fetch("/api/admin/packs"),
      fetch("/api/admin/uploads"),
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
    if (ph.ok) setPharmacies((await ph.json()).pharmacies ?? []);
  }, [recherche, filtrePack, filtreStatut]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function flash(texte: string, duree = 3000) {
    setMessage(texte);
    setTimeout(() => setMessage(""), duree);
  }

  async function majUser(id: string, patch: Record<string, unknown>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json().catch(() => ({}));
    flash(res.ok ? "Compte mis à jour." : (data.error ?? "Échec de la mise à jour."), 5000);
    void loadAll();
  }

  /** Valeur du select : "FREE", "pay:<packId>" ou "gift:<packId>". */
  function changerPack(u: Utilisateur, valeur: string) {
    if (valeur === "FREE") {
      if (window.confirm(`Repasser ${u.nomWhatsapp} en pack gratuit ?`)) {
        void majUser(u.id, { pack: "FREE" });
      }
      return;
    }
    const [mode, packId] = valeur.split(":");
    const pack = packs.find((x) => x.id === packId);
    if (!pack) return;
    const question =
      mode === "gift"
        ? `Offrir "${pack.nomPack}" à ${u.nomWhatsapp} sans enregistrer de paiement ?`
        : `Activer "${pack.nomPack}" pour ${u.nomWhatsapp} ? Un paiement de ${pack.prixFcfa} FCFA sera enregistré.`;
    if (window.confirm(question)) {
      void majUser(u.id, { pack: "PREMIUM", packId, sansPaiement: mode === "gift" });
    }
  }

  function majPackLocal(id: string, patch: Partial<Pack>) {
    setPacks((liste) => liste.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function lienInvalide(lien: string) {
    const v = lien.trim();
    return v !== "" && !v.startsWith("https://");
  }

  async function savePack(pack: Pack) {
    if (lienInvalide(pack.lienPaiement)) {
      flash("Le lien de paiement doit commencer par https://", 5000);
      return;
    }
    setSavingId(pack.id);
    const res = await fetch("/api/admin/packs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pack),
    });
    const data = await res.json().catch(() => ({}));
    setSavingId("");
    flash(
      res.ok ? "Pack enregistré. Les étudiants voient la modification immédiatement." : (data.error ?? "Échec de l'enregistrement."),
      5000,
    );
    if (res.ok) void loadAll();
  }

  async function ajouterPack() {
    const res = await fetch("/api/admin/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nomPack: "Nouveau pack", prixFcfa: 0, dureeJours: 30, estActif: false }),
    });
    const data = await res.json().catch(() => ({}));
    flash(
      res.ok ? "Pack créé (inactif). Renseignez-le puis activez-le." : (data.error ?? "Échec de la création."),
      5000,
    );
    if (res.ok) void loadAll();
  }

  async function supprimerPack(pack: Pack) {
    if (!window.confirm(`Supprimer définitivement le pack "${pack.nomPack}" ?`)) return;
    const res = await fetch(`/api/admin/packs?id=${encodeURIComponent(pack.id)}`, { method: "DELETE" });
    flash(res.ok ? "Pack supprimé." : "Échec de la suppression.", 4000);
    if (res.ok) void loadAll();
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
              { label: "Pharmacies", value: kpi?.pharmacies ?? 0 },
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
              <option value="PREMIUM">PREMIUM</option>
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
                  <th>Expire le</th>
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
                        className="min-h-[44px] rounded border border-[#dfe3e8] px-2"
                        value={u.pack === "FREE" ? "FREE" : "PREMIUM"}
                        onChange={(e) => changerPack(u, e.target.value)}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PREMIUM" disabled>
                          PREMIUM (actuel)
                        </option>
                        {packs
                          .filter((x) => x.estActif)
                          .map((x) => (
                            <option key={`pay-${x.id}`} value={`pay:${x.id}`}>
                              Activer : {x.nomPack}
                            </option>
                          ))}
                        {packs
                          .filter((x) => x.estActif)
                          .map((x) => (
                            <option key={`gift-${x.id}`} value={`gift:${x.id}`}>
                              Offrir : {x.nomPack}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td>
                      {u.pack === "FREE"
                        ? "-"
                        : u.packExpireAt
                          ? new Date(u.packExpireAt).toLocaleDateString("fr-FR")
                          : "Illimité"}
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
                        className="min-h-[44px] rounded bg-mp-yellow px-3 text-xs font-bold uppercase"
                        onClick={() => majUser(u.id, { statut: u.statut === "ACTIF" ? "BLOQUE" : "ACTIF" })}
                      >
                        {u.statut === "ACTIF" ? "Bloquer" : "Activer"}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-3 text-mp-grey">
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
        <div className="mt-4 space-y-4">
          <section className="mp-card flex items-start gap-3 p-4">
            <Info size={20} className="mt-0.5 shrink-0 text-mp-blue" />
            <p className="text-xs leading-relaxed text-mp-grey">
              Chaque modification est appliquée immédiatement, sans redéploiement. Quand un étudiant touche
              Payer, il est redirigé vers le lien du pack. Si le lien est vide, il est envoyé sur WhatsApp
              au {CONTACT.tel}. Après le paiement, activez son compte dans l&apos;onglet Comptes.
            </p>
          </section>

          {packs.map((p) => {
            const invalide = lienInvalide(p.lienPaiement);
            return (
              <section key={p.id} className="mp-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={p.estActif}
                      onChange={(e) => majPackLocal(p.id, { estActif: e.target.checked })}
                    />
                    {p.estActif ? "Pack visible par les étudiants" : "Pack masqué"}
                  </label>
                  <button
                    type="button"
                    className="mp-btn-ghost min-h-[44px]"
                    onClick={() => supprimerPack(p)}
                  >
                    <Trash2 size={16} /> Supprimer
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mp-label">Nom du pack</label>
                    <input
                      className="mp-input"
                      value={p.nomPack}
                      onChange={(e) => majPackLocal(p.id, { nomPack: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mp-label">Prix (FCFA)</label>
                    <input
                      className="mp-input"
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={p.prixFcfa}
                      onChange={(e) => majPackLocal(p.id, { prixFcfa: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="mp-label">Durée (jours, 9999 = à vie)</label>
                    <input
                      className="mp-input"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={p.dureeJours}
                      onChange={(e) => majPackLocal(p.id, { dureeJours: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="mp-label">Lien de paiement (Wave, MTN MoMo ou Orange Money)</label>
                  <input
                    className="mp-input"
                    value={p.lienPaiement}
                    onChange={(e) => majPackLocal(p.id, { lienPaiement: e.target.value })}
                    placeholder="https://pay.wave.com/m/M_ci_..."
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  {invalide ? (
                    <p className="mt-1 text-xs font-semibold text-red-700">Le lien doit commencer par https://</p>
                  ) : null}
                </div>

                <div className="mt-3">
                  <label className="mp-label">Description (visible par l&apos;étudiant)</label>
                  <textarea
                    className="mp-input min-h-[72px]"
                    value={p.description ?? ""}
                    onChange={(e) => majPackLocal(p.id, { description: e.target.value })}
                  />
                </div>

                <div className="mt-3">
                  <label className="mp-label">Note admin (privée, jamais montrée aux étudiants)</label>
                  <input
                    className="mp-input"
                    value={p.noteAdmin ?? ""}
                    onChange={(e) => majPackLocal(p.id, { noteAdmin: e.target.value })}
                    placeholder="Après paiement Wave, activez manuellement le compte dans Gestion Comptes"
                  />
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-[#cfd7e0] p-3">
                  <p className="mp-label">Aperçu côté étudiant</p>
                  <div className="mp-card mt-2 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-base font-bold">{p.nomPack || "Sans nom"}</p>
                        <p className="mt-1 text-xs text-mp-grey">{p.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-mp-blue">{p.prixFcfa} F</p>
                        <p className="text-xs text-mp-grey">
                          {p.dureeJours >= 9999 ? "accès illimité" : `${p.dureeJours} jours`}
                        </p>
                      </div>
                    </div>
                    <div className="mp-btn-yellow mt-4 opacity-80" aria-hidden="true">
                      Payer {p.prixFcfa} FCFA
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-mp-grey">
                    {p.lienPaiement.trim() && !invalide
                      ? `Redirection vers : ${p.lienPaiement.trim()}`
                      : `Aucun lien valide : l'étudiant sera envoyé sur WhatsApp (${CONTACT.tel}).`}
                  </p>
                </div>

                <button
                  type="button"
                  className="mp-btn-yellow mt-4 min-h-[44px] md:w-56"
                  onClick={() => savePack(p)}
                  disabled={savingId === p.id || invalide}
                >
                  {savingId === p.id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Sauvegarder
                </button>
              </section>
            );
          })}

          <button type="button" className="mp-btn-blue min-h-[44px]" onClick={ajouterPack}>
            <Plus size={16} /> Ajouter un pack
          </button>
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

      {onglet === "banque" ? <QuestionBank /> : null}

      {onglet === "qcm" ? <Questionnaires /> : null}
      {onglet === "pdf" ? <AdminPdf /> : null}
      {onglet === "questions" ? <AdminQuestions /> : null}
      {onglet === "parametres" ? <AdminParametres /> : null}

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
