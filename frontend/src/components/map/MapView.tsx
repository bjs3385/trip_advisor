"use client";

import { GoogleMap, Marker, Polyline, OverlayView } from "@react-google-maps/api";
import { useState, useCallback } from "react";
import { MapPin, ExternalLink, Star, Plus, Check, MapPinned } from "lucide-react";
import { SelectedNode } from "@/app/page";
import { LocationCategory } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";

const JAPAN_CENTER = { lat: 36.2048, lng: 138.2529 };

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#06090e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#06090e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#161b22" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#30363d" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0d1117" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0f1f14" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "on" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#30363d" }] },
];

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  styles: DARK_MAP_STYLE,
  backgroundColor: "#06090e",
  minZoom: 4,
};

// 카테고리 → 마커 색상
const CATEGORY_MARKER_COLOR: Record<string, string> = {
  HOTEL:   '#A371F7',
  SIGHT:   '#3FB950',
  FOOD:    '#FB923C',
  TRANSIT: '#58A6FF',
};

// 일차별 동선 색상
const DAY_ROUTE_COLORS = [
  '#58A6FF', '#3FB950', '#FB923C', '#A371F7', '#F85149',
  '#79C0FF', '#56D364', '#FFA657', '#D2A8FF', '#FF7B72',
];

interface MapViewProps {
  onNodeSelect: (node: SelectedNode) => void;
  isLoaded: boolean;
  loadError: boolean;
}

