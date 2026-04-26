"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2, X } from "lucide-react";
import { useItineraryStore } from "@/store/itinerary";
import { cn } from "@/lib/utils";
import { ThemedDatePicker } from "@/components/layout/timeline/ThemedDatePicker";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR");
}

export function TripSelector() {
  const trips = useItineraryStore((s) => s.trips);
  const fetchTrips = useItineraryStore((s) => s.fetchTrips);
  const selectTrip = useItineraryStore((s) => s.selectTrip);
  const createTrip = useItineraryStore((s) => s.createTrip);
  const deleteTrip = useItineraryStore((s) => s.deleteTrip);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStartDate, setNewStartDate] = useState(todayIso());
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTrips()
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [fetchTrips]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || !newStartDate) return;
    setBusy(true);
    try {
      const id = await createTrip(name, newStartDate);
      await selectTrip(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSelect = async (id: number) => {
    setBusy(true);
    try {
      await selectTrip(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    setBusy(true);
    try {
      await deleteTrip(id);
      setConfirmDeleteId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center bg-[#06090e] crt-overlay crt-flicker overflow-hidden">
      <div className="w-full max-w-2xl px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
          <span className="text-[12px] font-mono text-blue-400 tracking-[0.4em] uppercase">
            Trip Advisor
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
        </div>

        <h1 className="text-[22px] font-bold text-white tracking-wide mb-1">여행 선택</h1>
        <p className="text-[11px] font-mono text-slate-500 tracking-wider uppercase mb-6">
          Select a trip to continue, or create a new one
        </p>

        {error && (
          <div className="mb-4 border border-red-500/40 bg-red-500/10 text-red-300 text-[11px] font-mono px-3 py-2 rounded-sm">
            {error}
          </div>
        )}

        {showNewForm ? (
          <div className="mb-4 rounded-sm border border-blue-500/40 bg-[#0d1117] p-4 shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-blue-400 tracking-widest uppercase">
                New Trip
              </span>
              <button
                onClick={() => setShowNewForm(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                placeholder="여행 이름 (예: 도쿄 벚꽃 여행)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") setShowNewForm(false);
                }}
                className="bg-white/5 border border-white/10 text-slate-200 text-[13px] rounded-sm px-2 py-1.5 focus:outline-none focus:border-blue-500/50"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-600 tracking-widest uppercase">
                  시작일
                </span>
                <ThemedDatePicker value={newStartDate} onChange={setNewStartDate} />
              </div>
              <button
                onClick={handleCreate}
                disabled={busy || !newName.trim() || !newStartDate}
                className={cn(
                  "mt-1 flex items-center justify-center gap-1.5 rounded-sm border py-1.5 text-[11px] font-mono tracking-wider uppercase transition-colors",
                  busy || !newName.trim() || !newStartDate
                    ? "border-white/5 bg-white/[0.02] text-slate-600 cursor-not-allowed"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                )}
              >
                {busy ? "Creating…" : "Create & Open"}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-blue-500/40 bg-blue-500/5 py-3 text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/60 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-[12px] font-mono tracking-widest uppercase">새 여행 시작</span>
          </button>
        )}

        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : trips.length === 0 ? (
            <p className="text-center text-[11px] font-mono text-slate-600 py-6 border border-dashed border-slate-800 rounded-sm">
              아직 저장된 여행이 없습니다
            </p>
          ) : (
            trips.map((t) => (
              <div
                key={t.id}
                className="group flex items-center gap-3 rounded-sm border border-white/10 bg-[#0d1117] px-3 py-2.5 hover:border-blue-500/40 hover:bg-white/[0.03] transition-colors"
              >
                <div
                  onClick={() => !busy && handleSelect(t.id)}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-white truncate">{t.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                    <Calendar className="w-2.5 h-2.5" />
                    <span>{t.start_date}</span>
                    <span className="text-slate-700">·</span>
                    <span>{t.day_count}일</span>
                    <span className="text-slate-700">·</span>
                    <span>업데이트 {formatUpdatedAt(t.updated_at)}</span>
                  </div>
                </div>
                {confirmDeleteId === t.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={busy}
                      onClick={() => handleDelete(t.id)}
                      className="text-[10px] font-mono text-red-400 border border-red-500/40 bg-red-500/10 px-2 py-1 rounded-sm hover:bg-red-500/20"
                    >
                      삭제
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[10px] font-mono text-slate-400 border border-white/10 px-2 py-1 rounded-sm hover:bg-white/5"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(t.id)}
                    title="삭제"
                    className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
