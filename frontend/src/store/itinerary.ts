import { create } from "zustand";
import {
  DayEntry,
  ItineraryDay,
  LocationEntry,
  MapAreaEntry,
  normalizeLocationTransitRoles,
} from "@/data/itinerary";

export type TripSummary = {
  id: number;
  name: string;
  start_date: string;
  updated_at: string;
  day_count: number;
};

export type BookmarkEntry = {
  placeId: string;
  name: string;
  position: { lat: number; lng: number };
  address?: string;
  type?: string;
  rating?: number;
};

const TRIPS_API_URL =
  process.env.NEXT_PUBLIC_TRIPS_API_URL ?? "http://localhost:8000/api/trips/";

// ─── 선택된 장소 타입 ─────────────────────────────────────────────────────────
export type SelectedLocation = {
  day: number;
  locationId: string;
} | null;

// ─── 검색 → 지도 트리거 ──────────────────────────────────────────────────────
// SearchModule이 set, MapView가 watch해서 pan + PoiPopup 오픈 후 clear
export type SearchTarget = {
  position: { lat: number; lng: number };
  placeId: string;
  name: string;
  address?: string;
  type?: string;
  rating?: number;
} | null;

export type MapCamera = {
  center: { lat: number; lng: number };
  zoom: number;
} | null;

export type TimelineView = "gantt" | "timetable";

const DEFAULT_CITY = "TOKYO";

// 기본 하루 데이터
const EMPTY_DAY: ItineraryDay = { locations: [], routes: [], budget: [] };

