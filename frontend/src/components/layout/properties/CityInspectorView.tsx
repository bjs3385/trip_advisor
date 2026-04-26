import { Calendar, Globe, Hash } from "lucide-react";
import { motion } from "framer-motion";
import type { CityInfo, CityStyle, DayEntry } from "@/data/itinerary";
import { cn } from "@/lib/utils";

interface CityInspectorViewProps {
  selectedMapCity: string;
  cityInfo: CityInfo;
  cityStyle: CityStyle;
  cityDays: DayEntry[];
  cityLocCount: number;
}

export function CityInspectorView({
  selectedMapCity,
  cityInfo,
  cityStyle,
  cityDays,
  cityLocCount,
}: CityInspectorViewProps) {
  return (
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

      <div className="flex items-start gap-3">
        <div className="p-1 bg-white/5 rounded-sm border border-white/5">
          <Globe className="w-3 h-3 text-slate-400" />
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">REGION</p>
          <p className="text-[11px] text-slate-200 font-medium">{cityInfo.region}</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="p-1 bg-white/5 rounded-sm border border-white/5">
          <Calendar className="w-3 h-3 text-slate-400" />
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">SCHEDULE</p>
          <p className="text-[11px] text-slate-200 font-medium">
            {cityDays.length}일 · {cityDays.map((day) => `Day ${day.day}`).join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="p-1 bg-white/5 rounded-sm border border-white/5">
          <Hash className="w-3 h-3 text-slate-400" />
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">LOCATIONS</p>
          <p className="text-[11px] text-slate-200 font-medium">{cityLocCount}개 장소</p>
        </div>
      </div>

      <p className="text-[9px] text-slate-500 leading-relaxed border-t border-border-dim/40 pt-2.5 mt-1">
        {cityInfo.description}
      </p>
    </motion.div>
  );
}
