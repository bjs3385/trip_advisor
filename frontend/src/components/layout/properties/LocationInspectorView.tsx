import { Calendar, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { CATEGORY_COLOR, type BudgetEntry, type DayEntry, type LocationEntry } from "@/data/itinerary";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON } from "./constants";

interface LocationInspectorViewProps {
  selectedLoc: LocationEntry;
  selectedDay: DayEntry | null;
  relatedBudget: BudgetEntry[];
}

export function LocationInspectorView({
  selectedLoc,
  selectedDay,
  relatedBudget,
}: LocationInspectorViewProps) {
  const CatIcon = CATEGORY_ICON[selectedLoc.category];

  return (
    <motion.div
      key={selectedLoc.id}
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-3"
    >
      <h3
        className={cn(
          "text-[13px] font-bold text-white tracking-wider border-l-2 pl-2",
          CATEGORY_COLOR[selectedLoc.category],
          "border-current"
        )}
      >
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
        <div
          className={cn(
            "p-1 bg-white/5 rounded-sm border border-white/5",
            CATEGORY_COLOR[selectedLoc.category]
          )}
        >
          <CatIcon className="w-3 h-3" />
        </div>
        <div>
          <p className="text-[9px] font-mono text-slate-500 tracking-wider mb-0.5">TYPE</p>
          <p className={cn("text-[11px] font-medium", CATEGORY_COLOR[selectedLoc.category])}>
            {selectedLoc.category}
          </p>
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

      {relatedBudget.length > 0 && (
        <div className="mt-1 pt-2.5 border-t border-border-dim/40 flex flex-col gap-1.5">
          <p className="text-[8px] font-mono text-slate-600 tracking-widest">BUDGET</p>
          {relatedBudget.map((budget, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">{budget.label}</span>
              <span className="text-[10px] font-mono text-slate-200">{budget.amount}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
