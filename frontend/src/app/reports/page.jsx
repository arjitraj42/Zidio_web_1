'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  User,
  Shield,
  Calendar,
  Sparkles,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Ticket,
  Star,
  Award,
  Users,
  X,
  CheckSquare,
  Clock,
  ChevronRight,
  Layers,
  BarChart2,
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

function ReportsContent() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected Report Detail State
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Report Generation Form State
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [preset, setPreset] = useState('7days');
  const [titleInput, setTitleInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [generating, setGenerating] = useState(false);

  const currentUser = session?.user;
  const canGenerate = currentUser?.role === 'ADMIN' || currentUser?.role === 'ANALYST';

  // Helper to set date range from presets
  const applyPreset = useCallback((presetKey) => {
    setPreset(presetKey);
    const end = new Date();
    let start = new Date();

    if (presetKey === '7days') {
      start.setDate(end.getDate() - 7);
    } else if (presetKey === '30days') {
      start.setDate(end.getDate() - 30);
    } else if (presetKey === '90days') {
      start.setDate(end.getDate() - 90);
    }

    setEndDateInput(end.toISOString().split('T')[0]);
    setStartDateInput(start.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    applyPreset('7days');
  }, [applyPreset]);

  // Fetch list of saved reports for workspace
  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    setError('');

    try {
      const res = await fetch('/api/reports');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch reports');
        setLoadingReports(false);
        return;
      }

      const list = data.reports || [];
      setReports(list);

      // Auto-select most recent report
      if (list.length > 0 && !selectedReportId) {
        setSelectedReportId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading reports.');
    } finally {
      setLoadingReports(false);
    }
  }, [selectedReportId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, fetchReports]);

  // Fetch single report detail by ID
  const fetchReportDetail = useCallback(async (reportId) => {
    if (!reportId) return;

    setLoadingDetail(true);

    try {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch report detail');
        setLoadingDetail(false);
        return;
      }

      setSelectedReport(data);
    } catch (err) {
      console.error(err);
      setError('Error loading report details.');
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated' && selectedReportId) {
      fetchReportDetail(selectedReportId);
    }
  }, [status, selectedThemeId, selectedReportId, fetchReportDetail]);

  // Handle selecting a report
  const handleSelectReport = (id) => {
    setSelectedReportId(id);
  };

  // Handle Report Generation Submission
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    if (!startDateInput || !endDateInput) {
      setError('Please select both a start date and an end date.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccessMsg('');

    try {
      const pStart = new Date(startDateInput).toISOString();
      const pEnd = new Date(`${endDateInput}T23:59:59.999Z`).toISOString();

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodStart: pStart,
          periodEnd: pEnd,
          title: titleInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate report');
        return;
      }

      setSuccessMsg(`Executive report "${data.title}" generated successfully!`);
      setShowGenerateModal(false);
      setTitleInput('');

      // Refresh list and select newly generated report
      setSelectedReportId(data.id);
      setSelectedReport(data);
      fetchReports();
    } catch (err) {
      console.error(err);
      setError('An error occurred while generating executive report.');
    } finally {
      setGenerating(false);
    }
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

  // Extract contentJson sections for current selected report
  const contentJson = selectedReport?.contentJson || {};
  const stats = contentJson.stats || {};
  const narrative = contentJson.narrative || {};

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
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">Executive VoC Reports</h1>
                  <p className="text-[11px] text-gray-400">
                    Voice-of-Customer AI summaries &amp; strategic recommendations
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Navigation Links */}
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
              <Link
                href="/themes"
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white text-xs font-semibold border border-gray-800 transition-colors"
              >
                Themes
              </Link>
              <Link
                href="/ask"
                className="px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white text-xs font-semibold border border-gray-800 transition-colors"
              >
                Ask LOOP
              </Link>

              {canGenerate && (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Generate Report</span>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

        {/* Empty State: If no reports exist yet */}
        {!loadingReports && reports.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl border border-gray-800 text-center space-y-4 max-w-xl mx-auto my-12">
            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FileText className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-white">No Executive VoC Reports Generated Yet</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Generate structured Voice-of-Customer executive reports summarizing top feedback themes, sentiment shifts, verbatim quotes, and strategic recommendations.
            </p>
            {canGenerate ? (
              <div className="pt-2">
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Generate First Executive Report</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                Report generation requires ADMIN or ANALYST role permissions.
              </div>
            )}
          </div>
        ) : (
          /* Split Layout: Left Reports List, Right Report Detail Viewer */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Saved Reports List (Spans 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-purple-400" />
                    <span>Saved Reports</span>
                  </h2>
                  <p className="text-xs text-gray-400">Workspace history</p>
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-800">
                  {reports.length}
                </span>
              </div>

              <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
                {loadingReports ? (
                  <div className="p-8 text-center text-gray-500 text-xs flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Loading reports...</span>
                  </div>
                ) : (
                  reports.map((rpt) => {
                    const isSelected = selectedReportId === rpt.id;

                    return (
                      <button
                        key={rpt.id}
                        onClick={() => handleSelectReport(rpt.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                          isSelected
                            ? 'bg-gray-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                            : 'bg-gray-950/60 hover:bg-gray-900/60 border-gray-800/80 hover:border-gray-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
                        )}

                        <div className="space-y-2">
                          <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                            {rpt.title}
                          </h3>

                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-indigo-400" />
                              <span>
                                {new Date(rpt.periodStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
                                {new Date(rpt.periodEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              {new Date(rpt.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {rpt.generatedBy && (
                            <div className="text-[10px] text-gray-500 pt-1 border-t border-gray-900">
                              Author: <span className="text-gray-400 font-medium">{rpt.generatedBy.name || rpt.generatedBy.email}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Executive Report Viewer (Spans 8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {loadingDetail ? (
                <div className="py-24 text-center text-gray-500 text-xs flex items-center justify-center space-x-2">
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                  <span>Loading executive report contents...</span>
                </div>
              ) : selectedReport ? (
                <div className="space-y-6">
                  {/* Executive Report Header Banner */}
                  <div className="glass-card p-6 rounded-3xl border border-gray-800 space-y-3 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                          Executive VoC Report
                        </span>
                        <h2 className="text-2xl font-black text-white">{selectedReport.title}</h2>
                      </div>

                      {selectedReport.generatedBy && (
                        <div className="flex items-center space-x-2 text-xs text-gray-400 px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-800">
                          <User className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Generated by: <strong className="text-gray-200">{selectedReport.generatedBy.name}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-400 pt-2 border-t border-gray-800/80">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5 text-purple-400" />
                        <span>
                          Period: <strong>{new Date(selectedReport.periodStart).toLocaleDateString()}</strong> to{' '}
                          <strong>{new Date(selectedReport.periodEnd).toLocaleDateString()}</strong>
                        </span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Created: {new Date(selectedReport.createdAt).toLocaleString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Pre-Computed Key Stats Cards Grid */}
                  {stats.totalFeedback && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Stat 1: Total Feedback Volume */}
                      <div className="glass-card p-4 rounded-2xl border border-gray-800 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Feedback Volume
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-white">{stats.totalFeedback.current}</span>
                          <span className={`text-xs font-bold ${stats.totalFeedback.percentChange >= 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                            {stats.totalFeedback.percentChange >= 0 ? '+' : ''}{stats.totalFeedback.percentChange}% vs prior
                          </span>
                        </div>
                      </div>

                      {/* Stat 2: Positive Sentiment */}
                      <div className="glass-card p-4 rounded-2xl border border-gray-800 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Positive Share
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-emerald-400">
                            {stats.sentimentBreakdown?.current?.posPercent || 0}%
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            {stats.sentimentBreakdown?.shifts?.posShift >= 0 ? '+' : ''}
                            {stats.sentimentBreakdown?.shifts?.posShift || 0}% shift
                          </span>
                        </div>
                      </div>

                      {/* Stat 3: Negative Sentiment */}
                      <div className="glass-card p-4 rounded-2xl border border-gray-800 space-y-1">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                          Negative Share
                        </span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-2xl font-black text-rose-400">
                            {stats.sentimentBreakdown?.current?.negPercent || 0}%
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            {stats.sentimentBreakdown?.shifts?.negShift >= 0 ? '+' : ''}
                            {stats.sentimentBreakdown?.shifts?.negShift || 0}% shift
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section 1: Executive Summary */}
                  {narrative.executiveSummary && (
                    <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-3">
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <Sparkles className="h-4 w-4 text-indigo-400" />
                        <span>Executive Summary</span>
                      </h3>
                      <p className="text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-line">
                        {narrative.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Section 2: Top Themes Analysis */}
                  {narrative.topThemesAnalysis && (
                    <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-purple-400" />
                        <span>Top Feedback Themes Analysis</span>
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed font-sans">
                        {narrative.topThemesAnalysis}
                      </p>

                      {/* Render Top Themes Badges */}
                      {stats.topThemes && stats.topThemes.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {stats.topThemes.map((t) => (
                            <div key={t.themeId} className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 flex items-center justify-between text-xs">
                              <div className="flex items-center space-x-2 min-w-0">
                                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                                <span className="font-bold text-white truncate">{t.name}</span>
                              </div>
                              <div className="flex items-center space-x-2 shrink-0">
                                <span className="font-bold text-gray-200">{t.count} items</span>
                                <span className="text-[10px] text-gray-400">
                                  ({t.percentChange >= 0 ? '+' : ''}{t.percentChange}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section 3: Sentiment Shifts Commentary */}
                  {narrative.sentimentShiftCommentary && (
                    <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-3">
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <BarChart2 className="h-4 w-4 text-emerald-400" />
                        <span>Sentiment Shifts Commentary</span>
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed font-sans">
                        {narrative.sentimentShiftCommentary}
                      </p>
                    </div>
                  )}

                  {/* Section 4: Notable Verbatim Quotes */}
                  {narrative.notableQuotes && narrative.notableQuotes.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
                      <h3 className="text-base font-bold text-white flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-rose-400" />
                        <span>Notable Customer Verbatim Quotes</span>
                      </h3>

                      <div className="space-y-3">
                        {narrative.notableQuotes.map((nq, i) => {
                          const channelInfo = channelsConfig[nq.channel] || {
                            label: nq.channel,
                            icon: Ticket,
                            color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                          };
                          const ChannelIcon = channelInfo.icon;
                          const sentimentInfo = nq.sentiment ? sentimentConfig[nq.sentiment] || sentimentConfig.NEU : null;

                          return (
                            <blockquote
                              key={i}
                              className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800/80 space-y-2 relative"
                            >
                              <p className="text-sm text-gray-200 italic font-sans leading-relaxed">
                                &quot;{nq.quote}&quot;
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-900 text-xs">
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border font-medium ${channelInfo.color}`}>
                                    <ChannelIcon className="h-3 w-3 shrink-0" />
                                    <span>{channelInfo.label}</span>
                                  </span>

                                  {sentimentInfo && (
                                    <span className={`px-2 py-0.5 rounded border font-medium ${sentimentInfo.color}`}>
                                      {sentimentInfo.label}
                                    </span>
                                  )}
                                </div>

                                {nq.takeaway && (
                                  <span className="text-indigo-300 font-medium text-[11px]">
                                    Takeaway: {nq.takeaway}
                                  </span>
                                )}
                              </div>
                            </blockquote>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Section 5: Recommended Actions */}
                  {narrative.recommendedActions && narrative.recommendedActions.length > 0 && (
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-4">
                      <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                        <CheckSquare className="h-5 w-5 text-indigo-400" />
                        <span>Recommended Strategic Actions</span>
                      </h3>

                      <div className="space-y-3">
                        {narrative.recommendedActions.map((action, i) => (
                          <div
                            key={i}
                            className="p-3.5 rounded-xl bg-gray-900/90 border border-indigo-500/20 flex items-start space-x-3 text-xs text-gray-200"
                          >
                            <span className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px] border border-indigo-500/30">
                              {i + 1}
                            </span>
                            <span className="leading-relaxed font-sans pt-0.5">{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500 text-xs border border-dashed border-gray-800 rounded-2xl">
                  Select a report from the left list to view detailed contents.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin / Analyst Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass-card max-w-lg w-full p-6 rounded-3xl border border-gray-800 space-y-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-sm">
                <FileText className="h-5 w-5" />
                <h3 className="text-base text-white">Generate Voice-of-Customer Report</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Pre-computes feedback volume, sentiment shifts, top themes, and representative quotes, then synthesizes a grounded executive narrative using Claude AI.
            </p>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Quick Date Range Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset('7days')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      preset === '7days'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-850'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('30days')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      preset === '30days'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-850'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('90days')}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      preset === '90days'
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-gray-900 text-gray-300 border-gray-800 hover:bg-gray-850'
                    }`}
                  >
                    Last 90 Days
                  </button>
                </div>
              </div>

              {/* Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => {
                      setStartDateInput(e.target.value);
                      setPreset('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDateInput}
                    onChange={(e) => {
                      setEndDateInput(e.target.value);
                      setPreset('custom');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Report Title (Optional)
                </label>
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Q1 Executive VoC Summary"
                  className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generating || !startDateInput || !endDateInput}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                      <span>Synthesizing Report...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Generate Executive Report</span>
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

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Loading Executive Reports...</span>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
