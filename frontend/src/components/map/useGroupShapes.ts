import { useEffect, useRef } from "react";
import type { ItineraryDay, MapAreaEntry } from "@/data/itinerary";
import { DAY_ROUTE_COLORS } from "./mapConfig";
import { buildDayGroups } from "./mapUtils";

interface UseGroupShapesParams {
  map: google.maps.Map | null;
  itinerary: Record<number, ItineraryDay>;
  mapAreas: MapAreaEntry[];
  isLoaded: boolean;
}

export function useGroupShapes({ map, itinerary, mapAreas, isLoaded }: UseGroupShapesParams) {
  const shapeRefs = useRef<Map<string, google.maps.Polygon>>(new Map());

  useEffect(() => {
    if (!map || !isLoaded) return;

    const groups = buildDayGroups(
      itinerary,
      (dayStr) => DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length],
    );
    const areaIds = new Set(mapAreas.map((area) => area.id));
    const areas = [
      ...mapAreas
        .filter((area) => !area.hidden && area.shapeVertices.length >= 3)
        .map((area, index) => ({
          key: `area:${area.id}`,
          color: DAY_ROUTE_COLORS[index % DAY_ROUTE_COLORS.length],
          vertices: area.shapeVertices,
        })),
      ...Object.entries(itinerary).flatMap(([dayStr, dayData]) =>
      dayData.locations
        .filter((loc) => loc.shapeVertices && loc.shapeVertices.length >= 3 && !areaIds.has(loc.areaId ?? loc.id))
        .map((loc) => ({
          key: `${dayStr}:area:${loc.id}`,
          color: DAY_ROUTE_COLORS[(Number(dayStr) - 1) % DAY_ROUTE_COLORS.length],
          vertices: loc.shapeVertices!,
        })),
      ),
    ];

    const desiredKeys = new Set([
      ...groups.map((g) => `${g.dayStr}:${g.groupKey}`),
      ...areas.map((area) => area.key),
    ]);

    shapeRefs.current.forEach((poly, key) => {
      if (!desiredKeys.has(key)) {
        poly.setMap(null);
        shapeRefs.current.delete(key);
      }
    });

    for (const group of groups) {
      const key = `${group.dayStr}:${group.groupKey}`;
      const existing = shapeRefs.current.get(key);
      if (existing) {
        existing.setPath(group.shapeVertices);
        existing.setOptions({ strokeColor: group.color, fillColor: group.color });
      } else {
        const poly = new google.maps.Polygon({
          paths: group.shapeVertices,
          map,
          strokeColor: group.color,
          strokeOpacity: 0.55,
          strokeWeight: 1.5,
          fillColor: group.color,
          fillOpacity: 0.1,
          clickable: false,
          zIndex: 0,
        });
        shapeRefs.current.set(key, poly);
      }
    }

    for (const area of areas) {
      const existing = shapeRefs.current.get(area.key);
      if (existing) {
        existing.setPath(area.vertices);
        existing.setOptions({ strokeColor: area.color, fillColor: area.color });
      } else {
        const poly = new google.maps.Polygon({
          paths: area.vertices,
          map,
          strokeColor: area.color,
          strokeOpacity: 0.75,
          strokeWeight: 1.8,
          fillColor: area.color,
          fillOpacity: 0.16,
          clickable: false,
          zIndex: 0,
        });
        shapeRefs.current.set(area.key, poly);
      }
    }
  }, [map, itinerary, mapAreas, isLoaded]);

  useEffect(() => {
    const refs = shapeRefs.current;
    return () => {
      refs.forEach((poly) => poly.setMap(null));
      refs.clear();
    };
  }, []);
}
