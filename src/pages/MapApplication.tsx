import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import Map from '../components/Map';
import {
  MapEvent,
  Region,
  EventCategory,
  StrategicAsset,
  LiveAircraft,
  LiveShip,
  TimeRange,
} from '../types';
import {
  Globe,
  Map as MapIcon,
  RefreshCw,
  Loader2,
  Moon,
  Sun,
  Menu,
  X,
  Radio,
  Activity,
  ChevronUp,
  ChevronDown,
  Clock,
  Languages,
  Archive,
  Search,
  CalendarRange,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from '../components/OnboardingTour';
import RegionSelectionModal from '../components/RegionSelectionModal';
import TimelineView from '../components/TimelineView';
import ExportMenu from '../components/ExportMenu';
import SEOHead from '../components/SEOHead';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import RegionPreferencesModal from '../components/RegionPreferencesModal';
import { User as UserIcon, LogOut, Settings, Bell, ExternalLink, MessageSquare, UserPlus, Send } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
import BreakingAlertSystem from '../components/BreakingAlertSystem';
import {
  detectNewAlerts,
  sendBrowserNotification,
  saveAlertToHistory,
  AlertEvent,
} from '../lib/alerts';
import { useSocket } from '../hooks/useSocket';
import { useActivityStore } from '../store/activityStore';
import GlobalActivityLog from '../components/GlobalActivityLog';
import DashboardPortal from '../components/DashboardPortal';
import RiskMatrix from '../components/RiskMatrix';
import CommandPalette from '../components/CommandPalette';
import { LayoutPanelLeft } from 'lucide-react';

const REGIONS: Region[] = [
  { id: 'middle-east', name: 'Middle East', center: [33, 44], zoom: 5 },
  { id: 'europe', name: 'Europe / UKR', center: [49, 31], zoom: 5 },
  { id: 'asia', name: 'Asia / HK / TW', center: [30, 105], zoom: 4 },
  { id: 'north-america', name: 'North America', center: [38, -98], zoom: 4 },
  { id: 'south-america', name: 'South America', center: [-15, -60], zoom: 4 },
  { id: 'africa', name: 'Africa', center: [5, 25], zoom: 4 },
];

const REGION_ID_TO_LABEL: Record<string, string> = {
  'middle-east': 'Middle East',
  europe: 'Europe / UKR',
  asia: 'Asia / HK / TW',
  'north-america': 'North America',
  'south-america': 'South America',
  africa: 'Africa',
};

export default function MapApplication() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [currentRegion, setCurrentRegion] = useState<Region>(REGIONS[0]);
  const [activeRegionId, setActiveRegionId] = useState<string>(REGIONS[0].id);
  const [events, setEvents] = useState<MapEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(() => {
    const p = searchParams.get('categories');
    return p ? new Set(p.split(',')) : new Set();
  });
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    return (searchParams.get('time') as TimeRange) || 'all';
  });
  const [selectedReliability, setSelectedReliability] = useState<Set<string>>(() => {
    const p = searchParams.get('reliability');
    return p ? new Set(p.split(',')) : new Set(['A', 'B', 'C']);
  });
  const [timelineRange, setTimelineRange] = useState<[Date, Date] | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [strategicAssets, setStrategicAssets] = useState<StrategicAsset[]>([]);
  const [showStrategicAssets, setShowStrategicAssets] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedStrategicTypes, setSelectedStrategicTypes] = useState<Set<string>>(
    new Set(['nuclear', 'military', 'chokepoint', 'space', 'oil', 'mining'])
  );
  const [liveAircraft, setLiveAircraft] = useState<LiveAircraft[]>([]);
  const [liveShips, setLiveShips] = useState<LiveShip[]>([]);
  const isFetchingRef = useRef(false);
  const isFetchingAircraftRef = useRef(false);

  // ── Analyst Collaboration State ──
  const [analystData, setAnalystData] = useState<Record<string, { comments: { id: string; author: string; text: string; timestamp: string; }[]; status: 'open' | 'in-progress' | 'resolved'; assignee: string; }>>({});
  const [newCommentText, setNewCommentText] = useState('');

  // ── Archive Mode ──
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().split('T')[0];
  const [isArchiveMode, setIsArchiveMode] = useState(false);
  const [archiveFrom, setArchiveFrom] = useState(sevenDaysAgo);
  const [archiveTo, setArchiveTo] = useState(today);
  const [archiveKeyword, setArchiveKeyword] = useState('');
  const [archiveEvents, setArchiveEvents] = useState<MapEvent[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  // ── Auth & Preferences State ──
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // ── Router Hooks ──
  const navigate = useNavigate();

  // ── URL Sync ──
  useEffect(() => {
    const params = new URLSearchParams(searchParams);

    // Manage Categories
    if (selectedCategories.size > 0) {
      params.set('categories', Array.from(selectedCategories).join(','));
    } else {
      params.delete('categories');
    }

    // Manage Time
    if (timeRange !== 'all') {
      params.set('time', timeRange);
    } else {
      params.delete('time');
    }

    // Manage Reliability
    if (selectedReliability.size < 3) {
      params.set('reliability', Array.from(selectedReliability).join(','));
    } else {
      params.delete('reliability');
    }

    // Only set if changed to avoid unnecessary re-renders
    if (params.toString() !== searchParams.toString()) {
      setSearchParams(params, { replace: true });
    }
  }, [selectedCategories, timeRange, selectedReliability, searchParams, setSearchParams]);

  // ── Alert System State ──
  const [activeAlerts, setActiveAlerts] = useState<
    (AlertEvent & {
      id: string;
      title: string;
      category: string;
      region?: string;
      sourceUrl?: string;
      hotScore: number;
    })[]
  >([]);
  const knownEventIdsRef = useRef<Set<string>>(new Set());
  const isFirstFetchRef = useRef(true);

  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const LOADING_MESSAGES = [
    'Establishing tactical link...',
    'Scanning multi-source telemetry...',
    'Aligning satellite grid...',
    'Filtering low-confidence signals...',
  ];

  // ── Realtime Websocket Hook ──
  const { isConnected: isLiveFeedConnected, lastMessage: liveThreatEvent } = useSocket();

  useEffect(() => {
    if (liveThreatEvent && isLiveMode) {
      // A new realtime event arrived via websockets.
      // Convert it to a format matching the maps data structure, and append to events map.
      const newEvent: MapEvent = {
        id: liveThreatEvent.id,
        title: liveThreatEvent.title,
        description: liveThreatEvent.description || 'Real-time threat detection',
        timestamp: liveThreatEvent.timestamp,
        category: liveThreatEvent.category || 'military',
        location: {
          lat: liveThreatEvent.lat || (Math.random() * 20 + 20),
          lng: liveThreatEvent.lng || (Math.random() * 20 + 30),
          name: liveThreatEvent.locationName || 'Unknown Origin'
        },
        hotScore: liveThreatEvent.hotScore || 3,
        region: liveThreatEvent.region || activeRegionId || 'global'
      };

      // Avoid duplicates
      if (!knownEventIdsRef.current.has(newEvent.id)) {
        setEvents(prev => [newEvent, ...prev]);
        knownEventIdsRef.current.add(newEvent.id);

        // Optionally trigger breaking alert system instantly if high severity
        const alertObj: AlertEvent = { ...newEvent, sourceUrl: '', hotScore: newEvent.hotScore || 3 };
        const preferredRegions = profile?.preferences?.regions || [];

        // Use detectNewAlerts to see if it qualifies for notification
        const newBreaking = detectNewAlerts([alertObj], new Set(), preferredRegions);

        if (newBreaking.length > 0) {
          const breakingEvent = newBreaking[0];
          saveAlertToHistory(breakingEvent);
          sendBrowserNotification(breakingEvent);
          setActiveAlerts((prev) =>
            [{ id: breakingEvent.id, title: breakingEvent.title, category: breakingEvent.category, region: breakingEvent.region, sourceUrl: breakingEvent.sourceUrl, hotScore: breakingEvent.hotScore, timestamp: breakingEvent.timestamp }, ...prev].slice(0, 3)
          );
        }
      }
    }
  }, [liveThreatEvent, isLiveMode, profile, activeRegionId]);

  // ── Modals & Overlay State ──
  const [showTutorial, setShowTutorial] = useState(false);
  const [showRegionSelector, setShowRegionSelector] = useState(false);
  // Tracks if the tutorial needs to be shown after loading completes
  const pendingTutorialRef = useRef(false);

  // ── Auth Modal Mode State ──
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // ── Global Activity Log State ──
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Expose toggle globally for sidebar access
  useEffect(() => {
    (window as any).toggleActivityLog = () => setIsActivityLogOpen(prev => !prev);
    (window as any).toggleDashboard = () => setIsDashboardOpen(prev => !prev);
    return () => {
      delete (window as any).toggleActivityLog;
      delete (window as any).toggleDashboard;
    };
  }, []);
  const { addLog } = useActivityStore();

  useEffect(() => {
    // Determine startup sequence: Region Selector -> Tutorial -> Main App
    const forceReset = new URLSearchParams(window.location.search).has('reset');
    const savedRegionId = forceReset ? null : localStorage.getItem('pulsemap_default_region');
    const hasSeenTutorial = forceReset ? false : localStorage.getItem('pulsemap_tutorial_seen');

    // Use profile default if available, fallback to middle-east to skip Region Selector
    // Setup returning user's saved region or default directly
    const storedRegionId = profile?.preferences?.defaultRegion || savedRegionId;

    if (storedRegionId) {
      const loadedRegion = REGIONS.find((r) => r.id === storedRegionId) || REGIONS[0];
      setCurrentRegion(loadedRegion);
      setActiveRegionId(loadedRegion.id);

      // Mark tutorial as pending
      if (!hasSeenTutorial) {
        pendingTutorialRef.current = true;
      }
    } else {
      // First time visitor, show region selector
      setShowRegionSelector(true);
    }
  }, [profile]);

  // Show tutorial only after initial data load completes
  useEffect(() => {
    if (!isLoading && pendingTutorialRef.current) {
      pendingTutorialRef.current = false;
      // Small delay so the map renders fully before tutorial overlay appears
      const t = setTimeout(() => setShowTutorial(true), 600);
      return () => clearTimeout(t);
    }
  }, [isLoading, events.length]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingMsgIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      addLog({ type: 'info', category: 'system', message: 'Theme updated: Dark Mode engaged' });
    } else {
      document.documentElement.classList.remove('dark');
      addLog({ type: 'info', category: 'system', message: 'Theme updated: Light Mode engaged' });
    }
  }, [isDarkMode]);

  const fetchAndProcessNews = useCallback(
    async (fast = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);
      try {
        const url = fast ? '/api/news?fast=1' : '/api/news';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const mappedEvents: MapEvent[] = await res.json();
        setEvents(mappedEvents);
        setLastSync(new Date());

        // ── Alert Detection ──
        if (isFirstFetchRef.current) {
          // On first load just seed known IDs — don't alert for already-existing events
          mappedEvents.forEach((e) => knownEventIdsRef.current.add(e.id));
          isFirstFetchRef.current = false;
        } else {
          const preferredRegions = profile?.preferences?.regions || [];
          const alertEvents: AlertEvent[] = mappedEvents.map((e) => ({
            id: e.id,
            title: e.title,
            category: e.category,
            region: e.region,
            sourceUrl: e.sourceUrl,
            timestamp: e.timestamp,
            hotScore: e.hotScore,
          }));

          const newBreaking = detectNewAlerts(
            alertEvents,
            knownEventIdsRef.current,
            preferredRegions
          );

          if (newBreaking.length > 0) {
            // Add to known IDs
            newBreaking.forEach((e) => knownEventIdsRef.current.add(e.id));

            // Save to history
            newBreaking.forEach((e) => saveAlertToHistory(e));

            // Push browser notification
            newBreaking.slice(0, 2).forEach((e) => sendBrowserNotification(e));

            // Show in-app alert cards (max 3 visible at once)
            setActiveAlerts((prev) =>
              [
                ...newBreaking.slice(0, 3 - prev.length).map((e) => ({
                  id: e.id,
                  title: e.title,
                  category: e.category,
                  region: e.region,
                  sourceUrl: e.sourceUrl,
                  hotScore: e.hotScore,
                  timestamp: e.timestamp,
                })),
                ...prev,
              ].slice(0, 3)
            );
          }

          // Also mark any other new (non-breaking) events as known
          mappedEvents.forEach((e) => knownEventIdsRef.current.add(e.id));
        }
      } catch (err: any) {
        console.error('Failed to fetch news from API:', err);
        setError('Sync failed: ' + err.message);
        setRetryCountdown(30);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [profile]
  );

  useEffect(() => {
    // First load: use fast mode so mobile gets data in ~3-5s
    fetchAndProcessNews(true);

    // Fetch strategic assets once
    fetch('/api/strategic-assets')
      .then((res) => res.json())
      .then((data) => setStrategicAssets(data))
      .catch((err) => console.error('Failed to fetch strategic assets:', err));
  }, [fetchAndProcessNews]);

  const fetchArchive = useCallback(async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    try {
      const params = new URLSearchParams({
        from: archiveFrom,
        to: archiveTo,
        q: archiveKeyword,
      });

      const res = await fetch(`/api/historical?${params}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const mappedArchive: MapEvent[] = await res.json();
      setArchiveEvents(mappedArchive);
    } catch (err: any) {
      setArchiveError(err.message);
      setArchiveEvents([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [archiveFrom, archiveTo, archiveKeyword]);

  // Auto-retry countdown on error (UX-03)
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown === 0) {
      setRetryCountdown(null);
      setError(null);
      fetchAndProcessNews();
      return;
    }
    const t = setTimeout(() => setRetryCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [retryCountdown, fetchAndProcessNews]);

  const handleRegionChange = (region: Region) => {
    setActiveRegionId(region.id);
    setCurrentRegion(region);
    setSelectedEventId(null);
    localStorage.setItem('pulsemap_default_region', region.id);

    // Track region selection
    trackEvent({
      userId: user?.id,
      actionType: 'region_select',
      region: region.id,
    });

    if (user) {
      updateProfile({
        preferences: {
          ...profile?.preferences,
          defaultRegion: region.id,
        },
      });
    }

    addLog({
      type: 'info',
      category: 'map',
      message: `Strategic focus shifted to ${region.name}`,
      metadata: { regionId: region.id }
    });
  };

  const handleEventClick = (event: MapEvent) => {
    setSelectedEventId(event.id);
    const targetZoom = Math.max(currentRegion.zoom, 8);
    setCurrentRegion({
      id: 'focus',
      name: event.location.name,
      center: [event.location.lat, event.location.lng],
      zoom: targetZoom,
    });

    // Track event click
    trackEvent({
      userId: user?.id,
      eventId: event.id,
      actionType: 'click',
      region: event.region,
    });
  };

  const closeEvent = () => setSelectedEventId(null);

  useEffect(() => {
    if (!isLiveMode) {
      setLiveAircraft([]); // Clear aircraft when turning off radar
      setLiveShips([]); // Clear ships
      return;
    }

    // Initial fetch
    fetchAndProcessNews();

    const fetchAircraft = async () => {
      if (isFetchingAircraftRef.current) return;
      isFetchingAircraftRef.current = true;
      try {
        const res = await fetch('/api/aircraft');
        if (res.ok) {
          const data = await res.json();
          setLiveAircraft((prev) => {
            const incoming: LiveAircraft[] = data.aircraft || [];
            return incoming.map((newAc) => {
              const existing = prev.find((p) => p.id === newAc.id);
              // SERVER-SIDE priority: if server sends history, use it. Otherwise compute client-side.
              let history = newAc.history || existing?.history || [];
              if (!newAc.history && existing) {
                const moved =
                  Math.abs(existing.lat - newAc.lat) > 0.0001 ||
                  Math.abs(existing.lng - newAc.lng) > 0.0001;
                if (moved) {
                  history = [...history, [existing.lat, existing.lng]];
                  if (history.length > 50) history = history.slice(history.length - 50);
                }
              }
              return { ...newAc, history };
            });
          });
          setLiveShips(data.ships || []);
        }
      } catch (err) {
        // silently fail if radar tracking endpoints are down
      } finally {
        isFetchingAircraftRef.current = false;
      }
    };

    fetchAircraft(); // Fetch immediately on radar activation

    // Poll aircraft every 15s, News every 3 mins
    const aircraftInterval = setInterval(fetchAircraft, 15000);
    const newsInterval = setInterval(fetchAndProcessNews, 180000);

    addLog({
      type: 'warning',
      category: 'radar',
      message: isLiveMode ? 'Radar sweep engaged: Tracking active signals' : 'Radar stand-down: Tracking suspended'
    });

    return () => {
      clearInterval(aircraftInterval);
      clearInterval(newsInterval);
    };
  }, [isLiveMode, fetchAndProcessNews]);

  const baseFilteredEvents = useMemo(() => {
    // In archive mode, use archiveEvents; skip time filter (dates already constrained)
    const sourceEvents = isArchiveMode ? archiveEvents : events;
    const canonicalLabel = REGION_ID_TO_LABEL[activeRegionId] || activeRegionId;
    return sourceEvents.filter((e) => {
      if (activeRegionId !== 'world') {
        const textToSearch = (e.title + ' ' + e.description).toLowerCase();
        const isSameRegion = e.region?.toLowerCase() === canonicalLabel.toLowerCase();
        const regionKeywords: Record<string, string[]> = {
          'middle-east': [
            'iraq',
            'iran',
            'israel',
            'syria',
            'palestine',
            'gaza',
            'hamas',
            'hezbollah',
            'houthi',
            'yemen',
            'lebanon',
            'qatar',
            'tehran',
            'baghdad',
            'beirut',
            'damascus',
            'middle east',
          ],
          europe: [
            'ukraine',
            'russia',
            'kyiv',
            'moscow',
            'donbas',
            'crimea',
            'putin',
            'zelensky',
            'serbia',
            'kosovo',
            'nato',
            'european union',
            'poland',
            'belarus',
          ],
          asia: [
            'taiwan',
            'myanmar',
            'north korea',
            'south china sea',
            'kashmir',
            'seoul',
            'tokyo',
            'afghanistan',
            'taliban',
            'armenia',
            'azerbaijan',
            'india',
            'pakistan',
            'china',
            'beijing',
            'japan',
          ],
          'north-america': [
            'usa',
            'united states',
            'canada',
            'mexico',
            'washington',
            'pentagon',
            'congress',
            'border',
            'fbi',
            'cia',
            'north america',
          ],
          'south-america': [
            'venezuela',
            'brazil',
            'colombia',
            'argentina',
            'chile',
            'peru',
            'ecuador',
            'bolivia',
            'guyana',
            'paraguay',
            'uruguay',
            'suriname',
            'south america',
          ],
          africa: [
            'sudan',
            'ethiopia',
            'somalia',
            'nigeria',
            'mali',
            'niger',
            'burkina faso',
            'congo',
            'drc',
            'goma',
            'kenya',
            'uganda',
            'libya',
            'sahel',
            'rsf',
          ],
        };
        const keywords = regionKeywords[activeRegionId] || [];
        const hasKeywordMatch = keywords.some((k) => textToSearch.includes(k));
        const itemRegionLabel = e.region?.toLowerCase();
        const isOtherDefinedRegion =
          itemRegionLabel &&
          itemRegionLabel !== 'global' &&
          itemRegionLabel !== canonicalLabel.toLowerCase();
        if (isOtherDefinedRegion) return false;
        if (!isSameRegion && !hasKeywordMatch) return false;
      }
      if (selectedCategories.size > 0 && !selectedCategories.has(e.category)) return false;

      // Filter by reliability (events without reliability are assumed to be "A" or safe if not specified, 
      // but let's default strictly if we rely on it. For mock data, fallback to 'A' if undefined)
      const rel = e.reliability || 'A';
      if (!selectedReliability.has(rel)) return false;

      // Skip time filter in archive mode
      if (!isArchiveMode && timeRange !== 'all') {
        const eventTime = new Date(e.timestamp).getTime();
        const hoursDiff = (Date.now() - eventTime) / (1000 * 60 * 60);
        if (timeRange === '1h' && hoursDiff > 1) return false;
        if (timeRange === '24h' && hoursDiff > 24) return false;
        if (timeRange === '1w' && hoursDiff > 168) return false;
      }
      return true;
    });
  }, [events, archiveEvents, isArchiveMode, activeRegionId, selectedCategories, timeRange, selectedReliability]);

  const filteredEvents = useMemo(() => {
    if (!timelineRange) return baseFilteredEvents;
    return baseFilteredEvents.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= timelineRange[0].getTime() && t <= timelineRange[1].getTime();
    });
  }, [baseFilteredEvents, timelineRange]);

  const filteredStrategicAssets = useMemo(() => {
    return strategicAssets.filter((asset) => selectedStrategicTypes.has(asset.type));
  }, [strategicAssets, selectedStrategicTypes]);

  const [staggeredEvents, setStaggeredEvents] = useState<MapEvent[]>([]);
  const staggeredEventsRef = useRef<MapEvent[]>([]);

  useEffect(() => {
    staggeredEventsRef.current = staggeredEvents;
  }, [staggeredEvents]);

  useEffect(() => {
    let active = true;

    // Pause rendering and keep map empty while tutorial is visible
    if (showTutorial) {
      setStaggeredEvents([]);
      return;
    }

    const targetIds = new Set(filteredEvents.map((e) => e.id));
    const currentValid = staggeredEventsRef.current.filter((e) => targetIds.has(e.id));
    const validIds = new Set(currentValid.map((e) => e.id));
    const toAdd = filteredEvents.filter((e) => !validIds.has(e.id));

    if (toAdd.length === 0) {
      if (staggeredEventsRef.current.length !== currentValid.length) {
        setStaggeredEvents(currentValid);
      }
      return;
    }

    // Group incoming events by precise coordinates to prevent cluster animation glitches
    const groupedByLocation: Record<string, MapEvent[]> = {};
    toAdd.forEach((e) => {
      const key = `${e.location.lat.toFixed(4)},${e.location.lng.toFixed(4)}`;
      if (!groupedByLocation[key]) groupedByLocation[key] = [];
      groupedByLocation[key].push(e);
    });
    const locationChunks = Object.values(groupedByLocation);

    // Popcorn staggered load for all batches
    setStaggeredEvents([]); // Start empty for dramatic effect

    let chunkIdx = 0;
    const interval = setInterval(() => {
      if (!active) return clearInterval(interval);
      // Drop up to 2 locations at once
      const chunk = locationChunks
        .slice(chunkIdx, chunkIdx + 2)
        .reduce((acc, val) => acc.concat(val), [] as MapEvent[]);

      if (chunk.length === 0) {
        clearInterval(interval);
      } else {
        setStaggeredEvents((curr) => {
          const newIds = new Set(chunk.map((c) => c.id));
          return [...curr.filter((c) => !newIds.has(c.id)), ...chunk];
        });
        chunkIdx += 2;
      }
    }, 400); // Increased interval and grouping by location prevents cluster shaking

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [filteredEvents, showTutorial]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId),
    [events, selectedEventId]
  );

  return (
    <>
      <SEOHead
        title={`PulseMap Tracking - ${REGION_ID_TO_LABEL[activeRegionId] || 'Global'}`}
        description="Analyze real-time geopolitical and military events."
      />
      <div className="flex h-screen w-full bg-[var(--bg)] text-[var(--ink)] overflow-hidden font-sans transition-colors duration-300">
        {/* ── REGION SELECTION FOR NEW VISITORS ── */}
        <RegionSelectionModal
          isOpen={showRegionSelector}
          regions={REGIONS}
          onSelectRegion={(r) => {
            localStorage.setItem('pulsemap_default_region', r.id);
            setCurrentRegion(r);
            setActiveRegionId(r.id);
            setShowRegionSelector(false);
            // If they haven't seen the tutorial, trigger it immediately after region selection
            if (!localStorage.getItem('pulsemap_tutorial_seen')) {
              setShowTutorial(true);
            }
          }}
        />

        {/* ── Initial Loading Overlay ── */}
        <AnimatePresence>
          {isLoading && !showRegionSelector && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0f1a]/95 backdrop-blur-md"
            >
              <div className="relative mb-8">
                <Globe size={48} className="text-blue-500/20 animate-pulse absolute inset-0" />
                <MapIcon size={48} className="text-blue-400 relative z-10 animate-bounce" />
              </div>

              {/* Loader Ring */}
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 border-2 border-white/5 rounded-full" />
                <motion.div
                  className="absolute inset-0 border-2 border-transparent border-t-blue-500 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              {/* Status Text (Cycling) */}
              <motion.div
                key={loadingMsgIdx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-white/60 font-mono text-xs uppercase tracking-[0.2em] mb-2"
              >
                {LOADING_MESSAGES[loadingMsgIdx]}
              </motion.div>

              <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden mt-4">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error Banner with Auto-Retry Countdown (UX-03) ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-center gap-4 px-6 py-3 bg-red-600/90 backdrop-blur-md text-white text-xs font-mono font-bold"
            >
              <span className="uppercase tracking-widest">{error}</span>
              {retryCountdown !== null && (
                <span className="opacity-70">— retrying in {retryCountdown}s</span>
              )}
              <button
                onClick={() => {
                  setRetryCountdown(null);
                  setError(null);
                  fetchAndProcessNews();
                }}
                className="ml-2 px-3 py-1 border border-white/40 rounded-lg hover:bg-white/20 transition-all uppercase tracking-wider text-[10px]"
              >
                Retry Now
              </button>
              <button
                onClick={() => {
                  setError(null);
                  setRetryCountdown(null);
                }}
                className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile Sidebar Drawer ── */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1490] bg-black/40 backdrop-blur-md md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <div
          id="app-sidebar"
          className={[
            // Added id="app-sidebar"
            'fixed md:relative z-[1500] h-full transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)',
            isSidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full md:translate-x-0 shadow-2xl md:shadow-none',
          ].join(' ')}
        >
          <Sidebar
            events={staggeredEvents}
            selectedEventId={selectedEventId}
            onEventClick={(e) => {
              handleEventClick(e);
              setIsSidebarOpen(false);
            }}
            onCloseEvent={closeEvent}
            selectedCategories={selectedCategories}
            onCategorySelect={(cat: EventCategory) => {
              setSelectedCategories((prev) => {
                const next = new Set(prev);
                if (next.has(cat)) next.delete(cat);
                else next.add(cat);
                return next;
              });
            }}
            timeRange={timeRange}
            onTimeRangeSelect={setTimeRange}
            selectedReliability={selectedReliability}
            onReliabilitySelect={(rel: string) => {
              setSelectedReliability((prev) => {
                const next = new Set(prev);
                if (next.has(rel)) next.delete(rel);
                else next.add(rel);
                // Ensure at least one is selected? Up to UX, but let's allow 0
                return next;
              });
            }}
            onClose={() => setIsSidebarOpen(false)}
            isLoading={isLoading}
            isDarkMode={isDarkMode}
            onDarkModeToggle={() => setIsDarkMode((v) => !v)}
            isLiveMode={isLiveMode}
            onLiveModeToggle={() => {
              if (!isArchiveMode) setIsLiveMode((v) => !v);
            }}
            isArchiveMode={isArchiveMode}
            onArchiveToggle={() => {
              if (!user) {
                setAuthModalMode('register');
                setIsAuthModalOpen(true);
                return;
              }
              if (isLiveMode) setIsLiveMode(false);
              setIsArchiveMode((v) => !v);
              setArchiveEvents([]);
              setArchiveError(null);
            }}
            lastSync={lastSync}
            onManualRefresh={fetchAndProcessNews}
            showStrategicAssets={showStrategicAssets}
            onStrategicAssetsToggle={() => setShowStrategicAssets((v) => !v)}
            showHeatmap={showHeatmap}
            onHeatmapToggle={() => setShowHeatmap((v) => !v)}
            selectedStrategicTypes={selectedStrategicTypes}
            onStrategicTypeSelect={(type) => {
              setSelectedStrategicTypes((prev) => {
                const next = new Set(prev);
                if (next.has(type)) next.delete(type);
                else next.add(type);
                return next;
              });
            }}
            onHelpRequested={() => setShowTutorial(true)}
            onLoginRequested={() => {
              if (user) {
                navigate('/admin/dashboard');
              } else {
                setAuthModalMode('login');
                setIsAuthModalOpen(true);
              }
            }}
          />
        </div>

        <main id="app-map-area" className="flex-1 relative flex flex-col min-w-0">
          {' '}
          {/* Added id="app-map-area" */}
          {/* ── TACTICAL TOP BAR ── */}
          <div
            id="app-top-bar"
            className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-3 pointer-events-none md:flex-row md:items-start md:justify-between"
          >
            {' '}
            {/* Added id="app-top-bar" */}
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-3 glass rounded-2xl flex-shrink-0 group hover:bg-[var(--line)] transition-all"
              >
                <Menu size={20} className="group-hover:text-[var(--accent)] transition-colors" />
              </button>

              <div className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl shadow-2xl p-1.5 flex gap-1.5 overflow-x-auto no-scrollbar scroll-smooth items-center">
                {REGIONS.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => handleRegionChange(region)}
                    className={[
                      'px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                      activeRegionId === region.id
                        ? 'bg-[var(--ink)] text-[var(--bg)] shadow-lg shadow-black/20'
                        : 'text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]',
                    ].join(' ')}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>
            {/* ── PROFILE & AUTH SECTION ── */}
            <div className="flex items-center gap-2 pointer-events-auto ml-auto md:ml-0">
              <ExportMenu
                events={baseFilteredEvents}
                user={user}
                onAuthRequired={() => {
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }}
              />

              <div className="relative">
                <button
                  onClick={() =>
                    user ? setIsProfileMenuOpen(!isProfileMenuOpen) : setIsAuthModalOpen(true)
                  }
                  className="bg-[var(--bg-glass)] backdrop-blur-xl border border-[var(--glass-border)] rounded-2xl p-2.5 flex items-center gap-3 shadow-2xl hover:bg-[var(--line)] transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-[var(--bg)] transition-all">
                    <UserIcon size={18} />
                  </div>
                  {user ? (
                    <div className="hidden lg:flex flex-col items-start pr-2">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">
                        {profile?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className="text-[8px] font-mono opacity-40 uppercase tracking-tighter">
                        {profile?.role === 'admin' ? 'Strategic Command' : 'Intelligence Agent'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start pr-2">
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none mt-[1px]">
                        Log In / Sign Up
                      </span>
                    </div>
                  )}
                </button>

                <AnimatePresence>
                  {isProfileMenuOpen && user && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 w-56 glass rounded-[2rem] border border-[var(--glass-border)] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                      <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--accent)]/5">
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">
                          IDENTIFIED AS
                        </div>
                        <div className="text-xs font-bold truncate">{user.email}</div>
                      </div>
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            setIsPrefModalOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--line)] transition-all text-[11px] font-bold uppercase tracking-wider"
                        >
                          <Settings size={14} className="text-[var(--accent)]" />
                          <span>Preferences</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--line)] transition-all text-[11px] font-bold uppercase tracking-wider opacity-40 cursor-not-allowed group">
                          <Bell size={14} />
                          <span>
                            Watchlist{' '}
                            <span className="text-[8px] bg-[var(--line)] px-1.5 py-0.5 rounded ml-1">
                              v2.5
                            </span>
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            signOut();
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-all text-[11px] font-black uppercase tracking-widest"
                        >
                          <LogOut size={14} />
                          <span>Terminate Link</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authModalMode}
          />
          <RegionPreferencesModal
            isOpen={isPrefModalOpen}
            onClose={() => setIsPrefModalOpen(false)}
            regions={REGIONS}
          />

          <GlobalActivityLog
            isOpen={isActivityLogOpen}
            onClose={() => setIsActivityLogOpen(false)}
          />

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            setIsOpen={setIsCommandPaletteOpen}
            actions={{
              toggleTheme: () => setIsDarkMode(prev => !prev),
              toggleDashboard: () => setIsDashboardOpen(prev => !prev),
              toggleActivityLog: () => setIsActivityLogOpen(prev => !prev),
              toggleHeatmap: () => setShowHeatmap(prev => !prev),
              toggleStrategic: () => setShowStrategicAssets(prev => !prev),
              setRegion: (id) => {
                const region = REGIONS.find(r => r.id === id);
                if (region) handleRegionChange(region);
              }
            }}
          />
          <DashboardPortal
            isOpen={isDashboardOpen}
            onClose={() => setIsDashboardOpen(false)}
            widgets={[
              {
                id: 'timeline',
                title: 'Visual Timeline',
                defaultLayout: { x: 0, y: 10, w: 12, h: 2 },
                component: <TimelineView events={events} user={user} isWidget />
              },
              {
                id: 'risk',
                title: 'Risk Analysis Matrix',
                defaultLayout: { x: 0, y: 0, w: 6, h: 4 },
                component: <RiskMatrix events={events} />
              }
            ]}
          />
          {/* ── ARCHIVE DATE PICKER BAR ── */}
          <AnimatePresence>
            {isArchiveMode && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="absolute top-32 md:top-[4.5rem] left-4 right-4 z-[999] pointer-events-auto"
              >
                <div className="glass rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3 border border-amber-400/30 shadow-2xl shadow-amber-900/20">
                  <Archive size={14} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                    Archive Mode
                  </span>
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="opacity-40 uppercase text-[9px] tracking-wider">From</span>
                      <input
                        type="date"
                        value={archiveFrom}
                        max={archiveTo}
                        onChange={(e) => setArchiveFrom(e.target.value)}
                        className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-amber-400/60 cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px) font-mono">
                      <span className="opacity-40 uppercase text-[9px] tracking-wider">To</span>
                      <input
                        type="date"
                        value={archiveTo}
                        min={archiveFrom}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setArchiveTo(e.target.value)}
                        className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-amber-400/60 cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Keyword (optional)..."
                      value={archiveKeyword}
                      onChange={(e) => setArchiveKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchArchive()}
                      className="bg-[var(--line)]/60 border border-[var(--line)] rounded-lg px-2 py-1 text-[10px] font-mono flex-1 min-w-[120px] placeholder:opacity-30 focus:outline-none focus:border-amber-400/60"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchArchive}
                      disabled={archiveLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-500 text-black rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-400 transition-all disabled:opacity-50"
                    >
                      {archiveLoading ? (
                        <>
                          <Loader2 size={11} className="animate-spin" /> Scanning...
                        </>
                      ) : (
                        <>
                          <Search size={11} /> Query
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsArchiveMode(false);
                        setArchiveEvents([]);
                        setArchiveError(null);
                      }}
                      className="p-1.5 hover:bg-[var(--line)] rounded-lg transition-colors opacity-50 hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {archiveError && (
                    <div className="w-full text-[10px] font-mono text-red-400 mt-1 flex items-center gap-2">
                      <X size={10} /> {archiveError}
                    </div>
                  )}
                  {!archiveLoading && !archiveError && archiveEvents.length > 0 && (
                    <div className="w-full text-[10px] font-mono text-amber-400/60 mt-1">
                      {archiveEvents.length} events found · {archiveFrom} → {archiveTo}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <OnboardingTour
            run={showTutorial}
            onFinish={() => setShowTutorial(false)}
          />
          {/* ── MAP AREA ── */}
          <div className="flex-1 relative z-0">
            <Map
              events={staggeredEvents}
              center={[currentRegion.center[0], currentRegion.center[1]]}
              zoom={currentRegion.zoom}
              onEventClick={handleEventClick}
              selectedEventId={selectedEventId}
              isDarkMode={isDarkMode}
              isLiveMode={isLiveMode}
              strategicAssets={filteredStrategicAssets}
              showStrategicAssets={showStrategicAssets && !showHeatmap}
              showHeatmap={showHeatmap}
              liveAircraft={liveAircraft}
              liveShips={liveShips}
            />
          </div>
          {/* ── EVENT DETAIL PANEL (Premium Card) ── */}
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-[2100] flex items-end justify-center pb-0 px-0 md:pb-6 md:px-6"
                onClick={() => setSelectedEventId(null)}
              >
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="glass p-5 md:p-8 max-w-3xl w-full rounded-t-[2rem] md:rounded-[2rem] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] md:shadow-[-20px_20px_60px_rgba(0,0,0,0.5)] overflow-hidden relative mt-auto md:mt-0 border-b-0 md:border-b"
                >
                  {/* Visual Flair */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-40" />
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--accent)] opacity-5 blur-[40px] rounded-full" />

                  <div className="flex flex-col md:flex-row gap-6">
                    {selectedEvent.imageUrl && (
                      <div className="w-full md:w-64 h-44 md:h-auto rounded-2xl overflow-hidden border border-[var(--line)] flex-shrink-0 shadow-lg group">
                        <img
                          src={selectedEvent.imageUrl}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 overflow-y-auto max-h-[75vh] md:max-h-none">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[9px] font-black uppercase tracking-widest">
                              {selectedEvent.category}
                            </span>
                            <span className="text-[10px] font-mono opacity-30 flex items-center gap-1.5">
                              <Clock size={12} />{' '}
                              {new Date(selectedEvent.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <h2 className="text-xl md:text-2xl font-black tracking-tight leading-tight">
                            {selectedEvent.title}
                          </h2>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setSelectedEventId(null);
                          }}
                          className="p-3 hover:bg-[var(--line)] rounded-full transition-colors flex-shrink-0 relative z-[50]"
                          aria-label="Close detail"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <p className="text-sm md:text-base opacity-70 leading-relaxed mb-6 font-medium selection:bg-[var(--accent)] selection:text-white">
                        {selectedEvent.description}
                      </p>

                      <div className="flex items-center justify-between pt-6 border-t border-[var(--line)]">
                        <div className="flex items-center gap-3 text-xs font-bold opacity-50 uppercase tracking-widest">
                          <MapIcon size={16} className="text-[var(--accent)]" />
                          {selectedEvent.location.name}
                        </div>
                        {selectedEvent.sourceUrl && (
                          <a
                            href={selectedEvent.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              trackEvent({
                                userId: user?.id,
                                eventId: selectedEvent.id,
                                actionType: 'view_intel',
                                region: selectedEvent.region,
                                metadata: { source: selectedEvent.sourceUrl },
                              });
                            }}
                            className="px-6 py-3 bg-[var(--ink)] text-[var(--bg)] rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-lg hover:shadow-[var(--accent)]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                          >
                            View Intel <ExternalLink size={12} />
                          </a>
                        )}
                      </div>

                      {/* ── ANALYST COLLABORATION PANEL ── */}
                      {user && (
                        <div className="mt-8 pt-6 border-t border-[var(--line)]">
                          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-4">
                            <MessageSquare size={16} className="text-[var(--accent)]" /> Analyst Actions
                          </h3>

                          <div className="bg-[var(--line)]/10 rounded-xl p-4 space-y-4 border border-[var(--line)]/50">
                            <div className="flex flex-wrap items-center gap-4">
                              <select
                                value={analystData[selectedEvent.id]?.status || 'open'}
                                onChange={(e) => setAnalystData(prev => ({
                                  ...prev,
                                  [selectedEvent.id]: {
                                    status: e.target.value as any,
                                    comments: prev[selectedEvent.id]?.comments || [],
                                    assignee: prev[selectedEvent.id]?.assignee || ''
                                  }
                                }))}
                                className="bg-[var(--bg)] border border-[var(--line)] rounded-lg px-3 py-1.5 text-xs font-bold uppercase focus:border-[var(--accent)] focus:outline-none"
                              >
                                <option value="open">Status: OPEN</option>
                                <option value="in-progress">Status: IN PROGRESS</option>
                                <option value="resolved">Status: RESOLVED</option>
                              </select>

                              <button
                                onClick={() => setAnalystData(prev => ({
                                  ...prev,
                                  [selectedEvent.id]: {
                                    status: prev[selectedEvent.id]?.status || 'open',
                                    comments: prev[selectedEvent.id]?.comments || [],
                                    assignee: user.email?.split('@')[0] || 'Me'
                                  }
                                }))}
                                className="flex items-center gap-2 text-xs font-bold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 rounded-lg px-3 py-1.5 hover:bg-[var(--accent)]/20 transition-all"
                              >
                                {analystData[selectedEvent.id]?.assignee ? `Assigned to: ${analystData[selectedEvent.id].assignee}` : <><UserPlus size={14} /> Assign to me</>}
                              </button>
                            </div>

                            <div className="space-y-3 pt-2">
                              {(analystData[selectedEvent.id]?.comments || []).map(comment => (
                                <div key={comment.id} className="bg-[var(--bg)] p-3 rounded-lg border border-[var(--line)] border-l-2 border-l-[var(--accent)] shadow-sm">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider">{comment.author}</span>
                                    <span className="text-[9px] opacity-50 font-mono tracking-tighter">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-xs opacity-80 leading-relaxed">{comment.text}</p>
                                </div>
                              ))}

                              <div className="relative mt-2">
                                <input
                                  type="text"
                                  value={newCommentText}
                                  onChange={(e) => setNewCommentText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newCommentText.trim()) {
                                      const newC = { id: Date.now().toString(), author: user.email?.split('@')[0] || 'Unknown', text: newCommentText, timestamp: new Date().toISOString() };
                                      setAnalystData(prev => ({
                                        ...prev,
                                        [selectedEvent.id]: {
                                          status: prev[selectedEvent.id]?.status || 'open',
                                          assignee: prev[selectedEvent.id]?.assignee || '',
                                          comments: [...(prev[selectedEvent.id]?.comments || []), newC]
                                        }
                                      }));
                                      setNewCommentText('');
                                    }
                                  }}
                                  placeholder="Add an intel note..."
                                  className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-lg pl-3 pr-10 py-2.5 text-xs focus:border-[var(--accent)] focus:outline-none transition-colors"
                                />
                                <button
                                  onClick={() => {
                                    if (newCommentText.trim()) {
                                      const newC = { id: Date.now().toString(), author: user.email?.split('@')[0] || 'Unknown', text: newCommentText, timestamp: new Date().toISOString() };
                                      setAnalystData(prev => ({
                                        ...prev,
                                        [selectedEvent.id]: {
                                          status: prev[selectedEvent.id]?.status || 'open',
                                          assignee: prev[selectedEvent.id]?.assignee || '',
                                          comments: [...(prev[selectedEvent.id]?.comments || []), newC]
                                        }
                                      }));
                                      setNewCommentText('');
                                    }
                                  }}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--accent)] hover:text-red-400 hover:scale-110 transition-all disabled:opacity-50"
                                  disabled={!newCommentText.trim()}
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <TimelineView
            events={baseFilteredEvents}
            selectedRange={timelineRange}
            onRangeSelect={setTimelineRange}
            user={user}
            onAuthRequired={() => {
              setAuthModalMode('register');
              setIsAuthModalOpen(true);
            }}
          />
        </main>

        {/* ── COPYRIGHT NOTICE ── */}
        <div className="fixed bottom-3 right-3 z-[999] pointer-events-none select-none">
          <span className="text-[9px] font-mono opacity-30 tracking-widest uppercase text-[var(--ink)]">
            © 2026 Onur Çelik · All Rights Reserved
          </span>
        </div>

        {/* ── REAL-TIME ALERT SYSTEM ── */}
        <BreakingAlertSystem
          pendingAlerts={activeAlerts}
          onDismiss={(id) => setActiveAlerts((prev) => prev.filter((a) => a.id !== id))}
          onEventClick={(id) => {
            const event = events.find((e) => e.id === id);
            if (event) handleEventClick(event);
          }}
        />
      </div>
    </>
  );
}
