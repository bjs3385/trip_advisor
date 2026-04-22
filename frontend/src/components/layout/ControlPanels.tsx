"use client";

import { MapPin, Route, Wallet, Activity, Calendar, ChevronLeft, ChevronRight, Hotel, Clock, Banknote, Tag } from "lucide-react";
import { useEffect, useRef } from "react";
import { ActiveTab, SelectedNode } from "@/app/page";

// ─── 공통 플로팅 패널 래퍼 ─────────────────────────────────────────────────
function FloatPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-xl shadow-2xl ${className}`}
    >
      {children}
    </div>
  );
}

// ─── 모듈 1: 좌측 상단 네비게이션 ────────────────────────────────────────────
const NAV_ITEMS: {
  id: ActiveTab;
  icon: React.ElementType;
  label: string;
  color: string;
  activeRing: string;
}[] = [
  { id: "locations", icon: MapPin, label: "장소", color: "text-emerald-400", activeRing: "bg-emerald-400/15 ring-1 ring-emerald-400/40" },
  { id: "routes",    icon: Route,  label: "동선", color: "text-blue-400",    activeRing: "bg-blue-400/15 ring-1 ring-blue-400/40" },
  { id: "budget",    icon: Wallet, label: "예산", color: "text-purple-400",  activeRing: "bg-purple-400/15 ring-1 ring-purple-400/40" },
];

interface NavModuleProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function NavModule({ activeTab, setActiveTab }: NavModuleProps) {
  return (
    <FloatPanel>
      {/* 로고 영역 */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3.5 pb-3 border-b border-slate-700/50">
        <div className="relative w-7 h-7 rounded-lg bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center flex-shrink-0">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold text-white leading-none">Trip Advisor</p>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">Japan_2026</p>
        </div>
      </div>

      {/* 세로형 탭 아이콘 바 */}
      <div className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ id, icon: Icon, label, color, activeRing }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all ${
                isActive ? activeRing : "hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
              <span className={`text-xs font-medium ${isActive ? "text-white" : "text-slate-400"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </FloatPanel>
  );
}

// ─── 모듈 2: 우측 상단 속성 패널 ─────────────────────────────────────────────
interface PropertiesModuleProps {
  selectedNode: SelectedNode;
}

const NODE_DETAIL_MOCK: Record<string, { icon: React.ElementType; label: string; value: string }[]> = {
  tokyo:     [
    { icon: Hotel,   label: "숙소",   value: "시부야 스트림 엑셀 호텔" },
    { icon: Clock,   label: "체류",   value: "3박 4일" },
    { icon: Banknote, label: "예산",  value: "¥ 42,000" },
    { icon: Tag,     label: "태그",   value: "쇼핑, 음식, 문화" },
  ],
  kyoto:     [
    { icon: Hotel,   label: "숙소",   value: "료칸 니시야마 소안" },
    { icon: Clock,   label: "체류",   value: "2박 3일" },
    { icon: Banknote, label: "예산",  value: "¥ 38,000" },
    { icon: Tag,     label: "태그",   value: "전통, 사찰, 자연" },
  ],
  default:   [
    { icon: Clock,   label: "체류",   value: "1박 2일" },
    { icon: Banknote, label: "예산",  value: "¥ 20,000" },
  ],
};

export function PropertiesModule({ selectedNode }: PropertiesModuleProps) {
  const details = selectedNode
    ? (NODE_DETAIL_MOCK[selectedNode.id] ?? NODE_DETAIL_MOCK.default)
    : null;

  return (
    <FloatPanel className="w-64">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-blue-400" />
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            Properties
          </p>
        </div>
        {selectedNode && (
          <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
            {selectedNode.type}
          </span>
        )}
      </div>

      {/* 내용 */}
      <div className="p-3.5">
        {selectedNode && details ? (
          <>
            <p className="text-sm font-semibold text-white mb-3">{selectedNode.name}</p>
            <div className="flex flex-col gap-2.5">
              {details.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-mono text-slate-500">{label}</p>
                    <p className="text-xs text-slate-200 mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <MapPin className="w-5 h-5 text-slate-700" />
            <p className="text-[11px] font-mono text-slate-600 text-center leading-relaxed">
              지도에서 노드를 선택하면<br />속성이 표시됩니다
            </p>
          </div>
        )}
      </div>
    </FloatPanel>
  );
}

// ─── 모듈 3: 하단 중앙 타임라인 ──────────────────────────────────────────────
const DAYS = [
  { day: 1, label: "4/28", city: "도쿄", note: "입국 · 시부야" },
  { day: 2, label: "4/29", city: "도쿄", note: "아사쿠사 · 스카이트리" },
  { day: 3, label: "4/30", city: "도쿄", note: "하라주쿠 · 신주쿠" },
  { day: 4, label: "5/01", city: "교토", note: "이동 · 후시미 이나리" },
  { day: 5, label: "5/02", city: "교토", note: "아라시야마 · 긴카쿠지" },
  { day: 6, label: "5/03", city: "오사카", note: "이동 · 도톤보리" },
  { day: 7, label: "5/04", city: "나라", note: "나라 공원 · 도다이지" },
  { day: 8, label: "5/05", city: "오사카", note: "우메다 · 귀국" },
];

interface TimelineModuleProps {
  activeDay: number;
  setActiveDay: (day: number) => void;
}

export function TimelineModule({ activeDay, setActiveDay }: TimelineModuleProps) {
  const prev = () => setActiveDay(Math.max(1, activeDay - 1));
  const next = () => setActiveDay(Math.min(DAYS.length, activeDay + 1));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const activeBtn = container.querySelector<HTMLButtonElement>("[data-active='true']");
    activeBtn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeDay]);

  return (
    <FloatPanel>
      <div className="px-4 py-3 flex items-center gap-3">
        {/* 레이블 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest whitespace-nowrap">
            Timeline
          </p>
        </div>

        <div className="w-px h-5 bg-slate-700" />

        {/* 이전 버튼 */}
        <button
          onClick={prev}
          disabled={activeDay === 1}
          className="p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {/* 일자 스크롤 */}
        <div ref={scrollRef} className="flex items-center gap-1.5 overflow-x-auto flex-1 scrollbar-hide">
          {DAYS.map(({ day, label, city, note }) => {
            const isActive = activeDay === day;
            return (
              <button
                key={day}
                data-active={isActive}
                onClick={() => setActiveDay(day)}
                className={`flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-blue-500/20 ring-1 ring-blue-400/50"
                    : "hover:bg-slate-800/80"
                }`}
              >
                <span className={`text-[10px] font-mono ${isActive ? "text-blue-300" : "text-slate-500"}`}>
                  {label}
                </span>
                <span className={`text-xs font-semibold leading-tight ${isActive ? "text-white" : "text-slate-400"}`}>
                  {city}
                </span>
                <span className="text-[9px] text-slate-600 whitespace-nowrap max-w-[72px] truncate">
                  {note}
                </span>
              </button>
            );
          })}
        </div>

        {/* 다음 버튼 */}
        <button
          onClick={next}
          disabled={activeDay === DAYS.length}
          className="p-1 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <div className="w-px h-5 bg-slate-700" />

        {/* 현재 일자 뱃지 */}
        <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-mono text-slate-500">Day</span>
          <span className="text-sm font-bold text-white font-mono leading-none">
            {String(activeDay).padStart(2, "0")}
          </span>
        </div>
      </div>
    </FloatPanel>
  );
}
