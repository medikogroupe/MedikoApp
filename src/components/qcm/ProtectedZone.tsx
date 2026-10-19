"use client";

import { useMemo } from "react";

/**
 * Dissuasion contre les fuites : filigrane au nom de l'étudiant sur tout l'écran, copier/coller,
 * clic droit, glisser et impression bloqués. Un navigateur ne peut PAS empêcher une capture d'écran :
 * le filigrane permet de retrouver l'auteur d'une capture diffusée.
 */
export default function ProtectedZone({
  filigrane,
  masque = false,
  children,
}: {
  filigrane: string;
  masque?: boolean;
  children: React.ReactNode;
}) {
  const motif = useMemo(() => {
    const texte = filigrane.replace(/[<>&"']/g, "");
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='200'>` +
      `<text x='10' y='110' fill='rgba(10,75,138,0.16)' font-size='15' font-family='sans-serif' ` +
      `transform='rotate(-24 160 100)'>${texte}</text></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [filigrane]);

  const bloquer = (e: React.SyntheticEvent) => e.preventDefault();

  return (
    <div
      className="mp-protege relative select-none"
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={bloquer}
      onCopy={bloquer}
      onCut={bloquer}
      onDragStart={bloquer}
    >
      <style>{`@media print { .mp-protege { display: none !important; } }`}</style>
      <div className={masque ? "invisible" : undefined}>{children}</div>
      {masque ? (
        <div className="mp-card absolute inset-0 flex items-center justify-center p-6 text-center text-sm font-semibold text-mp-blue">
          Contenu masqué. Revenez sur cette page pour continuer l&apos;examen.
        </div>
      ) : null}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-40"
        style={{ backgroundImage: motif, backgroundRepeat: "repeat" }}
      />
    </div>
  );
}
