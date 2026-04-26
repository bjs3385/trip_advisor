import { useEffect, useRef, useState } from "react";
import { normalizeLocationTransitRoles, type ItineraryDay, type LocationCategory, type LocationEntry, type TransitRole } from "@/data/itinerary";
import { DAY_ROUTE_COLORS } from "./mapConfig";
import {
  buildDayGroups,
  fetchRoutePath,
  segmentKey,
  trimPolylineByShape,
} from "./mapUtils";
import type { GroupInfo, RouteMode } from "./mapTypes";

interface UseRoutePolylinesParams {
  map: google.maps.Map | null;
  itinerary: Record<number, ItineraryDay>;
  isLoaded: boolean;
  apiKey: string;
  routeComputedDays: number[];
  routeComputedLocationKeys: string[];
  routeComputeRequestId: number;
}

type DayPolyline = {
  main: google.maps.Polyline;
  glow: google.maps.Polyline;
};

type RouteNode = {
  entryPos: google.maps.LatLngLiteral;
  exitPos: google.maps.LatLngLiteral;
  group: GroupInfo | null;
  category: LocationCategory;
  transitRole?: TransitRole;
  shapeVertices?: google.maps.LatLngLiteral[];
};

type RouteSeg = {
  from: google.maps.LatLngLiteral;
  to: google.maps.LatLngLiteral;
  mode: RouteMode;
  fromGroup: GroupInfo | null;
  toGroup: GroupInfo | null;
};

const ANIMATION_CYCLE_MS = 9000;
const CHEVRON_REPEAT_PX = 90;
const CHEVRON_PATH = "M -2 3 L 0 0 L 2 3";
const ROUTE_LANE_GAP_PX = 10;
const MAP_TILE_SIZE = 256;
const SEGMENT_LANE_PATTERN = [-1.5, -0.5, 0.5, 1.5, -2.5, 2.5];
const ROUTE_SEGMENT_COLORS = [
  "#58A6FF",
  "#F97316",
  "#22D3EE",
  "#A371F7",
  "#3FB950",
  "#F85149",
  "#FACC15",
  "#EC4899",
];

function dayColor(dayStr: string): string {
  return DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length];
}

function segmentColor(dayStr: string, segmentIndex: number, segmentCount: number, fallback: string) {
  if (segmentCount <= 1) return fallback;
  return ROUTE_SEGMENT_COLORS[(Number(dayStr) + segmentIndex - 1) % ROUTE_SEGMENT_COLORS.length];
}

function routeEntryPosition(loc: LocationEntry): google.maps.LatLngLiteral | null {
  return loc.entryPoint ?? loc.position ?? null;
}

function routeExitPosition(loc: LocationEntry): google.maps.LatLngLiteral | null {
  return loc.exitPoint ?? loc.position ?? null;
}

function routeModeFor(from: RouteNode, to: RouteNode): RouteMode {
  const isTransitLeg =
    from.category === "TRANSIT" &&
    to.category === "TRANSIT" &&
    from.transitRole === "DEPARTURE" &&
    to.transitRole === "ARRIVAL";
  return isTransitLeg ? null : "WALK";
}

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

