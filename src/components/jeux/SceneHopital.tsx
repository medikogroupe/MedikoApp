"use client";

import { Visage, type Avatar } from "@/components/jeux/Portrait";

/** Chambre d'hopital illustree : patient alite, perfusion et moniteur (constantes indicatives liees a l'etat). */
export default function SceneHopital({ avatar, sante, mort = false, masquerMoniteur = false }: { avatar: Avatar; sante: number; mort?: boolean; masquerMoniteur?: boolean }) {
  const echelle = avatar === "bebe" ? 0.55 : avatar === "enfant" ? 0.65 : 0.75;
  const demi = 40 * echelle;
  const tx = 110 - demi;
  const ty = 118 - demi;
  const fc = mort ? 0 : Math.round(78 + (100 - sante) * 0.7);
  const spo2 = mort ? 0 : Math.round(90 + sante * 0.09);
  const temp = (36.8 + (100 - sante) * 0.024).toFixed(1).replace(".", ",");
  const alerte = mort || sante < 35;
  const finCouverture = avatar === "bebe" ? 220 : 296;
  return (
    <svg
      viewBox="0 0 400 250"
      className={`w-full rounded-xl border-2 ${alerte ? "border-red-400" : "border-[#d7e3ee]"}`}
      role="img"
      aria-label="Chambre d'hôpital"
    >
      <style>{`@keyframes ecg{from{stroke-dashoffset:120}to{stroke-dashoffset:0}}`}</style>
      <rect width="400" height="250" fill="#e6eff7" />
      <rect y="190" width="400" height="60" fill="#c9d4de" />
      <rect y="150" width="400" height="6" fill="#d7e3ee" />

      <rect x="16" y="22" width="80" height="62" rx="4" fill="#bfe3f7" stroke="#9db8cc" strokeWidth="3" />
      <path d="M56 22 V84 M16 53 H96" stroke="#9db8cc" strokeWidth="2" />
      <circle cx="34" cy="38" r="7" fill="#ffe08a" />
      <rect x="112" y="22" width="40" height="40" rx="6" fill="#ffffff" />
      <path d="M126 28h12v10h10v12h-10v10h-12V50h-10V38h10z" transform="translate(-6 -2) scale(0.95)" fill="#d6336c" />

      <rect x="270" y="14" width="114" height="94" rx="8" fill="#0f1b2d" />
      <text x="278" y="32" fontSize="13" fontWeight="700" fill="#4ade80">{mort ? "FC --" : `FC ${fc}`}</text>
      <text x="278" y="48" fontSize="13" fontWeight="700" fill="#38bdf8">{mort ? "SpO2 --" : `SpO2 ${spo2}%`}</text>
      <text x="278" y="64" fontSize="13" fontWeight="700" fill="#facc15">{mort ? "T° --" : `T° ${temp}`}</text>
      {mort ? (
        <line x1="278" y1="86" x2="376" y2="86" stroke="#f87171" strokeWidth="2" />
      ) : (
        <polyline
          points="0,0 14,0 18,-3 22,3 26,0 34,0 38,-16 42,14 46,0 60,0 66,-5 72,0 96,0"
          transform="translate(278 86)"
          fill="none"
          stroke={alerte ? "#f87171" : "#4ade80"}
          strokeWidth="2"
          style={{ strokeDasharray: 120, animation: "ecg 1.6s linear infinite" }}
        />
      )}
      <text x="278" y="102" fontSize="7" fill="#7f8ea3">constantes indicatives</text>
      {masquerMoniteur ? <rect x="262" y="8" width="130" height="106" rx="10" fill="#e6eff7" /> : null}

      <rect x="234" y="58" width="4" height="136" fill="#9aa8b5" />
      <rect x="222" y="190" width="28" height="5" rx="2" fill="#9aa8b5" />
      <rect x="222" y="22" width="28" height="38" rx="8" fill="#cfeaf7" stroke="#8cb8d0" strokeWidth="2" />
      <rect x="225" y="38" width="22" height="19" rx="5" fill="#9ed2ea" />
      <path d="M236 58 Q232 100 196 128" stroke="#8cb8d0" strokeWidth="2" fill="none" />

      <rect x="52" y="112" width="10" height="82" rx="3" fill="#7b8a99" />
      <rect x="60" y="150" width="240" height="14" rx="4" fill="#7b8a99" />
      <rect x="68" y="164" width="8" height="30" fill="#6b7886" />
      <rect x="282" y="164" width="8" height="30" fill="#6b7886" />
      <rect x="62" y="132" width="236" height="22" rx="8" fill="#ffffff" />
      <ellipse cx="108" cy="130" rx="34" ry="12" fill="#f4f7fa" />
      <g transform={`translate(${tx} ${ty}) scale(${echelle})`}>
        <Visage avatar={avatar} sante={sante} mort={mort} epaules={false} />
      </g>
      {avatar === "enceinte" ? <ellipse cx="205" cy="122" rx="32" ry="15" fill="#2a9d8f" /> : null}
      <path d={`M140 136 Q152 120 190 122 L${finCouverture} 126 L${finCouverture} 154 L140 154 Z`} fill="#2a9d8f" />
      <path d={`M140 136 Q152 120 190 122 L${finCouverture} 126`} stroke="#23857a" strokeWidth="2" fill="none" />
    </svg>
  );
}