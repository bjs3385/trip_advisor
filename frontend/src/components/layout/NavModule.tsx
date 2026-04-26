"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FloatPanel } from "@/components/ui/FloatPanel";
import { useItineraryStore } from "@/store/itinerary";
import { BudgetTab } from "./nav/BudgetTab";
import { LocationsTab } from "./nav/LocationsTab";
import { NavHeader } from "./nav/NavHeader";
import { NavTabs } from "./nav/NavTabs";
import { RoutesTab } from "./nav/RoutesTab";

export function NavModule() {
  const activeTab = useItineraryStore((s) => s.activeTab);
  const setActiveTab = useItineraryStore((s) => s.setActiveTab);
  const activeDay = useItineraryStore((s) => s.activeDay);
  const itinerary = useItineraryStore((s) => s.itinerary);
  const day = itinerary[activeDay] ?? itinerary[1] ?? { locations: [], routes: [], budget: [] };

  return (
    <FloatPanel delay={0.1}>
      <NavHeader />

      <NavTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`${activeTab}-${activeDay}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, position: "absolute" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex flex-col overflow-y-auto scrollbar-hide w-full"
            style={{ maxHeight: 256 }}
          >
            {activeTab === "locations" && <LocationsTab locations={day.locations} />}
            {activeTab === "routes" && <RoutesTab routes={day.routes} />}
            {activeTab === "budget" && <BudgetTab budget={day.budget} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </FloatPanel>
  );
}
