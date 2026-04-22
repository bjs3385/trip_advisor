"use client";

import { useState } from "react";
import MapView from "@/components/map/MapView";
import { NavModule, PropertiesModule, TimelineModule } from "@/components/layout/ControlPanels";

export type ActiveTab = "locations" | "routes" | "budget";

export type SelectedNode = {
  id: string;
  name: string;
  type: string;
  description: string;
} | null;

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("locations");
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [activeDay, setActiveDay] = useState(1);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-slate-950">
      {/* 배경 지도 */}
      <div className="absolute inset-0 z-0">
        <MapView onNodeSelect={setSelectedNode} />
      </div>

      {/* 좌측 상단 — 네비게이션 모듈 */}
      <div className="absolute top-4 left-4 z-10">
        <NavModule activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* 우측 상단 — 속성 패널 모듈 */}
      <div className="absolute top-4 right-4 z-10">
        <PropertiesModule selectedNode={selectedNode} />
      </div>

      {/* 하단 중앙 — 타임라인 모듈 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(720px,calc(100vw-2rem))]">
        <TimelineModule activeDay={activeDay} setActiveDay={setActiveDay} />
      </div>
    </div>
  );
}
