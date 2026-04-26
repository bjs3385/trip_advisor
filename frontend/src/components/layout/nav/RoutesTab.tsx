import { Clock, Plus, Route, Train } from "lucide-react";
import type { RouteEntry } from "@/data/itinerary";

interface RoutesTabProps {
  routes: RouteEntry[];
}

export function RoutesTab({ routes }: RoutesTabProps) {
  return (
    <div className="flex flex-col">
      {routes.map((route, index) => (
        <div key={index} className="flex flex-col gap-1.5 px-4 py-3 border-b border-border-dim/30 last:border-0">
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-white">{route.from}</span>
            <Route className="w-3 h-3 text-blue-400" />
            <span className="text-white">{route.to}</span>
          </div>
          <div className="flex items-center gap-3">
            <Train className="w-3 h-3 text-slate-500" />
            <span className="text-[9px] text-slate-400">{route.mode}</span>
            <Clock className="w-3 h-3 text-slate-500 ml-auto" />
            <span className="text-[9px] text-slate-400">{route.duration}</span>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
        <Plus className="w-3 h-3" />
        <span className="text-[9px] font-mono tracking-widest">ADD ROUTE</span>
      </button>
    </div>
  );
}
