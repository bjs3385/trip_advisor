"use client";

import { GoogleMap, OverlayView } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Bookmark, BookmarkCheck, CalendarPlus, Check, Eye, EyeOff, GripVertical, MapPin, Pentagon, Trash2, X } from "lucide-react";
import type { SelectedNode } from "@/app/page";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";
import { CITY_INFO } from "@/data/itinerary";
import { computeNextStart } from "@/components/layout/timeline/utils";
import { DAY_ROUTE_COLORS, JAPAN_CENTER, MAP_OPTIONS } from "./mapConfig";
import { MapPlaceholder } from "./MapPlaceholder";
import { LocationMarker } from "./LocationMarker";
import { PoiPopup } from "./PoiPopup";
import { useRoutePolylines } from "./useRoutePolylines";
import { useGroupShapes } from "./useGroupShapes";
import { buildDayGroups } from "./mapUtils";
import type { PlacePopup } from "./mapTypes";

interface MapViewProps {
  onNodeSelect: (node: SelectedNode) => void;
  isLoaded: boolean;
  loadError: boolean;
}

const MAP_TILE_SIZE = 256;
const FOCUS_EXTRA_MARGIN_PX = 24;
const MIN_FOCUS_OFFSET_PX = 96;
const MAX_FOCUS_OFFSET_PX = 220;
const AREA_TOOLS_WIDTH = 260;
const AREA_TOOLS_MIN_VISIBLE = 48;

function latLngToWorldPoint(position: google.maps.LatLngLiteral) {
  const siny = Math.min(Math.max(Math.sin((position.lat * Math.PI) / 180), -0.9999), 0.9999);
  return {
    x: ((position.lng + 180) / 360) * MAP_TILE_SIZE,
    y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * MAP_TILE_SIZE,
  };
}

