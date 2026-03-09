import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  LogOut,
  LayoutDashboard,
  MapPin,
  Search,
  Edit2,
  Trash2,
  Users,
  List,
  Map as MapIconView,
  BarChart2,
  TrendingUp,
  MousePointerClick,
  Eye,
  Globe,
  Activity,
  Send,
} from 'lucide-react';
import SEOHead from '../../components/SEOHead';
import EventModal from '../../components/admin/EventModal';
import NotificationsPanel from '../../components/admin/NotificationsPanel';
import TwoFactorSetup from '../../components/auth/TwoFactorSetup';
import Map from '../../components/Map';
import { MapEvent } from '../../types';

// ──────────────────────────────────────────────
// Analytics Tab Component
// ──────────────────────────────────────────────
function AnalyticsTab() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, clicks: 0, views: 0, searches: 0, regions: 0 });
  const [topRegions, setTopRegions] = useState<{ region: string; count: number }[]>([]);
  const [topSearches, setTopSearches] = useState<{ query: string; count: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('event_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      const rows = data || [];
      setAnalytics(rows);
      setRecentActivity(rows.slice(0, 20));

      // Compute stats
      const clicks = rows.filter((r: any) => r.action_type === 'click').length;
      const views = rows.filter((r: any) => r.action_type === 'view_intel').length;
      const searches = rows.filter((r: any) => r.action_type === 'search').length;
      const regionSelects = rows.filter((r: any) => r.action_type === 'region_select').length;
      setStats({ total: rows.length, clicks, views, searches, regions: regionSelects });

      // Top regions
      const regionCounts: Record<string, number> = {};
      rows
        .filter((r: any) => r.region)
        .forEach((r: any) => {
          regionCounts[r.region] = (regionCounts[r.region] || 0) + 1;
        });
      const sortedRegions = Object.entries(regionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([region, count]) => ({ region, count }));
      setTopRegions(sortedRegions);

      // Top searches
      const searchRows = rows.filter((r: any) => r.action_type === 'search' && r.metadata?.query);
      const searchCounts: Record<string, number> = {};
      searchRows.forEach((r: any) => {
        const q = r.metadata.query.toLowerCase().trim();
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      });
      const sortedSearches = Object.entries(searchCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([query, count]) => ({ query, count }));
      setTopSearches(sortedSearches);
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxRegionCount = topRegions[0]?.count || 1;
  const maxSearchCount = topSearches[0]?.count || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-white/30 font-mono text-sm">
        Loading analytics data...
      </div>
    );
  }

  const actionIcon = (type: string) => {
    if (type === 'click') return <MousePointerClick size={12} className="text-blue-400" />;
    if (type === 'view_intel') return <Eye size={12} className="text-green-400" />;
    if (type === 'search') return <Search size={12} className="text-yellow-400" />;
    if (type === 'region_select') return <Globe size={12} className="text-purple-400" />;
    return <Activity size={12} className="text-white/30" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Events',
            value: stats.total,
            color: 'text-white',
            icon: <BarChart2 size={18} className="text-white/30" />,
          },
          {
            label: 'Intel Clicks',
            value: stats.clicks,
            color: 'text-blue-400',
            icon: <MousePointerClick size={18} className="text-blue-400/50" />,
          },
          {
            label: 'Source Views',
            value: stats.views,
            color: 'text-green-400',
            icon: <Eye size={18} className="text-green-400/50" />,
          },
          {
            label: 'Searches',
            value: stats.searches,
            color: 'text-yellow-400',
            icon: <Search size={18} className="text-yellow-400/50" />,
          },
          {
            label: 'Region Selects',
            value: stats.regions,
            color: 'text-purple-400',
            icon: <Globe size={18} className="text-purple-400/50" />,
          },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest">
                {s.label}
              </div>
              {s.icon}
            </div>
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Regions Chart */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-purple-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">
              Top Regions
            </h3>
          </div>
          {topRegions.length === 0 ? (
            <p className="text-white/20 text-xs font-mono text-center py-8">
              No region data yet. Interact with the map to generate data.
            </p>
          ) : (
            <div className="space-y-3">
              {topRegions.map(({ region, count }) => (
                <div key={region}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white/70 capitalize">{region}</span>
                    <span className="text-xs font-mono text-white/40">{count}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxRegionCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Searches */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Search size={16} className="text-yellow-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">
              Trending Searches
            </h3>
          </div>
          {topSearches.length === 0 ? (
            <p className="text-white/20 text-xs font-mono text-center py-8">
              No search data yet. Users need to search in the sidebar to generate data.
            </p>
          ) : (
            <div className="space-y-3">
              {topSearches.map(({ query, count }) => (
                <div key={query}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-white/70">"{query}"</span>
                    <span className="text-xs font-mono text-white/40">{count}x</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxSearchCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-green-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-white/60">
              Live Activity Feed
            </h3>
          </div>
          <button
            onClick={fetchAnalytics}
            className="text-[10px] font-mono text-white/30 hover:text-white/60 transition-colors uppercase tracking-wider"
          >
            Refresh
          </button>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-white/20 text-xs font-mono text-center py-8">
            No activity recorded yet. Users must interact with the map.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-white/20 border-b border-white/5">
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3 pr-4">Action</th>
                  <th className="pb-3 pr-4">Region</th>
                  <th className="pb-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentActivity.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-white/30 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1.5 font-bold text-white/60">
                        {actionIcon(row.action_type)}
                        {row.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-white/40 capitalize">{row.region || '—'}</td>
                    <td className="py-2.5 text-white/30 font-mono truncate max-w-[200px]">
                      {row.metadata?.query ? `"${row.metadata.query}"` : row.event_id || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Main Dashboard
// ──────────────────────────────────────────────
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'pins' | 'users' | 'analytics' | 'notifications'>(
    'pins'
  );
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [usersList, setUsersList] = useState<any[]>([]);
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Events fetch error:', err);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate('/admin/login');
        return;
      }

      // Role check for RBAC
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();

      if (profile?.role !== 'admin' && profile?.role !== 'commander') {
        alert('Access Denied: You do not have permission to view the admin dashboard.');
        navigate('/');
        return;
      }

      setUser(session.user);
      fetchEvents();
      setLoading(false);
    };
    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/admin/login');
      } else {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
        if (profile?.role !== 'admin' && profile?.role !== 'commander') {
          navigate('/');
        } else {
          setUser(session.user);
        }
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (err) {
      alert('Could not delete.');
    }
  };

  const openNewModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(true);
  };
  const openEditModal = (event: any) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const filteredEvents = events.filter(
    (e) =>
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.location_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const mapEvents: MapEvent[] = filteredEvents.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description || '',
    timestamp: event.timestamp,
    category: (event.category || 'military') as any,
    location: { lat: event.lat, lng: event.lng, name: event.location_name },
    hotScore: event.hot_score || 1,
    region: event.region || 'global',
    sourceUrl: event.source_url,
    imageUrl: event.image_url,
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020509] flex items-center justify-center text-white/30 font-mono text-sm uppercase tracking-widest">
        Loading...
      </div>
    );
  }

  const navItems = [
    { key: 'pins', icon: <MapPin size={18} />, label: 'All Pins' },
    { key: 'users', icon: <Users size={18} />, label: 'Users' },
    { key: 'analytics', icon: <BarChart2 size={18} />, label: 'Analytics' },
    { key: 'notifications', icon: <Send size={18} />, label: 'Notifications' },
  ] as const;

  return (
    <>
      <SEOHead title="Dashboard | PulseMap Admin" description="PulseMap Kontrol Merkezi" />
      <div className="min-h-screen bg-[#020509] text-white flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-black/40 p-4 md:p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-8 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={18} />
            </div>
            <span className="font-black uppercase tracking-wider text-sm">PM-ADMIN</span>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map(({ key, icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-left transition-colors ${activeTab === key
                  ? 'bg-white/10 text-white'
                  : 'text-white/30 hover:bg-white/5 hover:text-white/70'
                  }`}
              >
                <span className={activeTab === key ? 'text-red-400' : 'text-white/20'}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="text-[10px] text-white/20 font-mono mb-3 truncate">{user?.email}</div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2.5 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-8 md:h-screen md:overflow-y-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-wide mb-1">
                {activeTab === 'pins'
                  ? 'Pin Management'
                  : activeTab === 'users'
                    ? 'User Management'
                    : activeTab === 'analytics'
                      ? 'Analytics'
                      : 'Notifications'}
              </h1>
              <p className="text-sm text-white/30 font-mono">
                {activeTab === 'pins'
                  ? 'Manage all intelligence and conflict events on the map.'
                  : activeTab === 'users'
                    ? 'View registered users, preferences and profile data.'
                    : activeTab === 'analytics'
                      ? 'User behavior, trending searches, and engagement metrics.'
                      : 'Send email briefings and Telegram alerts to subscribers.'}
              </p>
            </div>
            {activeTab === 'pins' && (
              <button
                onClick={openNewModal}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-black uppercase tracking-wide transition-colors shadow-[0_0_20px_rgba(239,68,68,0.2)]"
              >
                + Add New Pin
              </button>
            )}
          </div>

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <NotificationsPanel
              recentEvents={events.slice(0, 10).map((e) => ({
                title: e.title,
                category: e.category || 'military',
                region: e.region || 'global',
                sourceUrl: e.source_url,
                timestamp: e.timestamp,
              }))}
            />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && <AnalyticsTab />}

          {/* Pins Tab */}
          {activeTab === 'pins' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-1">
                    Total Pins
                  </div>
                  <div className="text-3xl font-black">{events.length}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-1">
                    Last 24 Hours
                  </div>
                  <div className="text-3xl font-black text-green-400">
                    {
                      events.filter((e) => new Date(e.timestamp) > new Date(Date.now() - 86400000))
                        .length
                    }
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                  >
                    <List size={14} /> Table
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'map' ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white'}`}
                  >
                    <MapIconView size={14} /> Map
                  </button>
                </div>
                <div className="relative w-full md:w-80">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title or location..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/20 font-mono"
                  />
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
                {viewMode === 'table' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-black/40 text-[10px] uppercase tracking-widest font-bold text-white/20 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Title / Location</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredEvents.map((event) => (
                          <tr key={event.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-mono text-xs text-white/30">
                              {new Date(event.timestamp).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/60">
                                {event.category}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold truncate max-w-xs">{event.title}</div>
                              <div className="text-xs font-mono text-white/30 truncate max-w-xs">
                                {event.location_name}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${event.status === 'published' ? 'text-green-400 bg-green-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}
                              >
                                {event.status || 'draft'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(event)}
                                className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors inline-block"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors inline-block"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {filteredEvents.length === 0 && (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-12 text-center text-white/20 font-mono"
                            >
                              No results found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="h-[600px] relative z-0">
                    <Map
                      events={mapEvents}
                      center={[30, 20]}
                      zoom={3}
                      onEventClick={(e) => {
                        const original = events.find((ev) => ev.id === e.id);
                        if (original) openEditModal(original);
                      }}
                      isDarkMode={true}
                      isLiveMode={false}
                      strategicAssets={[]}
                      showStrategicAssets={false}
                      liveAircraft={[]}
                      liveShips={[]}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-1">
                    Total Users
                  </div>
                  <div className="text-3xl font-black">{usersList.length}</div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 p-5 rounded-2xl">
                  <div className="text-[10px] uppercase font-bold text-white/30 tracking-widest mb-1">
                    Admins
                  </div>
                  <div className="text-3xl font-black text-red-400">
                    {usersList.filter((u) => u.role === 'admin').length}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden mb-8">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/40 text-[10px] uppercase tracking-widest font-bold text-white/20 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4">Join Date</th>
                        <th className="px-6 py-4">Full Name</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Regions</th>
                        <th className="px-6 py-4">Notifications</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-white/30">
                            {new Date(u.updated_at || Date.now()).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 font-bold">{u.full_name || '—'}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-red-400 bg-red-400/10' : 'text-white/40 bg-white/10'}`}
                            >
                              {u.role || 'user'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-white/40 text-xs">
                            {u.preferences?.regions?.join(', ') || '—'}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <span
                              className={`mr-2 ${u.preferences?.notifications?.email ? 'text-green-400' : 'text-white/20'}`}
                            >
                              📧 Email
                            </span>
                            <span
                              className={
                                u.preferences?.notifications?.telegram
                                  ? 'text-blue-400'
                                  : 'text-white/20'
                              }
                            >
                              ✈️ Telegram
                            </span>
                          </td>
                        </tr>
                      ))}
                      {usersList.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-12 text-center text-white/20 font-mono"
                          >
                            No users found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-lg font-black uppercase tracking-wide mb-4 text-white/80">Security Settings</h2>
                <TwoFactorSetup />
              </div>
            </>
          )}
        </div>
      </div>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        eventToEdit={selectedEvent}
        onSaved={() => fetchEvents()}
      />
    </>
  );
}
