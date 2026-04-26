"use client";

import { motion } from "framer-motion";
import type { ActiveTab } from "@/app/page";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./constants";

interface NavTabsProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

export function NavTabs({ activeTab, onChange }: NavTabsProps) {
  return (
    <div className="flex border-b border-border-dim/60">
      {NAV_ITEMS.map(({ id, icon: Icon, label, color, activeBg }) => {
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
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
            <Icon
              className={cn(
                "w-3.5 h-3.5 flex-shrink-0 transition-colors",
                isActive ? color : "text-slate-500 group-hover:text-slate-400"
              )}
            />
            <span
              className={cn(
                "text-[8px] font-mono tracking-widest transition-colors",
                isActive ? "text-white font-bold" : "text-slate-500 group-hover:text-slate-300"
              )}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
