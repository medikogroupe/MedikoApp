"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Loader2,
  MessageCircle,
  Pill,
  RotateCcw,
  Search,
  Stethoscope,
} from "lucide-react";
import SceneHopital from "@/components/jeux/SceneHopital";
import { avatarSur } from "@/components/jeux/Portrait";
import type { Bilan, Message, Vue } from "@/lib/consultation";

type Reponse = { token: string; vue: Vue; messages: Message[]; bilan: Bilan | null; suivi?: string };
type Onglet = "interroger" | "examiner" | "examens" | "diagnostic" | "ordonnance" | "rendez-vous";

const ONGLETS: { id: Onglet; label: string; icone: typeof Search }[] = [
  { id: "interroger", label: "Interroger", icone: MessageCircle },
  { id: "examiner", label: "Examiner", icone: Stethoscope },
  { id: "examens", label: "Examens", icone: Search },
  { id: "diagnostic", label: "Diagnostic", icone: ClipboardList },
  { id: "ordonnance", label: "Ordonnance", icone: Pill },
  { id: "rendez-vous", label: "Rendez-vous", icone: CalendarDays },
];

const ISSUE: Record<Bilan["issue"], { titre: string; classe: string }> = {
  GUERISON: { titre: "Guérison", classe: "text-green-700" },
  SEQUELLES: { titre: "Suivi incomplet", classe: "text-orange-600" },
  DECES: { titre: "Le patient est décédé", classe: "text-red-700" },
  ABANDON: { titre: "Simulation abandonnée", classe: "text-mp-grey" },
};

const GENRE: Record<Message["genre"], string> = {
  info: "border-mp-blue bg-[#f3f7fb]",
  ok: "border-green-500 bg-green-50",
  alerte: "border-red-500 bg-red-50",
};

async function appel(corps: Record<string, unknown>, url = "/api/jeux/consultation"): Promise<Reponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Erreur de la simulation.");
  return data as Reponse;
}

function libelleRdv(jours: number): string {
  if (jours === 1) return "Demain";
  if (jours === 7) return "Dans 1 semaine";
  if (jours === 14) return "Dans 2 semaines";
  if (jours === 30) return "Dans 1 mois";
  return `Dans ${jours} jours`;
}

