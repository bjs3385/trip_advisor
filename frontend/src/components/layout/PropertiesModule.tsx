"use client";

import { MapPin, Clock, Tag, Calendar, Train, Utensils, Camera, Bed, Globe, Banknote, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { SelectedNode } from "@/app/page";
import { CITY_INFO, getCityStyle, CATEGORY_COLOR, LocationCategory } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<LocationCategory, React.ElementType> = {
  HOTEL: Bed, SIGHT: Camera, FOOD: Utensils, TRANSIT: Train,
};

interface PropertiesModuleProps {
  selectedNode: SelectedNode;
}

export function PropertiesModule({ selectedNode }: PropertiesModuleProps) {
  const itinerary        = useItineraryStore((s) => s.itinerary);
  const days             = useItineraryStore((s) => s.days);
  const selectedLocation = useItineraryStore((s) => s.selectedLocation);
  const selectedMapCity  = useItineraryStore((s) => s.selectedMapCity);

  // ── 장소 선택 ──────────────────────────────────────────────────────────────
  const selectedLoc = selectedLocation
    ? itinerary[selectedLocation.day]?.locations.find(
        (l) => l.id === selectedLocation.locationId
      ) ?? null
    : null;

  const selectedDay = selectedLocation
    ? days.find((d) => d.day === selectedLocation.day)
    : null;

  const relatedBudget = selectedLoc && selectedLocation
    ? itinerary[selectedLocation.day]?.budget.filter(
        (b) => b.category === selectedLoc.category
      )
    : [];

  const CatIcon = selectedLoc ? CATEGORY_ICON[selectedLoc.category] : null;

  // ── 도시 선택 ──────────────────────────────────────────────────────────────
  const cityInfo  = selectedMapCity ? CITY_INFO[selectedMapCity] : null;
  const cityStyle = selectedMapCity ? getCityStyle(selectedMapCity) : null;
  const cityDays  = selectedMapCity
    ? days.filter((d) => d.city === selectedMapCity)
    : [];
  const cityLocCount = cityDays.reduce(
    (acc, d) => acc + (itinerary[d.day]?.locations.length ?? 0), 0
  );

  // ── 표시 모드: location > city > empty ────────────────────────────────────
  const mode = selectedLoc ? "location" : cityInfo ? "city" : "empty";

  return (
    <FloatPanel className="w-64" delay={0.2}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim/80 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">INSPECTOR</p>
        </div>
        {mode === "location" && selectedLoc && (
          <span className={cn(
            "text-[9px] font-mono border bg-black/40 px-1.5 py-0.5 rounded-sm",
            CATEGORY_COLOR[selectedLoc.category], "border-current/30"
          )}>
            {selectedLoc.category}
          </span>
        )}
        {mode === "city" && cityStyle && (
          <span className={cn(
            "text-[9px] font-mono border bg-black/40 px-1.5 py-0.5 rounded-sm",
            cityStyle.text, "border-current/30"
          )}>
            CITY
          </span>
        )}
      </div>

      {/* 내용 */}
      <div className="p-4 min-h-[140px]">
        <AnimatePresence mode="wait">

          {/* ── 장소 뷰 ── */}
          {mode === "location" && selectedLoc && (
            <motion.div
              key={selectedLoc.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <h3 className={cn(
                "text-[13px] font-bold text-white tracking-wider border-l-2 pl-2",
                CATEGORY_COLOR[selectedLoc.category], "border-current"
              )}>
                {selectedLoc.name}
              </h3>
              <div className="flex items-start gap-3">
                <div className="p-1 bg-white/5 rounded-sm border border-white/5">
                  <Clock className="w-3 h-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">TIME</p>
                  <p className="text-[11px] text-slate-200 font-medium">{selectedLoc.time}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className={cn("p-1 bg-white/5 rounded-sm border border-white/5", CATEGORY_COLOR[selectedLoc.category])}>
                  {CatIcon && <CatIcon className="w-3 h-3" />}
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">TYPE</p>
                  <p className={cn("text-[11px] font-medium", CATEGORY_COLOR[selectedLoc.category])}>{selectedLoc.category}</p>
                </div>
              </div>
              {selectedDay && (
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-white/5 rounded-sm border border-white/5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">DAY</p>
                    <p className="text-[11px] text-slate-200 font-medium">
                      Day {String(selectedDay.day).padStart(2, "0")} · {selectedDay.label} · {selectedDay.city}
                    </p>
                  </div>
                </div>
              )}
              {relatedBudget && relatedBudget.length > 0 && (
                <div className="mt-1 pt-2.5 border-t border-border-dim/40 flex flex-col gap-1.5">
                  <p className="text-[8px] font-mono text-slate-600 tracking-widest">BUDGET</p>
                  {relatedBudget.map((b, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">{b.label}</span>
                      <span className="text-[10px] font-mono text-slate-200">{b.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── 도시 뷰 ── */}
          {mode === "city" && cityInfo && cityStyle && (
            <motion.div
              key={`city-${selectedMapCity}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              <h3 className={cn("text-[13px] font-bold tracking-wider border-l-2 pl-2", cityStyle.text, "border-current")}>
                {cityInfo.name}
                <span className="text-[9px] font-mono text-slate-500 ml-2 font-normal">{selectedMapCity}</span>
              </h3>

              {/* 설명 */}
              <div className="flex items-start gap-3">
                <div className="p-1 bg-white/5 rounded-sm border border-white/5">
                  <Globe className="w-3 h-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">REGION</p>
                  <p className="text-[11px] text-slate-200 font-medium">{cityInfo.region}</p>
                </div>
              </div>

              {/* 일정 일수 */}
              <div className="flex items-start gap-3">
                <div className="p-1 bg-white/5 rounded-sm border border-white/5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">SCHEDULE</p>
                  <p className="text-[11px] text-slate-200 font-medium">
                    {cityDays.length}일 · {cityDays.map((d) => `Day ${d.day}`).join(", ")}
                  </p>
                </div>
              </div>

              {/* 장소 수 */}
              <div className="flex items-start gap-3">
                <div className="p-1 bg-white/5 rounded-sm border border-white/5">
                  <Hash className="w-3 h-3 text-slate-400" />
                </div>
                <div>
                  <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">LOCATIONS</p>
                  <p className="text-[11px] text-slate-200 font-medium">{cityLocCount}개 장소</p>
                </div>
              </div>

              {/* 설명 */}
              <p className="text-[9px] text-slate-500 leading-relaxed border-t border-border-dim/40 pt-2.5 mt-1">
                {cityInfo.description}
              </p>
            </motion.div>
          )}

          {/* ── 빈 뷰 ── */}
          {mode === "empty" && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full py-6 gap-3 opacity-50"
            >
              <div className="p-2 border border-slate-700 rounded-sm">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-[10px] font-mono text-slate-500 text-center leading-loose tracking-widest">
                AWAITING<br />TARGET SELECTION
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </FloatPanel>
  );
}
