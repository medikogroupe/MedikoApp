"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, BellRing } from "lucide-react";

type Devoir = {
  id: string;
  titre: string;
  module: string;
  dureeMinutes: number;
  nbQuestions: number;
  ouvert: boolean;
  tentative: { id: string; statut: string; noteSur20: number } | null;
};

const CLE_ACTIF = "mp_notif_active";
const CLE_ENVOYEES = "mp_notif_envoyees";

function lire(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}
function ecrire(cle: string, valeur: string) {
  try {
    localStorage.setItem(cle, valeur);
  } catch {
    // stockage indisponible : on continue sans memoriser
  }
}

export default function Cloche() {
  const [devoirs, setDevoirs] = useState<Devoir[]>([]);
  const [visible, setVisible] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(false);
  const [permission, setPermission] = useState("default");

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/qcm/surveille", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setVisible(!data.anonyme);
      const liste = (data.sessions ?? []) as Devoir[];
      setDevoirs(liste.filter((d) => d.ouvert && d.tentative?.statut !== "TERMINE"));
    } catch {
      // reseau indisponible : on reessaiera au prochain passage
    }
  }, []);

  useEffect(() => {
    setActif(lire(CLE_ACTIF) === "1");
    setPermission(typeof Notification === "undefined" ? "indisponible" : Notification.permission);
    void charger();
    const t = setInterval(() => void charger(), 60_000);
    return () => clearInterval(t);
  }, [charger]);

  useEffect(() => {
    if (!actif || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let deja: string[] = [];
    try {
      deja = JSON.parse(lire(CLE_ENVOYEES) ?? "[]");
    } catch {
      deja = [];
    }
    const nouveaux = devoirs.filter((d) => !deja.includes(d.id));
    if (nouveaux.length === 0) return;
    nouveaux.forEach((d) => {
      const titre = "MEDIKO+ \u2014 Nouveau devoir";
      const options = { body: d.titre, tag: d.id };
      const direct = () => {
        try {
          new Notification(titre, options);
        } catch {
          // navigateur mobile : la notification directe est interdite
        }
      };
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker
          .getRegistration()
          .then((reg) => (reg ? reg.showNotification(titre, options) : direct()))
          .catch(direct);
      } else {
        direct();
      }
    });
    ecrire(CLE_ENVOYEES, JSON.stringify([...deja, ...nouveaux.map((d) => d.id)].slice(-100)));
  }, [devoirs, actif]);

  async function basculer() {
    if (typeof Notification === "undefined") return;
    if (actif) {
      ecrire(CLE_ACTIF, "0");
      setActif(false);
      return;
    }
    let p = Notification.permission;
    if (p === "default") p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") {
      ecrire(CLE_ACTIF, "1");
      setActif(true);
    }
  }

  if (!visible) return null;

  return (
    <div className="relative">
      <button type="button" aria-label="Notifications" className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-white/10" onClick={() => setOuvert((o) => !o)}>
        {devoirs.length > 0 ? <BellRing size={20} /> : <Bell size={20} />}
        {devoirs.length > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-mp-yellow px-1 text-[10px] font-bold text-black">{devoirs.length}</span>
        ) : null}
      </button>
      {ouvert ? (
        <>
          <button type="button" aria-label="Fermer" className="fixed inset-0 z-30 cursor-default" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl bg-white p-3 text-mp-text shadow-lg">
            <p className="text-sm font-bold">Devoirs &agrave; faire</p>
            {devoirs.length === 0 ? (
              <p className="mt-2 text-xs text-mp-grey">Aucun devoir &agrave; faire pour le moment.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[#eef1f5]">
                {devoirs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/qcm/surveille/${d.id}`} className="block min-h-[44px] py-2" onClick={() => setOuvert(false)}>
                      <p className="text-sm font-semibold">{d.titre}</p>
                      <p className="text-xs text-mp-grey">
                        {d.module} &middot; {d.nbQuestions} questions &middot; {d.dureeMinutes} min
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 border-t border-[#eef1f5] pt-3">
              {permission === "indisponible" ? (
                <p className="text-xs text-mp-grey">Les notifications ne sont pas disponibles sur cet appareil.</p>
              ) : permission === "denied" ? (
                <p className="text-xs text-mp-grey">Notifications bloqu&eacute;es : autorisez-les dans les r&eacute;glages du navigateur.</p>
              ) : (
                <button type="button" className="flex min-h-[44px] w-full items-center justify-between text-xs font-semibold" onClick={() => void basculer()}>
                  <span>Notifications du navigateur</span>
                  <span className={`rounded-full px-3 py-1 ${actif ? "bg-mp-blue text-white" : "bg-mp-bg text-mp-grey"}`}>{actif ? "Activ\u00e9es" : "D\u00e9sactiv\u00e9es"}</span>
                </button>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}