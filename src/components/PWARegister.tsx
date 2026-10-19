"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      };
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register);
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
