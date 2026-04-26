"use client";

import { Bookmark, BookmarkCheck, CalendarPlus, Check, Loader2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SearchSuggestion } from "./searchTypes";

interface SearchDropdownProps {
  open: boolean;
  loading: boolean;
  query: string;
  suggestions: SearchSuggestion[];
  highlight: number;
  bookmarkedPlaceIds: Set<string>;
  bookmarkingPlaceId: string | null;
  schedulingPlaceId: string | null;
  scheduledPlaceId: string | null;
  onHover: (index: number) => void;
  onPick: (suggestion: SearchSuggestion) => void;
  onAddBookmark: (suggestion: SearchSuggestion) => void;
  onAddSchedule: (suggestion: SearchSuggestion) => void;
}

export function SearchDropdown({
  open,
  loading,
  query,
  suggestions,
  highlight,
  bookmarkedPlaceIds,
  bookmarkingPlaceId,
  schedulingPlaceId,
  scheduledPlaceId,
  onHover,
  onPick,
  onAddBookmark,
  onAddSchedule,
}: SearchDropdownProps) {
  const showDropdown = open && (loading || suggestions.length > 0 || (query.trim() && !loading));

  return (
    <AnimatePresence>
      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.12 }}
          className="absolute left-0 right-0 top-full mt-1 bg-[#0d1117]/98 border border-white/10 rounded-sm overflow-hidden z-20"
          style={{ boxShadow: "0 0 24px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

          {suggestions.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <li key={suggestion.placeId}>
                  <div
                    onMouseEnter={() => onHover(index)}
                    className={cn(
                      "flex items-stretch gap-1 border-b border-white/[0.04] transition-colors last:border-0",
                      index === highlight ? "bg-blue-500/10" : "hover:bg-white/5"
                    )}
                  >
                    <button
                      onClick={() => onPick(suggestion)}
                      className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2 text-left"
                    >
                      <MapPin
                        className={cn(
                          "w-3 h-3 mt-0.5 flex-shrink-0",
                          index === highlight ? "text-blue-400" : "text-slate-600"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-slate-200 truncate leading-tight">
                          {suggestion.primary}
                        </p>
                        {suggestion.secondary && (
                          <p className="text-[13px] font-mono text-slate-500 truncate leading-tight mt-0.5">
                            {suggestion.secondary}
                          </p>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddBookmark(suggestion);
                      }}
                      disabled={bookmarkedPlaceIds.has(suggestion.placeId) || bookmarkingPlaceId === suggestion.placeId}
                      title={bookmarkedPlaceIds.has(suggestion.placeId) ? "이미 노드 마커에 추가됨" : "노드 마커에 추가"}
                      className={cn(
                        "m-1 flex w-8 flex-shrink-0 items-center justify-center rounded-sm border transition-colors",
                        bookmarkedPlaceIds.has(suggestion.placeId)
                          ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                          : "border-white/10 bg-white/5 text-slate-500 hover:border-amber-400/40 hover:text-amber-300",
                        bookmarkingPlaceId === suggestion.placeId && "cursor-wait"
                      )}
                    >
                      {bookmarkingPlaceId === suggestion.placeId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : bookmarkedPlaceIds.has(suggestion.placeId) ? (
                        <BookmarkCheck className="h-3 w-3 fill-amber-300/20" />
                      ) : (
                        <Bookmark className="h-3 w-3" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddSchedule(suggestion);
                      }}
                      disabled={schedulingPlaceId === suggestion.placeId}
                      title="활성 Day 일정 마지막에 추가"
                      className={cn(
                        "my-1 mr-1 flex w-8 flex-shrink-0 items-center justify-center rounded-sm border transition-colors",
                        scheduledPlaceId === suggestion.placeId
                          ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                          : "border-white/10 bg-white/5 text-slate-500 hover:border-emerald-400/40 hover:text-emerald-300",
                        schedulingPlaceId === suggestion.placeId && "cursor-wait"
                      )}
                    >
                      {schedulingPlaceId === suggestion.placeId ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : scheduledPlaceId === suggestion.placeId ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <CalendarPlus className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loading && query.trim() ? (
            <p className="text-[14px] font-mono text-slate-500 text-center py-3">
              검색 결과가 없습니다
            </p>
          ) : null}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