function MapPlaceholder() {
  return (
    <div className="w-full h-full bg-[#06090e] flex items-center justify-center relative overflow-hidden">
      {/* 격자 패턴 */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      {/* 가상 지형 원형 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full border border-blue-500/10" />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-blue-400/20" />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-blue-300/30" />
      </div>

      <div className="relative flex flex-col items-center gap-4 p-6 bg-black/40 border border-white/10 rounded-sm backdrop-blur-md">
        <MapPin className="w-8 h-8 text-blue-500 animate-pulse" />
        <div className="text-center">
          <p className="text-blue-400 text-[13px] font-bold tracking-[0.2em] uppercase mb-1">
            Map Render Engine Offline
          </p>
          <p className="text-slate-500 text-[10px] font-mono tracking-widest">
            AWAITING NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </p>
        </div>
      </div>
    </div>
  );
}

type PlacePopup = {
  position: google.maps.LatLngLiteral;
  name: string;
  address?: string;
  type?: string;
  rating?: number;
  placeId: string;
};

const TYPE_TO_CATEGORY: Record<string, LocationCategory> = {
  lodging: "HOTEL",
  restaurant: "FOOD",
  food: "FOOD",
  cafe: "FOOD",
  transit_station: "TRANSIT",
  train_station: "TRANSIT",
  subway_station: "TRANSIT",
  bus_station: "TRANSIT",
  airport: "TRANSIT",
};

function guessCategory(type?: string): LocationCategory {
  if (!type) return "SIGHT";
  return TYPE_TO_CATEGORY[type] ?? "SIGHT";
}

function PoiPopup({ place, onClose }: { place: PlacePopup; onClose: () => void }) {
  const addLocation = useItineraryStore((s) => s.addLocation);
  const days        = useItineraryStore((s) => s.days);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [added, setAdded] = useState(false);

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
  const typeLabel = place.type?.replace(/_/g, ' ');
  const lat = place.position.lat.toFixed(4);
  const lng = place.position.lng.toFixed(4);

  const handleAdd = () => {
    addLocation(selectedDay, {
      id: `poi-${place.placeId.slice(-8)}-${Date.now()}`,
      name: place.name || place.address || "장소",
      category: guessCategory(place.type),
      time: "00:00",
      position: place.position,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div
      className="relative"
      style={{ transform: 'translate(-50%, calc(-100% - 18px))', width: 220 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#0d1117] border border-white/10 rounded-sm overflow-hidden text-left"
        style={{ boxShadow: '0 0 20px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)' }}
      >
        {/* 헤더 */}
        <div className="px-3 py-2 flex items-start justify-between gap-2 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
              <span className="text-[11px] font-bold text-slate-100 tracking-wide leading-tight">
                {place.name || "—"}
              </span>
            </div>
            {typeLabel && (
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                {typeLabel}
              </span>
            )}
          </div>
          <button
            className="text-slate-600 hover:text-slate-300 text-[10px] font-mono leading-none shrink-0 mt-0.5"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2">
          {/* 별점 */}
          {place.rating !== undefined && (
            <div className="flex items-center gap-1.5">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-mono text-yellow-400">{place.rating.toFixed(1)}</span>
              <span className="text-[9px] text-slate-600">/5</span>
            </div>
          )}

          {/* 주소 */}
          {place.address && (
            <div className="flex items-start gap-1.5">
              <MapPinned className="w-2.5 h-2.5 text-slate-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-slate-500 leading-relaxed">{place.address}</p>
            </div>
          )}

          {/* 좌표 */}
          <p className="text-[8px] font-mono text-slate-700">{lat}, {lng}</p>

          {/* 구분선 */}
          <div className="border-t border-white/[0.06]" />

          {/* 일정 추가 */}
          <div className="flex items-center gap-1.5">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="flex-1 bg-white/5 border border-white/10 text-slate-300 text-[9px] font-mono rounded-sm px-1.5 py-1 focus:outline-none focus:border-blue-500/50"
            >
              {days.map((d) => (
                <option key={d.day} value={d.day} className="bg-[#0d1117]">
                  Day {d.day} · {d.label} · {d.city}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              className={cn(
                "flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-sm border transition-colors shrink-0",
                added
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              )}
            >
              {added ? <Check className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
              {added ? "추가됨" : "추가"}
            </button>
          </div>

          {/* Maps 링크 */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-blue-400/50 hover:text-blue-400 font-mono"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Google Maps에서 보기
          </a>
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '8px solid rgba(255,255,255,0.10)',
        }}
      />
    </div>
  );
}

export default function MapView({ onNodeSelect, isLoaded, loadError }: MapViewProps) {
  const setSelectedMapCity  = useItineraryStore((s) => s.setSelectedMapCity);
  const itinerary           = useItineraryStore((s) => s.itinerary);
  const selectedLocation    = useItineraryStore((s) => s.selectedLocation);
  const setSelectedLocation = useItineraryStore((s) => s.setSelectedLocation);
  const [poiPopup, setPoiPopup] = useState<PlacePopup | null>(null);

  // position이 있는 모든 일정 항목 수집
  const mappedLocations = Object.entries(itinerary).flatMap(([dayStr, dayData]) =>
    dayData.locations
      .filter((loc) => loc.position)
      .map((loc) => ({ ...loc, day: Number(dayStr) }))
  );

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  if (!apiKey || loadError) return <MapPlaceholder />;

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };
      setSelectedMapCity(null);

      // 1) POI 아이콘 클릭 — placeId가 바로 들어오는 경우
      if ((event as any).placeId) {
        (event as any).stop();
        const placeId: string = (event as any).placeId;

        const place = new google.maps.places.Place({ id: placeId });
        place.fetchFields({ fields: ["displayName", "formattedAddress", "rating", "types"] })
          .then(() => {
            setPoiPopup({
              position,
              placeId,
              name: (place as any).displayName ?? "",
              address: (place as any).formattedAddress,
              type: place.types?.[0],
              rating: place.rating ?? undefined,
            });
          })
          .catch(() => {
            setPoiPopup({ position, placeId, name: "" });
          });
        return;
      }

      // 2) 빈 영역/역 라벨 클릭 — 근처 역을 Nearby Search로 탐색
      const PlaceCtor = (google.maps.places as any).Place;
      if (!PlaceCtor?.searchNearby) {
        setPoiPopup(null);
        return;
      }

      PlaceCtor.searchNearby({
        fields: ["id", "displayName", "formattedAddress", "location", "types", "rating"],
        locationRestriction: { center: position, radius: 80 },
        includedPrimaryTypes: [
          "train_station",
          "subway_station",
          "transit_station",
          "light_rail_station",
          "bus_station",
        ],
        maxResultCount: 1,
        rankPreference: (google.maps.places as any).SearchNearbyRankPreference?.DISTANCE,
      })
        .then(({ places }: { places: any[] }) => {
          const found = places?.[0];
          if (!found) {
            setPoiPopup(null);
            return;
          }
          const loc = found.location;
          setPoiPopup({
            position: loc ? { lat: loc.lat(), lng: loc.lng() } : position,
            placeId: found.id ?? "",
            name: found.displayName ?? "",
            address: found.formattedAddress,
            type: found.types?.[0],
            rating: found.rating ?? undefined,
          });
        })
        .catch(() => {
          setPoiPopup(null);
        });
    },
    [setSelectedMapCity]
  );

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-[#06090e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
          <p className="text-blue-400/80 text-[10px] font-mono tracking-[0.3em] uppercase">Initializing Geo-System...</p>
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
      onClick={handleMapClick}
    >
      {/* 일차별 동선 */}
      {Object.entries(itinerary).map(([dayStr, dayData]) => {
        const path = dayData.locations
          .filter((loc) => loc.position)
          .map((loc) => loc.position!);
        if (path.length < 2) return null;
        const color = DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length];
        return (
          <Polyline
            key={`route-day-${dayStr}`}
            path={path}
            options={{
              geodesic: true,
              strokeColor: color,
              strokeOpacity: 0.5,
              strokeWeight: 2,
            }}
          />
        );
      })}

      {/* 일정에 추가된 장소 마커 */}
      {mappedLocations.map((loc) => {
        const isSelected = selectedLocation?.locationId === loc.id && selectedLocation?.day === loc.day;
        const color = CATEGORY_MARKER_COLOR[loc.category] ?? '#58A6FF';
        return (
          <Marker
            key={loc.id}
            position={loc.position!}
            onClick={() => setSelectedLocation({ day: loc.day, locationId: loc.id })}
            icon={{
              path: 'M 0 -8 C -5 -8 -8 -4 -8 0 C -8 5 0 12 0 12 C 0 12 8 5 8 0 C 8 -4 5 -8 0 -8 Z',
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.7,
              strokeColor: isSelected ? '#ffffff' : color,
              strokeWeight: isSelected ? 2 : 1,
              scale: isSelected ? 1.4 : 1,
              anchor: new google.maps.Point(0, 12),
            }}
          />
        );
      })}

      {/* POI 커스텀 팝업 */}
      {poiPopup && (
        <OverlayView
          position={poiPopup.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <PoiPopup
            place={poiPopup}
            onClose={() => setPoiPopup(null)}
          />
        </OverlayView>
      )}
    </GoogleMap>
  );
}
