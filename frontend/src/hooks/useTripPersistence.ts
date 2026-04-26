"use client";

import { useEffect, useRef } from "react";
import { useItineraryStore } from "@/store/itinerary";

const SAVE_DEBOUNCE_MS = 700;

const TRIPS_API_URL =
  process.env.NEXT_PUBLIC_TRIPS_API_URL ?? "http://localhost:8000/api/trips/";

export function useTripPersistence() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTripIdRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = useItineraryStore.subscribe((state, prev) => {
      if (!state.isHydrated || state.currentTripId === null) return;

      const unchanged =
        state.days === prev.days &&
        state.cities === prev.cities &&
        state.itinerary === prev.itinerary &&
        state.startDate === prev.startDate &&
        state.bookmarks === prev.bookmarks &&
        state.mapAreas === prev.mapAreas &&
        state.cityStyleKeys === prev.cityStyleKeys &&
        state.mapCamera === prev.mapCamera &&
        state.timelineView === prev.timelineView &&
        state.activeDay === prev.activeDay &&
        state.routeSelectedDays === prev.routeSelectedDays &&
        state.routeSelectedLocationKeys === prev.routeSelectedLocationKeys;
      if (unchanged) return;

      pendingTripIdRef.current = state.currentTripId;

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const current = useItineraryStore.getState();
        if (
          current.currentTripId === null ||
          current.currentTripId !== pendingTripIdRef.current
        ) {
          return;
        }
        const body = {
          start_date: current.startDate,
          days: current.days,
          cities: current.cities,
          itinerary: current.itinerary,
          bookmarks: current.bookmarks,
          mapAreas: current.mapAreas,
          cityStyleKeys: current.cityStyleKeys,
          mapCamera: current.mapCamera,
          uiState: {
            timelineView: current.timelineView,
            activeDay: current.activeDay,
            routeSelectedDays: current.routeSelectedDays,
            routeSelectedLocationKeys: current.routeSelectedLocationKeys,
          },
        };
        fetch(`${TRIPS_API_URL}${current.currentTripId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).catch((err) => {
          console.error("trip save failed", err);
        });
      }, SAVE_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
