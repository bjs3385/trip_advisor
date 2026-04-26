import { Banknote, Plus } from "lucide-react";
import type { BudgetEntry } from "@/data/itinerary";

interface BudgetTabProps {
  budget: BudgetEntry[];
}

export function BudgetTab({ budget }: BudgetTabProps) {
  const dayTotal = budget.reduce(
    (sum, entry) => sum + Number.parseInt(entry.amount.replace(/[^0-9]/g, ""), 10),
    0
  );

  return (
    <div className="flex flex-col">
      {budget.map((entry, index) => (
        <div
          key={index}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-border-dim/30 last:border-0 hover:bg-white/5 transition-colors"
        >
          <Banknote className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="text-[11px] text-slate-300 flex-1">{entry.label}</span>
          <span className="text-[10px] font-mono text-purple-300 font-bold">{entry.amount}</span>
        </div>
      ))}

      <div className="flex items-center gap-3 px-4 py-2.5 bg-purple-500/5 border-t border-purple-500/20">
        <span className="text-[9px] font-mono text-slate-500 flex-1 tracking-widest">DAY TOTAL</span>
        <span className="text-[11px] font-mono text-purple-300 font-bold">¥{dayTotal.toLocaleString()}</span>
      </div>

      <button className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-slate-300 transition-colors">
        <Plus className="w-3 h-3" />
        <span className="text-[9px] font-mono tracking-widest">ADD ITEM</span>
      </button>
    </div>
  );
}
