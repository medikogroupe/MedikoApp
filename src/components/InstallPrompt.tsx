"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type EvenementInstall = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const evtRef = useRef<EvenementInstall | null>(null);
  const [installee, setInstallee] = useState(true);
  const [ferme, setFerme] = useState(false);
  const [aide, setAide] = useState(false);
  const [ios, setIos] = useState(false);
  const [diag, setDiag] = useState(false);
  const [recu, setRecu] = useState(false);
  const [sw, setSw] = useState("...");
  const [manifest, setManifest] = useState("...");
  const [ua, setUa] = useState("");

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstallee(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setDiag(window.location.search.includes("diag=1"));
    setUa(navigator.userAgent.slice(0, 110));
    setManifest(document.querySelector('link[rel="manifest"]') ? "oui" : "NON");
    try {
      if (sessionStorage.getItem("mp_install_ferme") === "1") setFerme(true);
    } catch {}
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => setSw(r ? (r.active ? "actif" : "en cours") : "ABSENT"))
        .catch(() => setSw("erreur"));
    } else {
      setSw("non pris en charge");
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      evtRef.current = e as EvenementInstall;
      setRecu(true);
    };
    const onTap = (ev: Event) => {
      const cible = ev.target as HTMLElement | null;
      if (cible?.closest("[data-install]")) return;
      const e = evtRef.current;
      if (!e) return;
      evtRef.current = null;
      setRecu(false);
      void e.prompt();
    };
    const onInstalled = () => setInstallee(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("pointerup", onTap);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("pointerup", onTap);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installer() {
    const e = evtRef.current;
    if (e) {
      evtRef.current = null;
      setRecu(false);
      await e.prompt();
      return;
    }
    setAide(true);
  }

  function fermer() {
    setFerme(true);
    try {
      sessionStorage.setItem("mp_install_ferme", "1");
    } catch {}
  }

  if (installee && !diag) return null;

  return (
    <>
      {diag ? (
        <div className="fixed inset-x-2 top-2 z-50 rounded-xl bg-black/90 p-3 text-[11px] leading-relaxed text-white">
          <p>Autorisation d&apos;installation reçue : {recu ? "OUI" : "NON"}</p>
          <p>Service worker : {sw}</p>
          <p>Lien manifest dans la page : {manifest}</p>
          <p>Mode : {installee ? "application" : "navigateur"}</p>
          <p>Navigateur : {ua}</p>
        </div>
      ) : null}
      {!installee && !ferme ? (
        <div
          data-install
          className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-2xl border border-[#dfe3e8] bg-white p-3 shadow-lg"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.svg" alt="" className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">Installer MEDIKO+</p>
            <p className="text-xs leading-snug text-mp-grey">
              {aide
                ? ios
                  ? "Touchez Partager dans Safari, puis « Sur l'écran d'accueil »."
                  : "Touchez le menu ⋮ de Chrome, puis « Ajouter à l'écran d'accueil »."
                : "Accès direct depuis votre écran d'accueil."}
            </p>
          </div>
          <button type="button" onClick={installer} className="mp-btn-yellow min-h-[44px] shrink-0 px-4">
            Installer
          </button>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer"
            className="flex h-10 w-10 shrink-0 items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      ) : null}
    </>
  );
}