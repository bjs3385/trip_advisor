// ─── 타입 정의 ────────────────────────────────────────────────────────────────
export type LocationCategory = "HOTEL" | "SIGHT" | "FOOD" | "TRANSIT";

export type DayEntry = {
  day: number;
  label: string;
  city: string;
  note: string;
};

export type LocationEntry = {
  id: string;
  name: string;
  category: LocationCategory;
  time: string;
  position?: { lat: number; lng: number };
};

export type RouteEntry = {
  from: string;
  to: string;
  mode: string;
  duration: string;
};

export type BudgetEntry = {
  label: string;
  amount: string;
  category: string;
};

export type ItineraryDay = {
  locations: LocationEntry[];
  routes: RouteEntry[];
  budget: BudgetEntry[];
};

// ─── 도시 스타일 ──────────────────────────────────────────────────────────────
export type CityStyle = { bar: string; text: string; dot: string; glow: string };

export const CITY_STYLE: Record<string, CityStyle> = {
  TOKYO:     { bar: "bg-blue-500",    text: "text-blue-400",    dot: "bg-blue-400",    glow: "shadow-[0_0_10px_rgba(59,130,246,0.6)]" },
  KYOTO:     { bar: "bg-emerald-500", text: "text-emerald-400", dot: "bg-emerald-400", glow: "shadow-[0_0_10px_rgba(52,211,153,0.6)]" },
  OSAKA:     { bar: "bg-orange-500",  text: "text-orange-400",  dot: "bg-orange-400",  glow: "shadow-[0_0_10px_rgba(251,146,60,0.6)]" },
  NARA:      { bar: "bg-purple-500",  text: "text-purple-400",  dot: "bg-purple-400",  glow: "shadow-[0_0_10px_rgba(192,132,252,0.6)]" },
  HIROSHIMA: { bar: "bg-pink-500",    text: "text-pink-400",    dot: "bg-pink-400",    glow: "shadow-[0_0_10px_rgba(244,114,182,0.6)]" },
};

const CITY_STYLE_FALLBACK_POOL: CityStyle[] = [
  { bar: "bg-cyan-500",    text: "text-cyan-400",    dot: "bg-cyan-400",    glow: "shadow-[0_0_10px_rgba(34,211,238,0.6)]"  },
  { bar: "bg-rose-500",    text: "text-rose-400",    dot: "bg-rose-400",    glow: "shadow-[0_0_10px_rgba(251,113,133,0.6)]" },
  { bar: "bg-amber-500",   text: "text-amber-400",   dot: "bg-amber-400",   glow: "shadow-[0_0_10px_rgba(251,191,36,0.6)]"  },
  { bar: "bg-teal-500",    text: "text-teal-400",    dot: "bg-teal-400",    glow: "shadow-[0_0_10px_rgba(45,212,191,0.6)]"  },
  { bar: "bg-fuchsia-500", text: "text-fuchsia-400", dot: "bg-fuchsia-400", glow: "shadow-[0_0_10px_rgba(232,121,249,0.6)]" },
];

export function getCityStyle(city: string): CityStyle {
  if (CITY_STYLE[city]) return CITY_STYLE[city];
  // 결정론적 색상: 키 문자열 해시 → 풀에서 선택
  let h = 0;
  for (let i = 0; i < city.length; i++) h = (h * 31 + city.charCodeAt(i)) >>> 0;
  return CITY_STYLE_FALLBACK_POOL[h % CITY_STYLE_FALLBACK_POOL.length];
}

export const CATEGORY_COLOR: Record<LocationCategory, string> = {
  HOTEL:   "text-purple-400",
  SIGHT:   "text-emerald-400",
  FOOD:    "text-orange-400",
  TRANSIT: "text-blue-400",
};

export const CATEGORY_DOT: Record<LocationCategory, string> = {
  HOTEL:   "bg-purple-400",
  SIGHT:   "bg-emerald-400",
  FOOD:    "bg-orange-400",
  TRANSIT: "bg-blue-400",
};

export const CATEGORY_BAR: Record<LocationCategory, string> = {
  HOTEL:   "bg-purple-500",
  SIGHT:   "bg-emerald-500",
  FOOD:    "bg-orange-500",
  TRANSIT: "bg-blue-500",
};

export const CATEGORY_GLOW: Record<LocationCategory, string> = {
  HOTEL:   "shadow-[0_0_10px_rgba(192,132,252,0.6)]",
  SIGHT:   "shadow-[0_0_10px_rgba(52,211,153,0.6)]",
  FOOD:    "shadow-[0_0_10px_rgba(251,146,60,0.6)]",
  TRANSIT: "shadow-[0_0_10px_rgba(59,130,246,0.6)]",
};

// ─── 도시 지도 데이터 ─────────────────────────────────────────────────────────
export type CityInfo = {
  name: string;
  region: string;
  description: string;
  position: { lat: number; lng: number };
};

export const CITY_INFO: Record<string, CityInfo> = {
  TOKYO:    { name: "도쿄",  region: "관동",   description: "일본 수도 · 쇼핑·문화·미식의 중심", position: { lat: 35.6762, lng: 139.6503 } },
  KYOTO:    { name: "교토",  region: "간사이", description: "천년 고도 · 전통사찰·기모노·자연",  position: { lat: 35.0116, lng: 135.7681 } },
  OSAKA:    { name: "오사카", region: "간사이", description: "미식의 도시 · 도톤보리·야경",       position: { lat: 34.6937, lng: 135.5023 } },
  NARA:     { name: "나라",  region: "간사이", description: "사슴 공원 · 동대사 · 고대 유적",    position: { lat: 34.6851, lng: 135.8048 } },
  HIROSHIMA:{ name: "히로시마", region: "주고쿠", description: "평화 기념관 · 미야지마 도리이",   position: { lat: 34.3853, lng: 132.4553 } },
};

// ─── 날짜 목록 ────────────────────────────────────────────────────────────────
export const DAYS: DayEntry[] = [];

// ─── 일정 데이터 ──────────────────────────────────────────────────────────────
export const ITINERARY: Record<number, ItineraryDay> = {};
