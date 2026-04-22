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

const PUBLIC_BASECAMP_COORDINATES = { lat: 37.8586, lng: -120.2142 };

export const MOCK_FAMILIES: Family[] = [
  {
    id: 'north-star',
    name: 'Parkers',
    origin: 'Los Angeles',
    shortOrigin: 'LA',
    status: 'Transit',
    eta: 'Thu 4:00 PM',
    driveTime: '5.5 hrs',
    headcount: '2 adults, 1 kid',
    vehicle: 'SUV',
    responsibility: 'Firewood + snacks',
    readiness: 82,
    routeSummary: 'Single-leg drive from LA to Pine Mountain Lake',
    checklist: [
      { id: 'car-pack', label: 'Car packed night before', done: true },
      { id: 'kid-bag', label: 'Kid activity bag loaded', done: true },
      { id: 'groceries', label: 'Road snacks secured', done: false },
      { id: 'firewood', label: 'Pickup firewood on arrival', done: false },
    ],
  },
  {
    id: 'silver-peak',
    name: 'Jiangs',
    origin: 'San Francisco',
    shortOrigin: 'SF',
    status: 'Transit',
    eta: 'Thu 4:00 PM',
    driveTime: '3.5 hrs',
    headcount: '2 adults, 1 kid',
    vehicle: 'SUV',
    responsibility: 'Coolers + breakfast fruit',
    readiness: 88,
    routeSummary: 'Short Bay Area drive with a quick Oakdale reset before Pine Mountain Lake',
    checklist: [
      { id: 'lake-gear', label: 'Lake towels and floaties', done: true },
      { id: 'breakfast', label: 'Breakfast fruit packed', done: true },
      { id: 'kids-shoes', label: 'Backup shoes for kid', done: false },
      { id: 'charger', label: 'Portable charger packed', done: true },
    ],
  },
  {
    id: 'desert-bloom',
    name: 'Riveras',
    origin: 'Reno',
    shortOrigin: 'RN',
    status: 'Friday Arrival',
    eta: 'Fri 1:00 PM',
    driveTime: '5 hrs',
    headcount: '2 adults, 1 kid',
    vehicle: 'SUV',
    responsibility: 'Grill kit + Saturday lunch',
    readiness: 71,
    routeSummary: 'Friday arrival from Reno straight into Pine Mountain Lake',
    checklist: [
      { id: 'late-arrival', label: 'Friday arrival window confirmed', done: true },
      { id: 'grill-kit', label: 'Grill kit packed', done: false },
      { id: 'yosemite-daypack', label: 'Yosemite daypacks staged', done: false },
      { id: 'park-pass', label: 'Park entry docs confirmed', done: true },
    ],
  },
];

export const MOCK_POINTS: MapPoint[] = [
  { id: 'sf-silver-peak', label: 'Jiangs', caption: 'San Francisco', familyId: 'silver-peak', focusDay: 'thursday', tone: 'critical', position: { lat: 37.7855, lng: -122.4068 } },
  { id: 'sf-desert-bloom', label: 'Riveras', caption: 'Reno', familyId: 'desert-bloom', focusDay: 'friday', tone: 'violet', position: { lat: 39.5296, lng: -119.8138 } },
  { id: 'la-north-star', label: 'Parkers', caption: 'Los Angeles', familyId: 'north-star', focusDay: 'thursday', tone: 'warning', position: { lat: 34.0522, lng: -118.2437 } },
  { id: 'pine-mountain-lake', label: 'Basecamp', caption: 'Pine Mountain Lake', familyId: 'all', focusDay: 'all', tone: 'success', position: PUBLIC_BASECAMP_COORDINATES },
  { id: 'yosemite', label: 'Yosemite', caption: 'Primary target', familyId: 'all', focusDay: 'saturday', tone: 'muted', position: { lat: 37.8651, lng: -119.5383 } },
];

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
