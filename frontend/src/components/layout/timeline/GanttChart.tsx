"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, Pencil, Plus, Route, X } from "lucide-react";
import { motion } from "framer-motion";
import { CITY_INFO, getCityStyle } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";
import { ThemedDatePicker } from "./ThemedDatePicker";
import { BOOKMARK_DRAG_MIME, bookmarkTypeToCategory, computeNextStart, roleForCategory } from "./utils";

interface GanttChartProps {
  onDayClick: (day: number) => void;
}

export function GanttChart({ onDayClick }: GanttChartProps) {
  const activeDay = useItineraryStore((s) => s.activeDay);
  const setActiveDay = useItineraryStore((s) => s.setActiveDay);
  const days = useItineraryStore((s) => s.days);
  const cities = useItineraryStore((s) => s.cities);
  const addDay = useItineraryStore((s) => s.addDay);
  const removeDay = useItineraryStore((s) => s.removeDay);
  const updateDay = useItineraryStore((s) => s.updateDay);
  const addCity = useItineraryStore((s) => s.addCity);
  const renameCity = useItineraryStore((s) => s.renameCity);
  const removeCity = useItineraryStore((s) => s.removeCity);
  const setSelectedMapCity = useItineraryStore((s) => s.setSelectedMapCity);
  const startDate = useItineraryStore((s) => s.startDate);
  const setStartDate = useItineraryStore((s) => s.setStartDate);
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const addLocation = useItineraryStore((s) => s.addLocation);
  const cityStyleKeys = useItineraryStore((s) => s.cityStyleKeys);
  const itinerary = useItineraryStore((s) => s.itinerary);
  const routeSelectedDays = useItineraryStore((s) => s.routeSelectedDays);
  const routeSelectedLocationKeys = useItineraryStore((s) => s.routeSelectedLocationKeys);
  const toggleRouteDaySelection = useItineraryStore((s) => s.toggleRouteDaySelection);
  const computeSelectedRoutes = useItineraryStore((s) => s.computeSelectedRoutes);

  const activeData = days.find((d) => d.day === activeDay) ?? days[0];
  const startYear = startDate.slice(0, 4);

  const [cityInput, setCityInput] = useState("");
  const [showCityInput, setShowCityInput] = useState(false);
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editingCityValue, setEditingCityValue] = useState("");
  const [dropTargetDay, setDropTargetDay] = useState<number | null>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const editCityInputRef = useRef<HTMLInputElement>(null);

  const isBookmarkDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME);

  const handleDayDragOver = (e: React.DragEvent, day: number) => {
    if (!isBookmarkDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dropTargetDay !== day) setDropTargetDay(day);
  };

  const handleDayDragLeave = (e: React.DragEvent, day: number) => {
    if (!isBookmarkDrag(e)) return;
    if (dropTargetDay === day) setDropTargetDay(null);
  };

  const handleDayDrop = (e: React.DragEvent, day: number) => {
    if (!isBookmarkDrag(e)) return;
    e.preventDefault();
    setDropTargetDay(null);
    const placeId = e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
    const bm = bookmarks.find((b) => b.placeId === placeId);
    if (!bm) return;
    const existing =
      useItineraryStore.getState().itinerary[day]?.locations ?? [];
    const category = bookmarkTypeToCategory(bm.type);
    addLocation(day, {
      id: `bm-${bm.placeId.slice(-6)}-${Date.now().toString(36)}`,
      name: bm.name,
      category,
      transitRole: roleForCategory(category, existing),
      time: computeNextStart(existing),
      position: bm.position,
    });
  };

  useEffect(() => {
    if (showCityInput) cityInputRef.current?.focus();
  }, [showCityInput]);

  useEffect(() => {
    if (editingCity) editCityInputRef.current?.focus();
  }, [editingCity]);

  const suggestions = Object.keys(CITY_INFO).filter((name) => !cities.includes(name));
  const routeSelectedCount = routeSelectedDays.length + routeSelectedLocationKeys.length;

  const hasEnoughRoutePoints = (day: number) => {
    const locations = itinerary[day]?.locations ?? [];
    return locations.filter((loc) => loc.position || loc.entryPoint || loc.exitPoint).length >= 2;
  };

  const submitCity = () => {
    const nextCity = cityInput.trim();
    if (!nextCity) {
      setShowCityInput(false);
      return;
    }
    addCity(nextCity);
    setCityInput("");
    setShowCityInput(false);
  };

  const startCityEdit = (cityName: string) => {
    setEditingCity(cityName);
    setEditingCityValue(cityName);
  };

  const submitCityEdit = () => {
    if (!editingCity) return;
    renameCity(editingCity, editingCityValue);
    setEditingCity(null);
    setEditingCityValue("");
  };

  return (
    <motion.div
      key="gantt"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-dim/60 bg-black/20">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-blue-400" />
          <span className="text-[13px] font-mono text-blue-400 tracking-widest uppercase">
            Gantt Timeline
          </span>
          <div className="w-px h-3 bg-slate-700 mx-1" />
          <span className="text-[13px] font-mono text-slate-500">
            Japan {startYear} · {days.length} Days
          </span>
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[12px] font-mono text-slate-600 tracking-widest uppercase">Start</span>
            <ThemedDatePicker value={startDate} onChange={setStartDate} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={computeSelectedRoutes}
            disabled={routeSelectedCount === 0}
            title="체크한 일자의 동선을 계산"
            className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-blue-400/30 bg-blue-400/10 px-2 text-[11px] font-mono text-blue-300 transition hover:border-blue-300 disabled:border-slate-700 disabled:bg-white/[0.03] disabled:text-slate-600"
          >
            <Route className="h-3.5 w-3.5" />
            동선 계산
            <span className="text-[10px] text-slate-500">{routeSelectedCount}</span>
          </button>
          {activeData && (
            <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-mono text-slate-500">ACTIVE -</span>
            <span className="text-[13px] font-mono text-white font-bold tracking-wider">
              Day {String(activeDay).padStart(2, "0")} · {activeData.label} · {activeData.city}
            </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 select-none">
        <div className="flex mb-2 ml-64 items-stretch">
          {days.map(({ day, label }) => (
            <div
              key={day}
              onClick={() => onDayClick(day)}
              onDragOver={(e) => handleDayDragOver(e, day)}
              onDragLeave={(e) => handleDayDragLeave(e, day)}
              onDrop={(e) => handleDayDrop(e, day)}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-0.5 py-1 rounded-sm cursor-pointer transition-all duration-200 group/day",
                activeDay === day ? "bg-white/5" : "hover:bg-white/5",
                dropTargetDay === day && "ring-1 ring-amber-400/60 bg-amber-400/10"
              )}
            >
              <button
                type="button"
                disabled={!hasEnoughRoutePoints(day)}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRouteDaySelection(day);
                }}
                title={hasEnoughRoutePoints(day) ? "동선 계산 대상" : "동선을 계산하려면 좌표가 있는 일정이 2개 이상 필요"}
                className={cn(
                  "absolute left-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded-sm border transition",
                  routeSelectedDays.includes(day)
                    ? "border-blue-300 bg-blue-400/20 text-blue-200 shadow-[0_0_8px_rgba(96,165,250,0.35)]"
                    : "border-slate-700 bg-black/30 text-slate-600 hover:border-blue-400/50 hover:text-blue-300",
                  !hasEnoughRoutePoints(day) && "cursor-not-allowed opacity-25 hover:border-slate-700 hover:text-slate-600"
                )}
              >
                <Route className="h-2.5 w-2.5" />
              </button>
              <input
                type="text"
                value={label}
                onChange={(e) => updateDay(day, { label: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "w-14 text-center bg-transparent border-0 outline-none text-[12px] font-mono tracking-wider",
                  activeDay === day ? "text-slate-300" : "text-slate-600 group-hover/day:text-slate-500"
                )}
              />
              <span
                className={cn(
                  "text-[14px] font-bold font-mono",
                  activeDay === day ? "text-white" : "text-slate-500 group-hover/day:text-slate-400"
                )}
              >
                {String(day).padStart(2, "0")}
              </span>
              {days.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeDay(day);
                  }}
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

        <div className="flex flex-col gap-1.5">
          {cities.map((cityName) => {
            const style = getCityStyle(cityStyleKeys[cityName] ?? cityName);
            return (
              <div key={cityName} className="flex items-center group/city">
                <div className="w-64 flex-shrink-0 pr-3 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                  <div />
                  {editingCity === cityName ? (
                    <input
                      ref={editCityInputRef}
                      value={editingCityValue}
                      onChange={(e) => setEditingCityValue(e.target.value.toUpperCase())}
                      onBlur={submitCityEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") submitCityEdit();
                        if (e.key === "Escape") {
                          setEditingCity(null);
                          setEditingCityValue("");
                        }
                      }}
                      className={cn(
                        "w-32 rounded-sm border border-white/10 bg-white/5 px-1.5 py-0.5 text-center text-[13px] font-mono font-bold tracking-widest outline-none focus:border-blue-500/40",
                        style.text,
                      )}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedMapCity(cityName)}
                      title="지도에서 이 도시로 이동"
                      className={cn(
                        "min-w-0 truncate text-center text-[13px] font-mono font-bold tracking-widest whitespace-nowrap transition hover:brightness-125",
                        style.text,
                      )}
                    >
                      {cityName}
                    </button>
                  )}
                  <div className="flex min-w-0 items-center gap-1">
                    <button
                      onClick={() => startCityEdit(cityName)}
                      title="도시 이름 편집"
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
                </div>

                {days.map(({ day, city }, index) => {
                  const thisCity = city === cityName;
                  const prevCity = days[index - 1]?.city === cityName;
                  const nextCity = days[index + 1]?.city === cityName;
                  const isActive = activeDay === day;

                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex-1 h-7 flex items-center transition-all duration-200",
                        thisCity ? "cursor-pointer" : "cursor-default",
                        isActive ? "bg-white/[0.03]" : thisCity ? "hover:bg-white/[0.02]" : "",
                        dropTargetDay === day && "bg-amber-400/10 ring-1 ring-amber-400/40"
                      )}
                      onClick={() => thisCity && onDayClick(day)}
                      onDragOver={(e) => handleDayDragOver(e, day)}
                      onDragLeave={(e) => handleDayDragLeave(e, day)}
                      onDrop={(e) => handleDayDrop(e, day)}
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
                            !prevCity && nextCity && "rounded-l-full ml-1.5",
                            prevCity && !nextCity && "rounded-r-full mr-1.5"
                          )}
                        />
                      ) : (
                        <div className={cn("h-px w-full", isActive ? "bg-slate-600/60" : "bg-slate-800/40")} />
                      )}
                    </div>
                  );
                })}

                <div className="ml-1 w-6 flex-shrink-0" />
              </div>
            );
          })}
        </div>

        <div className="flex items-center flex-wrap gap-3 mt-3 pt-2.5 border-t border-border-dim/40">
          {cities.map((cityName) => {
            const style = getCityStyle(cityStyleKeys[cityName] ?? cityName);
            const count = days.filter((d) => d.city === cityName).length;

            return (
              <div key={cityName} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", style.bar)} />
                <span className={cn("text-[12px] font-mono", style.text)}>{cityName}</span>
                <span className="text-[12px] font-mono text-slate-600">{count}d</span>
              </div>
            );
          })}

          {showCityInput ? (
            <div className="flex items-center gap-1">
              <input
                ref={cityInputRef}
                list="city-suggestions"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitCity();
                  if (e.key === "Escape") {
                    setCityInput("");
                    setShowCityInput(false);
                  }
                }}
                onBlur={submitCity}
                placeholder="CITY"
                className="w-24 bg-white/5 border border-white/10 text-[12px] font-mono text-slate-200 rounded-sm px-1.5 py-0.5 outline-none focus:border-blue-500/40"
              />
              <datalist id="city-suggestions">
                {suggestions.map((suggestion) => (
                  <option key={suggestion} value={suggestion} />
                ))}
              </datalist>
            </div>
          ) : (
            <button
              onClick={() => setShowCityInput(true)}
              title="도시 추가"
              className="flex items-center gap-1 text-[12px] font-mono text-slate-500 hover:text-blue-400 border border-dashed border-slate-700 hover:border-blue-500/40 rounded-sm px-1.5 py-0.5 transition"
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
