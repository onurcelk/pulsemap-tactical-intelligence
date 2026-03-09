import { useState, useMemo, useEffect, useRef } from 'react';
import { MapEvent, EventCategory, TimeRange } from '../types';
import EventCard from './EventCard';
import {
  Search,
  X,
  Clock,
  Bell,
  Languages,
  Check,
  AlertCircle,
  Sun,
  Moon,
  Radio,
  Archive,
  RefreshCw,
  Globe,
  Crosshair,
  Flame,
  Users,
  Landmark,
  Heart,
  Rocket,
  Zap,
  Gem,
  Anchor,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  User,
  Lock,
  Terminal,
  LayoutPanelLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { trackEvent } from '../lib/analytics';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  events: MapEvent[];
  selectedEventId?: string | null;
  onEventClick?: (event: MapEvent) => void;
  onCloseEvent?: () => void;
  onClose?: () => void;
  selectedCategories?: Set<string>;
  onCategorySelect?: (category: EventCategory) => void;
  timeRange?: TimeRange;
  onTimeRangeSelect?: (range: TimeRange) => void;
  isLoading?: boolean;
  isDarkMode?: boolean;
  onDarkModeToggle?: () => void;
  isLiveMode?: boolean;
  onLiveModeToggle?: () => void;
  isArchiveMode?: boolean;
  onArchiveToggle?: () => void;
  lastSync?: Date | null;
  onManualRefresh?: () => void;
  showStrategicAssets?: boolean;
  onStrategicAssetsToggle?: () => void;
  showHeatmap?: boolean;
  onHeatmapToggle?: () => void;
  selectedStrategicTypes?: Set<string>;
  onStrategicTypeSelect?: (type: string) => void;
  selectedReliability?: Set<string>;
  onReliabilitySelect?: (rel: string) => void;
  onHelpRequested?: () => void;
  onLoginRequested?: () => void;
}