// ISO ("YYYY-MM-DD") 파싱, 실패 시 null
function parseIso(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function fmtLabel(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}.${dd}`;
}

function parseMapCamera(value: unknown): MapCamera {
  if (!value || typeof value !== "object") return null;
  const camera = value as { center?: { lat?: unknown; lng?: unknown }; zoom?: unknown };
  const lat = Number(camera.center?.lat);
  const lng = Number(camera.center?.lng);
  const zoom = Number(camera.zoom);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) {
    return null;
  }
  return { center: { lat, lng }, zoom };
}

function parseRouteSelectedDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((day) => Number(day))
      .filter((day) => Number.isFinite(day) && day > 0)
      .map((day) => Math.floor(day)),
  ));
}

function parseRouteSelectedLocationKeys(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .map((key) => String(key).trim())
      .filter(Boolean),
  ));
}

function routeLocationKey(day: number, locationId: string) {
  return `${day}:${locationId}`;
}

function parseUiState(value: unknown): {
  timelineView: TimelineView;
  activeDay: number;
  routeSelectedDays: number[];
  routeSelectedLocationKeys: string[];
} {
  if (!value || typeof value !== "object") {
    return { timelineView: "gantt", activeDay: 1, routeSelectedDays: [], routeSelectedLocationKeys: [] };
  }
  const ui = value as {
    timelineView?: unknown;
    activeDay?: unknown;
    routeSelectedDays?: unknown;
    routeSelectedLocationKeys?: unknown;
  };
  const timelineView = ui.timelineView === "timetable" ? "timetable" : "gantt";
  const activeDay = Number(ui.activeDay);
  return {
    timelineView,
    activeDay: Number.isFinite(activeDay) && activeDay > 0 ? Math.floor(activeDay) : 1,
    routeSelectedDays: parseRouteSelectedDays(ui.routeSelectedDays),
    routeSelectedLocationKeys: parseRouteSelectedLocationKeys(ui.routeSelectedLocationKeys),
  };
}

function parseMapAreas(value: unknown): MapAreaEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const area = raw as Partial<MapAreaEntry>;
    const points = Array.isArray(area.shapeVertices) ? area.shapeVertices : [];
    const position = area.position;
    const entryPoint = area.entryPoint;
    const exitPoint = area.exitPoint;
    if (
      !area.id ||
      !position ||
      !entryPoint ||
      !exitPoint ||
      points.length < 3
    ) {
      return [];
    }
    return [{
      id: String(area.id),
      name: String(area.name || "AREA"),
      position,
      shapeVertices: points,
      entryPoint,
      exitPoint,
      hidden: Boolean(area.hidden),
    }];
  });
}

function deriveMapAreas(itinerary: Record<number, ItineraryDay>): MapAreaEntry[] {
  const byId = new Map<string, MapAreaEntry>();
  Object.values(itinerary).forEach((day) => {
    day.locations.forEach((loc) => {
      if (!loc.shapeVertices || loc.shapeVertices.length < 3 || !loc.position || !loc.entryPoint || !loc.exitPoint) {
        return;
      }
      const id = loc.areaId ?? loc.id;
      if (byId.has(id)) return;
      byId.set(id, {
        id,
        name: loc.name || "AREA",
        position: loc.position,
        shapeVertices: loc.shapeVertices,
        entryPoint: loc.entryPoint,
        exitPoint: loc.exitPoint,
      });
    });
  });
  return Array.from(byId.values());
}

function normalizeItineraryTransitRoles(itinerary: Record<number, ItineraryDay>): Record<number, ItineraryDay> {
  return Object.fromEntries(
    Object.entries(itinerary).map(([day, dayData]) => [
      day,
      {
        ...dayData,
        locations: normalizeLocationTransitRoles(dayData.locations ?? []),
      },
    ]),
  );
}

// "MM.DD" 라벨에 하루 더해서 다음 라벨 생성 (addDay 용)
function nextDateLabel(last: string | undefined, fallbackYear: number): string {
  if (!last) return "01.01";
  const m = /^(\d{1,2})[.\-/](\d{1,2})$/.exec(last.trim());
  if (!m) return last;
  const d = new Date(fallbackYear, Number(m[1]) - 1, Number(m[2]));
  d.setDate(d.getDate() + 1);
  return fmtLabel(d);
}

// ─── 스토어 타입 ──────────────────────────────────────────────────────────────
type ItineraryState = {
  // 데이터
  days: DayEntry[];
  cities: string[];
  itinerary: Record<number, ItineraryDay>;
  startDate: string; // "YYYY-MM-DD"

  // 트립 관리
  trips: TripSummary[];
  currentTripId: number | null;
  isHydrated: boolean;

  // 북마크
  bookmarks: BookmarkEntry[];
  mapAreas: MapAreaEntry[];
  cityStyleKeys: Record<string, string>;

  // UI 상태
  activeDay: number;
  activeTab: "locations" | "routes" | "budget";
  selectedLocation: SelectedLocation;
  selectedMapCity: string | null;
  searchTarget: SearchTarget;
  focusGroupTarget: { day: number; groupId: string } | null;
  mapCamera: MapCamera;
  timelineView: TimelineView;
  routeSelectedDays: number[];
  routeSelectedLocationKeys: string[];
  routeComputedDays: number[];
  routeComputedLocationKeys: string[];
  routeComputeRequestId: number;

  // UI 액션
  setActiveDay: (day: number) => void;
  setActiveTab: (tab: "locations" | "routes" | "budget") => void;
  setSelectedLocation: (sel: SelectedLocation) => void;
  setSelectedMapCity: (city: string | null) => void;
  setSearchTarget: (target: SearchTarget) => void;
  setMapCamera: (camera: MapCamera) => void;
  setTimelineView: (view: TimelineView) => void;
  toggleRouteDaySelection: (day: number) => void;
  toggleRouteLocationSelection: (day: number, locationId: string) => void;
  computeSelectedRoutes: () => void;

  // 장소 액션
  updateLocation: (day: number, updated: LocationEntry) => void;
  addLocation: (day: number, entry: LocationEntry) => void;
  removeLocation: (day: number, id: string) => void;
  setDayLocations: (day: number, locations: LocationEntry[]) => void;

  // 일자 액션
  addDay: (patch?: Partial<Omit<DayEntry, "day">>) => void;
  removeDay: (day: number) => void;
  updateDay: (day: number, patch: Partial<Omit<DayEntry, "day">>) => void;
  setStartDate: (iso: string) => void;

  // 도시 액션
  addCity: (name: string) => void;
  renameCity: (oldName: string, newName: string) => void;
  removeCity: (name: string) => void;

  // 트립 액션
  fetchTrips: () => Promise<void>;
  selectTrip: (id: number) => Promise<void>;
  createTrip: (name: string, startDate: string) => Promise<number>;
  deleteTrip: (id: number) => Promise<void>;
  clearCurrentTrip: () => void;

  // 북마크 액션
  addBookmark: (bookmark: BookmarkEntry) => void;
  removeBookmark: (placeId: string) => void;

  // 지도 구역 액션
  addMapArea: (area: MapAreaEntry) => void;
  toggleMapAreaHidden: (id: string) => void;
  removeMapArea: (id: string) => void;

  // 그룹 액션
  setGroupName: (day: number, groupId: string, name: string) => void;
  setFocusGroupTarget: (target: { day: number; groupId: string } | null) => void;
};

// ─── 스토어 ───────────────────────────────────────────────────────────────────
export const useItineraryStore = create<ItineraryState>((set) => ({
  days: [],
  cities: [],
  itinerary: {},
  startDate: "",

  trips: [],
  currentTripId: null,
  isHydrated: false,

  bookmarks: [],
  mapAreas: [],
  cityStyleKeys: {},

  activeDay: 1,
  activeTab: "locations",
  selectedLocation: null,
  selectedMapCity: null,
  searchTarget: null,
  focusGroupTarget: null,
  mapCamera: null,
  timelineView: "gantt",
  routeSelectedDays: [],
  routeSelectedLocationKeys: [],
  routeComputedDays: [],
  routeComputedLocationKeys: [],
  routeComputeRequestId: 0,

  setActiveDay: (day) => set({ activeDay: day }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedLocation: (sel) => set({ selectedLocation: sel, selectedMapCity: null }),
  setSelectedMapCity: (city) => set({ selectedMapCity: city, selectedLocation: null }),
  setSearchTarget: (target) => set({ searchTarget: target }),
  setMapCamera: (camera) => set({ mapCamera: camera }),
  setTimelineView: (view) => set({ timelineView: view }),
  toggleRouteDaySelection: (day) =>
    set((state) => {
      const selected = state.routeSelectedDays.includes(day)
        ? state.routeSelectedDays.filter((item) => item !== day)
        : [...state.routeSelectedDays, day].sort((a, b) => a - b);
      return { routeSelectedDays: selected };
    }),
  toggleRouteLocationSelection: (day, locationId) =>
    set((state) => {
      const key = routeLocationKey(day, locationId);
      const selected = state.routeSelectedLocationKeys.includes(key)
        ? state.routeSelectedLocationKeys.filter((item) => item !== key)
        : [...state.routeSelectedLocationKeys, key].sort();
      return { routeSelectedLocationKeys: selected };
    }),
  computeSelectedRoutes: () =>
    set((state) => ({
      routeComputedDays: state.routeSelectedDays,
      routeComputedLocationKeys: state.routeSelectedLocationKeys,
      routeComputeRequestId: state.routeComputeRequestId + 1,
    })),

  updateLocation: (day, updated) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: normalizeLocationTransitRoles(
            (state.itinerary[day]?.locations ?? []).map((loc) =>
              loc.id === updated.id ? updated : loc
            ),
          ),
        },
      },
    })),

  addLocation: (day, entry) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: normalizeLocationTransitRoles([...(state.itinerary[day]?.locations ?? []), entry]),
        },
      },
    })),

  removeLocation: (day, id) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: normalizeLocationTransitRoles(
            (state.itinerary[day]?.locations ?? []).filter((loc) => loc.id !== id),
          ),
        },
      },
      routeSelectedLocationKeys: state.routeSelectedLocationKeys.filter((key) => key !== routeLocationKey(day, id)),
      routeComputedLocationKeys: state.routeComputedLocationKeys.filter((key) => key !== routeLocationKey(day, id)),
    })),

  setDayLocations: (day, locations) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: normalizeLocationTransitRoles(locations),
        },
      },
    })),

  // ─── 일자 ───────────────────────────────────────────────────────────────────
  addDay: (patch) =>
    set((state) => {
      const lastDay = state.days[state.days.length - 1];
      const nextDayNum = (lastDay?.day ?? 0) + 1;
      const start = parseIso(state.startDate);
      const year = start?.getFullYear() ?? new Date().getFullYear();
      const city = patch?.city ?? lastDay?.city ?? state.cities[0] ?? DEFAULT_CITY;
      const newEntry: DayEntry = {
        day: nextDayNum,
        label: patch?.label ?? (lastDay ? nextDateLabel(lastDay.label, year) : fmtLabel(start ?? new Date(year, 0, 1))),
        city,
        note: patch?.note ?? "",
      };
      const nextCities = city && !state.cities.includes(city)
        ? [...state.cities, city]
        : state.cities;
      return {
        days: [...state.days, newEntry],
        cities: nextCities,
        itinerary: { ...state.itinerary, [nextDayNum]: EMPTY_DAY },
      };
    }),

  removeDay: (day) =>
    set((state) => {
      if (state.days.length <= 1) return state; // 최소 1일
      const remaining = state.days.filter((d) => d.day !== day);
      // 번호 재매핑 (1..N)
      const reindexed = remaining.map((d, i) => ({ ...d, day: i + 1 }));
      const newItinerary: Record<number, ItineraryDay> = {};
      remaining.forEach((d, i) => {
        newItinerary[i + 1] = state.itinerary[d.day] ?? EMPTY_DAY;
      });
      const nextActive = Math.min(state.activeDay, reindexed.length);
      return {
        days: reindexed,
        itinerary: newItinerary,
        activeDay: nextActive || 1,
        routeSelectedDays: state.routeSelectedDays
          .filter((selectedDay) => selectedDay !== day)
          .map((selectedDay) => {
            const index = remaining.findIndex((d) => d.day === selectedDay);
            return index === -1 ? null : index + 1;
          })
          .filter((selectedDay): selectedDay is number => selectedDay !== null),
        routeSelectedLocationKeys: state.routeSelectedLocationKeys
          .map((key) => {
            const [rawDay, locationId] = key.split(":");
            const oldDay = Number(rawDay);
            const index = remaining.findIndex((d) => d.day === oldDay);
            return index === -1 || !locationId ? null : routeLocationKey(index + 1, locationId);
          })
          .filter((key): key is string => key !== null),
        routeComputedDays: [],
        routeComputedLocationKeys: [],
        routeComputeRequestId: state.routeComputeRequestId + 1,
      };
    }),

  updateDay: (day, patch) =>
    set((state) => {
      const days = state.days.map((d) => (d.day === day ? { ...d, ...patch } : d));
      const nextCities = patch.city && !state.cities.includes(patch.city)
        ? [...state.cities, patch.city]
        : state.cities;
      return { days, cities: nextCities };
    }),

  setStartDate: (iso) =>
    set((state) => {
      const start = parseIso(iso);
      if (!start) return state;
      const updatedDays = state.days.map((d, i) => {
        const nd = new Date(start);
        nd.setDate(start.getDate() + i);
        return { ...d, label: fmtLabel(nd) };
      });
      return { startDate: iso, days: updatedDays };
    }),

  // ─── 도시 ───────────────────────────────────────────────────────────────────
  addCity: (name) =>
    set((state) => {
      const key = name.trim().toUpperCase();
      if (!key || state.cities.includes(key)) return state;
      return { cities: [...state.cities, key] };
    }),

  renameCity: (oldName, newName) =>
    set((state) => {
      const nextName = newName.trim().toUpperCase();
      if (!nextName || oldName === nextName) return state;
      const cityIndex = state.cities.indexOf(oldName);
      if (cityIndex === -1) return state;

      const filteredCities = state.cities.filter((city) => city !== oldName && city !== nextName);
      filteredCities.splice(cityIndex, 0, nextName);
      const styleKey = state.cityStyleKeys[oldName] ?? oldName;
      const cityStyleKeys = { ...state.cityStyleKeys };
      delete cityStyleKeys[oldName];
      cityStyleKeys[nextName] = cityStyleKeys[nextName] ?? styleKey;
      return {
        cities: filteredCities,
        cityStyleKeys,
        days: state.days.map((day) =>
          day.city === oldName ? { ...day, city: nextName } : day
        ),
      };
    }),

  removeCity: (name) =>
    set((state) => {
      // 해당 도시를 쓰는 일자가 있으면 남은 도시로 이동, 없으면 빈 값
      const key = name;
      const fallback = state.cities.find((c) => c !== key) ?? "";
      const updatedDays = state.days.map((d) =>
        d.city === key ? { ...d, city: fallback } : d
      );
      return {
        cities: state.cities.filter((c) => c !== key),
        cityStyleKeys: Object.fromEntries(
          Object.entries(state.cityStyleKeys).filter(([city]) => city !== key)
        ),
        days: updatedDays,
      };
    }),

  // ─── 트립 ───────────────────────────────────────────────────────────────────
  fetchTrips: async () => {
    const res = await fetch(TRIPS_API_URL);
    if (!res.ok) throw new Error("failed to fetch trips");
    const data = await res.json();
    set({ trips: data.trips ?? [] });
  },

  selectTrip: async (id: number) => {
    set({ isHydrated: false });
    const res = await fetch(`${TRIPS_API_URL}${id}`);
    if (!res.ok) throw new Error("failed to load trip");
    const data = await res.json();
    const itinerary = normalizeItineraryTransitRoles(data.itinerary ?? {});
    const mapAreas = parseMapAreas(data.mapAreas);

    const rawDays: DayEntry[] = data.days ?? [];
    const startDate: string = data.start_date ?? "";
    const start = parseIso(startDate);
    const days = start
      ? rawDays.map((d, i) => {
          const nd = new Date(start);
          nd.setDate(start.getDate() + i);
          return { ...d, label: fmtLabel(nd) };
        })
      : rawDays;

    const uiState = parseUiState(data.uiState);
    const activeDay = days.some((d) => d.day === uiState.activeDay) ? uiState.activeDay : (days[0]?.day ?? 1);

    set({
      currentTripId: data.id,
      days,
      cities: data.cities ?? [],
      itinerary,
      startDate,
      bookmarks: data.bookmarks ?? [],
      mapAreas: mapAreas.length > 0 ? mapAreas : deriveMapAreas(itinerary),
      cityStyleKeys: data.cityStyleKeys ?? {},
      mapCamera: parseMapCamera(data.mapCamera),
      activeDay,
      timelineView: uiState.timelineView,
      routeSelectedDays: uiState.routeSelectedDays.filter((day) => days.some((d) => d.day === day)),
      routeSelectedLocationKeys: uiState.routeSelectedLocationKeys,
      routeComputedDays: [],
      routeComputedLocationKeys: [],
      routeComputeRequestId: 0,
      activeTab: "locations",
      selectedLocation: null,
      selectedMapCity: null,
      searchTarget: null,
      focusGroupTarget: null,
      isHydrated: true,
    });
  },

  createTrip: async (name: string, startDate: string) => {
    const res = await fetch(TRIPS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, start_date: startDate }),
    });
    if (!res.ok) throw new Error("failed to create trip");
    const data = await res.json();
    set((state) => ({
      trips: [
        {
          id: data.id,
          name: data.name,
          start_date: data.start_date,
          updated_at: new Date().toISOString(),
          day_count: data.days?.length ?? 1,
        },
        ...state.trips.filter((t) => t.id !== data.id),
      ],
    }));
    return data.id as number;
  },

  deleteTrip: async (id: number) => {
    const res = await fetch(`${TRIPS_API_URL}${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("failed to delete trip");
    set((state) => ({
      trips: state.trips.filter((t) => t.id !== id),
      ...(state.currentTripId === id
        ? {
            currentTripId: null,
            days: [],
            cities: [],
            itinerary: {},
            startDate: "",
            bookmarks: [],
            mapAreas: [],
            cityStyleKeys: {},
            mapCamera: null,
            timelineView: "gantt",
            routeSelectedDays: [],
            routeSelectedLocationKeys: [],
            routeComputedDays: [],
            routeComputedLocationKeys: [],
            routeComputeRequestId: 0,
            isHydrated: false,
          }
        : {}),
    }));
  },

  clearCurrentTrip: () =>
    set({
      currentTripId: null,
      days: [],
      cities: [],
      itinerary: {},
      startDate: "",
      bookmarks: [],
      mapAreas: [],
      cityStyleKeys: {},
      mapCamera: null,
      timelineView: "gantt",
      routeSelectedDays: [],
      routeSelectedLocationKeys: [],
      routeComputedDays: [],
      routeComputedLocationKeys: [],
      routeComputeRequestId: 0,
      activeDay: 1,
      activeTab: "locations",
      selectedLocation: null,
      selectedMapCity: null,
      searchTarget: null,
      focusGroupTarget: null,
      isHydrated: false,
    }),

  // ─── 북마크 ─────────────────────────────────────────────────────────────────
  addBookmark: (bookmark) =>
    set((state) => {
      if (state.bookmarks.some((b) => b.placeId === bookmark.placeId)) {
        return state;
      }
      return { bookmarks: [bookmark, ...state.bookmarks] };
    }),

  removeBookmark: (placeId) =>
    set((state) => ({
      bookmarks: state.bookmarks.filter((b) => b.placeId !== placeId),
    })),

  // ─── 지도 구역 ────────────────────────────────────────────────────────────────
  addMapArea: (area) =>
    set((state) => {
      const existingIndex = state.mapAreas.findIndex((item) => item.id === area.id);
      if (existingIndex === -1) return { mapAreas: [area, ...state.mapAreas] };
      const mapAreas = [...state.mapAreas];
      mapAreas[existingIndex] = area;
      return { mapAreas };
    }),

  toggleMapAreaHidden: (id) =>
    set((state) => ({
      mapAreas: state.mapAreas.map((area) =>
        area.id === id ? { ...area, hidden: !area.hidden } : area
      ),
    })),

  removeMapArea: (id) =>
    set((state) => {
      const removedLocationKeys = new Set<string>();
      const itinerary = Object.fromEntries(
        Object.entries(state.itinerary).map(([day, dayData]) => [
          day,
          {
            ...dayData,
            locations: dayData.locations.filter((loc) => {
              const locAreaId = loc.areaId ?? (loc.id.endsWith("-schedule") ? loc.id.replace(/-schedule$/, "") : "");
              const shouldRemove = locAreaId === id;
              if (shouldRemove) removedLocationKeys.add(routeLocationKey(Number(day), loc.id));
              return !shouldRemove;
            }),
          },
        ]),
      );
      const selectedLocation =
        state.selectedLocation && removedLocationKeys.has(routeLocationKey(state.selectedLocation.day, state.selectedLocation.locationId))
          ? null
          : state.selectedLocation;
      return {
        mapAreas: state.mapAreas.filter((area) => area.id !== id),
        itinerary,
        routeSelectedLocationKeys: state.routeSelectedLocationKeys.filter((key) => !removedLocationKeys.has(key)),
        routeComputedLocationKeys: state.routeComputedLocationKeys.filter((key) => !removedLocationKeys.has(key)),
        selectedLocation,
      };
    }),

  // ─── 그룹 ───────────────────────────────────────────────────────────────────
  setFocusGroupTarget: (target) => set({ focusGroupTarget: target }),

  setGroupName: (day, groupId, name) =>
    set((state) => {
      const dayItin = state.itinerary[day] ?? EMPTY_DAY;
      const trimmed = name.trim();
      const groupNames = { ...(dayItin.groupNames ?? {}) };
      if (trimmed) {
        groupNames[groupId] = trimmed;
      } else {
        delete groupNames[groupId];
      }
      return {
        itinerary: {
          ...state.itinerary,
          [day]: { ...dayItin, groupNames },
        },
      };
    }),
}));

// ─── 편의 훅 ──────────────────────────────────────────────────────────────────
export const useActiveDay   = () => useItineraryStore((s) => s.activeDay);
export const useActiveTab   = () => useItineraryStore((s) => s.activeTab);
export const useDayItinerary = (day: number) =>
  useItineraryStore((s) => s.itinerary[day] ?? s.itinerary[1] ?? EMPTY_DAY);