function worldPointToLatLng(point: { x: number; y: number }): google.maps.LatLngLiteral {
  const lng = (point.x / MAP_TILE_SIZE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / MAP_TILE_SIZE;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function getBottomFocusOffset(map: google.maps.Map) {
  const panel = document.querySelector<HTMLElement>("[data-map-focus-obstruction='bottom']");
  if (!panel) return { x: 0, y: -160 };

  const mapRect = map.getDiv().getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const overlap = Math.max(0, mapRect.bottom - Math.max(mapRect.top, panelRect.top));
  const y = -Math.min(
    MAX_FOCUS_OFFSET_PX,
    Math.max(MIN_FOCUS_OFFSET_PX, overlap / 2 + FOCUS_EXTRA_MARGIN_PX),
  );
  return { x: 0, y };
}

function setMapCenterWithScreenOffset(
  map: google.maps.Map,
  position: google.maps.LatLngLiteral,
  offset: { x: number; y: number },
  zoom = map.getZoom() ?? 6,
) {
  const scale = 2 ** zoom;
  const target = latLngToWorldPoint(position);
  const center = {
    x: target.x - offset.x / scale,
    y: target.y - offset.y / scale,
  };
  map.setCenter(worldPointToLatLng(center));
}

function focusMapPoint(map: google.maps.Map, position: google.maps.LatLngLiteral, minZoom: number) {
  const zoom = Math.max(map.getZoom() ?? 6, minZoom);
  if ((map.getZoom() ?? 6) < minZoom) map.setZoom(minZoom);
  setMapCenterWithScreenOffset(map, position, getBottomFocusOffset(map), zoom);
}

function offsetCurrentMapFocus(map: google.maps.Map) {
  const center = map.getCenter();
  if (!center) return;
  setMapCenterWithScreenOffset(
    map,
    { lat: center.lat(), lng: center.lng() },
    getBottomFocusOffset(map),
  );
}

function centroid(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral {
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  return { lat, lng };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MapView({ onNodeSelect: _onNodeSelect, isLoaded, loadError }: MapViewProps) {
  void _onNodeSelect;

  const setSelectedMapCity = useItineraryStore((s) => s.setSelectedMapCity);
  const itinerary = useItineraryStore((s) => s.itinerary);
  const routeComputedDays = useItineraryStore((s) => s.routeComputedDays);
  const routeComputedLocationKeys = useItineraryStore((s) => s.routeComputedLocationKeys);
  const routeComputeRequestId = useItineraryStore((s) => s.routeComputeRequestId);
  const selectedLocation = useItineraryStore((s) => s.selectedLocation);
  const selectedMapCity = useItineraryStore((s) => s.selectedMapCity);
  const setSelectedLocation = useItineraryStore((s) => s.setSelectedLocation);
  const searchTarget = useItineraryStore((s) => s.searchTarget);
  const setSearchTarget = useItineraryStore((s) => s.setSearchTarget);
  const removeLocation = useItineraryStore((s) => s.removeLocation);
  const activeDay = useItineraryStore((s) => s.activeDay);
  const days = useItineraryStore((s) => s.days);
  const addLocation = useItineraryStore((s) => s.addLocation);
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const addBookmark = useItineraryStore((s) => s.addBookmark);
  const removeBookmark = useItineraryStore((s) => s.removeBookmark);
  const mapAreas = useItineraryStore((s) => s.mapAreas);
  const addMapArea = useItineraryStore((s) => s.addMapArea);
  const toggleMapAreaHidden = useItineraryStore((s) => s.toggleMapAreaHidden);
  const removeMapArea = useItineraryStore((s) => s.removeMapArea);
  const focusGroupTarget = useItineraryStore((s) => s.focusGroupTarget);
  const setFocusGroupTarget = useItineraryStore((s) => s.setFocusGroupTarget);
  const setMapCamera = useItineraryStore((s) => s.setMapCamera);
  const [manualPoiPopup, setManualPoiPopup] = useState<PlacePopup | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const cameraSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHandledInitialIdleRef = useRef(false);
  const draftAreaPolygonRef = useRef<google.maps.Polygon | null>(null);
  const [areaMode, setAreaMode] = useState<"idle" | "draw" | "entry" | "exit">("idle");
  const [draftVertices, setDraftVertices] = useState<google.maps.LatLngLiteral[]>([]);
  const [draftEntryPoint, setDraftEntryPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [draftExitPoint, setDraftExitPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [draftAreaName, setDraftAreaName] = useState("");
  const [areaToolsPosition, setAreaToolsPosition] = useState({ x: 16, y: 360 });
  const areaToolsDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const searchPopup = searchTarget
    ? {
        position: searchTarget.position,
        placeId: searchTarget.placeId,
        name: searchTarget.name,
        address: searchTarget.address,
        type: searchTarget.type,
        rating: searchTarget.rating,
      }
    : null;
  const activePoiPopup = manualPoiPopup ?? searchPopup;

  useEffect(() => {
    return () => {
      if (cameraSaveTimerRef.current) clearTimeout(cameraSaveTimerRef.current);
      draftAreaPolygonRef.current?.setMap(null);
    };
  }, []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = areaToolsDragRef.current;
      if (!drag) return;
      setAreaToolsPosition({
        x: clamp(
          drag.originX + event.clientX - drag.startX,
          8,
          Math.max(8, window.innerWidth - AREA_TOOLS_MIN_VISIBLE),
        ),
        y: clamp(
          drag.originY + event.clientY - drag.startY,
          8,
          Math.max(8, window.innerHeight - AREA_TOOLS_MIN_VISIBLE),
        ),
      });
    };
    const handlePointerUp = () => {
      areaToolsDragRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  const startAreaToolsDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    areaToolsDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: areaToolsPosition.x,
      originY: areaToolsPosition.y,
    };
  }, [areaToolsPosition]);

  useEffect(() => {
    if (!map || !isLoaded || draftVertices.length === 0) {
      draftAreaPolygonRef.current?.setMap(null);
      draftAreaPolygonRef.current = null;
      return;
    }

    if (!draftAreaPolygonRef.current) {
      draftAreaPolygonRef.current = new google.maps.Polygon({
        map,
        paths: draftVertices,
        strokeColor: "#38bdf8",
        strokeOpacity: 0.9,
        strokeWeight: 1.8,
        fillColor: "#38bdf8",
        fillOpacity: 0.14,
        clickable: false,
        zIndex: 10,
      });
    } else {
      draftAreaPolygonRef.current.setPath(draftVertices);
    }
  }, [draftVertices, isLoaded, map]);

  const resetAreaDraft = useCallback(() => {
    setAreaMode("idle");
    setDraftVertices([]);
    setDraftEntryPoint(null);
    setDraftExitPoint(null);
    setDraftAreaName("");
  }, []);

  const addDraftAreaToTimeline = useCallback(() => {
    const targetDay = days.some((day) => day.day === activeDay) ? activeDay : days[0]?.day;
    if (!targetDay || draftVertices.length < 3 || !draftEntryPoint || !draftExitPoint) return;

    const existing = useItineraryStore.getState().itinerary[targetDay]?.locations ?? [];
    const name = draftAreaName.trim() || "AREA";
    const areaId = `area-${Date.now().toString(36)}`;
    const area = {
      id: areaId,
      name,
      position: centroid(draftVertices),
      shapeVertices: draftVertices,
      entryPoint: draftEntryPoint,
      exitPoint: draftExitPoint,
    };
    addMapArea(area);
    addLocation(targetDay, {
      id: `${areaId}-schedule`,
      name,
      category: "SIGHT",
      time: computeNextStart(existing),
      areaId,
      position: area.position,
      shapeVertices: draftVertices,
      entryPoint: draftEntryPoint,
      exitPoint: draftExitPoint,
    });
    resetAreaDraft();
  }, [activeDay, addLocation, addMapArea, days, draftAreaName, draftEntryPoint, draftExitPoint, draftVertices, resetAreaDraft]);

  // SearchModule에서 선택 시 → pan + popup 오픈 → store 트리거 클리어
  useEffect(() => {
    if (!searchTarget) return;
    if (mapRef.current) {
      focusMapPoint(mapRef.current, searchTarget.position, 15);
    }
  }, [searchTarget]);

  // position이 있는 모든 일정 항목 수집
  const mappedLocations = useMemo(
    () =>
      Object.entries(itinerary).flatMap(([dayStr, dayData]) =>
        dayData.locations
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((loc, index) => ({ ...loc, routeOrder: index + 1 }))
          .filter((loc) => loc.position)
          .map((loc) => ({ ...loc, day: Number(dayStr) })),
      ),
    [itinerary],
  );

  useEffect(() => {
    const existingIds = new Set(mapAreas.map((area) => area.id));
    for (const loc of mappedLocations) {
      if (!loc.position || !loc.entryPoint || !loc.exitPoint || !loc.shapeVertices || loc.shapeVertices.length < 3) {
        continue;
      }
      const areaId = loc.areaId ?? (loc.id.endsWith("-schedule") ? loc.id.replace(/-schedule$/, "") : loc.id);
      if (existingIds.has(areaId)) continue;
      addMapArea({
        id: areaId,
        name: loc.name || "AREA",
        position: loc.position,
        shapeVertices: loc.shapeVertices,
        entryPoint: loc.entryPoint,
        exitPoint: loc.exitPoint,
      });
      existingIds.add(areaId);
    }
  }, [addMapArea, mapAreas, mappedLocations]);

  const activeDayScheduledAreaIds = useMemo(() => {
    const targetDay = days.some((day) => day.day === activeDay) ? activeDay : days[0]?.day;
    if (!targetDay) return new Set<string>();
    return new Set(
      (itinerary[targetDay]?.locations ?? [])
        .map((loc) => loc.areaId ?? (loc.id.endsWith("-schedule") ? loc.id.replace(/-schedule$/, "") : ""))
        .filter(Boolean),
    );
  }, [activeDay, days, itinerary]);

  const addMapAreaToTimeline = useCallback((area: {
    id: string;
    name: string;
    position: google.maps.LatLngLiteral;
    shapeVertices: google.maps.LatLngLiteral[];
    entryPoint: google.maps.LatLngLiteral;
    exitPoint: google.maps.LatLngLiteral;
  }) => {
    const targetDay = days.some((day) => day.day === activeDay) ? activeDay : days[0]?.day;
    if (!targetDay) return;
    const existing = useItineraryStore.getState().itinerary[targetDay]?.locations ?? [];
    if (existing.some((loc) => (loc.areaId ?? loc.id.replace(/-schedule$/, "")) === area.id)) return;
    addLocation(targetDay, {
      id: `${area.id}-schedule`,
      name: area.name,
      category: "SIGHT",
      time: computeNextStart(existing),
      areaId: area.id,
      position: area.position,
      shapeVertices: area.shapeVertices,
      entryPoint: area.entryPoint,
      exitPoint: area.exitPoint,
    });
  }, [activeDay, addLocation, days]);

  useEffect(() => {
    if (!selectedLocation || !mapRef.current) return;
    const target = mappedLocations.find(
      (loc) => loc.day === selectedLocation.day && loc.id === selectedLocation.locationId,
    );
    if (!target?.position) return;
    focusMapPoint(mapRef.current, target.position, 15);
  }, [selectedLocation, mappedLocations]);

  useEffect(() => {
    if (!selectedMapCity || !mapRef.current) return;
    const target = CITY_INFO[selectedMapCity];
    if (!target) return;
    focusMapPoint(mapRef.current, target.position, 10);
  }, [selectedMapCity]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  useRoutePolylines({
    map,
    itinerary,
    isLoaded,
    apiKey,
    routeComputedDays,
    routeComputedLocationKeys,
    routeComputeRequestId,
  });
  useGroupShapes({ map, itinerary, mapAreas, isLoaded });

  const allGroups = useMemo(() => {
    if (!isLoaded) return [];
    return buildDayGroups(
      itinerary,
      (dayStr) => DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length],
    );
  }, [itinerary, isLoaded]);

  const groupLabels = useMemo(() => {
    return allGroups
      .map((g) => {
        const name = itinerary[Number(g.dayStr)]?.groupNames?.[g.groupKey];
        if (!name) return null;
        return {
          key: `${g.dayStr}:${g.groupKey}`,
          anchor: g.centroid,
          name,
          color: g.color,
        };
      })
      .filter((v): v is { key: string; anchor: google.maps.LatLngLiteral; name: string; color: string } => v !== null);
  }, [allGroups, itinerary]);

  useEffect(() => {
    if (!focusGroupTarget || !mapRef.current) return;
    const target = allGroups.find(
      (g) => Number(g.dayStr) === focusGroupTarget.day && g.groupKey === focusGroupTarget.groupId,
    );
    if (!target) {
      setFocusGroupTarget(null);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const v of target.shapeVertices) bounds.extend(v);
    mapRef.current.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
    window.setTimeout(() => {
      if (mapRef.current) offsetCurrentMapFocus(mapRef.current);
    }, 0);
    setFocusGroupTarget(null);
  }, [focusGroupTarget, allGroups, setFocusGroupTarget]);
  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent | google.maps.IconMouseEvent) => {
      if (!event.latLng) return;
      const position = { lat: event.latLng.lat(), lng: event.latLng.lng() };

      if (areaMode !== "idle") {
        if (areaMode === "draw") {
          setDraftVertices((current) => [...current, position]);
        } else if (areaMode === "entry") {
          setDraftEntryPoint(position);
          setAreaMode("exit");
        } else if (areaMode === "exit") {
          setDraftExitPoint(position);
        }
        return;
      }

      setSelectedMapCity(null);
      setSearchTarget(null);

      // 1) POI 아이콘 클릭 — placeId가 바로 들어오는 경우
      if ("placeId" in event && event.placeId) {
        event.stop();
        const placeId = event.placeId;

        const place = new google.maps.places.Place({ id: placeId }) as google.maps.places.Place & {
          displayName?: string;
          formattedAddress?: string;
          rating?: number;
          types?: string[];
        };
        place.fetchFields({ fields: ["displayName", "formattedAddress", "rating", "types"] })
          .then(() => {
            setManualPoiPopup({
              position,
              placeId,
              name: place.displayName ?? "",
              address: place.formattedAddress,
              type: place.types?.[0],
              rating: place.rating ?? undefined,
            });
          })
          .catch(() => {
            setManualPoiPopup({ position, placeId, name: "" });
          });
        return;
      }

      // 2) 빈 영역/역 라벨 클릭 — 근처 역을 Nearby Search로 탐색
      type NearbySearchResult = {
        id?: string;
        displayName?: string;
        formattedAddress?: string;
        location?: google.maps.LatLng;
        types?: string[];
        rating?: number;
      };
      type SearchablePlaceCtor = typeof google.maps.places.Place & {
        searchNearby?: (request: {
          fields: string[];
          locationRestriction: { center: google.maps.LatLngLiteral; radius: number };
          includedPrimaryTypes: string[];
          maxResultCount: number;
          rankPreference?: unknown;
        }) => Promise<{ places: NearbySearchResult[] }>;
      };
      const PlaceCtor = google.maps.places.Place as SearchablePlaceCtor;
      if (!PlaceCtor?.searchNearby) {
        setManualPoiPopup(null);
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
        rankPreference: (google.maps.places as unknown as {
          SearchNearbyRankPreference?: { DISTANCE?: unknown };
        }).SearchNearbyRankPreference?.DISTANCE,
      })
        .then(({ places }: { places: NearbySearchResult[] }) => {
          const found = places?.[0];
          if (!found) {
            setManualPoiPopup(null);
            return;
          }
          const loc = found.location;
          setManualPoiPopup({
            position: loc ? { lat: loc.lat(), lng: loc.lng() } : position,
            placeId: found.id ?? "",
            name: found.displayName ?? "",
            address: found.formattedAddress,
            type: found.types?.[0],
            rating: found.rating ?? undefined,
          });
        })
        .catch(() => {
          setManualPoiPopup(null);
        });
    },
    [areaMode, setSearchTarget, setSelectedMapCity]
  );

  const handleMapIdle = useCallback(() => {
    const currentMap = mapRef.current;
    if (!currentMap) return;

    if (!hasHandledInitialIdleRef.current) {
      hasHandledInitialIdleRef.current = true;
      return;
    }

    const center = currentMap.getCenter();
    const zoom = currentMap.getZoom();
    if (!center || zoom === undefined) return;

    if (cameraSaveTimerRef.current) clearTimeout(cameraSaveTimerRef.current);
    cameraSaveTimerRef.current = setTimeout(() => {
      const next = {
        center: {
          lat: Number(center.lat().toFixed(6)),
          lng: Number(center.lng().toFixed(6)),
        },
        zoom: Number(zoom.toFixed(2)),
      };
      const current = useItineraryStore.getState().mapCamera;
      if (
        current &&
        Math.abs(current.center.lat - next.center.lat) < 0.000001 &&
        Math.abs(current.center.lng - next.center.lng) < 0.000001 &&
        Math.abs(current.zoom - next.zoom) < 0.01
      ) {
        return;
      }
      setMapCamera(next);
    }, 500);
  }, [setMapCamera]);

  if (!apiKey || loadError) return <MapPlaceholder />;

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
      onIdle={handleMapIdle}
      onLoad={(instance) => {
        mapRef.current = instance;
        hasHandledInitialIdleRef.current = false;
        const savedCamera = useItineraryStore.getState().mapCamera;
        if (savedCamera) {
          instance.setZoom(savedCamera.zoom);
          instance.setCenter(savedCamera.center);
        }
        setMap(instance);
      }}
      onUnmount={() => {
        if (cameraSaveTimerRef.current) clearTimeout(cameraSaveTimerRef.current);
        mapRef.current = null;
        setMap(null);
      }}
    >
      {/* 동선은 useEffect 안에서 google.maps.Polyline로 직접 관리됨 */}

      {typeof document !== "undefined" && createPortal((
      <div
        className="fixed z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-stretch gap-2"
        style={{ left: areaToolsPosition.x, top: areaToolsPosition.y, width: AREA_TOOLS_WIDTH }}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          onPointerDown={startAreaToolsDrag}
          className="flex h-6 cursor-grab items-center gap-1.5 rounded-sm border border-white/10 bg-[#0d1117]/95 px-2 text-[9px] font-mono tracking-widest text-slate-500 shadow-[0_0_12px_rgba(0,0,0,0.5)] active:cursor-grabbing"
          title="드래그해서 위치 이동"
        >
          <GripVertical className="h-3 w-3 text-slate-600" />
          지도 구역 도구
        </div>
        {areaMode === "idle" ? (
          <button
            onClick={() => setAreaMode("draw")}
            title="영역 일정 그리기"
            className="inline-flex h-9 w-full items-center justify-start gap-1.5 rounded-sm border border-cyan-400/35 bg-[#0d1117]/95 px-3 text-[11px] font-mono text-cyan-200 shadow-[0_0_14px_rgba(0,0,0,0.6)] transition hover:border-cyan-300 hover:bg-cyan-400/10"
          >
            <Pentagon className="h-4 w-4" />
            <span className="whitespace-nowrap">구역 그리기</span>
          </button>
        ) : (
          <div className="w-full rounded-sm border border-cyan-400/30 bg-[#0d1117]/95 p-2 shadow-[0_0_18px_rgba(0,0,0,0.65)]">
            <div className="mb-2 flex items-center gap-1.5">
              <Pentagon className="h-3.5 w-3.5 text-cyan-300" />
              <span className="text-[10px] font-mono tracking-widest text-cyan-200">
                {areaMode === "draw" ? `꼭짓점 ${draftVertices.length}` : areaMode === "entry" ? "진입점 선택" : "이탈점 선택"}
              </span>
              <button
                onClick={resetAreaDraft}
                title="취소"
                className="ml-auto text-slate-500 transition hover:text-red-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {areaMode === "draw" ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDraftVertices((current) => current.slice(0, -1))}
                  disabled={draftVertices.length === 0}
                  className="rounded-sm border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-400 transition hover:text-white disabled:opacity-30"
                >
                  되돌리기
                </button>
                <button
                  onClick={() => setAreaMode("entry")}
                  disabled={draftVertices.length < 3}
                  className="rounded-sm border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[10px] font-mono text-cyan-200 transition hover:border-cyan-300 disabled:opacity-30"
                >
                  진입점 찍기
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <input
                  value={draftAreaName}
                  onChange={(e) => setDraftAreaName(e.target.value)}
                  placeholder="구역 이름"
                  className="w-full rounded-sm border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-mono text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                />
                <button
                  onClick={addDraftAreaToTimeline}
                  disabled={!draftEntryPoint || !draftExitPoint}
                  title="시간 간트 마지막에 추가"
                  className="inline-flex items-center justify-center gap-1 rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[10px] font-mono text-emerald-200 transition hover:border-emerald-300 disabled:opacity-30"
                >
                  <Check className="h-3 w-3" />
                  일정에 추가
                </button>
              </div>
            )}
          </div>
        )}
        {mapAreas.length > 0 && (
          <div className="w-full rounded-sm border border-white/10 bg-[#0d1117]/95 shadow-[0_0_18px_rgba(0,0,0,0.65)]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-2 py-1.5">
              <span className="text-[9px] font-mono tracking-widest text-slate-500">지도 구역</span>
              <span className="text-[9px] font-mono text-slate-600">{mapAreas.length}</span>
            </div>
            <div className="max-h-28 overflow-y-auto">
              {mapAreas.map((area) => (
                <div key={area.id} className="flex items-center gap-1.5 border-b border-white/[0.04] px-2 py-1.5 last:border-b-0">
                  <button
                    onClick={() => {
                      if (mapRef.current) focusMapPoint(mapRef.current, area.position, 15);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-[10px] font-mono text-slate-300 hover:text-cyan-200"
                    title="구역으로 이동"
                  >
                    {area.name}
                  </button>
                  <button
                    onClick={() => toggleMapAreaHidden(area.id)}
                    title={area.hidden ? "구역 표시" : "구역 숨기기"}
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-sm border transition",
                      area.hidden
                        ? "border-slate-700 text-slate-600 hover:text-slate-300"
                        : "border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10",
                    )}
                  >
                    {area.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => addMapAreaToTimeline(area)}
                    disabled={activeDayScheduledAreaIds.has(area.id)}
                    title={activeDayScheduledAreaIds.has(area.id) ? "이미 현재 일자에 있음" : "현재 일자 일정에 추가"}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-emerald-400/30 text-emerald-300 transition hover:bg-emerald-400/10 disabled:border-slate-700 disabled:text-slate-700"
                  >
                    <CalendarPlus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => removeMapArea(area.id)}
                    title="구역 삭제"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-sm border border-red-500/30 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      ), document.body)}

      {draftVertices.map((point, index) => (
        <OverlayView key={`draft-${index}`} position={point} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div
            style={{ transform: "translate(-50%, -50%)" }}
            className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200 bg-cyan-400 text-[9px] font-mono font-bold text-black shadow-[0_0_10px_rgba(34,211,238,0.8)]"
          >
            {index + 1}
          </div>
        </OverlayView>
      ))}

      {draftEntryPoint && (
        <OverlayView position={draftEntryPoint} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div
            style={{ transform: "translate(-50%, -100%)" }}
            className="inline-flex items-center gap-1 rounded-sm border border-emerald-400/50 bg-[#0d1117]/95 px-1.5 py-1 text-[9px] font-mono text-emerald-300"
          >
            <MapPin className="h-3 w-3" />
            IN
          </div>
        </OverlayView>
      )}

      {draftExitPoint && (
        <OverlayView position={draftExitPoint} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div
            style={{ transform: "translate(-50%, -100%)" }}
            className="inline-flex items-center gap-1 rounded-sm border border-rose-400/50 bg-[#0d1117]/95 px-1.5 py-1 text-[9px] font-mono text-rose-300"
          >
            <MapPin className="h-3 w-3" />
            OUT
          </div>
        </OverlayView>
      )}

      {/* 그룹 이름 라벨 */}
      {groupLabels.map((label) => (
        <OverlayView
          key={label.key}
          position={label.anchor}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            style={{
              transform: 'translate(-50%, -50%)',
              borderColor: label.color,
              pointerEvents: 'none',
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0d1117]/95 border rounded-sm text-[15px] font-mono leading-none whitespace-nowrap shadow-[0_0_12px_rgba(0,0,0,0.7)] font-bold tracking-wide text-white"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: label.color, boxShadow: `0 0 8px ${label.color}` }}
            />
            <span>{label.name}</span>
          </div>
        </OverlayView>
      ))}

      {/* 일정에 추가된 장소 마커 */}
      {mappedLocations.map((loc) => {
        const isSelected = selectedLocation?.locationId === loc.id && selectedLocation?.day === loc.day;
        return (
          <LocationMarker
            key={loc.id}
            position={loc.position!}
            category={loc.category}
            isSelected={isSelected}
            order={loc.routeOrder}
            onClick={() => setSelectedLocation({ day: loc.day, locationId: loc.id })}
          />
        );
      })}

      {[
        ...mapAreas
          .filter((area) => !area.hidden)
          .flatMap((area) => [
            { key: `${area.id}:entry`, label: "IN", point: area.entryPoint, color: "emerald" as const },
            { key: `${area.id}:exit`, label: "OUT", point: area.exitPoint, color: "rose" as const },
          ]),
        ...mappedLocations.flatMap((loc) => {
          if (loc.areaId) return [];
          return [
            { key: `${loc.day}:${loc.id}:entry`, label: "IN", point: loc.entryPoint, color: "emerald" as const },
            { key: `${loc.day}:${loc.id}:exit`, label: "OUT", point: loc.exitPoint, color: "rose" as const },
          ];
        }),
      ].filter((item) => item.point).map((item) => (
        <OverlayView
          key={item.key}
          position={item.point!}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            style={{ transform: "translate(-50%, -100%)" }}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm border bg-[#0d1117]/95 px-1.5 py-1 text-[9px] font-mono",
              item.color === "emerald"
                ? "border-emerald-400/50 text-emerald-300"
                : "border-rose-400/50 text-rose-300",
            )}
          >
            <MapPin className="h-3 w-3" />
            {item.label}
          </div>
        </OverlayView>
      ))}

      {/* 선택된 마커 위 액션 버튼 */}
      {selectedLocation && (() => {
        const sel = mappedLocations.find(
          (l) => l.id === selectedLocation.locationId && l.day === selectedLocation.day
        );
        if (!sel?.position) return null;
        const isAreaSchedule = Boolean(sel.areaId || sel.shapeVertices);
        const isBookmarked = !isAreaSchedule && bookmarks.some((b) => b.placeId === sel.id);
        return (
          <OverlayView
            position={sel.position}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              style={{ transform: 'translate(-50%, calc(-100% - 22px))' }}
              className="inline-flex flex-col items-center gap-1"
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {!isAreaSchedule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isBookmarked) {
                      removeBookmark(sel.id);
                    } else {
                      addBookmark({
                        placeId: sel.id,
                        name: sel.name,
                        position: sel.position!,
                        type: sel.category,
                      });
                    }
                  }}
                  title={isBookmarked ? "노드 마커에서 제거" : "노드 마커에 추가"}
                  className={cn(
                    "inline-flex items-center gap-1 bg-[#0d1117]/95 border text-[9px] font-mono leading-none px-1.5 py-1 rounded-sm shadow-[0_0_10px_rgba(0,0,0,0.6)] whitespace-nowrap transition-colors",
                    isBookmarked
                      ? "border-amber-400/50 text-amber-300 hover:bg-amber-500/15"
                      : "border-amber-400/30 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300"
                  )}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-2.5 h-2.5 fill-amber-300/20 shrink-0" />
                  ) : (
                    <Bookmark className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>{isBookmarked ? "마커됨" : "마커"}</span>
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLocation(selectedLocation.day, selectedLocation.locationId);
                  setSelectedLocation(null);
                }}
                title={isAreaSchedule ? "일정에서만 제거" : "이 장소 삭제"}
                className="inline-flex items-center gap-1 bg-[#0d1117]/95 border border-red-500/40 text-red-400 hover:bg-red-500/15 hover:text-red-300 text-[9px] font-mono leading-none px-1.5 py-1 rounded-sm shadow-[0_0_10px_rgba(0,0,0,0.6)] whitespace-nowrap"
              >
                <Trash2 className="w-2.5 h-2.5 shrink-0" />
                <span>{isAreaSchedule ? "일정 제거" : "삭제"}</span>
              </button>
            </div>
          </OverlayView>
        );
      })()}

      {/* POI 커스텀 팝업 */}
      {activePoiPopup && (
        <OverlayView
          position={activePoiPopup.position}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <PoiPopup
            place={activePoiPopup}
            onClose={() => {
              setManualPoiPopup(null);
              setSearchTarget(null);
            }}
          />
        </OverlayView>
      )}
    </GoogleMap>
  );
}
