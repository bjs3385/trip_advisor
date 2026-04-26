import type { ItineraryDay } from "@/data/itinerary";
import type { GroupInfo, RouteMode } from "./mapTypes";

const ROUTES_API_URL =
  process.env.NEXT_PUBLIC_ROUTES_API_URL ?? "http://localhost:8000/api/routes/compute";

export function haversineKm(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function haversineM(a: google.maps.LatLngLiteral, b: google.maps.LatLngLiteral): number {
  return haversineKm(a, b) * 1000;
}

function centroid(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

// Andrew's monotone chain convex hull. Returns vertices in CCW order.
function convexHull(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[] {
  if (points.length <= 2) return [...points];
  const pts = [...points].sort((a, b) => a.lng - b.lng || a.lat - b.lat);
  const cross = (
    o: google.maps.LatLngLiteral,
    a: google.maps.LatLngLiteral,
    b: google.maps.LatLngLiteral,
  ) => (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);

  const lower: google.maps.LatLngLiteral[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }
  const upper: google.maps.LatLngLiteral[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function expandFromCentroid(
  hull: google.maps.LatLngLiteral[],
  c: google.maps.LatLngLiteral,
  factor: number,
): google.maps.LatLngLiteral[] {
  return hull.map((v) => ({
    lat: c.lat + (v.lat - c.lat) * factor,
    lng: c.lng + (v.lng - c.lng) * factor,
  }));
}

// Chaikin's corner-cutting: each vertex is replaced by 2 new vertices at
// 1/4 and 3/4 along the outgoing edge. After a few iterations, corners are
// smoothly rounded.
function chaikinSmooth(
  poly: google.maps.LatLngLiteral[],
  iterations: number,
): google.maps.LatLngLiteral[] {
  let current = poly;
  for (let it = 0; it < iterations; it++) {
    const next: google.maps.LatLngLiteral[] = [];
    const n = current.length;
    for (let i = 0; i < n; i++) {
      const a = current[i];
      const b = current[(i + 1) % n];
      next.push({
        lat: 0.75 * a.lat + 0.25 * b.lat,
        lng: 0.75 * a.lng + 0.25 * b.lng,
      });
      next.push({
        lat: 0.25 * a.lat + 0.75 * b.lat,
        lng: 0.25 * a.lng + 0.75 * b.lng,
      });
    }
    current = next;
  }
  return current;
}

function capsuleVertices(
  p1: google.maps.LatLngLiteral,
  p2: google.maps.LatLngLiteral,
  padM: number,
  arcN = 20,
): google.maps.LatLngLiteral[] {
  const spherical = google.maps.geometry.spherical;
  const ll1 = new google.maps.LatLng(p1);
  const ll2 = new google.maps.LatLng(p2);
  const heading = spherical.computeHeading(ll1, ll2);
  const verts: google.maps.LatLngLiteral[] = [];

  // arc around p2 from (heading-90) to (heading+90)
  for (let i = 0; i <= arcN; i++) {
    const t = heading - 90 + (180 * i) / arcN;
    const pt = spherical.computeOffset(ll2, padM, t);
    verts.push({ lat: pt.lat(), lng: pt.lng() });
  }
  // arc around p1 from (heading+90) to (heading+270)
  for (let i = 0; i <= arcN; i++) {
    const t = heading + 90 + (180 * i) / arcN;
    const pt = spherical.computeOffset(ll1, padM, t);
    verts.push({ lat: pt.lat(), lng: pt.lng() });
  }
  return verts;
}

function circleVertices(
  center: google.maps.LatLngLiteral,
  radiusM: number,
  n = 32,
): google.maps.LatLngLiteral[] {
  const spherical = google.maps.geometry.spherical;
  const ll = new google.maps.LatLng(center);
  const verts: google.maps.LatLngLiteral[] = [];
  for (let i = 0; i < n; i++) {
    const t = (360 * i) / n;
    const pt = spherical.computeOffset(ll, radiusM, t);
    verts.push({ lat: pt.lat(), lng: pt.lng() });
  }
  return verts;
}

function dedupePositions(
  positions: google.maps.LatLngLiteral[],
): google.maps.LatLngLiteral[] {
  const seen = new Map<string, google.maps.LatLngLiteral>();
  for (const p of positions) {
    const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
    if (!seen.has(key)) seen.set(key, p);
  }
  return Array.from(seen.values());
}

export function buildDayGroups(
  itinerary: Record<number, ItineraryDay>,
  dayColor: (dayStr: string) => string,
): GroupInfo[] {
  const groups: GroupInfo[] = [];

  for (const [dayStr, dayData] of Object.entries(itinerary)) {
    const byGroup = new Map<
      string,
      { id: string; pos: google.maps.LatLngLiteral; category: ItineraryDay["locations"][number]["category"] }[]
    >();
    for (const loc of dayData.locations) {
      if (!loc.position || !loc.groupId) continue;
      const arr = byGroup.get(loc.groupId) ?? [];
      arr.push({ id: loc.id, pos: loc.position, category: loc.category });
      byGroup.set(loc.groupId, arr);
    }

    for (const [groupKey, members] of byGroup) {
      if (members.length < 2) continue;
      // Transit-only groups (e.g. DEPARTURE/ARRIVAL pair) are rendered inline
      // in the timeline; the map should not draw a wrapping polygon for them.
      if (members.every((m) => m.category === "TRANSIT")) continue;

      const positions = dedupePositions(members.map((m) => m.pos));
      const c = centroid(positions);
      const color = dayColor(dayStr);

      let shapeVertices: google.maps.LatLngLiteral[];
      if (positions.length === 1) {
        shapeVertices = circleVertices(positions[0], 60);
      } else if (positions.length === 2) {
        const dist = haversineM(positions[0], positions[1]);
        const pad = Math.max(35, dist * 0.15);
        shapeVertices = capsuleVertices(positions[0], positions[1], pad);
      } else {
        const hull = convexHull(positions);
        let shape = chaikinSmooth(expandFromCentroid(hull, c, 1.5), 2);
        // Ensure every member node is inside the smoothed shape
        for (let i = 0; i < 5; i++) {
          if (positions.every((p) => pointInPolygon(p, shape))) break;
          shape = expandFromCentroid(shape, c, 1.1);
        }
        shapeVertices = shape;
      }

      const boundingRadiusMeters = Math.max(
        ...shapeVertices.map((v) => haversineM(c, v)),
      );

      groups.push({
        dayStr,
        groupKey,
        color,
        memberIds: members.map((m) => m.id),
        centroid: c,
        boundingRadiusMeters,
        shapeVertices,
      });
    }
  }

  return groups;
}

function pointInPolygon(
  point: google.maps.LatLngLiteral,
  verts: google.maps.LatLngLiteral[],
): boolean {
  let inside = false;
  for (let i = 0, j = verts.length - 1; i < verts.length; j = i++) {
    const xi = verts[i].lng;
    const yi = verts[i].lat;
    const xj = verts[j].lng;
    const yj = verts[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function trimPolylineByShape(
  polyline: google.maps.LatLngLiteral[],
  shapeVertices: google.maps.LatLngLiteral[],
  side: "start" | "end",
): google.maps.LatLngLiteral[] {
  if (polyline.length < 2 || shapeVertices.length < 3) return polyline;
  if (side === "start") {
    let i = 0;
    while (i < polyline.length - 1 && pointInPolygon(polyline[i], shapeVertices)) i++;
    return polyline.slice(i);
  }
  let i = polyline.length - 1;
  while (i > 0 && pointInPolygon(polyline[i], shapeVertices)) i--;
  return polyline.slice(0, i + 1);
}

export function segmentKey(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
  mode: RouteMode,
): string {
  const k = (n: number) => n.toFixed(5);
  return `${k(a.lat)},${k(a.lng)}|${k(b.lat)},${k(b.lng)}|${mode ?? "STRAIGHT"}`;
}

async function fetchWalkViaBackend(
  origin: google.maps.LatLngLiteral,
  dest: google.maps.LatLngLiteral,
): Promise<google.maps.LatLngLiteral[] | null> {
  try {
    const res = await fetch(ROUTES_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { lat: origin.lat, lng: origin.lng },
        destination: { lat: dest.lat, lng: dest.lng },
        travelMode: "WALK",
      }),
    });
    if (!res.ok) {
      console.error("routes proxy failed", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const polyline = data?.polyline;
    if (!Array.isArray(polyline) || polyline.length < 2) return null;

    return polyline.map((p: { lat: number; lng: number }) => ({ lat: p.lat, lng: p.lng }));
  } catch (err) {
    console.error("routes proxy error", err);
    return null;
  }
}

async function callDirectionsTransit(
  service: google.maps.DirectionsService,
  origin: google.maps.LatLngLiteral,
  dest: google.maps.LatLngLiteral,
  modes?: google.maps.TransitMode[],
): Promise<google.maps.LatLngLiteral[] | null> {
  const result = await service.route({
    origin,
    destination: dest,
    travelMode: google.maps.TravelMode.TRANSIT,
    ...(modes ? { transitOptions: { modes } } : {}),
  });
  const path = result.routes?.[0]?.overview_path;
  if (!path || path.length < 2) return null;
  return path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
}

async function fetchTransitViaDirectionsService(
  origin: google.maps.LatLngLiteral,
  dest: google.maps.LatLngLiteral,
): Promise<google.maps.LatLngLiteral[] | null> {
  const service = new google.maps.DirectionsService();
  const preferred = [
    google.maps.TransitMode.SUBWAY,
    google.maps.TransitMode.TRAIN,
    google.maps.TransitMode.RAIL,
    google.maps.TransitMode.BUS,
  ];
  try {
    return await callDirectionsTransit(service, origin, dest, preferred);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("ZERO_RESULTS")) {
      console.error("directions service transit error", err);
      return null;
    }
  }
  // Fallback: let Google pick any transit mode
  try {
    return await callDirectionsTransit(service, origin, dest);
  } catch (err) {
    console.error("directions service transit fallback error", err);
    return null;
  }
}

export async function fetchRoutePath(
  origin: google.maps.LatLngLiteral,
  dest: google.maps.LatLngLiteral,
  mode: Exclude<RouteMode, null>,
): Promise<google.maps.LatLngLiteral[] | null> {
  if (mode === "TRANSIT") {
    const transit = await fetchTransitViaDirectionsService(origin, dest);
    if (transit) return transit;
    return fetchWalkViaBackend(origin, dest);
  }
  return fetchWalkViaBackend(origin, dest);
}
