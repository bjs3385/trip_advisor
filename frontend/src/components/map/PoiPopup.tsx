"use client";

import { useState } from "react";
import { Bed, Bookmark, BookmarkCheck, Camera, Check, Footprints, MapPinned, Star, Train, Utensils } from "lucide-react";
import { CATEGORY_COLOR, type LocationCategory } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";
import { computeNextStart, roleForCategory } from "@/components/layout/timeline/utils";
import type { AddButtonConfig, PlacePopup } from "./mapTypes";

const ADD_BUTTONS: AddButtonConfig[] = [
  { cat: "TRANSIT", label: "교통", Icon: Train },
  { cat: "WALK", label: "도보", Icon: Footprints },
  { cat: "SIGHT", label: "위치", Icon: Camera },
  { cat: "FOOD", label: "음식", Icon: Utensils },
  { cat: "HOTEL", label: "호텔", Icon: Bed },
];

const TRANSIT_POI_TYPES = new Set([
  "train_station",
  "subway_station",
  "transit_station",
  "light_rail_station",
  "bus_station",
  "airport",
  "ferry_terminal",
]);

let poiIdCounter = 0;

function nextPoiId(placeId: string) {
  poiIdCounter += 1;
  return `poi-${placeId.slice(-8)}-${poiIdCounter}`;
}

interface PoiPopupProps {
  place: PlacePopup;
  onClose: () => void;
}

export function PoiPopup({ place, onClose }: PoiPopupProps) {
  const addLocation = useItineraryStore((s) => s.addLocation);
  const days = useItineraryStore((s) => s.days);
  const cities = useItineraryStore((s) => s.cities);
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const addBookmark = useItineraryStore((s) => s.addBookmark);
  const removeBookmark = useItineraryStore((s) => s.removeBookmark);
  const hasDays = days.length > 0;
  const hasCities = cities.length > 0;
  const canAdd = hasDays && hasCities;
  const isBookmarked = bookmarks.some((b) => b.placeId === place.placeId);
  const [selectedDay, setSelectedDay] = useState<number>(() => days[0]?.day ?? 1);
  const [addedCat, setAddedCat] = useState<LocationCategory | null>(null);
  const resolvedSelectedDay =
    hasDays && days.some((d) => d.day === selectedDay) ? selectedDay : (days[0]?.day ?? 1);

  const typeLabel = place.type?.replace(/_/g, " ");
  const lat = place.position.lat.toFixed(4);
  const lng = place.position.lng.toFixed(4);

  const handleAdd = (category: LocationCategory) => {
    if (!canAdd) return;

    const existing =
      useItineraryStore.getState().itinerary[resolvedSelectedDay]?.locations ?? [];
    const time = computeNextStart(existing);

    addLocation(resolvedSelectedDay, {
      id: nextPoiId(place.placeId),
      name: place.name || place.address || "장소",
      category,
      transitRole: roleForCategory(category, existing),
      time,
      position: place.position,
    });
    setAddedCat(category);
    window.setTimeout(() => setAddedCat(null), 1500);
  };

  return (
    <div
      className="relative"
      style={{ transform: "translate(-50%, calc(-100% - 18px))", width: 220 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-[#0d1117] border border-white/10 rounded-sm overflow-hidden text-left"
        style={{ boxShadow: "0 0 20px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
      >
        <div className="px-3 py-2 flex items-start justify-between gap-2 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <div className="w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
              <span className="text-[11px] font-bold text-slate-100 tracking-wide leading-tight">
                {place.name || "—"}
              </span>
            </div>
            {typeLabel && (
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <button
              onClick={() => {
                if (isBookmarked) {
                  removeBookmark(place.placeId);
                } else {
                  addBookmark({
                    placeId: place.placeId,
                    name: place.name || place.address || "장소",
                    position: place.position,
                    address: place.address,
                    type: place.type,
                    rating: place.rating,
                  });
                }
              }}
              title={isBookmarked ? "북마크 해제" : "북마크 추가"}
              className={cn(
                "transition-colors",
                isBookmarked
                  ? "text-amber-300 hover:text-amber-200"
                  : "text-slate-600 hover:text-amber-300"
              )}
            >
              {isBookmarked ? (
                <BookmarkCheck className="w-3 h-3 fill-amber-300/20" />
              ) : (
                <Bookmark className="w-3 h-3" />
              )}
            </button>
            <button
              className="text-slate-600 hover:text-slate-300 text-[10px] font-mono leading-none"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div className="px-3 py-2 flex flex-col gap-2">
          {place.rating !== undefined && (
            <div className="flex items-center gap-1.5">
              <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
              <span className="text-[10px] font-mono text-yellow-400">{place.rating.toFixed(1)}</span>
              <span className="text-[9px] text-slate-600">/5</span>
            </div>
          )}

          {place.address && (
            <div className="flex items-start gap-1.5">
              <MapPinned className="w-2.5 h-2.5 text-slate-600 mt-0.5 shrink-0" />
              <p className="text-[9px] text-slate-500 leading-relaxed">{place.address}</p>
            </div>
          )}

          <p className="text-[8px] font-mono text-slate-700">
            {lat}, {lng}
          </p>

          <div className="border-t border-white/[0.06]" />

          {canAdd ? (
            <div className="flex flex-col gap-1.5">
              <select
                value={resolvedSelectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
                className="bg-white/5 border border-white/10 text-slate-300 text-[9px] font-mono rounded-sm px-1.5 py-1 focus:outline-none focus:border-blue-500/50"
              >
                {days.map((d) => (
                  <option key={d.day} value={d.day} className="bg-[#0d1117]">
                    Day {d.day} · {d.label}
                    {d.city ? ` · ${d.city}` : ""}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-5 gap-1">
                {ADD_BUTTONS.map(({ cat, label, Icon }) => {
                  const isAdded = addedCat === cat;
                  const isTransitOnly = cat === "TRANSIT";
                  const disabled =
                    isTransitOnly && !(place.type && TRANSIT_POI_TYPES.has(place.type));
                  return (
                    <button
                      key={cat}
                      onClick={() => !disabled && handleAdd(cat)}
                      disabled={disabled}
                      title={disabled ? "교통시설 POI에만 사용 가능" : `${label}로 추가`}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-1 rounded-sm border transition-colors",
                        isAdded
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                          : disabled
                          ? "bg-white/[0.02] border-white/5 text-slate-700 cursor-not-allowed"
                          : cn("bg-white/5 border-white/10 hover:bg-white/10", CATEGORY_COLOR[cat])
                      )}
                    >
                      {isAdded ? <Check className="w-2.5 h-2.5" /> : <Icon className="w-2.5 h-2.5" />}
                      <span className="text-[8px] font-mono">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[9px] font-mono text-slate-500 text-center py-1 border border-dashed border-slate-700/60 rounded-sm">
              {!hasDays ? "간트에 일자를 먼저 추가하세요" : "간트에 도시(CITY)를 먼저 추가하세요"}
            </p>
          )}
        </div>
      </div>

      <div
        className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
        style={{
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "8px solid rgba(255,255,255,0.10)",
        }}
      />
    </div>
  );
}
