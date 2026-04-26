import { OverlayView } from "@react-google-maps/api";
import { Bed, Camera, Footprints, Train, Utensils } from "lucide-react";
import type { LocationCategory } from "@/data/itinerary";
import { CATEGORY_MARKER_COLOR } from "./mapConfig";

const CATEGORY_MARKER_ICON: Record<LocationCategory, React.ElementType> = {
  HOTEL: Bed,
  SIGHT: Camera,
  FOOD: Utensils,
  TRANSIT: Train,
  WALK: Footprints,
};

interface LocationMarkerProps {
  position: google.maps.LatLngLiteral;
  category: LocationCategory;
  isSelected: boolean;
  order?: number;
  onClick: () => void;
}

export function LocationMarker({
  position,
  category,
  isSelected,
  order,
  onClick,
}: LocationMarkerProps) {
  const Icon = CATEGORY_MARKER_ICON[category];
  const color = CATEGORY_MARKER_COLOR[category] ?? "#58A6FF";
  const size = isSelected ? 30 : 24;

  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          transform: "translate(-50%, -50%)",
          width: size,
          height: size,
          background: color,
          borderRadius: "50%",
          border: isSelected ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.4)",
          boxShadow: `0 0 ${isSelected ? 14 : 6}px ${color}`,
          opacity: isSelected ? 1 : 0.85,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "width 0.15s ease-out, height 0.15s ease-out, box-shadow 0.15s ease-out",
        }}
      >
        {order !== undefined ? (
          <span
            style={{
              color: "#ffffff",
              fontSize: isSelected ? 17 : 15,
              fontFamily: "monospace",
              fontWeight: 900,
              lineHeight: 1,
              textShadow: "0 1px 4px rgba(0,0,0,0.85)",
            }}
          >
            {order}
          </span>
        ) : (
          <Icon color="#ffffff" size={isSelected ? 16 : 13} strokeWidth={2.25} />
        )}
      </div>
    </OverlayView>
  );
}
