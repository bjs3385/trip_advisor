"use client";

import { useState, useEffect, useRef } from "react";
import type { KeyboardEvent } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { FloatPanel } from "@/components/ui/FloatPanel";
import type { LocationCategory } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { SearchDropdown } from "./search/SearchDropdown";
import { usePlaceSuggestions } from "./search/usePlaceSuggestions";
import type { SearchSuggestion } from "./search/searchTypes";
import { computeNextStart, roleForCategory } from "./timeline/utils";

interface SearchModuleProps {
  isLoaded: boolean;
}

export function SearchModule({ isLoaded }: SearchModuleProps) {
  const setSearchTarget = useItineraryStore((s) => s.setSearchTarget);
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const addBookmark = useItineraryStore((s) => s.addBookmark);
  const activeDay = useItineraryStore((s) => s.activeDay);
  const days = useItineraryStore((s) => s.days);
  const addLocation = useItineraryStore((s) => s.addLocation);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [bookmarkingPlaceId, setBookmarkingPlaceId] = useState<string | null>(null);
  const [schedulingPlaceId, setSchedulingPlaceId] = useState<string | null>(null);
  const [scheduledPlaceId, setScheduledPlaceId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { loading, suggestions, clearSuggestions, resetSessionToken } = usePlaceSuggestions({
    isLoaded,
    query,
  });

  useEffect(() => {
    const isTextEntry = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      );
    };

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (!isLoaded) return;
      const isSearchShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlashShortcut = e.key === "/" && !isTextEntry(e.target);
      if (!isSearchShortcut && !isSlashShortcut) return;

      e.preventDefault();
      setOpen(true);
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLoaded]);

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const clampedHighlight = suggestions.length === 0
    ? 0
    : Math.min(highlight, suggestions.length - 1);
  const bookmarkedPlaceIds = new Set(bookmarks.map((bookmark) => bookmark.placeId));

  const inferCategory = (types: string[] | undefined): LocationCategory => {
    const set = new Set(types ?? []);
    if (["train_station", "subway_station", "transit_station", "light_rail_station", "bus_station", "airport", "ferry_terminal"].some((type) => set.has(type))) {
      return "TRANSIT";
    }
    if (["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "food"].some((type) => set.has(type))) {
      return "FOOD";
    }
    if (["lodging", "hotel"].some((type) => set.has(type))) {
      return "HOTEL";
    }
    return "SIGHT";
  };

  const fetchSuggestionDetails = async (suggestion: SearchSuggestion) => {
    const place = suggestion.prediction.toPlace() as google.maps.places.Place & {
        displayName?: string;
        formattedAddress?: string;
        rating?: number;
        types?: string[];
        location?: google.maps.LatLng;
      };
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location", "types", "rating"],
    });
    const loc = place.location;
    if (!loc) return null;
    return {
      position: { lat: loc.lat(), lng: loc.lng() },
      placeId: suggestion.placeId,
      name: place.displayName ?? suggestion.primary,
      address: place.formattedAddress ?? suggestion.secondary,
      type: place.types?.[0],
      types: place.types ?? [],
      rating: place.rating ?? undefined,
    };
  };

  const pickSuggestion = async (suggestion: SearchSuggestion) => {
    setOpen(false);
    setQuery(suggestion.primary);
    try {
      const details = await fetchSuggestionDetails(suggestion);
      if (!details) return;
      setSearchTarget({
        position: details.position,
        placeId: details.placeId,
        name: details.name,
        address: details.address,
        type: details.type,
        rating: details.rating,
      });
    } finally {
      resetSessionToken();
    }
  };

  const addSuggestionBookmark = async (suggestion: SearchSuggestion) => {
    if (bookmarkedPlaceIds.has(suggestion.placeId) || bookmarkingPlaceId) return;
    setBookmarkingPlaceId(suggestion.placeId);
    try {
      const details = await fetchSuggestionDetails(suggestion);
      if (!details) return;
      addBookmark({
        placeId: details.placeId,
        name: details.name,
        position: details.position,
        address: details.address,
        type: details.type,
        rating: details.rating,
      });
    } finally {
      setBookmarkingPlaceId(null);
      resetSessionToken();
    }
  };

  const addSuggestionToSchedule = async (suggestion: SearchSuggestion) => {
    if (schedulingPlaceId) return;
    const targetDay = days.some((day) => day.day === activeDay) ? activeDay : days[0]?.day;
    if (!targetDay) return;

    setSchedulingPlaceId(suggestion.placeId);
    try {
      const details = await fetchSuggestionDetails(suggestion);
      if (!details) return;
      const existing = useItineraryStore.getState().itinerary[targetDay]?.locations ?? [];
      const category = inferCategory(details.types);
      addLocation(targetDay, {
        id: `search-${details.placeId.slice(-8)}-${Date.now().toString(36)}`,
        name: details.name || details.address || "장소",
        category,
        transitRole: roleForCategory(category, existing),
        time: computeNextStart(existing),
        position: details.position,
      });
      setScheduledPlaceId(suggestion.placeId);
      window.setTimeout(() => {
        setScheduledPlaceId((current) => (current === suggestion.placeId ? null : current));
      }, 1500);
    } finally {
      setSchedulingPlaceId(null);
      resetSessionToken();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pickSuggestion(suggestions[clampedHighlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <FloatPanel className="w-full overflow-visible" delay={0.25}>
      <div ref={wrapperRef} className="relative">
        {/* 입력 행 */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              const nextQuery = e.target.value;
              setQuery(nextQuery);
              setOpen(true);
              if (!nextQuery.trim()) {
                clearSuggestions();
                resetSessionToken();
              }
            }}
            onKeyDown={onKeyDown}
            placeholder={isLoaded ? "장소 검색 (예: 도쿄타워, 신주쿠역)" : "지도 로딩 중..."}
            disabled={!isLoaded}
            className="flex-1 bg-transparent border-0 outline-none text-[15px] text-slate-200 placeholder:text-slate-600 font-mono disabled:cursor-not-allowed"
          />
          {loading && <Loader2 className="w-3 h-3 text-slate-500 animate-spin flex-shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => {
                setQuery("");
                clearSuggestions();
                resetSessionToken();
              }}
              className="text-slate-600 hover:text-slate-300 flex-shrink-0"
              title="지우기"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <SearchDropdown
          open={open}
          loading={loading}
          query={query}
          suggestions={suggestions}
          highlight={clampedHighlight}
          bookmarkedPlaceIds={bookmarkedPlaceIds}
          bookmarkingPlaceId={bookmarkingPlaceId}
          schedulingPlaceId={schedulingPlaceId}
          scheduledPlaceId={scheduledPlaceId}
          onHover={setHighlight}
          onPick={pickSuggestion}
          onAddBookmark={addSuggestionBookmark}
          onAddSchedule={addSuggestionToSchedule}
        />
      </div>
    </FloatPanel>
  );
}
