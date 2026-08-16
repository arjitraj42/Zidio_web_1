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
  UserPlus,
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
  support_ticket: { label: 'Support Ticket', icon: Ticket, color: 'text-rose-700 bg-rose-50 border-rose-100' },
  app_review: { label: 'App Review', icon: Star, color: 'text-amber-700 bg-amber-50 border-amber-100' },
  nps_survey: { label: 'NPS Survey', icon: Award, color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  sales_note: { label: 'Sales Note', icon: TrendingUp, color: 'text-indigo-700 bg-indigo-50 border-indigo-100' },
  community_post: { label: 'Community Post', icon: Users, color: 'text-purple-700 bg-purple-50 border-purple-100' },
};

const getSentimentColor = (sentiment) => {
  switch (sentiment) {
    case 'POS': return '#10B981'; // Emerald
    case 'NEU': return '#F59E0B'; // Amber
    case 'NEG': return '#EF4444'; // Red
    default: return '#94A3B8';    // Slate
  }
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
  const initialThemeId = searchParams.get('themeId') || '';
  const initialDateFrom = searchParams.get('dateFrom') || '';
  const initialDateTo = searchParams.get('dateTo') || '';

  const [filters, setFilters] = useState({
    channel: initialChannel,
    sentiment: initialSentiment,
    status: initialStatus,
    themeId: initialThemeId,
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
      if (newFilters.themeId) params.set('themeId', newFilters.themeId);
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
      if (filters.themeId) queryParams.set('themeId', filters.themeId);
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
      themeId: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(emptyFilters);
    updateUrl(emptyFilters);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Glassmorphism Navigation Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Workspace Badge */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/25">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-extrabold text-slate-900 leading-tight tracking-tight">
                    Project LOOP Analytics
                  </h1>
                  <span className="hidden md:inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Workspace</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Workspace: <strong className="text-indigo-600 font-bold">{currentUser?.workspaceName || 'Default'}</strong>
                </p>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center space-x-3">
              <Link
                href="/ask"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-100 transition-all hover:scale-[1.02]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask LOOP</span>
              </Link>

              <Link
                href="/reports"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold text-xs border border-pink-100 transition-all hover:scale-[1.02]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Reports</span>
              </Link>

              <Link
                href="/themes"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-xs border border-purple-100 transition-all hover:scale-[1.02]"
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Themes</span>
              </Link>

              <Link
                href="/settings/members"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 font-semibold text-xs border border-cyan-100 transition-all hover:scale-[1.02]"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Member</span>
              </Link>

              <Link
                href="/inbox"
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm hover:scale-[1.02]"
              >
                <Inbox className="h-4 w-4" />
                <span>Go to Inbox</span>
              </Link>

              {currentUser && (
                <div className="hidden lg:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">{currentUser.name || currentUser.email}</span>
                  <span className="text-slate-300">|</span>
                  <span className="flex items-center text-slate-500">
                    <Shield className="h-3 w-3 mr-1 text-purple-500" />
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
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-600 hover:text-rose-800 font-semibold">
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
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-3 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Feedback
              </span>
              <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:scale-110 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-black text-slate-900">
                  {loading ? '...' : summary.totalItems.toLocaleString()}
                </div>
                {!loading && summary.percentClassified !== undefined && (
                  <span className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-100 shadow-sm">
                    <Sparkles className="h-2.5 w-2.5 text-purple-500 animate-pulse" />
                    <span>{summary.percentClassified}% AI Classified</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {summary.classifiedTotal || 0} items processed with live AI
              </p>
            </div>
          </div>

          {/* Card 2: % Negative Sentiment */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-3 relative overflow-hidden group hover:border-rose-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Negative Share
              </span>
              <div className="p-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-rose-600">
                {loading ? '...' : `${summary.percentNegative}%`}
              </div>
              <p className="text-[11px] text-slate-500">
                {summary.classifiedTotal > 0
                  ? `Based on ${summary.classifiedTotal} classified items`
                  : 'Awaiting AI sentiment classification'}
              </p>
            </div>
          </div>

          {/* Card 3: New This Week */}
          <div className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-3 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                New Ingested
              </span>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-emerald-600">
                {loading ? '...' : summary.newThisWeek.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500">Ingested in past 7 days</p>
            </div>
          </div>

          {/* Card 4: Active Team Members */}
          <Link
            href="/settings/members"
            className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-sm space-y-3 relative overflow-hidden group hover:border-purple-500/30 transition-all cursor-pointer block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider group-hover:text-purple-600 transition-colors">
                Team Members
              </span>
              <div className="p-2 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-purple-700">
                {loading ? '...' : summary.totalMembers}
              </div>
              <p className="text-[11px] text-slate-500 group-hover:text-slate-700 transition-colors flex items-center justify-between">
                <span>Active workspace accounts</span>
                <span className="text-purple-600 font-semibold text-[10px]">Manage →</span>
              </p>
            </div>
          </Link>
        </div>

        {/* Analytics Charts Row: Area Chart & Sentiment Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Volume Over Time AreaChart (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                  <span>Feedback Volume Over Time</span>
                </h2>
                <p className="text-xs text-slate-500">Daily customer feedback ingestion trend</p>
              </div>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                Daily Stream
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              {mounted && !loading && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#0F172A',
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
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Smile className="h-4 w-4 text-emerald-500" />
                  <span>Sentiment Breakdown</span>
                </h2>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  AI Signals
                </span>
              </div>
              <p className="text-xs text-slate-500">Distribution across POS, NEU, NEG &amp; Unclassified</p>
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
                        <Cell key={entry.sentiment} fill={getSentimentColor(entry.sentiment)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E2E8F0',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#0F172A',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Custom Sentiment Legend Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
              {sentimentData.map((st) => (
                <div key={st.sentiment} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-150">
                  <div className="flex items-center space-x-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: getSentimentColor(st.sentiment) }} />
                    <span className="text-slate-600 font-medium">{st.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{st.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section: Top Themes Ranking & Executive AI Digest */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Themes Ranking Bar Chart (Spans 2 cols) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-purple-500" />
                  <span>Top Feedback Themes</span>
                </h2>
                <p className="text-xs text-slate-500">Ranked themes assigned to workspace feedback</p>
              </div>
              <Link
                href="/themes"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 transition-colors flex items-center space-x-1"
              >
                <span>View Trends</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {topThemesData.length === 0 ? (
              <div className="py-16 text-center space-y-3 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                <Sparkles className="h-8 w-8 text-purple-500 mx-auto opacity-60" />
                <h4 className="text-slate-700 font-semibold text-sm">
                  Themes will appear here once feedback is classified
                </h4>
                <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                  During ingestion, AI automatically assigns feedback to workspace theme clusters.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                {mounted && !loading && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topThemesData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                      <XAxis type="number" stroke="#94A3B8" fontSize={11} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} width={110} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderColor: '#E2E8F0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          color: '#0F172A',
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
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/60 p-6 rounded-2xl border border-indigo-100 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider">
                <Zap className="h-4 w-4" />
                <span>Executive AI Intelligence</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">Voice-of-Customer Digest</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Project LOOP transforms raw customer signals into actionable executive recommendations and grounded vector search Q&amp;A.
              </p>

              <div className="space-y-2.5 pt-2">
                <Link
                  href="/ask"
                  className="p-3 rounded-xl bg-white/85 hover:bg-white border border-indigo-100 flex items-center justify-between text-xs transition-all group shadow-sm hover:border-indigo-200"
                >
                  <div className="flex items-center space-x-2 text-indigo-600 font-semibold">
                    <Sparkles className="h-4 w-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <span>Ask LOOP RAG Q&amp;A</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/reports"
                  className="p-3 rounded-xl bg-white/85 hover:bg-white border border-pink-100 flex items-center justify-between text-xs transition-all group shadow-sm hover:border-pink-200"
                >
                  <div className="flex items-center space-x-2 text-pink-600 font-semibold">
                    <FileText className="h-4 w-4 text-pink-500 group-hover:scale-110 transition-transform" />
                    <span>Synthesize VoC Report</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>

                <Link
                  href="/themes"
                  className="p-3 rounded-xl bg-white/85 hover:bg-white border border-purple-100 flex items-center justify-between text-xs transition-all group shadow-sm hover:border-purple-200"
                >
                  <div className="flex items-center space-x-2 text-purple-600 font-semibold">
                    <Tag className="h-4 w-4 text-purple-500 group-hover:scale-110 transition-transform" />
                    <span>Theme Spike Alerts</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </Link>
              </div>
            </div>

            <div className="relative z-10 p-3 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 flex items-center justify-between shadow-inner">
              <span>Multi-Tenant Security:</span>
              <span className="text-emerald-600 font-semibold flex items-center space-x-1">
                <Shield className="h-3 w-3" />
                <span>Isolated Workspace</span>
              </span>
            </div>
          </div>
        </div>

        {/* Live Recent Feedback Ingestion Feed */}
        {recentFeedback.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                  <Inbox className="h-4 w-4 text-indigo-500" />
                  <span>Recent Customer Feedback Stream</span>
                </h3>
                <p className="text-xs text-slate-500">Latest feedback ingested into this workspace</p>
              </div>
              <Link
                href="/inbox"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center space-x-1"
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
                  color: 'text-slate-600 bg-slate-50 border-slate-100',
                };
                const ChIcon = ch.icon;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 flex flex-col justify-between hover:border-indigo-200 hover:bg-white shadow-sm hover:shadow transition-all"
                  >
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      &quot;{item.content}&quot;
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border ${ch.color}`}>
                        <ChIcon className="h-3 w-3" />
                        <span>{ch.label}</span>
                      </span>

                      <span className="text-slate-400">
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
