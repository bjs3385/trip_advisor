"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThemedTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  stepMinutes?: number;
}

function parseTime(value: string) {
  const [rawHour, rawMinute] = value.split(":").map(Number);
  const hour = Number.isFinite(rawHour) ? Math.max(0, Math.min(23, rawHour)) : 0;
  const minute = Number.isFinite(rawMinute) ? Math.max(0, Math.min(59, rawMinute)) : 0;
  return { hour, minute };
}

function formatTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function ThemedTimePicker({
  value,
  onChange,
  stepMinutes = 10,
}: ThemedTimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const selected = parseTime(value);
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const minutes = Array.from(
    { length: Math.floor(60 / stepMinutes) },
    (_, index) => index * stepMinutes
  );

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

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex items-center gap-1.5 bg-white/5 border rounded-sm px-2 py-1 transition font-mono text-[12px] tracking-wider",
          open
            ? "border-blue-500/50 text-white shadow-[0_0_8px_rgba(59,130,246,0.35)]"
            : "border-white/10 text-slate-200 hover:border-blue-500/30"
        )}
        title="시간 선택"
      >
        <Clock className="w-3 h-3 text-blue-400" />
        <span>{value}</span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && rect && (
              <motion.div
                key="time-picker"
                ref={popRef}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                className="fixed z-[9999] w-52 bg-[#0d1117] border border-white/10 rounded-sm overflow-hidden"
                style={{
                  boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)",
                  bottom: window.innerHeight - rect.top + 8,
                  left: rect.left,
                }}
              >
                <div className="h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-black/20">
                  <span className="text-[12px] font-mono text-blue-400 tracking-widest uppercase">
                    Time Picker
                  </span>
                  <span className="text-[12px] font-mono text-white font-bold">{value}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 px-2 py-2">
                  <div className="border border-white/[0.06] rounded-sm bg-black/20 overflow-hidden">
                    <div className="px-2 py-1 border-b border-white/[0.06] text-[11px] font-mono text-slate-500 tracking-widest uppercase">
                      Hour
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {hours.map((hour) => {
                        const active = hour === selected.hour;
                        return (
                          <button
                            key={hour}
                            onClick={() => onChange(formatTime(hour, selected.minute))}
                            className={cn(
                              "w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-[12px] font-mono transition",
                              active ? "bg-blue-500/15 text-white" : "text-slate-300 hover:bg-white/5"
                            )}
                          >
                            <span>{String(hour).padStart(2, "0")}</span>
                            {active && <Check className="w-3 h-3 text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border border-white/[0.06] rounded-sm bg-black/20 overflow-hidden">
                    <div className="px-2 py-1 border-b border-white/[0.06] text-[11px] font-mono text-slate-500 tracking-widest uppercase">
                      Minute
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {minutes.map((minute) => {
                        const active = minute === selected.minute;
                        return (
                          <button
                            key={minute}
                            onClick={() => onChange(formatTime(selected.hour, minute))}
                            className={cn(
                              "w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-[12px] font-mono transition",
                              active ? "bg-blue-500/15 text-white" : "text-slate-300 hover:bg-white/5"
                            )}
                          >
                            <span>{String(minute).padStart(2, "0")}</span>
                            {active && <Check className="w-3 h-3 text-blue-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between px-3 py-2 border-t border-white/[0.06] bg-black/20">
                  <span className="text-[11px] font-mono text-slate-600 tracking-widest">
                    {stepMinutes} MIN STEP
                  </span>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-[11px] font-mono text-slate-400 hover:text-blue-400 tracking-widest uppercase transition"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
