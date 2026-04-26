export const JAPAN_CENTER = { lat: 36.2048, lng: 138.2529 };

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

export const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  styles: DARK_MAP_STYLE,
  backgroundColor: "#06090e",
  minZoom: 4,
};

export const CATEGORY_MARKER_COLOR: Record<string, string> = {
  HOTEL: "#A371F7",
  SIGHT: "#3FB950",
  FOOD: "#FB923C",
  TRANSIT: "#58A6FF",
  WALK: "#22D3EE",
};

export const DAY_ROUTE_COLORS = [
  "#58A6FF", "#3FB950", "#FB923C", "#A371F7", "#F85149",
  "#79C0FF", "#56D364", "#FFA657", "#D2A8FF", "#FF7B72",
];
