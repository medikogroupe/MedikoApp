"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string;
  nom: string;
  type: string;
  commune: string;
  latitude: number;
  longitude: number;
  estDeGardeAujourdhui: boolean;
};

const COULEURS: Record<string, string> = {
  pharmacie: "#0A4B8A",
  centre_sante: "#0E7C5A",
  chu: "#B03030",
  clinique: "#7A4FBF",
};

function icon(point: MapPoint) {
  const couleur = point.estDeGardeAujourdhui ? "#FFC107" : COULEURS[point.type] ?? "#0A4B8A";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${couleur};border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapView({
  points,
  center,
}: {
  points: MapPoint[];
  center: [number, number];
}) {
  return (
    <MapContainer center={center} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />
      {points.map((p) => (
        <Marker key={p.id} position={[p.latitude, p.longitude]} icon={icon(p)}>
          <Popup>
            <strong>{p.nom}</strong>
            <br />
            {p.commune}
            <br />
            {p.estDeGardeAujourdhui ? "De garde aujourd'hui" : "Service normal"}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
