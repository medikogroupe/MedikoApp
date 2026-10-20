"use client";

import { useState } from "react";

interface AdminSettingsProps {
  randomize: boolean;
  setRandomize: (v: boolean) => void;
  antiTriche: boolean;
  setAntiTriche: (v: boolean) => void;
}

export default function AdminSettings({ randomize, setRandomize, antiTriche, setAntiTriche }: AdminSettingsProps) {
  return (
    <div className="p-4 border rounded bg-gray-100">
      <label>
        <input type="checkbox" checked={randomize} onChange={(e) => setRandomize(e.target.checked)} />
        Mode aléatoire
      </label>
      <label className="ml-4">
        <input type="checkbox" checked={antiTriche} onChange={(e) => setAntiTriche(e.target.checked)} />
        Activer anti-triche
      </label>
    </div>
  );
}
