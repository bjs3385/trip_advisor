"use client";

import { Bookmark, GripVertical, MapPin, Star, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { useItineraryStore } from "@/store/itinerary";
import { BOOKMARK_DRAG_MIME } from "@/components/layout/timeline/utils";

export function NodeMarkerModule() {
  const bookmarks = useItineraryStore((s) => s.bookmarks);
  const removeBookmark = useItineraryStore((s) => s.removeBookmark);
  const setSearchTarget = useItineraryStore((s) => s.setSearchTarget);

  return (
    <FloatPanel className="w-64" delay={0.3}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim/80 bg-black/20">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
          <p className="text-[10px] font-mono text-amber-400 uppercase tracking-widest">
            NODE MARKER
          </p>
        </div>
        <span className="text-[9px] font-mono text-slate-500 tracking-widest">
          {String(bookmarks.length).padStart(2, "0")}
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto scrollbar-hide">
        {bookmarks.length === 0 ? (
          <div className="px-4 py-4 text-center">
            <p className="text-[10px] font-mono text-slate-600 tracking-wider">
              POI 팝업에서 북마크를 추가하세요
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {bookmarks.map((bm) => (
              <motion.div
                key={bm.placeId}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="border-b border-white/[0.04] last:border-b-0"
              >
                <div
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(BOOKMARK_DRAG_MIME, bm.placeId);
                    e.dataTransfer.setData("text/plain", bm.name);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className="group flex items-start gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors cursor-grab active:cursor-grabbing"
                  title="간트로 끌어서 일정에 추가"
                >
                <GripVertical className="w-2.5 h-2.5 text-slate-700 group-hover:text-slate-500 mt-1 shrink-0 transition-colors" />
                <button
                  onClick={() =>
                    setSearchTarget({
                      position: bm.position,
                      placeId: bm.placeId,
                      name: bm.name,
                      address: bm.address,
                      type: bm.type,
                      rating: bm.rating,
                    })
                  }
                  className="flex-1 min-w-0 text-left"
                  title="지도에서 보기"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Bookmark className="w-2.5 h-2.5 text-amber-400 fill-amber-400/30 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-200 truncate">
                      {bm.name || "—"}
                    </span>
                  </div>
                  {bm.type && (
                    <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest block">
                      {bm.type.replace(/_/g, " ")}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    {bm.rating !== undefined && (
                      <span className="flex items-center gap-0.5 text-[9px] font-mono text-yellow-400">
                        <Star className="w-2 h-2 fill-yellow-400" />
                        {bm.rating.toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-[9px] font-mono text-slate-600">
                      <MapPin className="w-2 h-2" />
                      {bm.position.lat.toFixed(3)}, {bm.position.lng.toFixed(3)}
                    </span>
                  </div>
                </button>
                <button
                  onClick={() => removeBookmark(bm.placeId)}
                  title="북마크 제거"
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </FloatPanel>
  );
}
