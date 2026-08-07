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
  FileText,
  Ticket,
  Star,
  Award,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { FilterBar } from '@/components/FilterBar';

// Channel configurations matching Inbox UI aesthetics
const channelConfig = {
  support_ticket: { label: 'Support Ticket', icon: Ticket, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  app_review: { label: 'App Review', icon: Star, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  nps_survey: { label: 'NPS Survey', icon: Award, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  sales_note: { label: 'Sales Note', icon: TrendingUp, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  community_post: { label: 'Community Post', icon: Users, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial filter parameters from URL
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
    percentClassified: 0,
  });
  const [volumeData, setVolumeData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);
  const [topThemesData, setTopThemesData] = useState([]);
  const [recentFeedback, setRecentFeedback] = useState([]);

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

  // Fetch Dashboard Summary Metrics & Recent Feedback from API
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

      // Fetch summary and recent feedback in parallel
      const [resSummary, resInbox] = await Promise.all([
        fetch(`/api/dashboard/summary?${queryParams.toString()}`),
        fetch(`/api/feedback?limit=4`),
      ]);

      const dataSummary = await resSummary.json();
      const dataInbox = await resInbox.json();

      if (!resSummary.ok) {
        setError(dataSummary.error || 'Failed to fetch dashboard metrics');
        setLoading(false);
        return;
      }

      setSummary(dataSummary.summary || {});
      setVolumeData(dataSummary.volumeOverTime || []);
      setSentimentData(dataSummary.sentimentBreakdown || []);
      setTopThemesData(dataSummary.topThemes || []);

      if (resInbox.ok && dataInbox.items) {
        setRecentFeedback(dataInbox.items.slice(0, 4));
      }
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
      {/* Top Glassmorphism Navigation Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Workspace Badge */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-extrabold text-white leading-tight tracking-tight">
                    Project LOOP Analytics
                  </h1>
                  <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Workspace</span>
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Workspace: <strong className="text-indigo-300 font-semibold">{currentUser?.workspaceName || 'Default'}</strong>
                </p>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center space-x-3">
              <Link
                href="/ask"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-semibold text-xs border border-indigo-500/30 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask LOOP</span>
              </Link>

              <Link
                href="/reports"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 font-semibold text-xs border border-pink-500/30 transition-all hover:scale-[1.02]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Reports</span>
              </Link>

              <Link
                href="/themes"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold text-xs border border-purple-500/30 transition-all hover:scale-[1.02]"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Themes</span>
              </Link>

              <Link
                href="/settings/members"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 font-semibold text-xs border border-cyan-500/30 transition-all hover:scale-[1.02]"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Members</span>
              </Link>

              <Link
                href="/inbox"
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/25 hover:scale-[1.02]"
              >
                <Inbox className="h-4 w-4" />
                <span>Go to Inbox</span>
              </Link>

              {currentUser && (
                <div className="hidden lg:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-xs">
                  <span className="font-semibold text-gray-200">{currentUser.name || currentUser.email}</span>
                  <span className="text-gray-700">|</span>
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

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Error Notification */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
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

        {/* Executive Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: Total Feedback */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 bg-gradient-to-br from-indigo-950/20 via-gray-900/50 to-gray-950 space-y-3 relative overflow-hidden group hover:border-indigo-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Feedback
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-white">
                  {loading ? '...' : summary.totalItems.toLocaleString()}
                </div>
                {!loading && summary.percentClassified !== undefined && (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm">
                    <Sparkles className="h-2.5 w-2.5 text-purple-400 animate-pulse" />
                    <span>{summary.percentClassified}% AI Classified</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400">
                {summary.classifiedTotal || 0} items processed with live AI
              </p>
            </div>
          </div>

          {/* Card 2: % Negative Sentiment */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 bg-gradient-to-br from-rose-950/20 via-gray-900/50 to-gray-950 space-y-3 relative overflow-hidden group hover:border-rose-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Negative Share
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-rose-400">
                {loading ? '...' : `${summary.percentNegative}%`}
              </div>
              <p className="text-[11px] text-gray-400">
                {summary.classifiedTotal > 0
                  ? `Based on ${summary.classifiedTotal} classified items`
                  : 'Awaiting AI sentiment classification'}
              </p>
            </div>
          </div>

          {/* Card 3: New This Week */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 bg-gradient-to-br from-emerald-950/20 via-gray-900/50 to-gray-950 space-y-3 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                New Ingested
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-emerald-400">
                {loading ? '...' : summary.newThisWeek.toLocaleString()}
              </div>
              <p className="text-[11px] text-gray-400">Ingested in past 7 days</p>
            </div>
          </div>

          {/* Card 4: Active Team Members */}
          <Link
            href="/settings/members"
            className="glass-card p-5 rounded-2xl border border-gray-800 bg-gradient-to-br from-purple-950/20 via-gray-900/50 to-gray-950 space-y-3 relative overflow-hidden group hover:border-purple-500/50 transition-all cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-purple-300 transition-colors">
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
              <p className="text-[11px] text-gray-400 group-hover:text-gray-200 transition-colors flex items-center justify-between">
                <span>Active workspace accounts</span>
                <span className="text-purple-400 font-semibold text-[10px]">Manage →</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Analytics Charts Row: Area Chart & Sentiment Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Volume Over Time AreaChart (Spans 2 cols) */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span>Feedback Volume Over Time</span>
                </h2>
                <p className="text-xs text-gray-400">Daily customer feedback ingestion trend</p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                Daily Stream
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              {mounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.45} />
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

          {/* Sentiment Distribution Donut Chart */}
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Smile className="h-4 w-4 text-emerald-400" />
                  <span>Sentiment Breakdown</span>
                </h2>
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  AI Signals
                </span>
              </div>
              <p className="text-xs text-gray-400">Distribution across POS, NEU, NEG &amp; Unclassified</p>
            </div>

            <div className="h-52 w-full relative">
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
                      outerRadius={78}
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

            {/* Custom Sentiment Legend Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-800/80">
              {sentimentData.map((st) => (
                <div key={st.sentiment} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gray-950/60 border border-gray-800/60">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                    <span className="text-gray-300 font-medium">{st.label}</span>
                  </div>
                  <span className="font-bold text-white">{st.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Themes Ranking & Executive AI Digest */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Themes Ranking Bar Chart (Spans 2 cols) */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-purple-400" />
                  <span>Top Feedback Themes</span>
                </h2>
                <p className="text-xs text-gray-400">Ranked themes assigned to workspace feedback</p>
              </div>
              <Link
                href="/themes"
                className="text-xs font-semibold text-purple-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>View Trends</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {topThemesData.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-gray-800 rounded-xl bg-gray-950/40">
                <Sparkles className="h-8 w-8 text-purple-400 mx-auto opacity-60" />
                <h4 className="text-gray-300 font-semibold text-sm">
                  Themes will appear here once feedback is classified
                </h4>
                <p className="text-gray-500 text-xs max-w-md mx-auto leading-relaxed">
                  During ingestion, AI automatically assigns feedback to workspace theme clusters.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                {mounted && !loading && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topThemesData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                      <XAxis type="number" stroke="#6B7280" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} width={110} />
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

          {/* Executive AI Digest & Quick Actions Card */}
          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-gray-900/60 to-gray-950 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                <Zap className="h-4 w-4" />
                <span>Executive AI Intelligence</span>
              </div>
              <h3 className="text-lg font-black text-white">Voice-of-Customer Digest</h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Project LOOP transforms raw customer signals into actionable executive recommendations and grounded vector search Q&amp;A.
              </p>

              <div className="space-y-2.5 pt-2">
                <Link
                  href="/ask"
                  className="p-3 rounded-xl bg-gray-900/90 hover:bg-gray-850 border border-indigo-500/20 flex items-center justify-between text-xs transition-all group"
                >
                  <div className="flex items-center space-x-2 text-indigo-300 font-semibold">
                    <Sparkles className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span>Ask LOOP RAG Q&amp;A</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  href="/reports"
                  className="p-3 rounded-xl bg-gray-900/90 hover:bg-gray-850 border border-pink-500/20 flex items-center justify-between text-xs transition-all group"
                >
                  <div className="flex items-center space-x-2 text-pink-300 font-semibold">
                    <FileText className="h-4 w-4 text-pink-400 group-hover:scale-110 transition-transform" />
                    <span>Synthesize VoC Report</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>

                <Link
                  href="/themes"
                  className="p-3 rounded-xl bg-gray-900/90 hover:bg-gray-850 border border-purple-500/20 flex items-center justify-between text-xs transition-all group"
                >
                  <div className="flex items-center space-x-2 text-purple-300 font-semibold">
                    <Tag className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                    <span>Theme Spike Alerts</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-950/80 border border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
              <span>Multi-Tenant Security:</span>
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Isolated Workspace</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Recent Feedback Ingestion Feed */}
        {recentFeedback.length > 0 && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <Inbox className="h-4 w-4 text-indigo-400" />
                  <span>Recent Customer Feedback Stream</span>
                </h3>
                <p className="text-xs text-gray-400">Latest feedback ingested into this workspace</p>
              </div>
              <Link
                href="/inbox"
                className="text-xs font-semibold text-indigo-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <span>Open Full Inbox</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentFeedback.map((item) => {
                const ch = channelConfig[item.channel] || {
                  label: item.channel,
                  icon: Ticket,
                  color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                };
                const ChIcon = ch.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-gray-950/80 border border-gray-800/80 space-y-2 flex flex-col justify-between hover:border-gray-700 transition-colors"
                  >
                    <p className="text-xs text-gray-200 line-clamp-2 leading-relaxed">
                      &quot;{item.content}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-gray-900">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border ${ch.color}`}>
                        <ChIcon className="h-3 w-3" />
                        <span>{ch.label}</span>
                      </span>

                      <span className="text-gray-500">
                        {item.customerLabel || 'Anonymous'} • {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
            <span>Loading Executive Analytics...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
