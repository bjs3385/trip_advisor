"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Train, Utensils, Camera, Bed, Pencil, Check, X, Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import {
  CATEGORY_COLOR,
  CATEGORY_BAR, CATEGORY_GLOW,
  CITY_INFO, getCityStyle,
  LocationCategory,
} from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<LocationCategory, React.ElementType> = {
  HOTEL: Bed, SIGHT: Camera, FOOD: Utensils, TRANSIT: Train,
};

// ─── 시간 → 분 변환 헬퍼 ─────────────────────────────────────────────────────
function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ─── 타임테이블 간트 뷰 ───────────────────────────────────────────────────────
function DayTimetable({
  onBack,
}: {
  onBack: () => void;
}) {
  const activeDay  = useItineraryStore((s) => s.activeDay);
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const itinerary  = useItineraryStore((s) => s.itinerary);
  const days       = useItineraryStore((s) => s.days);
  const dayData = days.find((d) => d.day === activeDay) ?? days[0];
  const itineraryDay = itinerary[activeDay] ?? itinerary[1] ?? { locations: [], routes: [], budget: [] };
  const cityStyle = getCityStyle(dayData.city);
  const locations = [...itineraryDay.locations].sort((a, b) => a.time.localeCompare(b.time));

  const updateLocation    = useItineraryStore((s) => s.updateLocation);
  const removeLocation    = useItineraryStore((s) => s.removeLocation);
  const setSelectedLocation = useItineraryStore((s) => s.setSelectedLocation);
  const selectedLocation  = useItineraryStore((s) => s.selectedLocation);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; time: string; category: LocationCategory }>({
    name: "", time: "", category: "SIGHT",
  });
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) nameRef.current?.focus();
  }, [editingId]);

  const handleBarClick = (act: typeof activities[number]) => {
    setSelectedLocation({ day: activeDay, locationId: act.id });
    setEditingId(act.id);
    setEditForm({ name: act.name, time: act.time, category: act.category });
  };

  const startEdit = (act: typeof activities[number], e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(act.id);
    setEditForm({ name: act.name, time: act.time, category: act.category });
  };

  const commitEdit = () => {
    if (!editingId) return;
    updateLocation(activeDay, { id: editingId, ...editForm });
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // 시간 축 범위 계산 (빈 일자는 기본 09~18)
  const startMin = locations.length > 0
    ? Math.floor(timeToMin(locations[0].time) / 60) * 60
    : 9 * 60;
  const lastStart = locations.length > 0 ? timeToMin(locations[locations.length - 1].time) : 16 * 60;
  const endMin   = Math.ceil((lastStart + 120) / 60) * 60;
  const totalMin = endMin - startMin;

  // 시간 눈금 (정시)
  const hours: number[] = [];
  for (let m = startMin; m <= endMin; m += 60) hours.push(m);

  // 각 활동의 시작/끝 분 계산
  const activities = locations.map((loc, i) => {
    const start = timeToMin(loc.time);
    const end   = i < locations.length - 1 ? timeToMin(locations[i + 1].time) : start + 120;
    return { ...loc, startMin: start, endMin: end };
  });

  const pct = (min: number) => ((min - startMin) / totalMin) * 100;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`timetable-${activeDay}`}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border-dim/60 bg-black/20">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="text-[9px] font-mono tracking-widest">GANTT</span>
          </button>
          <div className="w-px h-3 bg-slate-700 mx-1" />
          <span className={cn("text-[9px] font-mono font-bold", cityStyle.text)}>
            Day {String(activeDay).padStart(2, "0")}
          </span>
          <span className="text-[9px] font-mono text-slate-500">
            · {dayData.label} · {dayData.city} · {dayData.note}
          </span>
          <div className="flex items-center gap-0.5 ml-auto">
            <button
              onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
              disabled={activeDay === 1}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveDay(Math.min(days.length, activeDay + 1))}
              disabled={activeDay === days.length}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 간트 그리드 */}
        <div className="px-4 py-3 select-none">
          {/* 시간 눈금 헤더 */}
          <div className="flex mb-2 ml-28 relative">
            {hours.map((m) => (
              <div key={m} className="flex-1 flex flex-col items-start">
                <span className="text-[8px] font-mono text-slate-600 tracking-wider">
                  {String(m / 60).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* 세로 그리드선 + 행 */}
          <div className="relative flex flex-col gap-1.5">
            {/* 배경 그리드선 */}
            <div className="absolute inset-0 ml-28 flex pointer-events-none">
              {hours.map((m) => (
                <div key={m} className="flex-1 border-l border-slate-800/60" />
              ))}
            </div>

            {activities.map((act) => {
              const CatIcon = CATEGORY_ICON[act.category];
              const barLeft  = pct(act.startMin);
              const barWidth = pct(act.endMin) - barLeft;
              const isEditing = editingId === act.id;

              return (
                <div key={act.id} className="flex items-center h-7 group/row">
                  {/* 행 라벨 */}
                  <div className="w-28 flex-shrink-0 flex items-center gap-1.5 pr-2 min-w-0">
                    <div className={cn("p-0.5 rounded-sm bg-white/5 flex-shrink-0", CATEGORY_COLOR[act.category])}>
                      <CatIcon className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[9px] text-slate-400 truncate leading-tight">{act.name}</span>
                  </div>

                  {/* 바 영역 */}
                  <div className="flex-1 relative h-full flex items-center">
                    {isEditing ? (
                      /* ── 편집 폼 ── */
                      <div className="absolute inset-y-0 left-0 right-0 flex items-center gap-1 bg-slate-900/95 border border-slate-600/60 rounded-sm px-1.5 z-20">
                        {/* 카테고리 선택 */}
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value as LocationCategory }))}
                          className="bg-transparent text-[8px] font-mono text-slate-300 border-0 outline-none cursor-pointer"
                        >
                          {(["TRANSIT","SIGHT","FOOD","HOTEL"] as const).map((c) => (
                            <option key={c} value={c} className="bg-slate-900">{c}</option>
                          ))}
                        </select>
                        {/* 시간 입력 */}
                        <input
                          type="time"
                          value={editForm.time}
                          onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                          className="bg-transparent text-[8px] font-mono text-slate-300 border-0 outline-none w-16"
                        />
                        {/* 이름 입력 */}
                        <input
                          ref={nameRef}
                          value={editForm.name}
                          onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") cancelEdit(); }}
                          className="flex-1 bg-transparent text-[9px] text-white border-0 outline-none min-w-0"
                          placeholder="장소명"
                        />
                        {/* 액션 버튼 */}
                        <button onClick={commitEdit} className="text-emerald-400 hover:text-emerald-300 flex-shrink-0"><Check className="w-3 h-3" /></button>
                        <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X className="w-3 h-3" /></button>
                        <button onClick={() => { removeLocation(activeDay, act.id); cancelEdit(); }} className="text-red-500 hover:text-red-400 flex-shrink-0"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      /* ── 간트 바 ── */
                      <motion.div
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        transition={{ duration: 0.35, ease: "easeOut", delay: 0.05 }}
                        style={{
                          position: "absolute",
                          left:  `${barLeft}%`,
                          width: `${barWidth}%`,
                          originX: 0,
                        }}
                        onClick={() => handleBarClick(act)}
                        className={cn(
                          "h-4 w-full origin-left flex items-center px-1.5 overflow-hidden cursor-pointer",
                          "rounded-full group/bar ring-1 ring-transparent transition-all",
                          selectedLocation?.locationId === act.id && selectedLocation?.day === activeDay
                            ? "ring-white/60"
                            : "",
                          CATEGORY_BAR[act.category],
                          CATEGORY_GLOW[act.category],
                        )}
                      >
                        <span className="text-[8px] font-mono text-white/80 truncate whitespace-nowrap flex-1">
                          {act.time}
                        </span>
                        <Pencil
                          onClick={(e) => startEdit(act, e)}
                          className="w-2 h-2 text-white/50 flex-shrink-0 opacity-0 group-hover/bar:opacity-100 transition-opacity"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-border-dim/40">
            {(["TRANSIT","SIGHT","FOOD","HOTEL"] as const).map((cat) => (
              <div key={cat} className="flex items-center gap-1">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", CATEGORY_BAR[cat])} />
                <span className={cn("text-[8px] font-mono", CATEGORY_COLOR[cat])}>{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── 테마 커스텀 데이트 피커 ─────────────────────────────────────────────────
function ThemedDatePicker({
  value,
  onChange,
}: {
  value: string;            // "YYYY-MM-DD"
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const parse = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y || 2026, (m || 1) - 1, d || 1);
  };
  const selected = parse(value);
  const [view, setView] = useState(() => ({ y: selected.getFullYear(), m: selected.getMonth() }));

  // 열릴 때마다 현재 값 기준으로 뷰 동기화
  useEffect(() => {
    if (open) {
      const d = parse(value);
      setView({ y: d.getFullYear(), m: d.getMonth() });
    }
  }, [open, value]);

  // 열렸을 때 트리거 위치 추적 (스크롤·리사이즈 반영)
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

  // 바깥 클릭 / Esc 닫기 (팝오버는 portal 이라 별도 ref 확인)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 6×7 그리드
  const first = new Date(view.y, view.m, 1);
  const gridStart = new Date(view.y, view.m, 1 - first.getDay());
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }

  const today = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const pick = (d: Date) => {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    onChange(iso);
    setOpen(false);
  };

  const shift = (dy: number, dm: number) =>
    setView((v) => {
      let y = v.y + dy, m = v.m + dm;
      while (m < 0)  { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      return { y, m };
    });

  const weekdays = ["S", "M", "T", "W", "T", "F", "S"];
  const displayLabel = `${value.slice(0, 4)}.${value.slice(5, 7)}.${value.slice(8, 10)}`;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 bg-white/5 border rounded-sm px-1.5 py-0.5 transition font-mono text-[9px] tracking-wider",
          open
            ? "border-blue-500/50 text-white shadow-[0_0_8px_rgba(59,130,246,0.35)]"
            : "border-white/10 text-slate-200 hover:border-blue-500/30"
        )}
        title="시작 일정 변경"
      >
        <Calendar className="w-2.5 h-2.5 text-blue-400" />
        <span>{displayLabel}</span>
      </button>

      {mounted && createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              key="cal"
              ref={popRef}
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,  scale: 1 }}
              exit={{    opacity: 0, y: 6,  scale: 0.97 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="fixed z-[9999] w-56 bg-[#0d1117] border border-white/10 rounded-sm overflow-hidden"
              style={{
                boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)",
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left,
              }}
            >
            {/* 상단 네온 라인 */}
            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

            {/* 헤더 */}
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/[0.06] bg-black/20">
              <div className="flex items-center gap-0.5">
                <button onClick={() => shift(-1, 0)} title="이전 해"
                  className="p-0.5 text-slate-500 hover:text-blue-400 transition"><ChevronsLeft className="w-3 h-3" /></button>
                <button onClick={() => shift(0, -1)} title="이전 달"
                  className="p-0.5 text-slate-500 hover:text-blue-400 transition"><ChevronLeft className="w-3 h-3" /></button>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-[11px] font-mono font-bold text-white tracking-wider">
                  {view.y}
                </span>
                <span className="text-[8px] font-mono text-blue-400/70">.</span>
                <span className="text-[11px] font-mono font-bold text-blue-400 tracking-wider">
                  {String(view.m + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex items-center gap-0.5">
                <button onClick={() => shift(0, 1)} title="다음 달"
                  className="p-0.5 text-slate-500 hover:text-blue-400 transition"><ChevronRight className="w-3 h-3" /></button>
                <button onClick={() => shift(1, 0)} title="다음 해"
                  className="p-0.5 text-slate-500 hover:text-blue-400 transition"><ChevronsRight className="w-3 h-3" /></button>
              </div>
            </div>

            {/* 요일 */}
            <div className="grid grid-cols-7 px-1.5 pt-1.5 pb-0.5">
              {weekdays.map((w, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-[8px] font-mono text-center tracking-widest",
                    i === 0 ? "text-rose-400/70" : i === 6 ? "text-blue-400/70" : "text-slate-600"
                  )}
                >
                  {w}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-0.5 px-1.5 pb-1.5">
              {cells.map((d, i) => {
                const otherMonth = d.getMonth() !== view.m;
                const isSelected = sameDay(d, selected);
                const isToday = sameDay(d, today);
                const dow = d.getDay();
                return (
                  <button
                    key={i}
                    onClick={() => pick(d)}
                    className={cn(
                      "relative h-6 text-[9px] font-mono rounded-sm transition-colors",
                      isSelected
                        ? "bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        : otherMonth
                          ? "text-slate-700 hover:bg-white/5"
                          : dow === 0
                            ? "text-rose-400/80 hover:bg-white/5"
                            : dow === 6
                              ? "text-blue-400/80 hover:bg-white/5"
                              : "text-slate-300 hover:bg-white/5"
                    )}
                  >
                    {d.getDate()}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-between px-2 py-1 border-t border-white/[0.06] bg-black/20">
              <button
                onClick={() => pick(new Date())}
                className="text-[8px] font-mono text-slate-500 hover:text-blue-400 tracking-widest uppercase transition"
              >
                TODAY
              </button>
              <span className="text-[8px] font-mono text-slate-700 tracking-widest">ESC TO CLOSE</span>
            </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ─── 간트 뷰 ──────────────────────────────────────────────────────────────────
function GanttChart({
  onDayClick,
}: {
  onDayClick: (day: number) => void;
}) {
  const activeDay    = useItineraryStore((s) => s.activeDay);
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const days         = useItineraryStore((s) => s.days);
  const cities       = useItineraryStore((s) => s.cities);
  const addDay       = useItineraryStore((s) => s.addDay);
  const removeDay    = useItineraryStore((s) => s.removeDay);
  const updateDay    = useItineraryStore((s) => s.updateDay);
  const addCity      = useItineraryStore((s) => s.addCity);
  const removeCity   = useItineraryStore((s) => s.removeCity);
  const startDate    = useItineraryStore((s) => s.startDate);
  const setStartDate = useItineraryStore((s) => s.setStartDate);

  const activeData = days.find((d) => d.day === activeDay) ?? days[0];
  const startYear  = startDate.slice(0, 4);

  // 도시 추가 입력 상태
  const [cityInput, setCityInput] = useState("");
  const [showCityInput, setShowCityInput] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (showCityInput) cityInputRef.current?.focus(); }, [showCityInput]);
  const suggestions = Object.keys(CITY_INFO).filter((k) => !cities.includes(k));
  const submitCity = () => {
    const v = cityInput.trim();
    if (!v) { setShowCityInput(false); return; }
    addCity(v);
    setCityInput("");
    setShowCityInput(false);
  };

  return (
    <motion.div
      key="gantt"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-dim/60 bg-black/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-blue-400" />
          <span className="text-[9px] font-mono text-blue-400 tracking-widest uppercase">Gantt Timeline</span>
          <div className="w-px h-3 bg-slate-700 mx-1" />
          <span className="text-[9px] font-mono text-slate-500">Japan {startYear} · {days.length} Days</span>
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[8px] font-mono text-slate-600 tracking-widest uppercase">Start</span>
            <ThemedDatePicker value={startDate} onChange={setStartDate} />
          </div>
        </div>
        {activeData && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-slate-500">ACTIVE —</span>
            <span className="text-[9px] font-mono text-white font-bold tracking-wider">
              Day {String(activeDay).padStart(2, "0")} · {activeData.label} · {activeData.city}
            </span>
          </div>
        )}
      </div>

      {/* 간트 그리드 */}
      <div className="px-4 py-3 select-none">
        {/* 날짜 헤더 */}
        <div className="flex mb-2 ml-16 items-stretch">
          {days.map(({ day, label }) => (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-0.5 py-1 rounded-sm cursor-pointer transition-all duration-200 group/day",
                activeDay === day ? "bg-white/5" : "hover:bg-white/5"
              )}
            >
              <input
                type="text"
                value={label}
                onChange={(e) => updateDay(day, { label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-10 text-center bg-transparent border-0 outline-none text-[8px] font-mono tracking-wider",
                  activeDay === day ? "text-slate-300" : "text-slate-600 group-hover/day:text-slate-500"
                )}
              />
              <span className={cn("text-[10px] font-bold font-mono", activeDay === day ? "text-white" : "text-slate-500 group-hover/day:text-slate-400")}>
                {String(day).padStart(2, "0")}
              </span>
              {days.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); removeDay(day); }}
                  title="이 일자 삭제"
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-sm bg-black/80 border border-red-500/40 text-red-400 hover:bg-red-500/20 opacity-0 group-hover/day:opacity-100 transition flex items-center justify-center"
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addDay()}
            title="일자 추가"
            className="ml-1 w-6 flex items-center justify-center rounded-sm border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/15 transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* 도시 행 */}
        <div className="flex flex-col gap-1.5">
          {cities.map((cityName) => {
            const style = getCityStyle(cityName);
            return (
              <div key={cityName} className="flex items-center group/city">
                <div className="w-16 flex-shrink-0 pr-2 flex items-center gap-1 min-w-0">
                  <span className={cn("text-[9px] font-mono font-bold tracking-widest truncate", style.text)}>
                    {cityName}
                  </span>
                  <button
                    onClick={() => updateDay(activeDay, { city: cityName })}
                    title="활성 일자를 이 도시로 설정"
                    className="opacity-0 group-hover/city:opacity-100 text-slate-500 hover:text-slate-300 transition flex-shrink-0"
                  >
                    <Pencil className="w-2 h-2" />
                  </button>
                  {cities.length > 1 && (
                    <button
                      onClick={() => removeCity(cityName)}
                      title="도시 삭제 (이 도시를 쓰던 일자는 다른 도시로 이동됨)"
                      className="opacity-0 group-hover/city:opacity-100 text-red-500/70 hover:text-red-400 transition flex-shrink-0"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                {days.map(({ day, city }, i) => {
                  const thisCity = city === cityName;
                  const prevCity = days[i - 1]?.city === cityName;
                  const nextCity = days[i + 1]?.city === cityName;
                  const isActive = activeDay === day;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex-1 h-7 flex items-center transition-all duration-200",
                        thisCity ? "cursor-pointer" : "cursor-default",
                        isActive ? "bg-white/[0.03]" : thisCity ? "hover:bg-white/[0.02]" : ""
                      )}
                      onClick={() => thisCity && onDayClick(day)}
                    >
                      {thisCity ? (
                        <motion.div
                          initial={{ scaleX: 0, opacity: 0 }}
                          animate={{ scaleX: 1, opacity: isActive ? 1 : 0.55 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                          className={cn(
                            "h-4 w-full transition-all duration-200 origin-left",
                            style.bar,
                            isActive && style.glow,
                            !prevCity && !nextCity && "rounded-full mx-1.5",
                            !prevCity && nextCity  && "rounded-l-full ml-1.5",
                            prevCity  && !nextCity && "rounded-r-full mr-1.5"
                          )}
                        />
                      ) : (
                        <div className={cn("h-px w-full", isActive ? "bg-slate-600/60" : "bg-slate-800/40")} />
                      )}
                    </div>
                  );
                })}
                {/* 날짜 추가 버튼과 너비 맞춤 */}
                <div className="ml-1 w-6 flex-shrink-0" />
              </div>
            );
          })}
        </div>

        {/* 범례 + 도시 추가 + 이전/다음 */}
        <div className="flex items-center flex-wrap gap-3 mt-3 pt-2.5 border-t border-border-dim/40">
          {cities.map((cityName) => {
            const style = getCityStyle(cityName);
            const count = days.filter((d) => d.city === cityName).length;
            return (
              <div key={cityName} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", style.bar)} />
                <span className={cn("text-[8px] font-mono", style.text)}>{cityName}</span>
                <span className="text-[8px] font-mono text-slate-600">{count}d</span>
              </div>
            );
          })}

          {/* 도시 추가 */}
          {showCityInput ? (
            <div className="flex items-center gap-1">
              <input
                ref={cityInputRef}
                list="city-suggestions"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCity();
                  if (e.key === "Escape") { setCityInput(""); setShowCityInput(false); }
                }}
                onBlur={submitCity}
                placeholder="CITY"
                className="w-20 bg-white/5 border border-white/10 text-[8px] font-mono text-slate-200 rounded-sm px-1.5 py-0.5 outline-none focus:border-blue-500/40"
              />
              <datalist id="city-suggestions">
                {suggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
            </div>
          ) : (
            <button
              onClick={() => setShowCityInput(true)}
              title="도시 추가"
              className="flex items-center gap-1 text-[8px] font-mono text-slate-500 hover:text-blue-400 border border-dashed border-slate-700 hover:border-blue-500/40 rounded-sm px-1.5 py-0.5 transition"
            >
              <Plus className="w-2.5 h-2.5" />
              CITY
            </button>
          )}

          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
              disabled={activeDay === 1}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveDay(Math.min(days.length, activeDay + 1))}
              disabled={activeDay === days.length}
              className="p-1 text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── TimelineModule (컨테이너) ─────────────────────────────────────────────────
export function TimelineModule() {
  const activeDay    = useItineraryStore((s) => s.activeDay);
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const [view, setView] = useState<"gantt" | "timetable">("gantt");

  const handleDayClick = (day: number) => {
    setActiveDay(day);
    setView("timetable");
  };

  return (
    <FloatPanel delay={0.3}>
      <AnimatePresence mode="wait">
        {view === "gantt" ? (
          <GanttChart key="gantt" onDayClick={handleDayClick} />
        ) : (
          <DayTimetable
            key="timetable"
            onBack={() => setView("gantt")}
          />
        )}
      </AnimatePresence>
    </FloatPanel>
  );
}
