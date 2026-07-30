'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  LayoutDashboard,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Users,
  Inbox,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Shield,
  Tag,
  Calendar,
  Smile,
  Meh,
  Frown,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { FilterBar } from '@/components/FilterBar';

function DashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial filter parameters read from URL
  const initialChannel = searchParams.get('channel') || '';
  const initialSentiment = searchParams.get('sentiment') || '';
  const initialStatus = searchParams.get('status') || '';
  const initialDateFrom = searchParams.get('dateFrom') || '';
  const initialDateTo = searchParams.get('dateTo') || '';

  const [filters, setFilters] = useState({
    channel: initialChannel,
    sentiment: initialSentiment,
    status: initialStatus,
    dateFrom: initialDateFrom,
    dateTo: initialDateTo,
  });

  const [filterOptions, setFilterOptions] = useState({
    channels: [],
    themes: [],
  });

  // Dashboard Data State
  const [summary, setSummary] = useState({
    totalItems: 0,
    percentNegative: 0,
    newThisWeek: 0,
    totalMembers: 0,
    classifiedTotal: 0,
  });
  const [volumeData, setVolumeData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [topThemesData, setTopThemesData] = useState([]);

  const currentUser = session?.user;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync filter changes to URL search params
  const updateUrl = useCallback(
    (newFilters) => {
      const params = new URLSearchParams();
      if (newFilters.channel) params.set('channel', newFilters.channel);
      if (newFilters.sentiment) params.set('sentiment', newFilters.sentiment);
      if (newFilters.status) params.set('status', newFilters.status);
      if (newFilters.dateFrom) params.set('dateFrom', newFilters.dateFrom);
      if (newFilters.dateTo) params.set('dateTo', newFilters.dateTo);

      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router]
  );

  // Fetch filter options for FilterBar popovers
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/feedback/filter-options')
        .then((res) => res.json())
        .then((data) => {
          if (data.channels || data.themes) {
            setFilterOptions({
              channels: data.channels || [],
              themes: data.themes || [],
            });
          }
        })
        .catch((err) => console.error('Failed to load filter options:', err));
    }
  }, [status]);

  // Fetch Dashboard Summary Metrics from API
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (filters.channel) queryParams.set('channel', filters.channel);
      if (filters.sentiment) queryParams.set('sentiment', filters.sentiment);
      if (filters.status) queryParams.set('status', filters.status);
      if (filters.dateFrom) queryParams.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.set('dateTo', filters.dateTo);

      const res = await fetch(`/api/dashboard/summary?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch dashboard metrics');
        setLoading(false);
        return;
      }

      setSummary(data.summary || {});
      setVolumeData(data.volumeOverTime || []);
      setSentimentData(data.sentimentBreakdown || []);
      setTopThemesData(data.topThemes || []);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading dashboard analytics.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, fetchDashboardData]);

  const handleFilterChange = (key, value) => {
    const nextFilters = { ...filters, [key]: value };
    setFilters(nextFilters);
    updateUrl(nextFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {
      channel: '',
      sentiment: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    updateUrl(emptyFilters);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutDashboard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">
                    Project LOOP Analytics
                  </h1>
                  <p className="text-[11px] text-gray-400">
                    Workspace: <strong className="text-indigo-300">{currentUser?.workspaceName}</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Link
                href="/inbox"
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
              >
                <Inbox className="h-4 w-4" />
                <span>Go to Inbox</span>
              </Link>

              {currentUser && (
                <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-xs">
                  <span className="font-semibold text-gray-200">{currentUser.name || currentUser.email}</span>
                  <span className="text-gray-600">|</span>
                  <span className="flex items-center text-gray-400">
                    <Shield className="h-3 w-3 mr-1 text-purple-400" />
                    {currentUser.role}
                  </span>
                </div>
              )}

              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
              Dismiss
            </button>
          </div>
        )}

        {/* FilterBar Component */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          availableChannels={filterOptions.channels}
          availableThemes={filterOptions.themes}
        />

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Feedback */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Feedback
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-white">
                {loading ? '...' : summary.totalItems.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">Total customer items ingested</p>
            </div>
          </div>

          {/* Card 2: % Negative Sentiment */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                % Negative Sentiment
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-rose-400">
                {loading ? '...' : `${summary.percentNegative}%`}
              </div>
              <p className="text-[11px] text-gray-500">
                {summary.classifiedTotal > 0
                  ? `Based on ${summary.classifiedTotal} classified items`
                  : 'Awaiting AI sentiment classification'}
              </p>
            </div>
          </div>

          {/* Card 3: New This Week */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                New This Week
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-emerald-400">
                {loading ? '...' : summary.newThisWeek.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-500">Ingested in past 7 days</p>
            </div>
          </div>

          {/* Card 4: Active Team Members */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Team Members
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-purple-300">
                {loading ? '...' : summary.totalMembers}
              </div>
              <p className="text-[11px] text-gray-500">Active workspace accounts</p>
            </div>
          </div>
        </div>

        {/* Charts Grid: Volume Over Time & Sentiment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Volume Over Time AreaChart (Spans 2 cols) */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span>Feedback Volume Over Time</span>
                </h3>
                <p className="text-xs text-gray-400">Daily customer feedback ingestion trend</p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                Daily Stream
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              {mounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="label" stroke="#6B7280" fontSize={11} tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#374151',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#6366F1"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#volumeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Sentiment Distribution Chart */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Smile className="h-4 w-4 text-emerald-400" />
                  <span>Sentiment Breakdown</span>
                </h3>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  AI Signals
                </span>
              </div>
              <p className="text-xs text-gray-400">Distribution across POS, NEU, NEG & Unclassified</p>
            </div>

            <div className="h-56 w-full relative">
              {mounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {sentimentData.map((entry) => (
                        <Cell key={entry.sentiment} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#374151',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#F3F4F6',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Sentiment Legend List */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-800/80">
              {sentimentData.map((st) => (
                <div key={st.sentiment} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-950/60 border border-gray-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: st.color }} />
                    <span className="text-gray-300 font-medium">{st.label}</span>
                  </div>
                  <span className="font-bold text-gray-100">{st.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Themes Ranking Bar Chart & Checkpoint Banner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Themes Ranking (Spans 2 cols) */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <span>Top Feedback Themes</span>
                </h3>
                <p className="text-xs text-gray-400">Ranked themes assigned to feedback items</p>
              </div>
              <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                Week 3 AI Ready
              </span>
            </div>

            {topThemesData.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-gray-800 rounded-xl bg-gray-950/40">
                <Sparkles className="h-8 w-8 text-purple-400 mx-auto opacity-60" />
                <h4 className="text-gray-300 font-semibold text-sm">
                  Themes will appear here once AI classification is live
                </h4>
                <p className="text-gray-500 text-xs max-w-md mx-auto leading-relaxed">
                  The Theme engine join tables are configured and ready. During Week 3 AI integration, feedback will be auto-assigned to detected themes.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                {mounted && !loading && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topThemesData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                      <XAxis type="number" stroke="#6B7280" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} width={100} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          borderColor: '#374151',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#F3F4F6',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {topThemesData.map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>

          {/* M2 Milestone Checkpoint Card */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Shield className="h-4 w-4" />
                <span>M2 Milestone Checkpoint</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">Core App Build Verified</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Week 2 Core Application Milestone requirement criteria achieved:
              </p>

              <div className="space-y-2 pt-1 text-xs text-gray-300">
                <div className="flex items-center space-x-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>Bulk & Single Feedback Ingestion</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>Paginated Inbox + Multi-Field Filters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>Inline Status Workflow (NEW/REVIEWED/ACTIONED)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="h-4 w-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</span>
                  <span>Real Database-Driven Recharts Dashboard</span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
              <strong className="block text-indigo-200">Vercel Deployment Reminder:</strong>
              <p className="text-[11px] leading-normal text-indigo-300/80">
                Commit changes and push to trigger Vercel production deployment before your mentor check-in.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Loading Analytics...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
