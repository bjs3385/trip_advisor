import type { ElementType } from "react";
import { Bed, Camera, Footprints, MapPin, Route, Train, Utensils, Wallet } from "lucide-react";
import type { ActiveTab } from "@/app/page";
import type { LocationCategory } from "@/data/itinerary";

export const NAV_ITEMS: {
  id: ActiveTab;
  icon: ElementType;
  label: string;
  color: string;
  activeBg: string;
}[] = [
  { id: "locations", icon: MapPin, label: "LOCATIONS", color: "text-emerald-400", activeBg: "bg-emerald-400/10" },
  { id: "routes", icon: Route, label: "ROUTES", color: "text-blue-400", activeBg: "bg-blue-400/10" },
  { id: "budget", icon: Wallet, label: "BUDGET", color: "text-purple-400", activeBg: "bg-purple-400/10" },
];

export const CATEGORY_ICON: Record<LocationCategory, ElementType> = {
  HOTEL: Bed,
  SIGHT: Camera,
  FOOD: Utensils,
  TRANSIT: Train,
  WALK: Footprints,
};
