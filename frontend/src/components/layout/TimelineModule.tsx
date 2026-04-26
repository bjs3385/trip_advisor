"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { useItineraryStore } from "@/store/itinerary";
import { GanttChart } from "./timeline/GanttChart";
import { DayTimetable } from "./timeline/DayTimetable";

// ─── TimelineModule (컨테이너) ─────────────────────────────────────────────────
export function TimelineModule() {
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const view = useItineraryStore((s) => s.timelineView);
  const setView = useItineraryStore((s) => s.setTimelineView);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;

    const updateHeight = () => setContentHeight(node.offsetHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleDayClick = (day: number) => {
    setActiveDay(day);
    setView("timetable");
  };

  return (
    <FloatPanel delay={0.3}>
      <motion.div
        initial={false}
        animate={contentHeight === null ? { height: "auto" } : { height: contentHeight }}
        transition={{ height: { duration: 0.16, ease: [0.32, 0.72, 0, 1] } }}
        className="overflow-hidden"
      >
        <div ref={contentRef}>
          <AnimatePresence mode="wait" initial={false}>
            {view === "gantt" ? (
              <GanttChart key="gantt" onDayClick={handleDayClick} />
            ) : (
              <DayTimetable
                key="timetable"
                onBack={() => setView("gantt")}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </FloatPanel>
  );
}
