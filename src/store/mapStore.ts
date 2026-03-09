import { create } from 'zustand';
import type { Map as LeafletMap } from 'leaflet';

interface MapState {
  mapInstance: LeafletMap | null;
  setMapInstance: (map: LeafletMap | null) => void;
}

export const useMapStore = create<MapState>((set) => ({
  mapInstance: null,
  setMapInstance: (map) => set({ mapInstance: map }),
}));
