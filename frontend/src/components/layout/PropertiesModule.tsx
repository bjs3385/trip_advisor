"use client";

import { AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import type { SelectedNode } from "@/app/page";
import { CITY_INFO, getCityStyle } from "@/data/itinerary";
import { useItineraryStore } from "@/store/itinerary";
import { CityInspectorView } from "./properties/CityInspectorView";
import { EmptyInspectorView } from "./properties/EmptyInspectorView";
import { InspectorHeader } from "./properties/InspectorHeader";
import { LocationInspectorView } from "./properties/LocationInspectorView";

interface PropertiesModuleProps {
  selectedNode: SelectedNode;
}

export function PropertiesModule({ selectedNode }: PropertiesModuleProps) {
  void selectedNode;

  const itinerary = useItineraryStore((s) => s.itinerary);
  const days = useItineraryStore((s) => s.days);
  const selectedLocation = useItineraryStore((s) => s.selectedLocation);
  const selectedMapCity = useItineraryStore((s) => s.selectedMapCity);
  const cityStyleKeys = useItineraryStore((s) => s.cityStyleKeys);

  const selectedLoc = selectedLocation
    ? itinerary[selectedLocation.day]?.locations.find(
        (l) => l.id === selectedLocation.locationId
      ) ?? null
    : null;

  const selectedDay = selectedLocation
    ? days.find((d) => d.day === selectedLocation.day)
    : null;

  const relatedBudget = selectedLoc && selectedLocation
    ? itinerary[selectedLocation.day]?.budget.filter(
        (b) => b.category === selectedLoc.category
      )
    : [];

  const cityInfo = selectedMapCity ? CITY_INFO[selectedMapCity] : null;
  const cityStyle = selectedMapCity ? getCityStyle(cityStyleKeys[selectedMapCity] ?? selectedMapCity) : null;
  const cityDays = selectedMapCity
    ? days.filter((d) => d.city === selectedMapCity)
    : [];
  const cityLocCount = cityDays.reduce(
    (acc, d) => acc + (itinerary[d.day]?.locations.length ?? 0), 0
  );

  const mode = selectedLoc ? "location" : cityInfo ? "city" : "empty";

  return (
    <FloatPanel className="w-64" delay={0.2}>
      <InspectorHeader
        mode={mode}
        locationCategory={selectedLoc?.category}
        cityStyle={cityStyle}
      />

      <div className="p-4 min-h-[140px]">
        <AnimatePresence mode="wait">
          {mode === "location" && selectedLoc && (
            <LocationInspectorView
              selectedLoc={selectedLoc}
              selectedDay={selectedDay ?? null}
              relatedBudget={relatedBudget}
            />
          )}

          {mode === "city" && cityInfo && cityStyle && (
            <CityInspectorView
              selectedMapCity={selectedMapCity ?? ""}
              cityInfo={cityInfo}
              cityStyle={cityStyle}
              cityDays={cityDays}
              cityLocCount={cityLocCount}
            />
          )}

          {mode === "empty" && <EmptyInspectorView />}
        </AnimatePresence>
      </div>
    </FloatPanel>
  );
}