const CATEGORIES = [
  {
    id: 'military' as EventCategory,
    label: 'Military',
    dotClass: 'bg-red-500',
    icon: Crosshair,
    activeClass: 'border-red-500/70 bg-red-500/15 text-red-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'explosion' as EventCategory,
    label: 'Explosion',
    dotClass: 'bg-orange-500',
    icon: Flame,
    activeClass: 'border-orange-500/70 bg-orange-500/15 text-orange-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'protest' as EventCategory,
    label: 'Protest',
    dotClass: 'bg-blue-500',
    icon: Users,
    activeClass: 'border-blue-500/70 bg-blue-500/15 text-blue-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'politics' as EventCategory,
    label: 'Politics',
    dotClass: 'bg-purple-500',
    icon: Landmark,
    activeClass: 'border-purple-500/70 bg-purple-500/15 text-purple-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'humanitarian' as EventCategory,
    label: 'Aid',
    dotClass: 'bg-emerald-500',
    icon: Heart,
    activeClass: 'border-emerald-500/70 bg-emerald-500/15 text-emerald-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
];

const STRATEGIC_TYPES = [
  {
    id: 'nuclear',
    label: 'Nuclear',
    icon: Radio,
    activeClass: 'border-yellow-400/60 bg-yellow-400/10 text-yellow-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'military',
    label: 'Base',
    icon: Crosshair,
    activeClass: 'border-indigo-400/60 bg-indigo-400/10 text-indigo-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'space',
    label: 'Space',
    icon: Rocket,
    activeClass: 'border-pink-400/60 bg-pink-400/10 text-pink-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'oil',
    label: 'Energy',
    icon: Zap,
    activeClass: 'border-slate-400/60 bg-slate-400/10 text-slate-300',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'mining',
    label: 'Resources',
    icon: Gem,
    activeClass: 'border-orange-400/60 bg-orange-400/10 text-orange-500',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
  {
    id: 'chokepoint',
    label: 'Chokepoint',
    icon: Anchor,
    activeClass: 'border-teal-400/60 bg-teal-400/10 text-teal-400',
    inactiveClass:
      'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
  },
];

const TIME_FILTERS: { id: TimeRange; label: string }[] = [
  { id: '1h', label: '1H' },
  { id: '24h', label: '24H' },
  { id: '1w', label: '1W' },
  { id: 'all', label: 'All' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Turkish' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh-CN', label: '简体中文' },
];

export default function Sidebar({
  events,
  selectedEventId,
  onEventClick,
  onCloseEvent,
  onClose,
  selectedCategories = new Set(),
  onCategorySelect,
  timeRange = 'all',
  onTimeRangeSelect,
  isLoading = false,
  isDarkMode = true,
  onDarkModeToggle,
  isLiveMode = false,
  onLiveModeToggle,
  isArchiveMode = false,
  onArchiveToggle,
  lastSync,
  onManualRefresh,
  showStrategicAssets = false,
  onStrategicAssetsToggle,
  showHeatmap = false,
  onHeatmapToggle,
  selectedStrategicTypes = new Set(),
  onStrategicTypeSelect,
  selectedReliability = new Set(['A', 'B', 'C']),
  onReliabilitySelect,
  onHelpRequested,
  onLoginRequested,
}: SidebarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('en');
  // Mobile: collapsible filter panel
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim()) {
        trackEvent({
          userId: user?.id,
          actionType: 'search',
          metadata: { query: query.trim() },
        });
      }
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, user]);

  const filtered = useMemo(() => {
    let result = [...events];
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      const aScore = (a as any).hotScore || 1;
      const bScore = (b as any).hotScore || 1;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }, [events, debouncedQuery]);

  const handleLangChange = (code: string) => {
    setCurrentLang(code);
    setIsLangMenuOpen(false);
    // @ts-ignore
    if (window.triggerTranslate) {
      // @ts-ignore
      window.triggerTranslate(code);
    }
  };

  const activeFiltersCount = selectedCategories.size + (selectedStrategicTypes.size < 6 ? 1 : 0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] border-r border-[var(--line)] w-80 md:w-[400px] shadow-2xl relative overflow-hidden transition-colors">
      {/* ── Security Scan Line ── */}
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-20 animate-pulse pointer-events-none" />

      {/* ── HEADER (compact on mobile) ── */}
      <div className="px-3 py-2 md:px-5 md:py-4 border-b border-[var(--line)] bg-[var(--bg)]/50 backdrop-blur-md z-10 flex-shrink-0">
        {/* Top row: logo + controls */}
        <div className="flex items-center justify-between mb-2 md:mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center shadow-lg shadow-red-500/20 flex-shrink-0">
              <Bell size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-extrabold tracking-tight leading-none uppercase">
                PulseMap
              </h1>
              <p className="text-[8px] font-mono tracking-[0.15em] opacity-40 uppercase">
                Tactical Analysis
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onHelpRequested}
              className="p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors"
              title="Tutorial"
            >
              <HelpCircle size={14} />
            </button>
            <button
              id="sidebar-dashboard-toggle"
              onClick={() => (window as any).toggleDashboard?.()}
              className="p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors flex items-center gap-1.5 group"
              title="Strategic Dashboard"
            >
              <LayoutPanelLeft size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Portal</span>
            </button>
            <button
              id="sidebar-activity-toggle"
              onClick={() => (window as any).toggleActivityLog?.()}
              className="p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors flex items-center gap-1.5 group"
              title="Global Activity Log"
            >
              <Terminal size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Console</span>
            </button>
            <button
              onClick={onLoginRequested}
              className={`px-3 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-1.5 ${user ? 'text-[var(--accent)] bg-[var(--accent)]/10 border border-[var(--accent)]/30 hover:bg-[var(--accent)]/20' : 'bg-[var(--accent)] text-white hover:bg-red-500 shadow-lg shadow-red-500/20 hover:scale-105 active:scale-95'}`}
              title={user ? 'User Profile' : 'User Login'}
            >
              <User size={14} />
              {!user && <span>Log In / Sign Up</span>}
            </button>
            <div className="relative">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className={`p-1.5 text-[var(--ink-dim)] hover:bg-[var(--line)] rounded hover:text-[var(--ink)] transition-colors flex items-center gap-0.5 ${isLangMenuOpen ? 'bg-[var(--line)]' : 'opacity-80'}`}
              >
                <Languages size={14} />
                <span className="text-[9px] font-mono font-bold uppercase hidden sm:inline">
                  {currentLang}
                </span>
              </button>
              <AnimatePresence>
                {isLangMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 8 }}
                    className="absolute right-0 mt-1 w-44 glass rounded-xl shadow-2xl z-[100] border border-[var(--line)] overflow-hidden"
                  >
                    <div className="p-1.5 space-y-0.5">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleLangChange(lang.code)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentLang === lang.code ? 'bg-[var(--accent)] text-white' : 'hover:bg-[var(--line)] opacity-60 hover:opacity-100'}`}
                        >
                          {lang.label}
                          {currentLang === lang.code && <Check size={11} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden p-1.5 hover:bg-[var(--line)] rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Search + Filter toggle row */}
        <div id="sidebar-filter-toggle" className="flex gap-2 items-center">
          <div className="relative flex-1 group">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity"
              size={13}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: city / country / keyword..."
              className="w-full pl-8 pr-7 py-2 bg-[var(--line)]/30 border border-[var(--line)] rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all placeholder:text-[var(--ink-dim)]/50"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Mobile filter toggle button */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${filtersOpen ? 'bg-[var(--accent)]/10 border-[var(--accent)]/40 text-[var(--accent)]' : 'border-[var(--line)] text-[var(--ink-dim)] hover:bg-[var(--line)]/50'}`}
          >
            {filtersOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            <span className="hidden sm:inline">Filters</span>
            {activeFiltersCount > 0 && !filtersOpen && (
              <span className="w-4 h-4 rounded-full bg-[var(--accent)] text-white text-[9px] flex items-center justify-center leading-none">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible filters */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 flex flex-col gap-3" id="sidebar-filters">
                {/* Time filters */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest flex-shrink-0">
                    Time
                  </span>
                  <div className="flex gap-1">
                    {TIME_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => onTimeRangeSelect?.(f.id)}
                        className={[
                          'px-3 py-1 rounded-lg text-[10px] font-bold transition-all border uppercase tracking-tighter',
                          timeRange === f.id
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
                        ].join(' ')}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category filters */}
                <div>
                  <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">
                    Categories
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {CATEGORIES.map((cat) => {
                      const isActive = selectedCategories.has(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => onCategorySelect?.(cat.id)}
                          className={[
                            'px-2 py-1 rounded-lg text-[9px] uppercase font-bold tracking-widest border transition-all flex items-center gap-1.5',
                            isActive ? cat.activeClass : cat.inactiveClass,
                          ].join(' ')}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${cat.dotClass} ${isActive ? 'opacity-100' : 'opacity-70'}`}
                          />
                          <cat.icon size={11} strokeWidth={2.5} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reliability Score */}
                <div>
                  <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">
                    Reliability Score
                  </span>
                  <div className="flex gap-1.5 mt-1.5">
                    {['A', 'B', 'C'].map((rel) => {
                      const isActive = selectedReliability.has(rel);
                      const colors: Record<string, string> = {
                        A: 'text-green-400 border-green-400/50 bg-green-400/10 hover:bg-green-400/20',
                        B: 'text-yellow-400 border-yellow-400/50 bg-yellow-400/10 hover:bg-yellow-400/20',
                        C: 'text-orange-400 border-orange-400/50 bg-orange-400/10 hover:bg-orange-400/20',
                      };
                      const activeClass = colors[rel] || '';
                      return (
                        <button
                          key={rel}
                          onClick={() => onReliabilitySelect?.(rel)}
                          className={[
                            'px-3 py-1 rounded-lg text-[10px] font-black tracking-widest border transition-all',
                            isActive
                              ? activeClass
                              : 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50',
                          ].join(' ')}
                        >
                          {rel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Strategic assets */}
                <div id="sidebar-strategic">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-mono opacity-30 uppercase tracking-widest">
                      Strategic Assets
                    </span>
                    <button
                      onClick={onStrategicAssetsToggle}
                      className={`text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border transition-all ${showStrategicAssets ? 'border-indigo-400/60 bg-indigo-400/10 text-indigo-400' : 'border-[var(--line)] text-[var(--ink-dim)] opacity-50 hover:opacity-100'}`}
                    >
                      {showStrategicAssets ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {STRATEGIC_TYPES.map((type) => {
                      const isActive = selectedStrategicTypes.has(type.id);
                      return (
                        <button
                          key={type.id}
                          onClick={() => onStrategicTypeSelect?.(type.id)}
                          className={`px-2 py-1 rounded-md text-[8px] uppercase font-bold tracking-widest border transition-all flex items-center gap-1 ${isActive ? type.activeClass : 'border-[var(--line)] text-[var(--ink-dim)] hover:text-[var(--ink)] bg-[var(--line)]/10 hover:bg-[var(--line)]/30'}`}
                        >
                          <type.icon size={10} strokeWidth={2.5} />
                          {type.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LIVE INTEL FEED (flex-1, fills remaining space, scrollable) ── */}
      <div
        id="sidebar-intel-feed"
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scroll-smooth relative"
      >
        <div className="px-3 py-2 flex items-center justify-between sticky top-0 bg-[var(--bg)]/90 backdrop-blur-md z-[5] border-b border-[var(--line)]/50">
          <span className="text-[10px] font-mono font-black uppercase tracking-[0.2em] opacity-40">
            Live Intel Feed
          </span>
          <span className="text-[9px] font-mono opacity-20">{filtered.length} NODES</span>
        </div>

        <div className="p-2 md:p-3 space-y-2">
          <AnimatePresence mode="popLayout">
            {isLoading && events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center flex flex-col items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full border border-[var(--line)] flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border border-[var(--accent)] animate-ping opacity-20" />
                  <Clock className="opacity-20" size={20} />
                </div>
                <p className="text-xs font-mono opacity-30 uppercase tracking-widest">
                  Synchronizing...
                </p>
              </motion.div>
            ) : events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center flex flex-col items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full border border-[var(--line)] flex items-center justify-center">
                  <AlertCircle className="opacity-20 animate-pulse" size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-mono opacity-80 uppercase tracking-widest text-[var(--accent)]">
                    No Intel Detected
                  </p>
                  <p className="text-[10px] font-mono opacity-30 uppercase tracking-tighter">
                    Current sector telemetry is silent.
                  </p>
                </div>
                {!isLiveMode && (
                  <button
                    onClick={onLiveModeToggle}
                    className="mt-2 px-4 py-2 border border-[var(--accent)]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-all"
                  >
                    Activate Radar Sweep
                  </button>
                )}
              </motion.div>
            ) : filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-8 text-center opacity-30"
              >
                <p className="text-sm font-mono tracking-widest uppercase">No Signal Matches</p>
              </motion.div>
            ) : (
              <div className="divide-y divide-[var(--line)]">
                {filtered.map((event, idx) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.5) }}
                    layout
                  >
                    <EventCard
                      event={event}
                      isSelected={selectedEventId === event.id}
                      onClick={onEventClick}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── MODE CONTROLS STRIP ── */}
      <div
        id="sidebar-mode-strip"
        className="border-t border-[var(--line)] px-3 py-2 flex items-center gap-1.5 bg-[var(--bg)]/60 backdrop-blur-md flex-shrink-0"
      >
        <button
          onClick={onDarkModeToggle}
          className="p-2 rounded-xl hover:bg-[var(--line)] transition-all group flex-shrink-0"
          title="Dark/Light"
        >
          {isDarkMode ? (
            <Sun
              size={15}
              className="text-yellow-400 group-hover:rotate-90 transition-transform duration-300"
            />
          ) : (
            <Moon size={15} className="text-slate-500" />
          )}
        </button>

        <button
          onClick={onStrategicAssetsToggle}
          className={[
            'p-2 rounded-xl transition-all flex-shrink-0',
            showStrategicAssets
              ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30'
              : 'hover:bg-[var(--line)] opacity-40 hover:opacity-100',
          ].join(' ')}
          title="Strategic Assets"
        >
          <Globe size={15} className={showStrategicAssets ? 'animate-spin-slow' : ''} />
        </button>

        <button
          onClick={onHeatmapToggle}
          className={[
            'p-2 rounded-xl transition-all flex-shrink-0',
            showHeatmap
              ? 'bg-red-500/20 text-red-500 ring-1 ring-red-500/30'
              : 'hover:bg-[var(--line)] opacity-40 hover:opacity-100',
          ].join(' ')}
          title="Density Heatmap"
        >
          <Flame size={15} />
        </button>

        <div className="w-px h-4 bg-[var(--line)] flex-shrink-0" />

        <button
          onClick={onArchiveToggle}
          className={[
            'flex items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all flex-shrink-0 relative group/archive',
            isArchiveMode
              ? 'bg-amber-400/15 text-amber-400 border border-amber-400/30'
              : 'hover:bg-[var(--line)] opacity-50 hover:opacity-100',
          ].join(' ')}
          title={!user ? "Authentication Required" : "Archive"}
        >
          {!user ? <Lock size={12} className="text-red-400" /> : <Archive size={13} />}
          <span className="hidden sm:inline">Archive</span>
        </button>

        <button
          onClick={onLiveModeToggle}
          disabled={isArchiveMode}
          className={[
            'flex items-center gap-1 px-2 py-2 rounded-xl text-[10px] font-black font-mono uppercase tracking-wider transition-all flex-1 justify-center',
            isLiveMode
              ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30'
              : 'hover:bg-[var(--line)] opacity-50 hover:opacity-100',
            isArchiveMode ? 'cursor-not-allowed opacity-20 pointer-events-none' : '',
          ].join(' ')}
        >
          <div className="relative flex-shrink-0">
            {isLiveMode && (
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-40" />
            )}
            <div
              className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-[var(--accent)]' : 'bg-gray-400'}`}
            />
          </div>
          <span>{isLiveMode ? 'Active' : 'Engage'}</span>
        </button>

        <button
          onClick={onManualRefresh}
          disabled={isLoading || isArchiveMode}
          className="p-2 rounded-xl hover:bg-[var(--line)] opacity-50 hover:opacity-100 transition-all flex-shrink-0 disabled:opacity-20 disabled:pointer-events-none"
          title={lastSync ? `Last sync: ${lastSync.toLocaleTimeString()}` : 'Refresh'}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin text-[var(--accent)]' : ''} />
        </button>
      </div>

      {/* ── FOOTER ── */}
      <div className="px-3 py-1.5 border-t border-[var(--line)] flex items-center justify-between bg-[var(--bg)]/80 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse shadow-[0_0_8px_var(--success)]" />
          <span className="text-[8px] font-mono font-bold opacity-30 uppercase tracking-tighter">
            All Systems Nominal
          </span>
        </div>
        <div className="text-[8px] font-mono opacity-10">v2.4.0</div>
      </div>
    </div>
  );
}
