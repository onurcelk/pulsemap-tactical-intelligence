import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
  LayersControl,
  Polyline,
} from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { MapEvent, EventCategory, StrategicAsset, LiveAircraft, LiveShip } from '../types';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, ExternalLink } from 'lucide-react';

// FIX: Leaflet default icon broken in Vite — must be set explicitly
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

const CATEGORY_COLORS: Record<EventCategory, string> = {
  military: '#ef4444',
  explosion: '#f97316',
  protest: '#3b82f6',
  politics: '#a855f7',
  humanitarian: '#10b981',
  other: '#6b7280',
};

// Tactical Inline SVG Icons
const CATEGORY_ICON_SVG: Record<EventCategory, string> = {
  // Crosshair / target — clearly "military operation", not generic shield
  military: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
  // Flame / fire — unmistakably an explosion or strike
  explosion: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  // Crowd / megaphone fist — protest, demo, march
  protest: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  // Landmark / columns — government, politics
  politics: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  // Heart — care, aid
  humanitarian: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  other: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

const STRATEGIC_ICON_SVG: Record<string, string> = {
  // Classic radioactive trefoil — unmistakably nuclear
  nuclear: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M12 4a8 8 0 0 1 6.93 4H5.07A8 8 0 0 1 12 4z" fill="white" stroke="none"/><path d="M5.07 8A8 8 0 0 0 4 12a8 8 0 0 0 4.54 7.17L6.27 14a4 4 0 0 1-.27-2z" fill="white" stroke="none"/><path d="M18.93 8A8 8 0 0 1 20 12a8 8 0 0 1-4.54 7.17L17.73 14a4 4 0 0 0 .27-2z" fill="white" stroke="none"/></svg>`,
  // Crosshair for military bases/installations
  military: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>`,
  chokepoint: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 8-4 4 4 4 4-4-4-4Z"/></svg>`,
  space: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.71-2.13.71-2.13l-4.42-4.42S3.66 15.66 4.5 16.5z"/><path d="M12 5l-9 9"/><path d="M22 2c-3.11 0-7.33 1.11-10.44 4.22a16.5 16.5 0 0 0-3.69 11.44c1.11 1.11 2.22 1.11 3.33 0s1.11-2.22 0-3.33c-1.11-1.11-1.11-2.22 0-3.33s2.22-1.11 3.33 0a16.5 16.5 0 0 0 11.44-3.69C20.89 9.33 22 5.11 22 2z"/></svg>`,
  oil: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 18.5a4.5 4.5 0 0 1 4.5-4.5h.5a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-.5a4.5 4.5 0 0 1-4.5-4.5V4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v1.5a4.5 4.5 0 0 1-4.5 4.5H4a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.5a4.5 4.5 0 0 1 4.5 4.5V20a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1.5z"/></svg>`,
  mining: `<svg xmlns="http://www.w3.org/2000/svg" width="{{S}}" height="{{S}}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>`,
};

const STRATEGIC_COLORS: Record<string, string> = {
  nuclear: '#facc15', // Yellow
  military: '#6366f1', // Indigo
  chokepoint: '#2dd4bf', // Teal
  space: '#ec4899', // Pink
  oil: '#475569', // Slate
  mining: '#fb923c', // Orange
};

const createCustomIcon = (event: MapEvent, isSelected: boolean) => {
  const category = event.category;
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  const hotScore = (event as any).hotScore ?? 1;

  const isHot = hotScore >= 5; // raised from 3 → 5
  const isVeryHot = hotScore >= 10; // raised from 6 → 10
  const hoursOld = (Date.now() - new Date(event.timestamp).getTime()) / (1000 * 60 * 60);
  const isCritical = ['military', 'explosion'].includes(category);
  // Pulse ONLY for: selected items, heavily reported stories (>=5 sources), or brand-new critical events (<1h)
  const shouldPulse = isSelected || isHot || (isCritical && hoursOld < 1);

  const pulseColor = isVeryHot ? '#ff2200' : isHot ? '#f97316' : isCritical ? '#ff0000' : 'white';
  const pulseSpeed = isVeryHot ? '0.7s' : isHot ? '1.0s' : '1.3s';
  const ringSize = isVeryHot ? 80 : isHot ? 64 : 48;

  const size = isSelected ? 48 : isHot ? 42 : 36;
  const iconSize = isSelected ? 20 : isHot ? 18 : 16;
  const pinOffset = size / 2;

  const iconHtml = CATEGORY_ICON_SVG[category].replace(/\{\{S\}\}/g, String(iconSize));

  // Hot badge above marker
  const hotBadge = isHot
    ? `
    <div style="
      position:absolute;
      top:-${size + 20}px;left:-12px;
      background:${isVeryHot ? '#ff2200' : '#f97316'};
      color:white;font-size:9px;font-weight:900;font-family:monospace;
      padding:2px 6px;border-radius:10px;white-space:nowrap;
      box-shadow:0 2px 8px rgba(0,0,0,0.7), 0 0 12px ${pulseColor}88;
      letter-spacing:0.05em;
    ">🔥 ${hotScore}</div>`
    : '';

  // Pulse rings — much more aggressive and visible
  const ring1 = `
    <div style="
      position:absolute;
      top:-${ringSize / 2}px;left:-${ringSize / 2}px;
      width:${ringSize}px;height:${ringSize}px;
      border-radius:50%;
      border: ${isVeryHot ? 4 : isHot ? 3 : 2}px solid ${pulseColor};
      background: ${isVeryHot ? pulseColor + '33' : pulseColor + '22'};
      animation: pulse-ring ${pulseSpeed} ease-out infinite;
      box-shadow: 0 0 ${isVeryHot ? 30 : 20}px ${pulseColor}, inset 0 0 ${isVeryHot ? 15 : 10}px ${pulseColor}66;
      transform-origin: center;
      z-index: 999;
    "></div>`;

  const ring2 = isHot
    ? `
    <div style="
      position:absolute;
      top:-${ringSize / 2 + 10}px;left:-${ringSize / 2 + 10}px;
      width:${ringSize + 20}px;height:${ringSize + 20}px;
      border-radius:50%;
      border: 2px solid ${pulseColor}99;
      animation: pulse-ring ${parseFloat(pulseSpeed) + 0.35}s ease-out infinite 0.25s;
      box-shadow: 0 0 12px ${pulseColor}66;
      transform-origin: center;
      z-index: 998;
    "></div>`
    : '';

  const ring3 = isVeryHot
    ? `
    <div style="
      position:absolute;
      top:-${ringSize / 2 + 20}px;left:-${ringSize / 2 + 20}px;
      width:${ringSize + 40}px;height:${ringSize + 40}px;
      border-radius:50%;
      border: 1.5px solid ${pulseColor}66;
      animation: pulse-ring ${parseFloat(pulseSpeed) + 0.7}s ease-out infinite 0.5s;
      transform-origin: center;
      z-index: 997;
    "></div>`
    : '';

  // Track if this exact event ID has already spawned
  const w = window as any;
  if (!w.__spawnedMarkers) w.__spawnedMarkers = new Set<string>();
  const isNewMarker = !w.__spawnedMarkers.has(event.id);

  if (isNewMarker) {
    w.__spawnedMarkers.add(event.id);
  }

  const animationClass = isNewMarker ? 'tactical-pin-animator' : '';

  return L.divIcon({
    className: 'custom-tactical-pin',
    html: `
      <div style="position:relative;width:0;height:0;" class="${animationClass}">
        ${hotBadge}
        ${shouldPulse ? ring1 + ring2 + ring3 : ''}
        <div style="
          position:absolute;
          top:-${size}px;left:-${pinOffset}px;
          width:${size}px;height:${size}px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5)${isHot ? `, 0 0 25px ${pulseColor}` : ''}, inset 0 0 8px rgba(255,255,255,0.4);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        ">
          <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;">
            ${iconHtml}
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    popupAnchor: [0, -(size + (isHot ? 20 : 0))],
  });
};

const createStrategicIcon = (type: string) => {
  const color = STRATEGIC_COLORS[type] ?? '#6366f1';
  const size = 21; // was 14 — increased by 50%
  const iconSize = 11; // was 7 — increased proportionally
  const iconHtml = (STRATEGIC_ICON_SVG[type] || STRATEGIC_ICON_SVG.military).replace(
    /\{\{S\}\}/g,
    String(iconSize)
  );

  return L.divIcon({
    className: 'strategic-asset-pin',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${color};
        border: 1.5px solid white;
        border-radius: 6px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        transform: rotate(45deg);
      ">
        <div style="transform: rotate(-45deg); display: flex; align-items:center; justify-content:center;">
          ${iconHtml}
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const createAircraftIcon = (aircraft: LiveAircraft) => {
  // Rotate the raw SVG specifically to the aircraft's heading
  // The SVG naturally points 'UP' (0 degrees), so we just rotate it by `heading` degrees
  const heading = aircraft.heading || 0;

  // Decide color scheme if grounded (low alt / speed)
  const isGrounded = aircraft.alt <= 100 && aircraft.speed < 20;
  const fillColor = isGrounded ? 'rgba(100, 116, 139, 0.6)' : '#0ea5e9'; // slate-500 vs sky-500
  const strokeColor = isGrounded ? 'rgba(255, 255, 255, 0.4)' : 'white';
  const dropShadow = isGrounded ? 'none' : 'drop-shadow(0px 2px 4px rgba(14,165,233,0.6))';
  const opacity = isGrounded ? 0.6 : 1;

  const iconHtml = `
    <div style="
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      transform: rotate(${heading}deg);
      filter: ${dropShadow};
      opacity: ${opacity};
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.5l-1.3 1.3c-.3.3-.2.8.1 1l5.4 3-2.9 2.9-3.2-.8c-.4-.1-.8.2-1 .5L.2 15c-.3.3-.2.8.1 1l4.2 1.5 1.5 4.2c.2.3.6.4 1 .1l1.5-1.5c.3-.2.6-.6.5-1l-.8-3.2 2.9-2.9 3 5.4c.2.3.7.4 1 .1l1.3-1.3c.3-.2.6-.6.5-1.1z"/></svg>
    </div>
  `;

  return L.divIcon({
    className: 'live-aircraft-pin',
    html: iconHtml,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

const createShipIcon = (ship: LiveShip) => {
  const heading = ship.heading || 0;
  // A glowing blue diamond container with a ship icon pointing towards heading
  const iconHtml = `
    <div style="
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      transform: rotate(${heading}deg);
      filter: drop-shadow(0px 2px 5px rgba(14, 165, 233, 0.8));
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="var(--bg)" stroke="#0ea5e9" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- Stylized Stealth Ship Top-Down -->
        <path d="M12 2 L8 8 L8 20 L12 22 L16 20 L16 8 Z" fill="rgba(14, 165, 233, 0.15)"/>
        <!-- Bridge/Superstructure -->
        <path d="M10 12 L12 10 L14 12 L14 16 L10 16 Z" fill="#0ea5e9"/>
        <!-- Wake Line -->
        <line x1="12" y1="22" x2="12" y2="28" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 2" />
        <line x1="12" y1="-4" x2="12" y2="2" stroke="#0ea5e9" stroke-width="1.5" stroke-dasharray="2 2" />
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'live-ship-pin',
    html: iconHtml,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

import HeatmapLayer from './HeatmapLayer';

interface MapProps {
  events: MapEvent[];
  center: [number, number];
  zoom: number;
  onEventClick?: (event: MapEvent) => void;
  selectedEventId?: string | null;
  isDarkMode?: boolean;
  isLiveMode?: boolean;
  strategicAssets?: StrategicAsset[];
  showStrategicAssets?: boolean;
  liveAircraft?: LiveAircraft[];
  liveShips?: LiveShip[];
  showHeatmap?: boolean;
}

function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);

  useEffect(() => {
    const centerChanged =
      prevCenter.current[0] !== center[0] || prevCenter.current[1] !== center[1];
    if (centerChanged || prevZoom.current !== zoom) {
      map.flyTo(center, zoom, { animate: true, duration: 1.2, easeLinearity: 0.25 });
      prevCenter.current = center;
      prevZoom.current = zoom;
    }
  }, [center, zoom, map]);

  return null;
}

// --- RADAR COLLISION DETECTION ENGINE ---
const RadarHighlight = ({
  lat,
  lng,
  children,
  isLiveMode,
}: {
  lat: number;
  lng: number;
  children: React.ReactNode;
  isLiveMode: boolean;
}) => {
  const [isLit, setIsLit] = useState(false);
  const map = useMap();

  useEffect(() => {
    if (!isLiveMode) return;

    // Sync with index.css radar-sweep 12s animation
    const interval = setInterval(() => {
      // Calculate current angle of the radar sweep
      const elapsed = (Date.now() % 12000) / 12000;
      const radarAngle = elapsed * 360; // 0 at top, clockwise

      // Calculate angle of this marker relative to map center
      const center = map.getCenter();
      const point = map.project([lat, lng]);
      const centerPoint = map.project(center);

      // Math: Get angle between center and marker
      let markerAngle =
        (Math.atan2(point.y - centerPoint.y, point.x - centerPoint.x) * 180) / Math.PI + 90;
      if (markerAngle < 0) markerAngle += 360;

      // Detection: If radar beam (approx 15deg width) is touching this marker's angle
      const diff = Math.abs(radarAngle - markerAngle);
      const isTouching = diff < 8 || diff > 352;

      if (isTouching && !isLit) {
        setIsLit(true);
        setTimeout(() => setIsLit(false), 1500); // Animation duration match
      }
    }, 100);

    return () => clearInterval(interval);
  }, [lat, lng, isLiveMode, map, isLit]);

  return <div className={isLit ? 'radar-glow-active' : ''}>{children}</div>;
};

export default function Map({
  events,
  center,
  zoom,
  onEventClick,
  selectedEventId,
  isDarkMode = false,
  isLiveMode = false,
  strategicAssets = [],
  showStrategicAssets = false,
  liveAircraft = [],
  liveShips = [],
  showHeatmap = false,
}: MapProps) {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[var(--bg)]">
      {/* ── TACTICAL RADAR OVERLAY ── */}
      <AnimatePresence>
        {isLiveMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9000] pointer-events-none overflow-hidden"
          >
            <div className="radar-sweep-overlay" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vh] h-[80vh] border border-[var(--accent)]/10 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vh] h-[50vh] border border-[var(--accent)]/5 rounded-full" />
            <div className="absolute top-4 right-20 flex items-center gap-2 px-3 py-1 bg-black/80 rounded-full border border-red-500/50">
              <Radio size={12} className="text-red-500 animate-pulse" />
              <span className="text-[10px] font-mono text-red-500 font-black uppercase tracking-widest">
                Scanning Signal...
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MapContainer
        center={center}
        zoom={zoom}
        zoomControl={false}
        className="w-full h-full touch-none"
      >
        <ZoomControl position="bottomright" />
        <ChangeView center={center} zoom={zoom} />

        <LayersControl position="bottomright">
          <LayersControl.BaseLayer name="Tactical View" checked={isDarkMode}>
            <TileLayer
              attribution="&copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              className="tactical-tiles"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite Hybrid">
            <TileLayer
              attribution="&copy; Google"
              url="https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
              subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Street View" checked={!isDarkMode}>
            <TileLayer
              attribution="&copy; OpenStreetMap"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {showHeatmap && (
          <HeatmapLayer
            points={events.map(e => [e.location.lat, e.location.lng, ((e as any).hotScore || 1) * 0.2] as [number, number, number])}
          />
        )}

        {/* Hide clusters when heatmap is visible to reduce clutter */}
        {!showHeatmap && (
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            maxClusterRadius={40}
            spiderfyOnMaxZoom={true}
            iconCreateFunction={(cluster: any) => {
              const count = cluster.getChildCount();
              let size = 36;
              if (count > 20) size = 44;
              if (count > 100) size = 52;

              const children: any[] = cluster.getAllChildMarkers ? cluster.getAllChildMarkers() : [];
              const catCounts: Record<string, number> = {};
              for (const m of children) {
                const cat = m.options?.title || 'other';
                catCounts[cat] = (catCounts[cat] || 0) + 1;
              }
              const dominant =
                (Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as EventCategory) ||
                'other';
              const clusterColor = CATEGORY_COLORS[dominant] ?? CATEGORY_COLORS.other;

              // Ensure popcorn animation only triggers ONE TIME per cluster location
              const latlng = cluster.getLatLng();
              const coordKey = `${latlng.lat.toFixed(3)},${latlng.lng.toFixed(3)}`;

              // We use a global tracking object bound to the window to track spawned clusters across renders
              const w = window as any;
              if (!w.__spawnedClusters) w.__spawnedClusters = new Set<string>();
              const isNewCluster = !w.__spawnedClusters.has(coordKey);

              if (isNewCluster) {
                w.__spawnedClusters.add(coordKey);
              }

              const animationClass = isNewCluster ? 'tactical-pin-animator' : '';

              return L.divIcon({
                html: `
                <div class="${animationClass}" style="
                  width:${size}px;height:${size}px;
                  background: rgba(15, 23, 42, 0.9);
                  border: 3px solid ${clusterColor};
                  backdrop-filter: blur(8px);
                  color: white; font-weight: 800; font-family: var(--font-mono);
                  font-size: ${size <= 36 ? 11 : 13}px;
                  border-radius: 50%;
                  display: flex; align-items: center; justify-content: center;
                  box-shadow: 0 0 20px ${clusterColor}44, inset 0 0 10px rgba(0,0,0,0.5);
                  position: relative;
                ">
                  ${count}
                  <div style="position:absolute; inset: -4px; border-radius: 50%; border: 1px solid ${clusterColor}44; animation: pulse-ring 2s infinite;"></div>
                </div>
              `,
                className: 'custom-cluster-icon',
                iconSize: [size, size],
                iconAnchor: [size / 2, size / 2],
              });
            }}
          >
            {events.map((event) => (
              <Marker
                key={event.id}
                position={[event.location.lat, event.location.lng]}
                icon={createCustomIcon(event, selectedEventId === event.id)}
                title={event.category}
                eventHandlers={{ click: () => onEventClick?.(event) }}
              >
                <Popup className="minimal-popup">
                  <div className="p-3 max-w-[280px] bg-[var(--bg)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded bg-[var(--line)] text-[9px] font-mono font-bold uppercase tracking-widest opacity-60">
                        {event.category}
                      </span>
                      {(event as any).hotScore > 1 && (
                        <span className="text-[9px] font-mono font-bold text-orange-400 ml-auto">
                          🔥 {(event as any).hotScore} sources
                        </span>
                      )}
                      {!((event as any).hotScore > 1) && (
                        <span className="text-[9px] font-mono opacity-40 ml-auto">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-mono opacity-40 mb-2">📍 {event.location.name}</p>

                    {/* Related stories list */}
                    <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
                      {(
                        (event as any).relatedStories || [
                          {
                            title: event.title,
                            sourceUrl: event.sourceUrl,
                            source: '',
                            timestamp: event.timestamp,
                          },
                        ]
                      ).map((s: any, i: number) => (
                        <a
                          key={i}
                          href={s.sourceUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                          style={{ textDecoration: 'none' }}
                        >
                          <div
                            className={`p-1.5 rounded border transition-all ${i === 0 ? 'border-[var(--accent)]/30 bg-[var(--accent)]/5' : 'border-[var(--line)]/50 hover:border-[var(--line)]'}`}
                          >
                            <p
                              className={`text-[11px] font-semibold leading-tight ${i === 0 ? 'text-[var(--ink)]' : 'text-[var(--ink-dim)]'} group-hover:text-[var(--ink)] line-clamp-2`}
                            >
                              {s.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {s.source && (
                                <span className="text-[8px] font-mono opacity-40">{s.source}</span>
                              )}
                              <span className="text-[8px] font-mono opacity-30 ml-auto">
                                {new Date(s.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {showStrategicAssets &&
          strategicAssets.map((asset) => (
            <Marker
              key={asset.id}
              position={[asset.lat, asset.lng]}
              icon={createStrategicIcon(asset.type)}
            >
              <RadarHighlight lat={asset.lat} lng={asset.lng} isLiveMode={isLiveMode}>
                <div style={{ width: 0, height: 0 }} />
              </RadarHighlight>
              <Popup className="strategic-popup">
                <div className="p-3 max-w-[200px] text-[var(--ink)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">
                      {asset.type} Asset
                    </span>
                  </div>
                  <h4 className="font-bold text-sm uppercase mb-1 text-[var(--ink)]">
                    {asset.name}
                  </h4>
                  <p className="text-[10px] text-[var(--ink-dim)] leading-relaxed mb-3">
                    {asset.description}
                  </p>
                  {asset.wikiUrl && (
                    <a
                      href={asset.wikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 w-full justify-center bg-[var(--line)]/20 hover:bg-[var(--accent)] text-[var(--ink)] hover:text-white px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors font-mono border border-[var(--line)]"
                    >
                      Wikipedia Intel
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {/* ── LIVE MILITARY AIRCRAFT LAYER ── */}
        {isLiveMode &&
          liveAircraft.map((ac) => (
            <React.Fragment key={ac.id}>
              {ac.history && ac.history.length > 1 && (
                <Polyline
                  positions={ac.history.map((pos) => [pos[0], pos[1]])}
                  color={
                    ac.alt <= 100 && ac.speed < 20
                      ? 'rgba(100, 116, 139, 0.4)'
                      : 'rgba(14, 165, 233, 0.6)'
                  }
                  weight={2}
                  dashArray="4 4"
                />
              )}
              <Marker
                position={[ac.lat, ac.lng]}
                icon={createAircraftIcon(ac)}
                zIndexOffset={2000} // Ensure aircraft float above standard assets
              >
                <RadarHighlight lat={ac.lat} lng={ac.lng} isLiveMode={isLiveMode}>
                  <div style={{ width: 0, height: 0 }} />
                </RadarHighlight>
                <Popup className="strategic-popup">
                  <div className="p-3 max-w-[200px] bg-slate-900 text-white rounded-lg border border-sky-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-sky-400 tracking-widest flex items-center gap-1">
                        <Radio size={10} className="animate-pulse" /> Live Telemetry
                      </span>
                    </div>
                    <h4 className="font-bold text-sm uppercase mb-1 text-white">{ac.callsign}</h4>
                    {(ac.operator || ac.registration) && (
                      <div className="text-[10px] font-black uppercase text-sky-500/80 mb-3 truncate bg-sky-900/40 px-2 py-1.5 rounded-md inline-block border border-sky-500/20">
                        {ac.operator || `Reg: ${ac.registration}`}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-black/40 p-1.5 rounded border border-white/10">
                        <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                          Altitude
                        </div>
                        <div className="font-bold text-sky-400">{Math.round(ac.alt)} ft</div>
                      </div>
                      <div className="bg-black/40 p-1.5 rounded border border-white/10">
                        <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                          Speed
                        </div>
                        <div className="font-bold text-sky-400">{Math.round(ac.speed)} kts</div>
                      </div>
                      <div className="bg-black/40 p-1.5 rounded border border-white/10">
                        <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                          Heading
                        </div>
                        <div className="font-bold text-sky-400">{Math.round(ac.heading)}°</div>
                      </div>
                      <div className="bg-black/40 p-1.5 rounded border border-white/10">
                        <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                          Type
                        </div>
                        <div className="font-bold text-white truncate">{ac.type}</div>
                      </div>
                    </div>
                    <div className="mt-2 text-[9px] opacity-60 leading-tight">{ac.description}</div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ))}

        {/* ── LIVE OSINT SHIPS LAYER ── */}
        {isLiveMode &&
          liveShips.map((ship) => (
            <Marker
              key={ship.id}
              position={[ship.lat, ship.lng]}
              icon={createShipIcon(ship)}
              zIndexOffset={1900}
            >
              <RadarHighlight lat={ship.lat} lng={ship.lng} isLiveMode={isLiveMode}>
                <div style={{ width: 0, height: 0 }} />
              </RadarHighlight>
              <Popup className="strategic-popup">
                <div className="p-3 max-w-[200px] bg-slate-900 text-white rounded-lg border border-sky-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-widest flex items-center gap-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        className="animate-pulse"
                      >
                        <path d="M12 2 L9 8 L9 20 L12 22 L15 20 L15 8 Z" />
                        <path d="M10 12 L12 10 L14 12 L14 16 L10 16 Z" />
                      </svg>{' '}
                      OSINT Tracker
                    </span>
                  </div>
                  <h4 className="font-bold text-sm uppercase mb-1 text-white">{ship.name}</h4>
                  <div className="text-[10px] font-black uppercase text-sky-500/80 mb-3 truncate bg-sky-900/40 px-2 py-1.5 rounded-md inline-block border border-sky-500/20">
                    {ship.country} Nav. Asset
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-black/40 p-1.5 rounded border border-white/10">
                      <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                        Speed
                      </div>
                      <div className="font-bold text-sky-400">{Math.round(ship.speed)} kts</div>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded border border-white/10">
                      <div className="opacity-50 text-[8px] uppercase tracking-wider mb-0.5">
                        Heading
                      </div>
                      <div className="font-bold text-sky-400">{Math.round(ship.heading)}°</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[9px] text-slate-400 leading-tight">{ship.type}</div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
