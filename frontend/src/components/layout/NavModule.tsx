"use client";

import {
  MapPin, Route, Wallet, Activity,
  Plus, Train, Utensils, Camera, Bed, Clock, Banknote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { CATEGORY_COLOR, LocationCategory } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { ActiveTab } from "@/app/page";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  id: ActiveTab;
  icon: React.ElementType;
  label: string;
  color: string;
  activeBg: string;
}[] = [
  { id: "locations", icon: MapPin, label: "LOCATIONS", color: "text-emerald-400", activeBg: "bg-emerald-400/10" },
  { id: "routes",    icon: Route,  label: "ROUTES",    color: "text-blue-400",    activeBg: "bg-blue-400/10" },
  { id: "budget",    icon: Wallet, label: "BUDGET",    color: "text-purple-400",  activeBg: "bg-purple-400/10" },
];

const CATEGORY_ICON: Record<LocationCategory, React.ElementType> = {
  HOTEL: Bed, SIGHT: Camera, FOOD: Utensils, TRANSIT: Train,
};

interface NavModuleProps {}

export function NavModule(_: NavModuleProps) {
  const activeTab  = useItineraryStore((s) => s.activeTab);
  const setActiveTab = useItineraryStore((s) => s.setActiveTab);
  const activeDay  = useItineraryStore((s) => s.activeDay);
  const itinerary  = useItineraryStore((s) => s.itinerary);
  const day = itinerary[activeDay] ?? itinerary[1] ?? { locations: [], routes: [], budget: [] };

  return (
    <FloatPanel delay={0.1}>
      {/* 로고 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border-dim/80 bg-black/20">
        <div className="relative w-8 h-8 rounded-sm bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-sm animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        </div>
        <div>
          <p className="text-[13px] font-bold text-white tracking-widest leading-none">TRIP ADVISOR</p>
          <p className="text-[9px] font-mono text-blue-400/70 mt-1 tracking-widest uppercase">SYS.OP.JAPAN.26</p>
        </div>
      </div>

      {/* 탭 바 */}
      <div className="flex border-b border-border-dim/60">
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, activeBg }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-1 px-2 py-2.5 transition-all duration-200 group",
                isActive ? activeBg : "hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavLine"
                  className={cn("absolute bottom-0 left-0 right-0 h-[2px] shadow-[0_0_6px_currentColor]", color)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
              <Icon className={cn("w-3.5 h-3.5 flex-shrink-0 transition-colors", isActive ? color : "text-slate-500 group-hover:text-slate-400")} />
              <span className={cn(
                "text-[8px] font-mono tracking-widest transition-colors",
                isActive ? "text-white font-bold" : "text-slate-500 group-hover:text-slate-300"
              )}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${activeTab}-${activeDay}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, position: "absolute" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex flex-col overflow-y-auto scrollbar-hide w-full"
            style={{ maxHeight: 256 }}
          >
            {/* 장소 탭 */}
            {activeTab === "locations" && (
              <div className="flex flex-col">
                {day.locations.map((loc) => {
                  const CatIcon = CATEGORY_ICON[loc.category];
                  return (
                    <div key={loc.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-border-dim/30 last:border-0">
                      <span className="text-[9px] font-mono text-slate-500 w-8 flex-shrink-0">{loc.time}</span>
                      <div className={cn("p-1 rounded-sm bg-white/5 flex-shrink-0", CATEGORY_COLOR[loc.category])}>
                        <CatIcon className="w-3 h-3" />
                      </div>
                      <span className="text-[11px] text-slate-300 font-medium leading-tight flex-1">{loc.name}</span>
                      <span className={cn("text-[8px] font-mono", CATEGORY_COLOR[loc.category])}>{loc.category}</span>
                    </div>
                  );
                })}
                <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
                  <Plus className="w-3 h-3" />
                  <span className="text-[9px] font-mono tracking-widest">ADD LOCATION</span>
                </button>
              </div>
            )}

            {/* 동선 탭 */}
            {activeTab === "routes" && (
              <div className="flex flex-col">
                {day.routes.map((r, i) => (
                  <div key={i} className="flex flex-col gap-1.5 px-4 py-3 border-b border-border-dim/30 last:border-0">
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-white">{r.from}</span>
                      <Route className="w-3 h-3 text-blue-400" />
                      <span className="text-white">{r.to}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Train className="w-3 h-3 text-slate-500" />
                      <span className="text-[9px] text-slate-400">{r.mode}</span>
                      <Clock className="w-3 h-3 text-slate-500 ml-auto" />
                      <span className="text-[9px] text-slate-400">{r.duration}</span>
                    </div>
                  </div>
                ))}
                <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
                  <Plus className="w-3 h-3" />
                  <span className="text-[9px] font-mono tracking-widest">ADD ROUTE</span>
                </button>
              </div>
            )}

            {/* 예산 탭 */}
            {activeTab === "budget" && (
              <div className="flex flex-col">
                {day.budget.map((b, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border-dim/30 last:border-0 hover:bg-white/5 transition-colors">
                    <Banknote className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="text-[11px] text-slate-300 flex-1">{b.label}</span>
                    <span className="text-[10px] font-mono text-purple-300 font-bold">{b.amount}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/5 border-t border-purple-500/20">
                  <span className="text-[9px] font-mono text-slate-500 flex-1 tracking-widest">DAY TOTAL</span>
                  <span className="text-[11px] font-mono text-purple-300 font-bold">
                    ¥{day.budget.reduce((sum, b) => sum + parseInt(b.amount.replace(/[^0-9]/g, "")), 0).toLocaleString()}
                  </span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
                  <Plus className="w-3 h-3" />
                  <span className="text-[9px] font-mono tracking-widest">ADD ITEM</span>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </FloatPanel>
  );
}
