'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Tag,
  MessageSquare,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  User,
  Shield,
  Layers,
  Search,
  X,
  Ticket,
  Star,
  Award,
  TrendingUp,
  TrendingDown,
  Users,
  GitMerge,
  AlertTriangle,
  Calendar,
  Activity,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

// Channel configs matching Inbox UI patterns
const channelsConfig = {
  support_ticket: {
    label: 'Support Ticket',
    icon: Ticket,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  app_review: {
    label: 'App Review',
    icon: Star,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  nps_survey: {
    label: 'NPS Survey',
    icon: Award,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  sales_note: {
    label: 'Sales Note',
    icon: TrendingUp,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  community_post: {
    label: 'Community Post',
    icon: Users,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
};

// Sentiment configs matching Inbox UI patterns
const sentimentConfig = {
  POS: { label: 'Positive', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  NEU: { label: 'Neutral', color: 'bg-gray-500/10 text-gray-300 border-gray-500/20' },
  NEG: { label: 'Negative', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
};

function ThemesContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Period Selector State (default 7 days)
  const initialPeriodDays = parseInt(searchParams.get('periodDays') || '7', 10);
  const [periodDays, setPeriodDays] = useState(initialPeriodDays);

  // Themes & Trends State
  const [trendsData, setTrendsData] = useState({
    themes: [],
    spikes: [],
    timeSeries: [],
    topThemes: [],
    totalPeriodFeedback: 0,
  });
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Theme & Drill-Down State
  const initialThemeId = searchParams.get('themeId') || null;
  const [selectedThemeId, setSelectedThemeId] = useState(initialThemeId);
  const [themeFeedbackItems, setThemeFeedbackItems] = useState([]);
  const [selectedThemeDetails, setSelectedThemeDetails] = useState(null);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);

  // Drill-Down Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Admin Merge Themes Modal State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [sourceThemeId, setSourceThemeId] = useState('');
  const [targetThemeId, setTargetThemeId] = useState('');
  const [merging, setMerging] = useState(false);

  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Sync selected parameters to URL
  const updateUrl = useCallback(
    (newThemeId, newPeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newThemeId) {
        params.set('themeId', newThemeId);
      } else {
        params.delete('themeId');
      }
      if (newPeriod) {
        params.set('periodDays', newPeriod.toString());
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.replace(newUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Fetch Trends Data from GET /api/themes/trends
  const fetchTrends = useCallback(
    async (days = periodDays) => {
      setLoadingTrends(true);
      setError('');

      try {
        const res = await fetch(`/api/themes/trends?periodDays=${days}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch theme trends');
          setLoadingTrends(false);
          return;
        }

        setTrendsData(data);

        // Auto-select first theme if none selected and themes list is non-empty
        if (data.themes && data.themes.length > 0 && !selectedThemeId) {
          setSelectedThemeId(data.themes[0].themeId);
        }
      } catch (err) {
        console.error(err);
        setError('An error occurred while loading theme trends.');
      } finally {
        setLoadingTrends(false);
      }
    },
    [periodDays, selectedThemeId]
  );

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTrends(periodDays);
    }
  }, [status, periodDays, fetchTrends]);

  // Handle Period Change
  const handlePeriodChange = (newDays) => {
    setPeriodDays(newDays);
    updateUrl(selectedThemeId, newDays);
    fetchTrends(newDays);
  };

  // Fetch Drill-down Feedback Items for selected theme
  const fetchDrillDownFeedback = useCallback(
    async (themeId, pageNum = 1) => {
      if (!themeId) return;

      setLoadingDrillDown(true);

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', pageNum.toString());
        queryParams.set('pageSize', pageSize.toString());

        const res = await fetch(`/api/themes/${themeId}/feedback?${queryParams.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Failed to fetch feedback for selected theme');
          setLoadingDrillDown(false);
          return;
        }

        setSelectedThemeDetails(data.theme || null);
        setThemeFeedbackItems(data.items || data.feedback || []);
        setTotalCount(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(data.page || pageNum);
      } catch (err) {
        console.error(err);
        setError('Error loading drill-down feedback.');
      } finally {
        setLoadingDrillDown(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    if (status === 'authenticated' && selectedThemeId) {
      fetchDrillDownFeedback(selectedThemeId, page);
    }
  }, [status, selectedThemeId, page, fetchDrillDownFeedback]);

  // Handle selecting a theme
  const handleSelectTheme = (themeId) => {
    setSelectedThemeId(themeId);
    setPage(1);
    updateUrl(themeId, periodDays);
  };

  // Handle Admin Theme Merge Submission
  const handleMergeThemes = async (e) => {
    e.preventDefault();
    if (!sourceThemeId || !targetThemeId) {
      setError('Please select both a source theme and a target theme to merge.');
      return;
    }
    if (sourceThemeId === targetThemeId) {
      setError('Source and target themes must be different.');
      return;
    }

    setMerging(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/themes/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceThemeId, targetThemeId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to merge themes');
        return;
      }

      setSuccessMsg(data.message || 'Themes merged successfully!');
      setShowMergeModal(false);
      setSourceThemeId('');
      setTargetThemeId('');

      // Refresh trends list and select target theme
      setSelectedThemeId(targetThemeId);
      await fetchTrends(periodDays);
      fetchDrillDownFeedback(targetThemeId, 1);
    } catch (err) {
      console.error(err);
      setError('An error occurred while merging themes.');
    } finally {
      setMerging(false);
    }
  };

  // Filter themes by search query
  const filteredThemes = (trendsData.themes || []).filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
      {/* Top Navigation Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Activity className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">Theme Trends & Spikes</h1>
                  <p className="text-[11px] text-gray-400">
                    Volume over time & AI spike detection analytics
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation & Controls */}
            <div className="flex items-center space-x-3">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white text-xs font-semibold border border-gray-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/inbox"
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white text-xs font-semibold border border-gray-800 transition-colors"
              >
                Inbox
              </Link>

              {isAdmin && (
                <button
                  onClick={() => setShowMergeModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-semibold text-xs border border-purple-500/30 transition-all"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  <span>Merge Themes</span>
                </button>
              )}

              {currentUser && (
                <div className="hidden md:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-xs">
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

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Notification Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-rose-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Success Notification Banner */}
        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Period Selector & Top Bar Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Analysis Window</h2>
              <p className="text-xs text-gray-400">
                Comparing current {periodDays}-day window vs previous {periodDays}-day period
              </p>
            </div>
          </div>

          {/* Period Selector Toggle Buttons */}
          <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => handlePeriodChange(7)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodDays === 7
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePeriodChange(30)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                periodDays === 30
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>
        </div>

        {/* Spiking Themes Warning Section (If any spike detected) */}
        {trendsData.spikes && trendsData.spikes.length > 0 && (
          <div className="glass-card p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                    <span>Spiking Feedback Themes Detected</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                      {trendsData.spikes.length} Spike{trendsData.spikes.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <p className="text-xs text-rose-200/80">
                    Themes showing &gt;= 50% volume increase in current {periodDays}-day period vs previous period
                  </p>
                </div>
              </div>
            </div>

            {/* List of Spiking Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {trendsData.spikes.map((spike) => (
                <div
                  key={spike.themeId}
                  onClick={() => handleSelectTheme(spike.themeId)}
                  className="p-4 rounded-xl bg-gray-900/90 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: spike.color }}
                      />
                      <span className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                        {spike.name}
                      </span>
                    </div>
                    <span className="inline-flex items-center space-x-1 text-xs font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      <TrendingUp className="h-3 w-3" />
                      <span>+{spike.percentChange}%</span>
                    </span>
                  </div>
                  <p className="text-xs text-gray-300">
                    <strong className="text-white">{spike.name}</strong> feedback up{' '}
                    <strong className="text-rose-400">+{spike.percentChange}%</strong> vs previous period ({spike.previousCount} → {spike.currentCount} items)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recharts Volume Over Time Multi-Line Chart */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span>Theme Volume Over Time</span>
              </h3>
              <p className="text-xs text-gray-400">
                Daily breakdown for top workspace themes in the current {periodDays}-day window
              </p>
            </div>
            {trendsData.topThemes && trendsData.topThemes.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {trendsData.topThemes.map((t) => (
                  <span
                    key={t.themeId}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-[11px] font-semibold text-gray-300"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="h-72 w-full pt-4">
            {loadingTrends ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Calculating trend time-series...</span>
              </div>
            ) : trendsData.totalPeriodFeedback === 0 || trendsData.timeSeries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center space-y-2 border border-dashed border-gray-800 rounded-xl text-center p-6">
                <Activity className="h-8 w-8 text-gray-600 opacity-60" />
                <p className="text-xs text-gray-400 font-semibold">Not enough feedback history yet to show trends</p>
                <p className="text-[11px] text-gray-600 max-w-sm">
                  Ingest customer feedback via single submission, CSV upload, or simulated channels to visualize theme trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                  <XAxis dataKey="date" stroke="#6B7280" fontSize={11} tickLine={false} />
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
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {trendsData.topThemes.map((t) => (
                    <Line
                      key={t.themeId}
                      type="monotone"
                      dataKey={t.name}
                      stroke={t.color || '#6366F1'}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: t.color || '#6366F1' }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Split Layout: Left Theme Cards with Inline Trend Pills, Right Drill-Down View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Theme List Cards (Spans 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <Layers className="h-4 w-4 text-purple-400" />
                  <span>Workspace Themes ({trendsData.themes.length})</span>
                </h2>
                <p className="text-xs text-gray-400">Current volume &amp; period percent change</p>
              </div>
            </div>

            {/* Theme Search Input */}
            <div className="relative">
              <Search className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter theme names..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
              />
            </div>

            {/* Themes Cards Container */}
            <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {loadingTrends ? (
                <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>Loading workspace themes...</span>
                </div>
              ) : filteredThemes.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-xl">
                  No themes found.
                </div>
              ) : (
                filteredThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.themeId;
                  const themeColor = theme.color || '#6366F1';

                  return (
                    <button
                      key={theme.themeId}
                      onClick={() => handleSelectTheme(theme.themeId)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                        isSelected
                          ? 'bg-gray-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                          : 'bg-gray-950/60 hover:bg-gray-900/60 border-gray-800/80 hover:border-gray-700'
                      }`}
                    >
                      {/* Selected Indicator Accent Strip */}
                      {isSelected && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1.5"
                          style={{ backgroundColor: themeColor }}
                        />
                      )}

                      <div className="flex items-start justify-between space-x-3">
                        <div className="flex items-start space-x-3 min-w-0">
                          {/* Color Swatch Circle */}
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0 mt-1 shadow-sm"
                            style={{ backgroundColor: themeColor }}
                          />
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                              {theme.name}
                            </h3>
                            {theme.description && (
                              <p className="text-xs text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                                {theme.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Counts & Percent Change Pill */}
                        <div className="shrink-0 flex flex-col items-end space-y-1">
                          <div className="flex items-center space-x-1 px-2.5 py-0.5 rounded-xl bg-gray-900 border border-gray-800 text-xs font-bold text-gray-200">
                            <MessageSquare className="h-3 w-3 text-indigo-400" />
                            <span>{theme.currentCount}</span>
                          </div>

                          {/* Percent Change Badge */}
                          {theme.isSpike ? (
                            <span className="inline-flex items-center space-x-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              <TrendingUp className="h-3 w-3" />
                              <span>+{theme.percentChange}% SPIKE</span>
                            </span>
                          ) : theme.isNew ? (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              NEW
                            </span>
                          ) : theme.percentChange > 0 ? (
                            <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <TrendingUp className="h-3 w-3" />
                              <span>+{theme.percentChange}%</span>
                            </span>
                          ) : theme.percentChange < 0 ? (
                            <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-500/10 text-gray-400 border border-gray-500/20">
                              <TrendingDown className="h-3 w-3" />
                              <span>{theme.percentChange}%</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-500 px-2 py-0.5">
                              0%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Theme Drill-Down View (Spans 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedThemeDetails ? (
              <div className="space-y-6">
                {/* Selected Theme Header Card */}
                <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className="h-4 w-4 rounded-full shrink-0 shadow-md"
                        style={{ backgroundColor: selectedThemeDetails.color }}
                      />
                      <h2 className="text-xl font-black text-white">{selectedThemeDetails.name}</h2>
                    </div>
                    <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20">
                      {totalCount} total items linked
                    </span>
                  </div>

                  {selectedThemeDetails.description && (
                    <p className="text-xs text-gray-300 leading-relaxed pl-7">
                      {selectedThemeDetails.description}
                    </p>
                  )}
                </div>

                {/* Drill-down Feedback Items Header */}
                <div className="flex items-center justify-between pt-2">
                  <h3 className="text-sm font-bold text-gray-200 flex items-center space-x-2">
                    <MessageSquare className="h-4 w-4 text-indigo-400" />
                    <span>Underlying Customer Quotes</span>
                  </h3>
                  <span className="text-xs text-gray-400">
                    Sorted by newest first
                  </span>
                </div>

                {/* Drill-down Feedback List */}
                {loadingDrillDown ? (
                  <div className="py-16 text-center text-gray-500 text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Loading drill-down feedback items...</span>
                  </div>
                ) : themeFeedbackItems.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-2xl">
                    No feedback items currently linked to this theme.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {themeFeedbackItems.map((item) => {
                      const channelInfo = channelsConfig[item.channel] || {
                        label: item.channel,
                        icon: Ticket,
                        color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                      };
                      const ChannelIcon = channelInfo.icon;

                      const sentimentInfo = item.sentiment
                        ? sentimentConfig[item.sentiment] || sentimentConfig.NEU
                        : null;

                      const confidencePercent = item.confidence
                        ? Math.round(item.confidence * 100)
                        : null;

                      return (
                        <div
                          key={item.id}
                          className="glass-card p-5 rounded-2xl border border-gray-800 space-y-3 hover:border-gray-700 transition-colors"
                        >
                          {/* Feedback Content Quote */}
                          <p className="text-sm text-gray-200 leading-relaxed font-sans">
                            &quot;{item.content}&quot;
                          </p>

                          {/* Badges Row */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/60 text-xs">
                            {/* Channel Badge */}
                            <span
                              className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border font-medium ${channelInfo.color}`}
                            >
                              <ChannelIcon className="h-3 w-3 shrink-0" />
                              <span>{channelInfo.label}</span>
                            </span>

                            {/* Sentiment Badge */}
                            {sentimentInfo && (
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-medium ${sentimentInfo.color}`}
                              >
                                <span>{sentimentInfo.label}</span>
                                {item.sentimentScore !== null && item.sentimentScore !== undefined && (
                                  <span className="text-[10px] opacity-75">
                                    ({item.sentimentScore > 0 ? '+' : ''}
                                    {item.sentimentScore.toFixed(2)})
                                  </span>
                                )}
                              </span>
                            )}

                            {/* Status Badge */}
                            <span className="px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 font-medium">
                              {item.status}
                            </span>

                            {/* Confidence Score Badge */}
                            {confidencePercent !== null && (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
                                <Sparkles className="h-3 w-3 text-purple-400" />
                                <span>{confidencePercent}% confidence</span>
                              </span>
                            )}

                            {/* CreatedAt Timestamp */}
                            <span className="ml-auto text-[11px] text-gray-500">
                              {new Date(item.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-800 text-xs">
                        <span className="text-gray-400">
                          Page <strong className="text-white">{page}</strong> of{' '}
                          <strong className="text-white">{totalPages}</strong> ({totalCount} total items)
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 transition-colors"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-40 transition-colors"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-2xl">
                Select a theme to view underlying feedback quotes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Merge Themes Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-gray-800 space-y-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <GitMerge className="h-5 w-5" />
                <h3 className="text-base text-white">Merge Duplicate Themes</h3>
              </div>
              <button
                onClick={() => setShowMergeModal(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Consolidate feedback from a duplicate theme into a target theme. All feedback links will be reassigned, and the duplicate theme will be deleted.
            </p>

            <form onSubmit={handleMergeThemes} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Duplicate Theme to Remove (Source) *
                </label>
                <select
                  value={sourceThemeId}
                  onChange={(e) => setSourceThemeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  required
                >
                  <option value="">-- Select duplicate theme --</option>
                  {trendsData.themes.map((t) => (
                    <option key={t.themeId} value={t.themeId} disabled={t.themeId === targetThemeId}>
                      {t.name} ({t.currentCount} items)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Main Theme to Keep (Target) *
                </label>
                <select
                  value={targetThemeId}
                  onChange={(e) => setTargetThemeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-purple-500 transition-colors"
                  required
                >
                  <option value="">-- Select main target theme --</option>
                  {trendsData.themes.map((t) => (
                    <option key={t.themeId} value={t.themeId} disabled={t.themeId === sourceThemeId}>
                      {t.name} ({t.currentCount} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={merging || !sourceThemeId || !targetThemeId}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {merging ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <GitMerge className="h-4 w-4" />
                      <span>Confirm Merge</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ThemesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Loading Theme Trends...</span>
          </div>
        </div>
      }
    >
      <ThemesContent />
    </Suspense>
  );
}
