import { Activity, ChevronLeft } from "lucide-react";
import { useItineraryStore } from "@/store/itinerary";

export function NavHeader() {
  const clearCurrentTrip = useItineraryStore((s) => s.clearCurrentTrip);
  const currentTripId = useItineraryStore((s) => s.currentTripId);
  const tripName = useItineraryStore(
    (s) => s.trips.find((t) => t.id === s.currentTripId)?.name ?? null,
  );

  return (
    <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border-dim/80 bg-black/20">
      <div className="relative w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
        <Activity className="w-4 h-4 text-blue-400" />
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-sm animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white tracking-widest leading-none truncate">
          {tripName ?? "TRIP ADVISOR"}
        </p>
        <p className="text-[9px] font-mono text-blue-400/70 mt-1 tracking-widest uppercase">
          SYS.OP.JAPAN.26
        </p>
      </div>
      {currentTripId !== null && (
        <button
          onClick={clearCurrentTrip}
          title="여행 선택으로 돌아가기"
          className="flex items-center gap-0.5 text-[9px] font-mono text-slate-500 hover:text-blue-400 border border-white/10 hover:border-blue-500/40 rounded-sm px-1.5 py-1 transition"
        >
          <ChevronLeft className="w-2.5 h-2.5" />
          TRIPS
        </button>
      )}
    </div>
  );
}
