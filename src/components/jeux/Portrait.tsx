"use client";

import { useId } from "react";

export type Avatar = "enfant" | "bebe" | "homme" | "femme" | "enceinte";
const LISTE: Avatar[] = ["enfant", "bebe", "homme", "femme", "enceinte"];

export function avatarSur(v: unknown): Avatar {
  return LISTE.includes(v as Avatar) ? (v as Avatar) : "homme";
}

/** Visage du patient (repere 80x80) : teint et expression selon son etat. */
export function Visage({ avatar, sante, mort, epaules }: { avatar: Avatar; sante: number; mort: boolean; epaules: boolean }) {
  const peau = mort ? "#a9a39b" : sante >= 60 ? "#8d5a3b" : sante >= 35 ? "#a67a60" : "#b99b88";
  const rx = avatar === "bebe" ? 19 : avatar === "enfant" ? 17 : 16;
  const ry = avatar === "bebe" ? 19 : avatar === "enfant" ? 18 : 20;
  const cy = avatar === "bebe" ? 42 : 40;
  const ouverts = !mort && sante >= 35;
  const bouche = mort ? "M34 57 L46 57" : sante >= 60 ? "M33 54 Q40 60 47 54" : sante >= 35 ? "M34 56 L46 56" : "M33 59 Q40 52 47 59";
  const vetement =
    avatar === "enceinte" ? "#9b59b6" : avatar === "femme" ? "#e07a5f" : avatar === "homme" ? "#0A4B8A" : avatar === "enfant" ? "#f2b134" : "#8ecae6";
  return (
    <g>
      {epaules ? <path d="M6 82 Q8 62 40 62 Q72 62 74 82 Z" fill={vetement} /> : null}
      {epaules ? <rect x="34" y="52" width="12" height="14" fill={peau} /> : null}
      <ellipse cx="40" cy={cy} rx={rx} ry={ry} fill={peau} />
      {avatar === "homme" ? <path d="M24 36 Q24 16 40 16 Q56 16 56 36 Q48 26 40 26 Q32 26 24 36 Z" fill="#1f1410" /> : null}
      {avatar === "enfant" ? <path d="M25 34 Q26 20 40 20 Q54 20 55 34 Q47 27 40 27 Q33 27 25 34 Z" fill="#1f1410" /> : null}
      {avatar === "femme" ? <path d="M22 38 Q20 14 40 14 Q60 14 58 38 Q50 22 40 22 Q30 22 22 38 Z" fill="#c0392b" /> : null}
      {avatar === "enceinte" ? <path d="M22 38 Q20 14 40 14 Q60 14 58 38 Q50 22 40 22 Q30 22 22 38 Z" fill="#2a9d8f" /> : null}
      {avatar === "bebe" ? <path d="M23 38 Q22 18 40 18 Q58 18 57 38 Q48 28 40 28 Q32 28 23 38 Z" fill="#f4d35e" /> : null}
      {ouverts ? (
        <>
          <circle cx="33" cy="40" r="2.4" fill="#1b1b1b" />
          <circle cx="47" cy="40" r="2.4" fill="#1b1b1b" />
        </>
      ) : mort ? (
        <path d="M30 38 L36 42 M36 38 L30 42 M44 38 L50 42 M50 38 L44 42" stroke="#1b1b1b" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <path d="M30 41 Q33 43 36 41 M44 41 Q47 43 50 41" stroke="#1b1b1b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      )}
      <path d={bouche} stroke="#3b1d12" strokeWidth="2" fill="none" strokeLinecap="round" />
      {!mort && sante < 60 ? <path d="M58 30 Q61 35 58 38 Q55 35 58 30 Z" fill="#7ec8ff" /> : null}
    </g>
  );
}

export default function Portrait({ avatar, taille = 64, sante = 100, mort = false }: { avatar: Avatar; taille?: number; sante?: number; mort?: boolean }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 80 80" width={taille} height={taille} className="shrink-0" role="img" aria-label="Portrait du patient">
      <defs>
        <clipPath id={id}>
          <circle cx="40" cy="40" r="40" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect width="80" height="80" fill="#eaf1f8" />
        <Visage avatar={avatar} sante={sante} mort={mort} epaules />
      </g>
    </svg>
  );
}