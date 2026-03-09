import { create } from 'zustand';

interface FilterState {
  timeRange: [Date, Date] | null;
  threatTypes: string[];
  regions: string[];
  reliabilityScores: ('A' | 'B' | 'C')[];
  setTimeRange: (range: [Date, Date] | null) => void;
  setThreatTypes: (types: string[]) => void;
  setRegions: (regions: string[]) => void;
  setReliabilityScores: (scores: ('A' | 'B' | 'C')[]) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  timeRange: null,
  threatTypes: [],
  regions: [],
  reliabilityScores: [],
  setTimeRange: (range) => set({ timeRange: range }),
  setThreatTypes: (types) => set({ threatTypes: types }),
  setRegions: (regions) => set({ regions }),
  setReliabilityScores: (scores) => set({ reliabilityScores: scores }),
  resetFilters: () =>
    set({
      timeRange: null,
      threatTypes: [],
      regions: [],
      reliabilityScores: [],
    }),
}));
