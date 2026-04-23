"use client";

import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import { MapPin, Star, Check, MapPinned, Train, Camera, Utensils, Bed, Trash2 } from "lucide-react";
import { SelectedNode } from "@/app/page";
import { CATEGORY_COLOR, LocationCategory } from "@/data/itinerary";
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

// 두 좌표 간 직선 거리 (km) — Directions 모드 자동 추정에 사용
function haversineKm(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

type RouteMode = "WALK" | "TRANSIT" | null;

function segmentKey(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
  mode: RouteMode,
): string {
  const k = (n: number) => n.toFixed(5);
  return `${k(a.lat)},${k(a.lng)}|${k(b.lat)},${k(b.lng)}|${mode ?? "STRAIGHT"}`;
}

// Routes API 호출 — 실패 시 null 반환해 호출자가 직선 폴백하도록
async function fetchRoutePath(
  origin: google.maps.LatLngLiteral,
  dest: google.maps.LatLngLiteral,
  mode: Exclude<RouteMode, null>,
  apiKey: string,
): Promise<google.maps.LatLngLiteral[] | null> {
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.polyline.geoJsonLinestring",
      },
      body: JSON.stringify({
        origin:      { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat,   longitude: dest.lng   } } },
        travelMode: mode,
        polylineEncoding: "GEO_JSON_LINESTRING",
        languageCode: "ko",
        regionCode: "JP",
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.routes?.[0]?.polyline?.geoJsonLinestring?.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    // GeoJSON은 [lng, lat] 순
    return coords.map((c: [number, number]) => ({ lng: c[0], lat: c[1] }));
  } catch {
    return null;
  }
}

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

const ADD_BUTTONS: { cat: LocationCategory; label: string; Icon: React.ElementType }[] = [
  { cat: "TRANSIT", label: "교통", Icon: Train },
  { cat: "SIGHT",   label: "위치", Icon: Camera },
  { cat: "FOOD",    label: "음식", Icon: Utensils },
  { cat: "HOTEL",   label: "호텔", Icon: Bed },
];

const CATEGORY_MARKER_ICON: Record<LocationCategory, React.ElementType> = {
  HOTEL: Bed, SIGHT: Camera, FOOD: Utensils, TRANSIT: Train,
};

function LocationMarker({
  position,
  category,
  isSelected,
  onClick,
}: {
  position: google.maps.LatLngLiteral;
  category: LocationCategory;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_MARKER_ICON[category];
  const color = CATEGORY_MARKER_COLOR[category] ?? '#58A6FF';
  const size = isSelected ? 30 : 24;
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          transform: 'translate(-50%, -50%)',
          width: size,
          height: size,
          background: color,
          borderRadius: '50%',
          border: isSelected ? '2px solid #ffffff' : `1px solid rgba(255,255,255,0.4)`,
          boxShadow: `0 0 ${isSelected ? 14 : 6}px ${color}`,
          opacity: isSelected ? 1 : 0.85,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'width 0.15s ease-out, height 0.15s ease-out, box-shadow 0.15s ease-out',
        }}
      >
        <Icon
          color="#ffffff"
          size={isSelected ? 16 : 13}
          strokeWidth={2.25}
        />
      </div>
    </OverlayView>
  );
}

