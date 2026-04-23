import { create } from 'zustand';

// --- Types ---

export type FamilyId = 'north-star' | 'silver-peak' | 'desert-bloom' | 'all';

export interface Family {
  id: FamilyId;
  name: string;
  origin: string;
  shortOrigin: string;
  status: string;
  eta: string;
  driveTime: string;
  headcount: string;
  vehicle: string;
  responsibility: string;
  readiness: number;
  routeSummary: string;
  checklist: { id: string; label: string; done: boolean }[];
}

export interface MapPoint {
  id: string;
  label: string;
  caption: string;
  familyId: FamilyId;
  focusDay: string;
  tone: 'critical' | 'violet' | 'warning' | 'success' | 'muted' | 'info';
  position: { lat: number; lng: number };
}

export interface TripState {
  isMissionActive: boolean;
  activeDay: number;
  families: Family[];
  mapPoints: MapPoint[];

  // Actions
  setMissionActive: (active: boolean) => void;
  setActiveDay: (day: number) => void;
  toggleChecklistItem: (familyId: FamilyId, itemId: string) => void;
}

// --- Mock Data (Adapted from tripData.js) ---

export const MOCK_FAMILIES: Family[] = [];

export const MOCK_POINTS: MapPoint[] = [];

// --- Zustand Store ---

export const useTripStore = create<TripState>((set) => ({
  isMissionActive: false,
  activeDay: 1,
  families: MOCK_FAMILIES,
  mapPoints: MOCK_POINTS,

  setMissionActive: (active) => set({ isMissionActive: active }),
  setActiveDay: (day) => set({ activeDay: day }),

  toggleChecklistItem: (familyId, itemId) =>
    set((state) => ({
      families: state.families.map((fam) =>
        fam.id === familyId
          ? {
              ...fam,
              checklist: fam.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
              ),
            }
          : fam
      ),
    })),
}));
