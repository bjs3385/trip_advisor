"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";

const JAPAN_BOUNDS = {
  north: 45.6,
  south: 24.0,
  east: 146.0,
  west: 122.9,
};

type Suggestion = {
  placeId: string;
  primary: string;
  secondary: string;
  prediction: any; // google.maps.places.PlacePrediction
};

interface SearchModuleProps {
  isLoaded: boolean;
}

export function SearchModule({ isLoaded }: SearchModuleProps) {
  const setSearchTarget = useItineraryStore((s) => s.setSearchTarget);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlight, setHighlight] = useState(0);

  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // 세션 토큰: 입력 ~ 선택까지 한 묶음으로 과금되도록 유지
  const ensureSessionToken = useCallback(() => {
    if (!isLoaded) return null;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new (google.maps.places as any).AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, [isLoaded]);

  // 입력 변경 시 디바운스 후 자동완성 호출
  useEffect(() => {
    if (!isLoaded) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const SuggestionCtor = (google.maps.places as any).AutocompleteSuggestion;
        if (!SuggestionCtor?.fetchAutocompleteSuggestions) {
          setSuggestions([]);
          return;
        }
        const sessionToken = ensureSessionToken();
        const { suggestions: result } = await SuggestionCtor.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken,
          locationBias: JAPAN_BOUNDS,
          includedRegionCodes: ["jp"],
          language: "ko",
        });

        const mapped: Suggestion[] = (result ?? [])
          .map((s: any) => {
            const p = s.placePrediction;
            if (!p) return null;
            return {
              placeId: p.placeId,
              primary: p.mainText?.text ?? p.text?.text ?? "",
              secondary: p.secondaryText?.text ?? "",
              prediction: p,
            };
          })
          .filter(Boolean) as Suggestion[];

        setSuggestions(mapped);
        setHighlight(0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, isLoaded, ensureSessionToken]);

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

  const pickSuggestion = async (s: Suggestion) => {
    setOpen(false);
    setQuery(s.primary);
    try {
      const place = s.prediction.toPlace();
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location", "types", "rating"],
      });
      const loc = place.location;
      if (!loc) return;
      setSearchTarget({
        position: { lat: loc.lat(), lng: loc.lng() },
        placeId: s.placeId,
        name: place.displayName ?? s.primary,
        address: place.formattedAddress ?? s.secondary,
        type: place.types?.[0],
        rating: place.rating ?? undefined,
      });
    } finally {
      // 세션 토큰: 선택 시 종료 → 다음 검색은 새 세션
      sessionTokenRef.current = null;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pickSuggestion(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && (loading || suggestions.length > 0 || (query.trim() && !loading));

  return (
    <FloatPanel className="w-full overflow-visible" delay={0.25}>
      <div ref={wrapperRef} className="relative">
        {/* 입력 행 */}
        <div className="flex items-center gap-2 px-3 py-2">
          <Search className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onKeyDown={onKeyDown}
            placeholder={isLoaded ? "장소 검색 (예: 도쿄타워, 신주쿠역)" : "지도 로딩 중..."}
            disabled={!isLoaded}
            className="flex-1 bg-transparent border-0 outline-none text-[11px] text-slate-200 placeholder:text-slate-600 font-mono disabled:cursor-not-allowed"
          />
          {loading && <Loader2 className="w-3 h-3 text-slate-500 animate-spin flex-shrink-0" />}
          {query && !loading && (
            <button
              onClick={() => { setQuery(""); setSuggestions([]); }}
              className="text-slate-600 hover:text-slate-300 flex-shrink-0"
              title="지우기"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 자동완성 드롭다운 */}
        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 right-0 bottom-full mb-1 bg-[#0d1117]/98 border border-white/10 rounded-sm overflow-hidden z-20"
              style={{ boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
            >
              {/* 하단 네온 라인 */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

              {suggestions.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto">
                  {suggestions.map((s, i) => (
                    <li key={s.placeId}>
                      <button
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => pickSuggestion(s)}
                        className={cn(
                          "w-full flex items-start gap-2 px-3 py-2 text-left transition-colors border-b border-white/[0.04] last:border-0",
                          i === highlight ? "bg-blue-500/10" : "hover:bg-white/5"
                        )}
                      >
                        <MapPin className={cn(
                          "w-3 h-3 mt-0.5 flex-shrink-0",
                          i === highlight ? "text-blue-400" : "text-slate-600"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-200 truncate leading-tight">{s.primary}</p>
                          {s.secondary && (
                            <p className="text-[9px] font-mono text-slate-500 truncate leading-tight mt-0.5">
                              {s.secondary}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : !loading && query.trim() ? (
                <p className="text-[10px] font-mono text-slate-500 text-center py-3">
                  검색 결과가 없습니다
                </p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FloatPanel>
  );
}
