"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        if (process.env.NODE_ENV === "production") {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      } else {
        // Developpement : aucun cache, on retire les anciens service workers.
        navigator.serviceWorker.getRegistrations().then((liste) => liste.forEach((r) => void r.unregister())).catch(() => undefined);
        if ("caches" in window) caches.keys().then((cles) => cles.forEach((c) => void caches.delete(c))).catch(() => undefined);
      }
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
