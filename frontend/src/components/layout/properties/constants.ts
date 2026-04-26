import type { ElementType } from "react";
import { Bed, Camera, Footprints, Train, Utensils } from "lucide-react";
import type { LocationCategory } from "@/data/itinerary";

export const CATEGORY_ICON: Record<LocationCategory, ElementType> = {
  HOTEL: Bed,
  SIGHT: Camera,
  FOOD: Utensils,
  TRANSIT: Train,
  WALK: Footprints,
};
