import { create } from "zustand";
import {
  DAYS as INITIAL_DAYS,
  ITINERARY as INITIAL_ITINERARY,
  DayEntry,
  ItineraryDay,
  LocationEntry,
} from "@/data/itinerary";

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

// ─── 초기 도시 목록 (간트 표시 순서) ──────────────────────────────────────────
const INITIAL_CITIES: string[] = [];

// 초기 시작일
const INITIAL_START_DATE = "2026-04-23";

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

  // UI 상태
  activeDay: number;
  activeTab: "locations" | "routes" | "budget";
  selectedLocation: SelectedLocation;
  selectedMapCity: string | null;
  searchTarget: SearchTarget;

  // UI 액션
  setActiveDay: (day: number) => void;
  setActiveTab: (tab: "locations" | "routes" | "budget") => void;
  setSelectedLocation: (sel: SelectedLocation) => void;
  setSelectedMapCity: (city: string | null) => void;
  setSearchTarget: (target: SearchTarget) => void;

  // 장소 액션
  updateLocation: (day: number, updated: LocationEntry) => void;
  addLocation: (day: number, entry: LocationEntry) => void;
  removeLocation: (day: number, id: string) => void;

  // 일자 액션
  addDay: (patch?: Partial<Omit<DayEntry, "day">>) => void;
  removeDay: (day: number) => void;
  updateDay: (day: number, patch: Partial<Omit<DayEntry, "day">>) => void;
  setStartDate: (iso: string) => void;

  // 도시 액션
  addCity: (name: string) => void;
  removeCity: (name: string) => void;
};

// ─── 스토어 ───────────────────────────────────────────────────────────────────
export const useItineraryStore = create<ItineraryState>((set) => ({
  days: INITIAL_DAYS,
  cities: [...INITIAL_CITIES],
  itinerary: INITIAL_ITINERARY,
  startDate: INITIAL_START_DATE,

  activeDay: 1,
  activeTab: "locations",
  selectedLocation: null,
  selectedMapCity: null,
  searchTarget: null,

  setActiveDay: (day) => set({ activeDay: day }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedLocation: (sel) => set({ selectedLocation: sel, selectedMapCity: null }),
  setSelectedMapCity: (city) => set({ selectedMapCity: city, selectedLocation: null }),
  setSearchTarget: (target) => set({ searchTarget: target }),

  updateLocation: (day, updated) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: (state.itinerary[day]?.locations ?? []).map((loc) =>
            loc.id === updated.id ? updated : loc
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
          locations: [...(state.itinerary[day]?.locations ?? []), entry],
        },
      },
    })),

  removeLocation: (day, id) =>
    set((state) => ({
      itinerary: {
        ...state.itinerary,
        [day]: {
          ...(state.itinerary[day] ?? EMPTY_DAY),
          locations: (state.itinerary[day]?.locations ?? []).filter((loc) => loc.id !== id),
        },
      },
    })),

  // ─── 일자 ───────────────────────────────────────────────────────────────────
  addDay: (patch) =>
    set((state) => {
      const lastDay = state.days[state.days.length - 1];
      const nextDayNum = (lastDay?.day ?? 0) + 1;
      const year = parseIso(state.startDate)?.getFullYear() ?? new Date().getFullYear();
      const city = patch?.city ?? lastDay?.city ?? state.cities[0] ?? "";
      const newEntry: DayEntry = {
        day: nextDayNum,
        label: patch?.label ?? nextDateLabel(lastDay?.label, year),
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
        days: updatedDays,
      };
    }),
}));

// ─── 편의 훅 ──────────────────────────────────────────────────────────────────
export const useActiveDay   = () => useItineraryStore((s) => s.activeDay);
export const useActiveTab   = () => useItineraryStore((s) => s.activeTab);
export const useDayItinerary = (day: number) =>
  useItineraryStore((s) => s.itinerary[day] ?? s.itinerary[1] ?? EMPTY_DAY);
