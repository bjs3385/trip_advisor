import type { LocationCategory, LocationEntry, TransitRole } from "@/data/itinerary";

export function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

const DEFAULT_START = "09:00";
const FALLBACK_DURATION_MIN = 60;
const DAY_END_MIN = 23 * 60 + 30;
const TIME_STEP_MIN = 10;

const CATEGORY_DURATION_MIN: Record<LocationCategory, number> = {
  HOTEL: 60,
  SIGHT: 90,
  FOOD: 75,
  TRANSIT: 30,
  WALK: 20,
};

function minToTime(minute: number) {
  const safeMinute = Math.max(0, minute);
  const h = Math.floor(safeMinute / 60);
  const m = safeMinute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function snapUp(minute: number) {
  return Math.ceil(minute / TIME_STEP_MIN) * TIME_STEP_MIN;
}

function durationFor(loc: Pick<LocationEntry, "category">) {
  return CATEGORY_DURATION_MIN[loc.category] ?? FALLBACK_DURATION_MIN;
}

export function computeNextStart(locations: LocationEntry[]): string {
  if (locations.length === 0) return DEFAULT_START;

  const intervals = locations
    .map((loc) => {
      const start = timeToMin(loc.time);
      const end = loc.endTime ? timeToMin(loc.endTime) : start + durationFor(loc);
      return {
        start,
        end: Math.max(start + TIME_STEP_MIN, end),
      };
    })
    .filter((interval) => Number.isFinite(interval.start) && Number.isFinite(interval.end))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  if (intervals.length === 0) return DEFAULT_START;

  const desiredDuration = FALLBACK_DURATION_MIN;
  let cursor = timeToMin(DEFAULT_START);
  for (const interval of intervals) {
    if (interval.start - cursor >= desiredDuration) {
      return minToTime(snapUp(cursor));
    }
    cursor = Math.max(cursor, interval.end);
  }

  const nextAfterLast = snapUp(cursor);
  if (nextAfterLast + desiredDuration <= DAY_END_MIN) {
    return minToTime(nextAfterLast);
  }

  let latestStart = 0;
  for (const loc of locations) {
    const start = timeToMin(loc.time);
    if (Number.isFinite(start) && start > latestStart) latestStart = start;
  }
  return minToTime(Math.min(DAY_END_MIN, snapUp(latestStart + TIME_STEP_MIN)));
}

const LOCATION_CATEGORIES: ReadonlySet<LocationCategory> = new Set([
  "HOTEL",
  "SIGHT",
  "FOOD",
  "TRANSIT",
  "WALK",
]);

export function bookmarkTypeToCategory(type: string | undefined): LocationCategory {
  if (type && LOCATION_CATEGORIES.has(type as LocationCategory)) {
    return type as LocationCategory;
  }
  return "SIGHT";
}

export const BOOKMARK_DRAG_MIME = "application/x-trip-bookmark";

export function nextTransitRole(locations: LocationEntry[]): TransitRole {
  const transitNodes = locations.filter((loc) => loc.category === "TRANSIT");
  const departures = transitNodes.filter((loc) => loc.transitRole === "DEPARTURE").length;
  const arrivals = transitNodes.filter((loc) => loc.transitRole === "ARRIVAL").length;
  return departures <= arrivals ? "DEPARTURE" : "ARRIVAL";
}

export function roleForCategory(category: LocationCategory, locations: LocationEntry[]): TransitRole | undefined {
  return category === "TRANSIT" ? nextTransitRole(locations) : undefined;
}
