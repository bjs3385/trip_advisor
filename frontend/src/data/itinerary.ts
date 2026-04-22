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
export const DAYS: DayEntry[] = [
  { day: 1, label: "04.28", city: "TOKYO", note: "ARRIVAL" },
  { day: 2, label: "04.29", city: "TOKYO", note: "ASAKUSA" },
  { day: 3, label: "04.30", city: "TOKYO", note: "SHINJUKU" },
  { day: 4, label: "05.01", city: "KYOTO", note: "TRANSIT" },
  { day: 5, label: "05.02", city: "KYOTO", note: "ARASHIYAMA" },
  { day: 6, label: "05.03", city: "OSAKA", note: "TRANSIT" },
  { day: 7, label: "05.04", city: "NARA",  note: "PARK" },
  { day: 8, label: "05.05", city: "OSAKA", note: "DEPARTURE" },
];

// ─── 일정 데이터 ──────────────────────────────────────────────────────────────
export const ITINERARY: Record<number, ItineraryDay> = {
  1: {
    locations: [
      { id: "a", name: "나리타 공항 입국",    category: "TRANSIT", time: "11:00" },
      { id: "b", name: "시부야 스트림 엑셀",  category: "HOTEL",   time: "15:00" },
      { id: "c", name: "시부야 스크램블",     category: "SIGHT",   time: "17:30" },
    ],
    routes: [{ from: "나리타", to: "시부야", mode: "N'EX 특급", duration: "90분" }],
    budget: [
      { label: "숙박", amount: "¥18,000", category: "HOTEL" },
      { label: "교통", amount: "¥3,000",  category: "TRANSIT" },
      { label: "식비", amount: "¥4,000",  category: "FOOD" },
    ],
  },
  2: {
    locations: [
      { id: "a", name: "아사쿠사 센소지",  category: "SIGHT", time: "09:00" },
      { id: "b", name: "나카미세 거리",    category: "FOOD",  time: "11:00" },
      { id: "c", name: "도쿄 스카이트리", category: "SIGHT", time: "13:00" },
    ],
    routes: [{ from: "시부야", to: "아사쿠사", mode: "도쿄 메트로", duration: "35분" }],
    budget: [
      { label: "스카이트리", amount: "¥2,060", category: "SIGHT" },
      { label: "식비",       amount: "¥5,000", category: "FOOD" },
      { label: "교통",       amount: "¥1,000", category: "TRANSIT" },
    ],
  },
  3: {
    locations: [
      { id: "a", name: "하라주쿠 다케시타", category: "SIGHT", time: "10:00" },
      { id: "b", name: "메이지 신궁",       category: "SIGHT", time: "13:00" },
      { id: "c", name: "신주쿠 가부키초",   category: "FOOD",  time: "19:00" },
    ],
    routes: [
      { from: "시부야",   to: "하라주쿠", mode: "도보",        duration: "15분" },
      { from: "하라주쿠", to: "신주쿠",   mode: "JR 야마노테", duration: "5분" },
    ],
    budget: [
      { label: "식비", amount: "¥6,000",  category: "FOOD" },
      { label: "교통", amount: "¥800",    category: "TRANSIT" },
      { label: "쇼핑", amount: "¥10,000", category: "SIGHT" },
    ],
  },
  4: {
    locations: [
      { id: "a", name: "도쿄 → 교토 이동", category: "TRANSIT", time: "08:00" },
      { id: "b", name: "후시미 이나리",     category: "SIGHT",   time: "13:00" },
      { id: "c", name: "료칸 니시야마 소안", category: "HOTEL",  time: "17:00" },
    ],
    routes: [{ from: "도쿄역", to: "교토역", mode: "신칸센 노조미", duration: "2시간 20분" }],
    budget: [
      { label: "신칸센", amount: "¥13,820", category: "TRANSIT" },
      { label: "료칸",   amount: "¥25,000", category: "HOTEL" },
      { label: "식비",   amount: "¥4,000",  category: "FOOD" },
    ],
  },
  5: {
    locations: [
      { id: "a", name: "아라시야마 대나무숲", category: "SIGHT", time: "09:00" },
      { id: "b", name: "텐류지 정원",         category: "SIGHT", time: "10:30" },
      { id: "c", name: "긴카쿠지",            category: "SIGHT", time: "14:00" },
    ],
    routes: [
      { from: "교토역",   to: "아라시야마", mode: "산인 본선", duration: "25분" },
      { from: "아라시야마", to: "긴카쿠지", mode: "버스 204", duration: "45분" },
    ],
    budget: [
      { label: "텐류지",  amount: "¥500",   category: "SIGHT" },
      { label: "긴카쿠지", amount: "¥500",  category: "SIGHT" },
      { label: "교통",    amount: "¥1,200", category: "TRANSIT" },
      { label: "식비",    amount: "¥5,000", category: "FOOD" },
    ],
  },
  6: {
    locations: [
      { id: "a", name: "교토 → 오사카 이동",  category: "TRANSIT", time: "10:00" },
      { id: "b", name: "도톤보리",             category: "FOOD",    time: "13:00" },
      { id: "c", name: "오사카 도미인 호텔",   category: "HOTEL",   time: "16:00" },
    ],
    routes: [{ from: "교토역", to: "오사카역", mode: "JR 신쾌속", duration: "29분" }],
    budget: [
      { label: "숙박", amount: "¥12,000", category: "HOTEL" },
      { label: "교통", amount: "¥600",    category: "TRANSIT" },
      { label: "식비", amount: "¥8,000",  category: "FOOD" },
    ],
  },
  7: {
    locations: [
      { id: "a", name: "나라 공원 사슴", category: "SIGHT", time: "09:30" },
      { id: "b", name: "도다이지 대불", category: "SIGHT", time: "11:00" },
      { id: "c", name: "가스가 대사",   category: "SIGHT", time: "13:30" },
    ],
    routes: [
      { from: "오사카 난바", to: "나라",   mode: "긴테쓰 특급", duration: "40분" },
      { from: "나라",        to: "오사카", mode: "긴테쓰",      duration: "40분" },
    ],
    budget: [
      { label: "도다이지", amount: "¥600",   category: "SIGHT" },
      { label: "교통",     amount: "¥1,800", category: "TRANSIT" },
      { label: "식비",     amount: "¥4,500", category: "FOOD" },
    ],
  },
  8: {
    locations: [
      { id: "a", name: "우메다 스카이빌딩", category: "SIGHT",   time: "10:00" },
      { id: "b", name: "오사카 이타미 공항", category: "TRANSIT", time: "15:00" },
    ],
    routes: [{ from: "오사카", to: "이타미 공항", mode: "리무진 버스", duration: "30분" }],
    budget: [
      { label: "스카이빌딩", amount: "¥1,500", category: "SIGHT" },
      { label: "교통",       amount: "¥760",   category: "TRANSIT" },
      { label: "기념품",     amount: "¥8,000", category: "FOOD" },
    ],
  },
};
