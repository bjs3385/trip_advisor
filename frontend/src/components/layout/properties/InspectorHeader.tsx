import { CATEGORY_COLOR, type CityStyle, type LocationCategory } from "@/data/itinerary";
import { cn } from "@/lib/utils";

interface InspectorHeaderProps {
  mode: "location" | "city" | "empty";
  locationCategory?: LocationCategory;
  cityStyle?: CityStyle | null;
}

export function InspectorHeader({
  mode,
  locationCategory,
  cityStyle,
}: InspectorHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim/80 bg-black/20">
      <div className="flex items-center gap-2">
        <div className="w-1 h-3 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">INSPECTOR</p>
      </div>

      {mode === "location" && locationCategory && (
        <span
          className={cn(
            "text-[9px] font-mono border bg-black/40 px-1.5 py-0.5 rounded-sm",
            CATEGORY_COLOR[locationCategory],
            "border-current/30"
          )}
        >
          {locationCategory}
        </span>
      )}

      {mode === "city" && cityStyle && (
        <span
          className={cn(
            "text-[9px] font-mono border bg-black/40 px-1.5 py-0.5 rounded-sm",
            cityStyle.text,
            "border-current/30"
          )}
        >
          CITY
        </span>
      )}
    </div>
  );
}
