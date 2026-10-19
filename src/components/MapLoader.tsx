"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/MapView";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#e4eaf1] text-xs text-mp-grey">
      Chargement de la carte...
    </div>
  ),
});

export default function MapLoader({ points, center }: { points: MapPoint[]; center: [number, number] }) {
  return <MapView points={points} center={center} />;
}
