"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemedDatePickerProps {
  value: string;
  onChange: (iso: string) => void;
}

export function ThemedDatePicker({ value, onChange }: ThemedDatePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y || 2026, (m || 1) - 1, d || 1);
  };

  const selected = parse(value);
  const [view, setView] = useState(() => ({ y: selected.getFullYear(), m: selected.getMonth() }));

  useLayoutEffect(() => {
    if (!open) return;

    const update = () => {
      if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const first = new Date(view.y, view.m, 1);
  const gridStart = new Date(view.y, view.m, 1 - first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    cells.push(day);
  }

  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const pick = (date: Date) => {
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };

  const shift = (dy: number, dm: number) =>
    setView((current) => {
      let y = current.y + dy;
      let m = current.m + dm;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      while (m > 11) {
        m -= 12;
        y += 1;
      }
      return { y, m };
    });

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const displayLabel = `${value.slice(0, 4)}.${value.slice(5, 7)}.${value.slice(8, 10)}`;
  const handleToggle = () => {
    if (!open) {
      const next = parse(value);
      setView({ y: next.getFullYear(), m: next.getMonth() });
    }
    setOpen((current) => !current);
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-1.5 bg-white/5 border rounded-sm px-1.5 py-0.5 transition font-mono text-[13px] tracking-wider",
          open
            ? "border-blue-500/50 text-white shadow-[0_0_8px_rgba(59,130,246,0.35)]"
            : "border-white/10 text-slate-200 hover:border-blue-500/30"
        )}
        title="시작 일정 변경"
      >
        <Calendar className="w-2.5 h-2.5 text-blue-400" />
        <span>{displayLabel}</span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && rect && (
              <motion.div
                key="cal"
                ref={popRef}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="fixed z-[9999] w-56 bg-[#0d1117] border border-white/10 rounded-sm overflow-hidden"
                style={{
                  boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)",
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                }}
              >
                <div className="h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

                <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06] bg-black/20">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => shift(-1, 0)}
                      title="이전 해"
                      className="p-0.5 text-slate-500 hover:text-blue-400 transition"
                    >
                      <ChevronsLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => shift(0, -1)}
                      title="이전 달"
                      className="p-0.5 text-slate-500 hover:text-blue-400 transition"
                    >
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-[15px] font-mono font-bold text-white tracking-wider">
                      {view.y}
                    </span>
                    <span className="text-[12px] font-mono text-blue-400/70">.</span>
                    <span className="text-[15px] font-mono font-bold text-blue-400 tracking-wider">
                      {String(view.m + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => shift(0, 1)}
                      title="다음 달"
                      className="p-0.5 text-slate-500 hover:text-blue-400 transition"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => shift(1, 0)}
                      title="다음 해"
                      className="p-0.5 text-slate-500 hover:text-blue-400 transition"
                    >
                      <ChevronsRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 px-1.5 pt-1.5 pb-0.5">
                  {weekdays.map((weekday, index) => (
                    <div
                      key={weekday + index}
                      className={cn(
                        "text-[12px] font-mono text-center tracking-widest",
                        index === 0
                          ? "text-rose-400/70"
                          : index === 6
                            ? "text-blue-400/70"
                            : "text-slate-600"
                      )}
                    >
                      {weekday}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5 px-1.5 pb-1.5">
                  {cells.map((date, index) => {
                    const otherMonth = date.getMonth() !== view.m;
                    const isSelected = sameDay(date, selected);
                    const isToday = sameDay(date, today);
                    const dayOfWeek = date.getDay();

                    return (
                      <button
                        key={index}
                        onClick={() => pick(date)}
                        className={cn(
                          "relative h-8 text-[13px] font-mono rounded-sm transition-colors",
                          isSelected
                            ? "bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                            : otherMonth
                              ? "text-slate-700 hover:bg-white/5"
                              : dayOfWeek === 0
                                ? "text-rose-400/80 hover:bg-white/5"
                                : dayOfWeek === 6
                                  ? "text-blue-400/80 hover:bg-white/5"
                                  : "text-slate-300 hover:bg-white/5"
                        )}
                      >
                        {date.getDate()}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between px-2 py-1 border-t border-white/[0.06] bg-black/20">
                  <button
                    onClick={() => pick(new Date())}
                    className="text-[12px] font-mono text-slate-500 hover:text-blue-400 tracking-widest uppercase transition"
                  >
                    TODAY
                  </button>
                  <span className="text-[12px] font-mono text-slate-700 tracking-widest">
                    ESC TO CLOSE
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