function offsetPathByScreenPixels(
  path: google.maps.LatLngLiteral[],
  offsetPx: number,
  zoom: number,
): google.maps.LatLngLiteral[] {
  if (path.length < 2 || Math.abs(offsetPx) < 0.1) return path;
  const scale = 2 ** zoom;
  const worldPath = path.map(latLngToWorldPoint);
  const offsetWorld = offsetPx / scale;

  return worldPath.map((point, index) => {
    const prev = worldPath[Math.max(0, index - 1)];
    const next = worldPath[Math.min(worldPath.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.000001) return path[index];
    return worldPointToLatLng({
      x: point.x + (-dy / len) * offsetWorld,
      y: point.y + (dx / len) * offsetWorld,
    });
  });
}

export function useRoutePolylines({
  map,
  itinerary,
  isLoaded,
  apiKey,
  routeComputedDays,
  routeComputedLocationKeys,
  routeComputeRequestId,
}: UseRoutePolylinesParams) {
  const polylineRefs = useRef<Map<string, DayPolyline>>(new Map());
  const segmentCacheRef = useRef<Map<string, google.maps.LatLngLiteral[]>>(new Map());
  const [zoomVersion, setZoomVersion] = useState(0);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("zoom_changed", () => {
      setZoomVersion((value) => value + 1);
    });
    return () => listener.remove();
  }, [map]);

  useEffect(() => {
    if (!map || !isLoaded || !apiKey) return;
    if (routeComputeRequestId === 0 || (routeComputedDays.length === 0 && routeComputedLocationKeys.length === 0)) {
      polylineRefs.current.forEach((refs) => {
        refs.main.setMap(null);
        refs.glow.setMap(null);
      });
      polylineRefs.current.clear();
      return;
    }

    let cancelled = false;

    const handler = window.setTimeout(async () => {
      const allowedDays = new Set(routeComputedDays.map(String));
      const allowedLocationKeys = new Set(routeComputedLocationKeys);
      const allowedLocationDayPrefixes = new Set(routeComputedLocationKeys.map((key) => key.split(":")[0]));
      const groups = buildDayGroups(itinerary, dayColor);
      const groupByLocId = new Map<string, GroupInfo>();
      for (const g of groups) {
        for (const id of g.memberIds) groupByLocId.set(id, g);
      }

      // Build desired segments per day, collapsing same-group consecutive locations
      const desired = new Map<string, { color: string; segs: RouteSeg[] }>();

      Object.entries(itinerary).forEach(([dayStr, dayData]) => {
        const wholeDayAllowed = allowedDays.has(dayStr);
        if (!wholeDayAllowed && !allowedLocationDayPrefixes.has(dayStr)) return;
        const positioned = normalizeLocationTransitRoles(
          dayData.locations
            .filter((loc) => wholeDayAllowed || allowedLocationKeys.has(`${dayStr}:${loc.id}`))
            .filter((loc) => loc.position || loc.entryPoint || loc.exitPoint)
            .slice()
            .sort((a, b) => a.time.localeCompare(b.time)),
        );
        if (positioned.length < 2) return;

        const nodes: RouteNode[] = [];
        let lastGroupKey: string | null = null;
        for (const loc of positioned) {
          const group = groupByLocId.get(loc.id) ?? null;
          if (group) {
            if (group.groupKey !== lastGroupKey) {
              nodes.push({
                entryPos: group.centroid,
                exitPos: group.centroid,
                group,
                category: loc.category,
                transitRole: loc.transitRole,
              });
              lastGroupKey = group.groupKey;
            }
          } else {
            const entryPos = routeEntryPosition(loc);
            const exitPos = routeExitPosition(loc);
            if (entryPos && exitPos) {
              nodes.push({
                entryPos,
                exitPos,
                group: null,
                category: loc.category,
                transitRole: loc.transitRole,
                shapeVertices: loc.shapeVertices,
              });
            }
            lastGroupKey = null;
          }
        }
        if (nodes.length < 2) return;

        const segs: RouteSeg[] = [];
        for (let i = 0; i < nodes.length - 1; i++) {
          const from = nodes[i];
          const to = nodes[i + 1];
          const mode = routeModeFor(from, to);
          segs.push({
            from: from.exitPos,
            to: to.entryPos,
            mode,
            fromGroup: from.group ?? (from.shapeVertices ? {
              dayStr,
              groupKey: `area-from-${i}`,
              color: dayColor(dayStr),
              memberIds: [],
              centroid: from.exitPos,
              boundingRadiusMeters: 0,
              shapeVertices: from.shapeVertices,
            } : null),
            toGroup: to.group ?? (to.shapeVertices ? {
              dayStr,
              groupKey: `area-to-${i}`,
              color: dayColor(dayStr),
              memberIds: [],
              centroid: to.entryPos,
              boundingRadiusMeters: 0,
              shapeVertices: to.shapeVertices,
            } : null),
          });
        }

        desired.set(dayStr, { color: dayColor(dayStr), segs });
      });

      const desiredPolyKeys = new Set<string>();
      for (const [dayStr, { segs }] of desired) {
        for (let i = 0; i < segs.length; i++) {
          desiredPolyKeys.add(`${dayStr}:${i}`);
        }
      }

      polylineRefs.current.forEach((refs, key) => {
        if (!desiredPolyKeys.has(key)) {
          refs.main.setMap(null);
          refs.glow.setMap(null);
          polylineRefs.current.delete(key);
        }
      });

      const dayLaneOffsets = new Map<string, number>();
      const routeDays = Array.from(desired.keys()).sort((a, b) => Number(a) - Number(b));
      routeDays.forEach((dayStr, index) => {
        dayLaneOffsets.set(dayStr, (index - (routeDays.length - 1) / 2) * ROUTE_LANE_GAP_PX);
      });

      const zoom = map.getZoom() ?? 12;
      for (const [dayStr, { color, segs }] of desired) {
        for (const [segIdx, seg] of segs.entries()) {
          const cacheKey = segmentKey(seg.from, seg.to, seg.mode);
          let rawPath = segmentCacheRef.current.get(cacheKey);

          if (!rawPath) {
            if (seg.mode) {
              const fetched = await fetchRoutePath(seg.from, seg.to, seg.mode);
              if (fetched) rawPath = fetched;
            }
            if (rawPath) {
              segmentCacheRef.current.set(cacheKey, rawPath);
            } else {
              rawPath = [seg.from, seg.to];
            }
          }

          if (cancelled) return;

          let path = rawPath;
          if (seg.fromGroup) {
            path = trimPolylineByShape(path, seg.fromGroup.shapeVertices, "start");
          }
          if (seg.toGroup) {
            path = trimPolylineByShape(path, seg.toGroup.shapeVertices, "end");
          }
          const segmentLaneNudge = segs.length > 1
            ? SEGMENT_LANE_PATTERN[segIdx % SEGMENT_LANE_PATTERN.length] * ROUTE_LANE_GAP_PX
            : 0;
          path = offsetPathByScreenPixels(path, (dayLaneOffsets.get(dayStr) ?? 0) + segmentLaneNudge, zoom);

          const polyKey = `${dayStr}:${segIdx}`;

          if (path.length < 2) {
            const existing = polylineRefs.current.get(polyKey);
            if (existing) {
              existing.main.setMap(null);
              existing.glow.setMap(null);
              polylineRefs.current.delete(polyKey);
            }
            continue;
          }

          const routeColor = segmentColor(dayStr, segIdx, segs.length, color);
          const arrowIcons: google.maps.IconSequence[] = [
            {
              icon: {
                path: CHEVRON_PATH,
                scale: 2.8,
                strokeColor: routeColor,
                strokeOpacity: 0.28,
                strokeWeight: 5,
                fillOpacity: 0,
              },
              offset: "0%",
              repeat: `${CHEVRON_REPEAT_PX}px`,
            },
            {
              icon: {
                path: CHEVRON_PATH,
                scale: 2.8,
                strokeColor: routeColor,
                strokeOpacity: 1,
                strokeWeight: 1.8,
                fillOpacity: 0,
              },
              offset: "0%",
              repeat: `${CHEVRON_REPEAT_PX}px`,
            },
          ];

          const existing = polylineRefs.current.get(polyKey);
          if (existing) {
            existing.main.setPath(path);
            existing.main.setOptions({ strokeColor: routeColor, icons: arrowIcons, zIndex: 20 + segIdx });
            existing.glow.setPath(path);
            existing.glow.setOptions({ strokeColor: routeColor, zIndex: 10 + segIdx });
          } else {
            const glow = new google.maps.Polyline({
              path,
              map,
              geodesic: false,
              strokeColor: routeColor,
              strokeOpacity: 0.12,
              strokeWeight: 7,
              zIndex: 10 + segIdx,
            });
            const main = new google.maps.Polyline({
              path,
              map,
              geodesic: false,
              strokeColor: routeColor,
              strokeOpacity: 0.95,
              strokeWeight: 3,
              icons: arrowIcons,
              zIndex: 20 + segIdx,
            });
            polylineRefs.current.set(polyKey, { main, glow });
          }
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(handler);
    };
  }, [apiKey, isLoaded, map, routeComputeRequestId, routeComputedDays, routeComputedLocationKeys, zoomVersion]);

  useEffect(() => {
    if (!isLoaded) return;

    let rafId = 0;
    const startTs = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTs;
      const phase = ((elapsed % ANIMATION_CYCLE_MS) / ANIMATION_CYCLE_MS) * CHEVRON_REPEAT_PX;
      const offsetStr = `${phase.toFixed(1)}px`;

      polylineRefs.current.forEach(({ main }) => {
        const icons = main.get("icons") as google.maps.IconSequence[] | undefined;
        if (!icons || icons.length === 0) return;
        for (const icon of icons) icon.offset = offsetStr;
        main.set("icons", icons);
      });

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isLoaded]);

  useEffect(() => {
    const refs = polylineRefs.current;
    return () => {
      refs.forEach(({ main, glow }) => {
        main.setMap(null);
        glow.setMap(null);
      });
      refs.clear();
    };
  }, []);
}
