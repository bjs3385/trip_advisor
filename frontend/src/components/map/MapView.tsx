"use client";

import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useState, useCallback } from "react";
import { MapPin } from "lucide-react";
import { SelectedNode } from "@/app/page";

const JAPAN_CENTER = { lat: 35.6762, lng: 139.6503 };

const LOCATIONS = [
  {
    id: "tokyo",
    name: "도쿄",
    type: "도시",
    description: "일본의 수도. 시부야, 아사쿠사, 신주쿠 등 주요 관광지.",
    position: { lat: 35.6762, lng: 139.6503 },
  },
  {
    id: "kyoto",
    name: "교토",
    type: "고도",
    description: "천 년의 고도. 후시미 이나리, 아라시야마, 긴카쿠지.",
    position: { lat: 35.0116, lng: 135.7681 },
  },
  {
    id: "osaka",
    name: "오사카",
    type: "도시",
    description: "일본 제2의 도시. 도톤보리, 오사카 성, 우메다.",
    position: { lat: 34.6937, lng: 135.5023 },
  },
  {
    id: "nara",
    name: "나라",
    type: "고도",
    description: "사슴 공원과 도다이지 대불로 유명한 옛 수도.",
    position: { lat: 34.6851, lng: 135.8049 },
  },
  {
    id: "hiroshima",
    name: "히로시마",
    type: "도시",
    description: "평화 기념 공원과 미야지마 섬.",
    position: { lat: 34.3853, lng: 132.4553 },
  },
];

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1f0f" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  styles: DARK_MAP_STYLE,
  backgroundColor: "#020617",
};

interface MapViewProps {
  onNodeSelect: (node: SelectedNode) => void;
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center relative overflow-hidden">
      {/* 격자 패턴 */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      {/* 가상 지형 원형 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full border border-slate-800/60 opacity-40" />
        <div className="absolute w-[300px] h-[300px] rounded-full border border-slate-700/40 opacity-30" />
        <div className="absolute w-[150px] h-[150px] rounded-full border border-slate-600/30 opacity-20" />
      </div>
      {/* 플레이스홀더 도시 핀 */}
      {[
        { name: "도쿄", x: "60%", y: "28%" },
        { name: "교토", x: "46%", y: "54%" },
        { name: "오사카", x: "44%", y: "60%" },
        { name: "나라", x: "47%", y: "62%" },
        { name: "히로시마", x: "32%", y: "66%" },
      ].map((city) => (
        <div
          key={city.name}
          className="absolute flex flex-col items-center gap-1"
          style={{ left: city.x, top: city.y, transform: "translate(-50%, -50%)" }}
        >
          <div className="w-2 h-2 rounded-full bg-blue-400 ring-2 ring-blue-400/30" />
          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">{city.name}</span>
        </div>
      ))}
      <div className="relative flex flex-col items-center gap-3">
        <MapPin className="w-6 h-6 text-slate-600" />
        <p className="text-slate-600 text-xs font-mono tracking-widest uppercase">
          Map rendering area
        </p>
        <p className="text-slate-700 text-[10px] font-mono">
          NEXT_PUBLIC_GOOGLE_MAPS_API_KEY required
        </p>
      </div>
    </div>
  );
}

export default function MapView({ onNodeSelect }: MapViewProps) {
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const handleMarkerClick = useCallback(
    (loc: (typeof LOCATIONS)[number]) => {
      setActiveMarker(loc.id);
      onNodeSelect({ id: loc.id, name: loc.name, type: loc.type, description: loc.description });
    },
    [onNodeSelect]
  );

  if (!apiKey || loadError) return <MapPlaceholder />;

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-xs font-mono">Loading map engine...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-full"
      center={JAPAN_CENTER}
      zoom={6}
      options={MAP_OPTIONS}
      onClick={() => { setActiveMarker(null); onNodeSelect(null); }}
    >
      {LOCATIONS.map((loc) => (
        <Marker
          key={loc.id}
          position={loc.position}
          onClick={() => handleMarkerClick(loc)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: activeMarker === loc.id ? 10 : 7,
            fillColor: activeMarker === loc.id ? "#34d399" : "#60a5fa",
            fillOpacity: 1,
            strokeColor: activeMarker === loc.id ? "#059669" : "#1d4ed8",
            strokeWeight: 2,
          }}
        />
      ))}
    </GoogleMap>
  );
}