export default function Consultation() {
  const [slug, setSlug] = useState("");
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [token, setToken] = useState("");
  const [vue, setVue] = useState<Vue | null>(null);
  const [journal, setJournal] = useState<Message[]>([]);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [onglet, setOnglet] = useState<Onglet>("interroger");
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [rdv, setRdv] = useState(0);
  const fin = useRef<HTMLDivElement>(null);
  const [suivi, setSuivi] = useState("");
  const [persiste, setPersiste] = useState(false);

  async function demarrer(cas: string, recommencer = false) {
    setOccupe(true);
    setErreur("");
    try {
      let connecte = false;
      try {
        const sess = (await (await fetch("/api/auth/session", { cache: "no-store" })).json()) as { connecte?: boolean };
        connecte = Boolean(sess.connecte);
      } catch {
        connecte = false;
      }
      const d = connecte ? await appel({ action: "start", cas, recommencer }, "/api/jeux/suivi") : await appel({ action: "start", cas });
      setPersiste(connecte);
      setSuivi(d.suivi ?? "");
      setToken(d.token);
      setVue(d.vue);
      setJournal(d.messages);
      setBilan(null);
      setSelection({});
      setRdv(0);
      setOnglet("interroger");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de la simulation.");
    }
    setOccupe(false);
    setChargement(false);
  }

  useEffect(() => {
    const cas = new URLSearchParams(window.location.search).get("cas") ?? "";
    setSlug(cas);
    if (cas) void demarrer(cas);
    else setChargement(false);
  }, []);

  useEffect(() => {
    fin.current?.scrollIntoView({ block: "nearest" });
  }, [journal]);

  async function jouer(corps: Record<string, unknown>, apres?: () => void) {
    if (occupe) return;
    setOccupe(true);
    setErreur("");
    try {
      const d = persiste ? await appel({ ...corps, suivi }, "/api/jeux/suivi") : await appel({ ...corps, token });
      const passage = corps.action === "rdv" && !d.bilan;
      setToken(d.token);
      setVue(d.vue);
      setJournal((j) => [
        ...j,
        ...(passage ? [{ genre: "info" as const, texte: `Consultation ${d.vue.consultation} · jour ${d.vue.jour}` }] : []),
        ...d.messages,
      ]);
      if (d.bilan) setBilan(d.bilan);
      if (apres) apres();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur de la simulation.");
    }
    setOccupe(false);
  }

  if (chargement) {
    return (
      <p className="mp-card flex items-center gap-2 p-4 text-sm text-mp-grey">
        <Loader2 size={16} className="animate-spin" /> Préparation de la consultation...
      </p>
    );
  }

  if (!vue) {
    return (
      <div className="mp-card p-4">
        <p className="text-sm font-bold">Simulation de suivi</p>
        <p className="mt-2 text-xs text-mp-grey">
          {erreur || (slug ? "Ce patient n'est pas disponible." : "Choisissez un patient dans la liste pour commencer.")}
        </p>
        <Link href="/jeux/parcours" className="mp-btn-yellow mt-4 inline-flex">
          Choisir un patient
        </Link>
      </div>
    );
  }

  const termine = vue.termine;
  const bloque = occupe || termine;
  const sansPoints = vue.pa <= 0;
  const choisis = Object.keys(selection);
  const soins = vue.catalogue.filter((t) => t.type === "SOIN");
  const medicaments = vue.catalogue.filter((t) => t.type === "MEDICAMENT");

  function basculer(id: string) {
    setSelection((s) => {
      const copie = { ...s };
      if (id in copie) delete copie[id];
      else copie[id] = 5;
      return copie;
    });
  }

  function ligneTraitement(t: { id: string; nom: string; forme: string }, v: Vue) {
    const actif = t.id in selection;
    const enCours = v.ordonnance.some((o) => o.id === t.id);
    return (
      <li key={t.id} className={`rounded-lg border p-2 ${actif ? "border-mp-blue bg-[#eaf1f8]" : "border-[#dfe3e8] bg-white"}`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={bloque || enCours}
            aria-pressed={actif}
            onClick={() => basculer(t.id)}
            className="flex min-h-[44px] flex-1 flex-col items-start justify-center text-left"
          >
            <span className="text-sm font-semibold">{t.nom}</span>
            <span className="text-[11px] text-mp-grey">{enCours ? "Déjà en cours" : t.forme}</span>
          </button>
          {actif ? (
            <select
              className="mp-input !w-auto !py-1 text-xs"
              value={selection[t.id]}
              onChange={(e) => setSelection((s) => ({ ...s, [t.id]: Number(e.target.value) }))}
              aria-label={`Durée du traitement ${t.nom}`}
            >
              {v.durees.map((d) => (
                <option key={d} value={d}>
                  {d} j
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <div>
      <SceneHopital avatar={avatarSur(vue.cas.avatar)} sante={vue.visuel} mort={bilan?.issue === "DECES"} masquerMoniteur />

      <div className="mp-card mt-3 p-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-mp-blue">{vue.cas.patient}</span>
          <span className="text-mp-grey">
            Jour {vue.jour} · Consultation {vue.consultation}
          </span>
        </div>
        <p className="mt-2 text-sm">{vue.narratif}</p>
        {persiste ? <p className="mt-1 text-[11px] text-mp-grey">Suivi enregistré : vous pouvez fermer et reprendre plus tard.</p> : null}
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-mp-grey">
          <Clock size={14} className="text-mp-blue" /> Temps de consultation
          <span className="flex gap-1" aria-label={`${vue.pa} actions restantes sur ${vue.paMax}`}>
            {Array.from({ length: vue.paMax }).map((_, i) => (
              <span key={i} className={`h-2.5 w-5 rounded-full ${i < vue.pa ? "bg-mp-blue" : "bg-[#dfe3e8]"}`} />
            ))}
          </span>
        </div>
        {vue.connus.length > 0 ? (
          <p className="mt-2 rounded-lg bg-yellow-50 p-2 text-xs">
            <b>Dossier :</b> {vue.connus.join(", ")}
          </p>
        ) : null}
      </div>

      <div className="mp-card mt-3 max-h-56 space-y-2 overflow-y-auto p-3">
        {journal.map((m, i) => (
          <p key={i} className={`rounded-md border-l-4 px-2 py-1.5 text-xs ${GENRE[m.genre]}`}>
            {m.texte}
          </p>
        ))}
        <div ref={fin} />
      </div>

      {erreur ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {erreur}
        </p>
      ) : null}

      {bilan ? (
        <div className="mp-card mt-3 p-4">
          <p className={`text-center text-base font-bold ${ISSUE[bilan.issue].classe}`}>{ISSUE[bilan.issue].titre}</p>
          <p className="mt-2 text-sm">{bilan.texte}</p>
          <p className="mt-2 text-center text-xs text-mp-grey">
            {bilan.jours} jour(s) · {bilan.consultations} consultation(s)
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Rigueur de l&apos;examen</span>
              <span>{bilan.rigueur} %</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[#e9edf3]">
              <div className={`h-full rounded-full ${bilan.rigueur >= 60 ? "bg-green-500" : "bg-orange-400"}`} style={{ width: `${bilan.rigueur}%` }} />
            </div>
          </div>

          {bilan.avertissements.map((a, i) => (
            <p key={i} className="mt-3 rounded-lg bg-yellow-50 p-3 text-xs">
              {a}
            </p>
          ))}

          <p className="mt-3 text-xs">
            <b>Votre diagnostic :</b> {bilan.diagnostic}
            {bilan.diagnosticJuste === false ? ` — attendu : ${bilan.diagnosticAttendu}` : bilan.diagnosticJuste ? " — correct" : ` — attendu : ${bilan.diagnosticAttendu}`}
          </p>

          {bilan.fautes.length > 0 ? (
            <div className="mt-3 text-xs">
              <p className="font-bold text-red-700">Erreurs de prescription</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {bilan.fautes.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {bilan.manques.length > 0 ? (
            <div className="mt-3 text-xs">
              <p className="font-bold text-orange-600">Informations essentielles non recherchées</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {bilan.manques.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {bilan.aRevoir.length > 0 ? (
            <div className="mt-3 rounded-lg bg-mp-bg p-3 text-xs">
              <p className="font-bold">Fiche de révision</p>
              <ul className="mt-1 list-disc space-y-1.5 pl-4 text-mp-grey">
                {bilan.aRevoir.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="mp-btn-yellow" disabled={occupe} onClick={() => void demarrer(slug, true)}>
              <RotateCcw size={16} /> Rejouer ce patient
            </button>
            <Link href="/jeux/parcours" className="mp-btn-ghost inline-flex items-center justify-center">
              Choisir un autre patient
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {ONGLETS.map((o) => {
              const Icone = o.icone;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOnglet(o.id)}
                  className={`flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${
                    onglet === o.id ? "bg-mp-blue text-white" : "mp-card text-mp-grey"
                  }`}
                >
                  <Icone size={14} /> {o.label}
                </button>
              );
            })}
          </div>

          <div className="mp-card mt-3 p-4">
            {onglet === "interroger" ? (
              <div className="space-y-2">
                <p className="text-xs text-mp-grey">Chaque question utilise une action. Choisissez celles qui comptent.</p>
                {vue.questions.map((q) =>
                  q.posee ? (
                    <div key={q.id} className="rounded-lg bg-mp-bg p-2 text-xs">
                      <p className="font-semibold">{q.question}</p>
                      <p className="mt-1 text-mp-grey">{q.reponse}</p>
                    </div>
                  ) : (
                    <button
                      key={q.id}
                      type="button"
                      disabled={bloque || sansPoints}
                      onClick={() => void jouer({ action: "ask", id: q.id })}
                      className="min-h-[44px] w-full rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2 text-left text-sm disabled:opacity-50"
                    >
                      {q.question}
                    </button>
                  ),
                )}
              </div>
            ) : null}

            {onglet === "examiner" ? (
              <div className="space-y-2">
                <p className="text-xs text-mp-grey">Chaque examen utilise une action. Les mesures se refont à chaque consultation.</p>
                {vue.examensCliniques.map((x) => (
                  <button
                    key={x.id}
                    type="button"
                    disabled={bloque || sansPoints || x.fait}
                    onClick={() => void jouer({ action: "exam", id: x.id })}
                    className="min-h-[44px] w-full rounded-[10px] border border-[#dfe3e8] bg-white px-3 py-2 text-left text-sm disabled:opacity-50"
                  >
                    {x.libelle}
                    {x.fait ? " · fait" : ""}
                  </button>
                ))}
              </div>
            ) : null}

            {onglet === "examens" ? (
              <div className="space-y-2">
                <p className="text-xs text-mp-grey">Certains résultats ne sont disponibles que les jours suivants.</p>
                {vue.examens.map((x) => (
                  <div key={x.id} className="rounded-lg border border-[#dfe3e8] bg-white p-2">
                    <p className="text-sm font-semibold">{x.libelle}</p>
                    {x.etat === "PRET" ? (
                      <p className="mt-1 text-xs text-green-700">Résultat : {x.resultat}</p>
                    ) : x.etat === "ATTENTE" ? (
                      <p className="mt-1 text-xs text-mp-grey">Demandé · résultat au jour {x.jourPrevu}</p>
                    ) : null}
                    {x.etat !== "ATTENTE" ? (
                      <button
                        type="button"
                        disabled={bloque || sansPoints}
                        onClick={() => void jouer({ action: "labo", id: x.id })}
                        className="mt-1 min-h-[40px] rounded-lg bg-mp-bg px-3 text-xs font-bold text-mp-blue disabled:opacity-50"
                      >
                        {x.etat === "PRET" ? "Refaire cet examen" : "Demander"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {onglet === "diagnostic" ? (
              <div className="space-y-2">
                <p className="text-xs text-mp-grey">Retenez votre diagnostic (gratuit, modifiable). Il sera évalué à la fin.</p>
                {vue.diagnostics.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-pressed={vue.diagnostic === d.id}
                    disabled={bloque}
                    onClick={() => void jouer({ action: "diag", id: d.id })}
                    className={`min-h-[44px] w-full rounded-[10px] border px-3 py-2 text-left text-sm ${
                      vue.diagnostic === d.id ? "border-mp-blue bg-[#eaf1f8] font-semibold" : "border-[#dfe3e8] bg-white"
                    }`}
                  >
                    {d.libelle}
                  </button>
                ))}
              </div>
            ) : null}

            {onglet === "ordonnance" ? (
              <div>
                {vue.ordonnance.length > 0 ? (
                  <div className="mb-4">
                    <p className="text-xs font-bold">En cours</p>
                    <ul className="mt-1 space-y-1">
                      {vue.ordonnance.map((o) => (
                        <li key={o.id} className="flex items-center justify-between gap-2 rounded-lg bg-mp-bg p-2 text-xs">
                          <span>
                            <b>{o.nom}</b> · encore {o.reste} jour(s)
                          </span>
                          <button
                            type="button"
                            disabled={bloque}
                            onClick={() => void jouer({ action: "arreter", id: o.id })}
                            className="min-h-[36px] rounded-lg border border-[#dfe3e8] bg-white px-2 font-bold text-red-700"
                          >
                            Arrêter
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <p className="text-xs text-mp-grey">
                  Prescrivez avec prudence : un traitement contre-indiqué, inutile ou en double aggrave l&apos;état du patient. Les doses seront
                  ajoutées après validation médicale.
                </p>
                <p className="mt-3 text-xs font-bold">Soins</p>
                <ul className="mt-1 space-y-1">{soins.map((t) => ligneTraitement(t, vue))}</ul>
                <p className="mt-3 text-xs font-bold">Médicaments</p>
                <ul className="mt-1 space-y-1">{medicaments.map((t) => ligneTraitement(t, vue))}</ul>
                <button
                  type="button"
                  className="mp-btn-yellow mt-4"
                  disabled={bloque || choisis.length === 0}
                  onClick={() =>
                    void jouer({ action: "prescrire", lignes: choisis.map((id) => ({ id, jours: selection[id] })) }, () => setSelection({}))
                  }
                >
                  <Pill size={16} /> Valider l&apos;ordonnance ({choisis.length})
                </button>
              </div>
            ) : null}

            {onglet === "rendez-vous" ? (
              <div>
                <p className="text-xs text-mp-grey">
                  Fixer le rendez-vous termine la consultation : le temps passe, l&apos;état du patient évolue selon votre traitement. Un suivi trop
                  tardif peut être fatal, un patient en danger revient en urgence.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {vue.rdv.map((j) => (
                    <button
                      key={j}
                      type="button"
                      aria-pressed={rdv === j}
                      disabled={bloque}
                      onClick={() => setRdv(j)}
                      className={`min-h-[44px] rounded-[10px] border px-2 text-sm ${
                        rdv === j ? "border-mp-blue bg-[#eaf1f8] font-semibold" : "border-[#dfe3e8] bg-white"
                      }`}
                    >
                      {libelleRdv(j)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="mp-btn-yellow mt-4"
                  disabled={bloque || rdv === 0}
                  onClick={() => void jouer({ action: "rdv", jours: rdv }, () => setRdv(0))}
                >
                  <CheckCircle2 size={16} /> Fixer le rendez-vous
                </button>
              </div>
            ) : null}
          </div>

          <button type="button" className="mp-btn-ghost mt-3" disabled={occupe} onClick={() => void jouer({ action: "abandon" })}>
            Abandonner cette simulation
          </button>
        </>
      )}
    </div>
  );
}