function PoiPopup({ place, onClose }: { place: PlacePopup; onClose: () => void }) {
  const addLocation = useItineraryStore((s) => s.addLocation);
  const days        = useItineraryStore((s) => s.days);
  const hasDays     = days.length > 0;
  const [selectedDay, setSelectedDay] = useState<number>(() => days[0]?.day ?? 1);
  const [addedCat, setAddedCat] = useState<LocationCategory | null>(null);

  // days 변경 시 selectedDay가 유효 범위 밖이면 첫 일자로 동기화
  useEffect(() => {
    if (hasDays && !days.some((d) => d.day === selectedDay)) {
      setSelectedDay(days[0].day);
    }
  }, [days, hasDays, selectedDay]);

  const typeLabel = place.type?.replace(/_/g, ' ');
  const lat = place.position.lat.toFixed(4);
  const lng = place.position.lng.toFixed(4);

  const handleAdd = (category: LocationCategory) => {
    if (!hasDays) return;
    addLocation(selectedDay, {
      id: `poi-${place.placeId.slice(-8)}-${Date.now()}`,
      name: place.name || place.address || "장소",
      category,
      time: "00:00",
      position: place.position,
    });
    setAddedCat(category);
    setTimeout(() => setAddedCat(null), 1500);
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
          {hasDays ? (
            <div className="flex flex-col gap-1.5">
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-slate-300 text-[9px] font-mono rounded-sm px-1.5 py-1 focus:outline-none focus:border-blue-500/50"
              >
                {days.map((d) => (
                  <option key={d.day} value={d.day} className="bg-[#0d1117]">
                    Day {d.day} · {d.label}{d.city ? ` · ${d.city}` : ""}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-4 gap-1">
                {ADD_BUTTONS.map(({ cat, label, Icon }) => {
                  const isAdded = addedCat === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleAdd(cat)}
                      title={`${label}로 추가`}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-1 rounded-sm border transition-colors",
                        isAdded
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : cn("bg-white/5 border-white/10 hover:bg-white/10", CATEGORY_COLOR[cat])
                      )}
                    >
                      {isAdded ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                      <span className="text-[8px] font-mono">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[9px] font-mono text-slate-500 text-center py-1 border border-dashed border-slate-700/60 rounded-sm">
              간트에 일자를 먼저 추가하세요
            </p>
          )}
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
  const searchTarget        = useItineraryStore((s) => s.searchTarget);
  const setSearchTarget     = useItineraryStore((s) => s.setSearchTarget);
  const removeLocation      = useItineraryStore((s) => s.removeLocation);
  const [poiPopup, setPoiPopup] = useState<PlacePopup | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // SearchModule에서 선택 시 → pan + popup 오픈 → store 트리거 클리어
  useEffect(() => {
    if (!searchTarget) return;
    setPoiPopup({
      position: searchTarget.position,
      placeId: searchTarget.placeId,
      name: searchTarget.name,
      address: searchTarget.address,
      type: searchTarget.type,
      rating: searchTarget.rating,
    });
    if (mapRef.current) {
      mapRef.current.panTo(searchTarget.position);
      const z = mapRef.current.getZoom() ?? 6;
      if (z < 13) mapRef.current.setZoom(15);
    }
    setSearchTarget(null);
  }, [searchTarget, setSearchTarget]);

  // position이 있는 모든 일정 항목 수집
  const mappedLocations = Object.entries(itinerary).flatMap(([dayStr, dayData]) =>
    dayData.locations
      .filter((loc) => loc.position)
      .map((loc) => ({ ...loc, day: Number(dayStr) }))
  );

  // 동선 폴리라인을 직접 google.maps.Polyline 인스턴스로 관리
  // (라이브러리 <Polyline>은 path 변경/언마운트 시 인스턴스가 지도에서 제거되지 않는 케이스가 있음)
  const polylineRefs = useRef<Map<string, google.maps.Polyline>>(new Map());
  // (origin, dest, mode) → resolved path 캐시 (Routes API 비용 절감)
  const segmentCacheRef = useRef<Map<string, google.maps.LatLngLiteral[]>>(new Map());

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const key = apiKey;
    if (!key) return;

    let cancelled = false;

    const handler = window.setTimeout(async () => {
      // 1) 현재 itinerary에서 day별 세그먼트 계산 (mode 자동 추정)
      const desired = new Map<
        string,
        { color: string; segs: { from: google.maps.LatLngLiteral; to: google.maps.LatLngLiteral; mode: RouteMode }[] }
      >();
      Object.entries(itinerary).forEach(([dayStr, dayData]) => {
        const positioned = dayData.locations.filter((l) => l.position);
        if (positioned.length < 2) return;
        const segs: { from: google.maps.LatLngLiteral; to: google.maps.LatLngLiteral; mode: RouteMode }[] = [];
        for (let i = 0; i < positioned.length - 1; i++) {
          const from = positioned[i].position!;
          const to   = positioned[i + 1].position!;
          const dist = haversineKm(from, to);
          // 너무 멀면 mode=null → API 호출 없이 직선 폴백 (비용 절감)
          const mode: RouteMode = dist < 3 ? "WALK" : dist < 150 ? "TRANSIT" : null;
          segs.push({ from, to, mode });
        }
        desired.set(dayStr, {
          color: DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length],
          segs,
        });
      });

      // 2) 사라진 day의 폴리라인 제거
      polylineRefs.current.forEach((line, k) => {
        if (!desired.has(k)) {
          line.setMap(null);
          polylineRefs.current.delete(k);
        }
      });

      // 3) day별로 세그먼트 path 가져와 이어붙여 폴리라인 갱신
      for (const [dayStr, { color, segs }] of desired) {
        const segPaths: google.maps.LatLngLiteral[][] = [];
        for (const seg of segs) {
          const cacheK = segmentKey(seg.from, seg.to, seg.mode);
          let path = segmentCacheRef.current.get(cacheK);
          if (!path) {
            if (seg.mode) {
              const fetched = await fetchRoutePath(seg.from, seg.to, seg.mode, key);
              if (fetched) path = fetched;
            }
            if (!path) path = [seg.from, seg.to];
            segmentCacheRef.current.set(cacheK, path);
          }
          if (cancelled) return;
          segPaths.push(path);
        }

        // 세그먼트 사이 중복 끝점 제거하면서 이어붙이기
        const fullPath: google.maps.LatLngLiteral[] = [];
        segPaths.forEach((p, i) => {
          fullPath.push(...(i === 0 ? p : p.slice(1)));
        });

        const existing = polylineRefs.current.get(dayStr);
        if (existing) {
          existing.setPath(fullPath);
          existing.setOptions({ strokeColor: color });
        } else {
          const line = new google.maps.Polyline({
            path: fullPath,
            map,
            geodesic: false,
            strokeColor: color,
            strokeOpacity: 0.7,
            strokeWeight: 3,
          });
          polylineRefs.current.set(dayStr, line);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(handler);
    };
  }, [itinerary, isLoaded, apiKey]);

  // 컴포넌트 언마운트 시 폴리라인 전부 정리
  useEffect(() => {
    const refs = polylineRefs.current;
    return () => {
      refs.forEach((line) => line.setMap(null));
      refs.clear();
    };
  }, []);

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
      onLoad={(map) => { mapRef.current = map; }}
      onUnmount={() => { mapRef.current = null; }}
    >
      {/* 동선은 useEffect 안에서 google.maps.Polyline로 직접 관리됨 */}

      {/* 일정에 추가된 장소 마커 */}
      {mappedLocations.map((loc) => {
        const isSelected = selectedLocation?.locationId === loc.id && selectedLocation?.day === loc.day;
        return (
          <LocationMarker
            key={loc.id}
            position={loc.position!}
            category={loc.category}
            isSelected={isSelected}
            onClick={() => setSelectedLocation({ day: loc.day, locationId: loc.id })}
          />
        );
      })}

      {/* 선택된 마커 위 삭제 버튼 */}
      {selectedLocation && (() => {
        const sel = mappedLocations.find(
          (l) => l.id === selectedLocation.locationId && l.day === selectedLocation.day
        );
        if (!sel?.position) return null;
        return (
          <OverlayView
            position={sel.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeLocation(selectedLocation.day, selectedLocation.locationId);
                setSelectedLocation(null);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title="이 장소 삭제"
              style={{ transform: 'translate(-50%, calc(-100% - 22px))' }}
              className="flex items-center gap-1 bg-[#0d1117]/95 border border-red-500/40 text-red-400 hover:bg-red-500/15 hover:text-red-300 text-[9px] font-mono px-1.5 py-1 rounded-sm shadow-[0_0_10px_rgba(0,0,0,0.6)] whitespace-nowrap"
            >
              <Trash2 className="w-2.5 h-2.5" />
              삭제
            </button>
          </OverlayView>
        );
      })()}

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
