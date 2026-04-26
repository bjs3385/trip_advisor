import { Plus } from "lucide-react";
import { CATEGORY_COLOR, type LocationEntry } from "@/data/itinerary";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON } from "./constants";

interface LocationsTabProps {
  locations: LocationEntry[];
}

export function LocationsTab({ locations }: LocationsTabProps) {
  return (
    <div className="flex flex-col">
      {locations.map((location) => {
        const CatIcon = CATEGORY_ICON[location.category];
        return (
          <div
            key={location.id}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-border-dim/30 last:border-0"
          >
            <span className="text-[9px] font-mono text-slate-500 w-8 flex-shrink-0">{location.time}</span>
            <div className={cn("p-1 rounded-sm bg-white/5 flex-shrink-0", CATEGORY_COLOR[location.category])}>
              <CatIcon className="w-3 h-3" />
            </div>
            <span className="text-[11px] text-slate-300 font-medium leading-tight flex-1">
              {location.name}
            </span>
            <span className={cn("text-[8px] font-mono", CATEGORY_COLOR[location.category])}>
              {location.category}
            </span>
          </div>
        );
      })}
      <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
        <Plus className="w-3 h-3" />
        <span className="text-[9px] font-mono tracking-widest">ADD LOCATION</span>
      </button>
    </div>
  );
}
