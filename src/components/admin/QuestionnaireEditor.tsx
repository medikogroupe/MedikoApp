"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { FILIERES, MATIERES } from "@/lib/constants";
import QuestionRapide from "@/components/admin/QuestionRapide";

type QC = { id: string; question: string; type: string; points: number };
type Section = { titre: string; description: string; mode: "choix" | "tirage"; nb: string; ids: string[] };

function heureLocale(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
const vide = (): Section => ({ titre: "", description: "", mode: "tirage", nb: "5", ids: [] });
const libelle = (f: string) => f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ");

export default function QuestionnaireEditor({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    titre: "",
    module: MATIERES[0] as string,
    dateLancement: heureLocale(),
    dureeMinutes: "30",
    sortiesMax: "3",
    niveau: "",
    consignes: "",
    melanger: true,
    ajouterBanque: false,
    filieres: [] as string[],
  });
  const [sections, setSections] = useState<Section[]>([vide()]);
  const [banque, setBanque] = useState<QC[]>([]);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/admin/questions?matiere=${encodeURIComponent(form.module)}`);
      setBanque(res.ok ? (((await res.json()).questions ?? []) as { id: string; question: string; type: string; points: number; actif?: boolean }[]).filter((q) => q.actif !== false) : []);
      setSections((s) => s.map((x) => ({ ...x, ids: [] })));
    })();
  }, [form.module]);

  function maj(i: number, p: Partial<Section>) {
    setSections((s) => s.map((x, k) => (k === i ? { ...x, ...p } : x)));
  }

  const total = sections.reduce((n, s) => n + (s.mode === "choix" ? s.ids.length : Number(s.nb) || 0), 0);

  async function lancer() {
    setErreur("");
    setMessage("");
    setOccupe(true);
    const res = await fetch("/api/admin/qcm/devoir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: form.titre,
        module: form.module,
        dateLancement: form.dateLancement ? new Date(form.dateLancement).toISOString() : undefined,
        dureeMinutes: Number(form.dureeMinutes),
        sortiesMax: Number(form.sortiesMax) || 0,
        niveau: form.niveau,
        consignes: form.consignes,
        ajouterBanque: form.ajouterBanque,
        melanger: form.melanger,
        filieres: form.filieres,
        sections: sections.map((s) => ({
          titre: s.titre,
          description: s.description,
          questions: s.mode === "choix" ? s.ids.map((id) => ({ id })) : [],
          tirage: s.mode === "tirage" ? { nb: Number(s.nb) || 0 } : undefined,
        })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setOccupe(false);
    if (!res.ok) {
      setErreur(data.error ?? "Impossible de créer le questionnaire.");
      return;
    }
    setMessage(`Questionnaire créé avec ${data.nbQuestions} question(s).`);
    onCreated();
  }

  return (
    <section className="mp-card p-4">
      <h2 className="text-sm font-bold">Nouveau questionnaire (devoir ou examen)</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mp-label">Titre</label>
          <input className="mp-input" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
        </div>
        <div>
          <label className="mp-label">Module (Banque)</label>
          <select className="mp-input" value={form.module} onChange={(e) => setForm({ ...form, module: e.target.value })}>
            {MATIERES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mp-label">Ouverture</label>
          <input type="datetime-local" className="mp-input" value={form.dateLancement} onChange={(e) => setForm({ ...form, dateLancement: e.target.value })} />
        </div>
        <div>
          <label className="mp-label">Durée (minutes)</label>
          <input className="mp-input" inputMode="numeric" value={form.dureeMinutes} onChange={(e) => setForm({ ...form, dureeMinutes: e.target.value })} />
        </div>
        <div>
          <label className="mp-label">Sorties d&apos;écran tolérées (0 = illimité)</label>
          <input className="mp-input" inputMode="numeric" value={form.sortiesMax} onChange={(e) => setForm({ ...form, sortiesMax: e.target.value })} />
        </div>
        <div>
          <label className="mp-label">Niveau</label>
          <select className="mp-input" value={form.niveau} onChange={(e) => setForm({ ...form, niveau: e.target.value })}>
            <option value="">Tous les niveaux</option>
            {["L1", "L2", "L3", "M1", "M2"].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="mp-label">Filières (aucune cochée = toutes)</label>
        <div className="flex flex-wrap gap-2">
          {FILIERES.map((f) => {
            const actif = form.filieres.includes(f);
            return (
              <button
                key={f}
                type="button"
                aria-pressed={actif}
                onClick={() => setForm({ ...form, filieres: actif ? form.filieres.filter((x) => x !== f) : [...form.filieres, f] })}
                className={`min-h-[44px] rounded-lg border px-3 text-xs font-semibold ${actif ? "border-mp-blue bg-mp-blue text-white" : "border-[#dfe3e8] bg-white text-mp-grey"}`}
              >
                {libelle(f)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <label className="mp-label">Consignes (affichées à l&apos;étudiant avant de commencer)</label>
        <textarea className="mp-input" rows={3} maxLength={2000} value={form.consignes} onChange={(e) => setForm({ ...form, consignes: e.target.value })} />
      </div>

      <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={form.melanger} onChange={(e) => setForm({ ...form, melanger: e.target.checked })} />
        Mélanger les questions et les propositions
      </label>

      <label className="mt-3 flex min-h-[44px] items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-5 w-5" checked={form.ajouterBanque} onChange={(e) => setForm({ ...form, ajouterBanque: e.target.checked })} />
        Ajouter les questions r&eacute;dig&eacute;es ici &agrave; la Banque (entra&icirc;nement libre)
      </label>

      <div className="mt-4 space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="rounded-[10px] border border-[#eef1f5] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-mp-blue">Section {i + 1}</p>
              {sections.length > 1 ? (
                <button type="button" className="flex min-h-[44px] items-center gap-1 text-xs font-semibold text-red-700" onClick={() => setSections((x) => x.filter((_, k) => k !== i))}>
                  <Trash2 size={14} /> Supprimer
                </button>
              ) : null}
            </div>
            <input className="mp-input mt-1" placeholder="Titre de la section" value={s.titre} onChange={(e) => maj(i, { titre: e.target.value })} />
            <textarea className="mp-input mt-2" rows={2} placeholder="Description (facultatif)" value={s.description} onChange={(e) => maj(i, { description: e.target.value })} />
            <QuestionRapide matiere={form.module} niveau={form.niveau} actif={form.ajouterBanque} onCreated={(q) => { setBanque((b) => [{ id: q.id, question: q.question, type: q.type, points: q.points }, ...b]); maj(i, { mode: "choix", ids: [...s.ids, q.id] }); }} />
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold">
                <input type="radio" checked={s.mode === "tirage"} onChange={() => maj(i, { mode: "tirage" })} /> Tirage au sort
              </label>
              <label className="flex min-h-[44px] items-center gap-2 text-xs font-semibold">
                <input type="radio" checked={s.mode === "choix"} onChange={() => maj(i, { mode: "choix" })} /> Choisir dans la Banque
              </label>
            </div>
            {s.mode === "tirage" ? (
              <div className="mt-1">
                <label className="mp-label">Nombre de questions</label>
                <input className="mp-input md:w-40" inputMode="numeric" value={s.nb} onChange={(e) => maj(i, { nb: e.target.value })} />
              </div>
            ) : (
              <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#eef1f5]">
                {banque.length === 0 ? <p className="p-2 text-xs text-mp-grey">Aucune question dans ce module.</p> : null}
                {banque.map((q) => (
                  <label key={q.id} className="flex min-h-[44px] items-start gap-2 border-b border-[#eef1f5] p-2 text-xs">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-5 w-5 shrink-0"
                      checked={s.ids.includes(q.id)}
                      onChange={(e) => maj(i, { ids: e.target.checked ? [...s.ids, q.id] : s.ids.filter((x) => x !== q.id) })}
                    />
                    <span>
                      <span className="mr-1 font-bold text-mp-blue">{q.type}</span>
                      {q.question} <span className="text-mp-grey">({q.points} pt)</span>
                    </span>
                  </label>
                ))}
                <p className="p-2 text-xs font-semibold text-mp-blue">{s.ids.length} question(s) choisie(s)</p>
              </div>
            )}
          </div>
        ))}
        <button type="button" className="flex min-h-[44px] items-center gap-1 text-xs font-semibold text-mp-blue" onClick={() => setSections((x) => [...x, vide()])}>
          <Plus size={14} /> Ajouter une section
        </button>
      </div>

      <p className="mt-3 text-xs font-semibold text-mp-grey">Total prévu : {total} question(s)</p>
      {erreur ? <p className="mt-2 text-xs font-semibold text-red-700">{erreur}</p> : null}
      {message ? <p className="mt-2 text-xs font-semibold text-green-700">{message}</p> : null}
      <button type="button" className="mp-btn-yellow mt-3 min-h-[44px] md:w-56" onClick={lancer} disabled={occupe}>
        {occupe ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer le questionnaire
      </button>
    </section>
  );
}