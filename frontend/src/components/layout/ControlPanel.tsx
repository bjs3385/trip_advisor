"use client";

import { MapPin, Route, Wallet, Settings, ChevronRight, Activity } from "lucide-react";
import { ActiveTab, SelectedNode } from "@/app/page";

interface ControlPanelProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedNode: SelectedNode;
}

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    id: "locations",
    label: "장소 노드",
    sublabel: "Locations",
    icon: MapPin,
    color: "text-emerald-400",
    activeColor: "text-emerald-300",
    activeBg: "bg-emerald-400/10 border-emerald-400/30",
  },
  {
    id: "routes",
    label: "이동 경로",
    sublabel: "Routes",
    icon: Route,
    color: "text-blue-400",
    activeColor: "text-blue-300",
    activeBg: "bg-blue-400/10 border-blue-400/30",
  },
  {
    id: "budget",
    label: "예산 분석",
    sublabel: "Budget",
    icon: Wallet,
    color: "text-purple-400",
    activeColor: "text-purple-300",
    activeBg: "bg-purple-400/10 border-purple-400/30",
  },
];

const PLACEHOLDER_NODES = [
  { id: "tokyo", name: "도쿄", type: "도시", status: "active" },
  { id: "kyoto", name: "교토", type: "고도", status: "active" },
  { id: "osaka", name: "오사카", type: "도시", status: "active" },
  { id: "nara", name: "나라", type: "고도", status: "pending" },
  { id: "hiroshima", name: "히로시마", type: "도시", status: "pending" },
];

export default function ControlPanel({
  activeTab,
  setActiveTab,
  selectedNode,
}: ControlPanelProps) {
  return (
    <div className="h-full w-full backdrop-blur-md bg-slate-900/90 border-r border-slate-700/60 flex flex-col">

      {/* 헤더 */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-700/60">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/30">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Trip Advisor</h1>
              <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">
                Japan_2026 Controller
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-400/10 border border-emerald-400/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
          </div>
        </div>
      </div>

      {/* 내비게이션 탭 */}
      <div className="px-3 py-3 border-b border-slate-700/60 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                isActive
                  ? `${item.activeBg} border-opacity-100`
                  : "border-transparent hover:bg-slate-800/60"
              }`}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 ${isActive ? item.activeColor : item.color}`}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isActive ? "text-white" : "text-slate-300"}`}>
                  {item.label}
                </p>
                <p className="text-[10px] font-mono text-slate-500">{item.sublabel}</p>
              </div>
              <ChevronRight
                className={`w-3 h-3 transition-opacity ${isActive ? "opacity-100 text-slate-400" : "opacity-0"}`}
              />
            </button>
          );
        })}
      </div>

      {/* 노드 목록 */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-2">
          Node Registry — {PLACEHOLDER_NODES.length} entries
        </p>
        <div className="flex flex-col gap-1">
          {PLACEHOLDER_NODES.map((node) => (
            <div
              key={node.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/60 cursor-pointer group transition-colors"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  node.status === "active" ? "bg-emerald-400" : "bg-slate-600"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{node.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{node.type}</p>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
      </div>

      {/* 선택된 노드 인스펙터 */}
      <div className="px-3 py-3 border-t border-slate-700/60">
        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest px-2 mb-2">
          Node Inspector
        </p>
        <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 px-3 py-3 min-h-[80px]">
          {selectedNode ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{selectedNode.name}</p>
                <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">
                  {selectedNode.type}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{selectedNode.description}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-1">id: {selectedNode.id}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[56px]">
              <p className="text-xs font-mono text-slate-600">지도에서 노드를 선택하세요</p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 설정 버튼 */}
      <div className="px-3 pb-4 pt-1">
        <button className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border border-slate-700/60 hover:bg-slate-800/60 transition-colors group">
          <Settings className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
            시스템 설정
          </span>
        </button>
      </div>
    </div>
  );
}
