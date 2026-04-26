"use client";

import { useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import MapView from "@/components/map/MapView";
import { NavModule, PropertiesModule, TimelineModule } from "@/components/layout/ControlPanels";
import { NodeMarkerModule } from "@/components/layout/NodeMarkerModule";
import { SearchModule } from "@/components/layout/SearchModule";
import { TripSelector } from "@/components/TripSelector";
import { useItineraryStore } from "@/store/itinerary";
import { useTripPersistence } from "@/hooks/useTripPersistence";

export type ActiveTab = "locations" | "routes" | "budget";

export type SelectedNode = {
  id: string;
  name: string;
  type: string;
  description: string;
} | null;

// 앱 전체에서 단 한 번만 로드 — 싱글톤 충돌 방지
const GOOGLE_MAPS_LIBRARIES: ("places" | "geometry")[] = ["places", "geometry"];

export default function Home() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const currentTripId = useItineraryStore((s) => s.currentTripId);

  useTripPersistence();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: "ko",
    region: "KR",
  });

  if (currentTripId === null) {
    return <TripSelector />;
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background crt-overlay crt-flicker">
      {/* 배경 지도 */}
      <div className="absolute inset-0 z-0">
        <MapView onNodeSelect={setSelectedNode} isLoaded={isLoaded} loadError={!!loadError} />
      </div>

      {/* 좌측 상단 — 네비게이션 모듈 */}
      <div className="absolute top-4 left-4 z-10">
        <NavModule />
      </div>

      {/* 상단 중앙 — 검색 모듈 */}
      <div className="absolute top-4 left-1/2 z-20 w-[min(720px,calc(100vw-2rem))] -translate-x-1/2">
        <SearchModule isLoaded={isLoaded} />
      </div>

      {/* 우측 상단 — 속성 패널 + 북마크 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <PropertiesModule selectedNode={selectedNode} />
        <NodeMarkerModule />
      </div>

      {/* 하단 중앙 — 타임라인 모듈 */}
      <div
        data-map-focus-obstruction="bottom"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 w-[min(1440px,calc(100vw-2rem))] flex flex-col gap-2"
      >
        <TimelineModule />
      </div>
    </div>
  );
}
