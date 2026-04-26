import type { ElementType } from "react";
import type { LocationCategory } from "@/data/itinerary";

export type RouteMode = "WALK" | "TRANSIT" | null;

export type PlacePopup = {
  position: google.maps.LatLngLiteral;
  name: string;
  address?: string;
  type?: string;
  rating?: number;
  placeId: string;
};

export type AddButtonConfig = {
  cat: LocationCategory;
  label: string;
  Icon: ElementType;
};

export type GroupInfo = {
  dayStr: string;
  groupKey: string;
  color: string;
  memberIds: string[];
  centroid: google.maps.LatLngLiteral;
  boundingRadiusMeters: number;
  shapeVertices: google.maps.LatLngLiteral[];
};
