'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Printer,
  Share2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  User,
  Sparkles,
  Layers,
  BarChart2,
  MessageSquare,
  CheckSquare,
  Ticket,
  Star,
  Award,
  TrendingUp,
  Users,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

const channelsConfig = {
  support_ticket: { label: 'Support Ticket', icon: Ticket },
  app_review: { label: 'App Review', icon: Star },
  nps_survey: { label: 'NPS Survey', icon: Award },
  sales_note: { label: 'Sales Note', icon: TrendingUp },
  community_post: { label: 'Community Post', icon: Users },
};

function ShareContent() {
  const { data: session, status } = useSession();
  const params = useParams();
  const reportId = params?.id;

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch report details
  const fetchReport = useCallback(async () => {
    if (!reportId) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/reports/${reportId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch report');
        return;
      }

      setReport(data);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading the report.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReport();
    }
  }, [status, fetchReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Loading Voice-of-Customer Report...</span>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300 p-4">
        <div className="max-w-md w-full glass-card p-6 rounded-2xl border border-gray-800 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Report Not Found</h2>
          <p className="text-xs text-gray-400">{error || 'The requested report could not be found or belongs to another workspace.'}</p>
          <Link
            href="/reports"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Reports</span>
          </Link>
        </div>
      </div>
    );
  }

  const contentJson = report.contentJson || {};
  const stats = contentJson.stats || {};
  const narrative = contentJson.narrative || {};

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans antialiased print:bg-white print:text-black">
      {/* Non-printable Top Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/reports"
              className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
              title="Back to Reports"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-sm text-white">Shareable Report View</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 hover:text-white text-xs font-semibold border border-gray-800 transition-colors"
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5 text-indigo-400" />}
              <span>{copied ? 'Link Copied!' : 'Copy Share Link'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Printable Content Document */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:p-0 print:m-0 print:max-w-none">
        {/* Report Banner */}
        <div className="glass-card p-8 rounded-3xl border border-gray-800 space-y-4 print:border-b-2 print:border-black print:rounded-none print:p-0 print:shadow-none">
          <div className="space-y-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20 print:border-black print:text-black">
              Project LOOP Voice-of-Customer Executive Report
            </span>
            <h1 className="text-3xl font-black text-white print:text-black">{report.title}</h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-800 print:text-black print:border-gray-300">
            <span className="flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-purple-400 print:hidden" />
              <span>
                Period: <strong>{new Date(report.periodStart).toLocaleDateString()}</strong> to{' '}
                <strong>{new Date(report.periodEnd).toLocaleDateString()}</strong>
              </span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <User className="h-3.5 w-3.5 text-indigo-400 print:hidden" />
              <span>Author: <strong>{report.generatedBy?.name || 'Workspace Analyst'}</strong></span>
            </span>
            <span>•</span>
            <span>Created: {new Date(report.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Pre-computed Key Stats Summary */}
        {stats.totalFeedback && (
          <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
            <div className="glass-card p-4 rounded-2xl border border-gray-800 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] font-semibold text-gray-400 uppercase print:text-gray-700">
                Total Feedback
              </span>
              <div className="text-2xl font-black text-white print:text-black">{stats.totalFeedback.current}</div>
              <span className="text-xs font-bold text-gray-400 print:text-gray-600">
                {stats.totalFeedback.percentChange >= 0 ? '+' : ''}{stats.totalFeedback.percentChange}% vs prior
              </span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-gray-800 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] font-semibold text-gray-400 uppercase print:text-gray-700">
                Positive Share
              </span>
              <div className="text-2xl font-black text-emerald-400 print:text-black">
                {stats.sentimentBreakdown?.current?.posPercent || 0}%
              </div>
              <span className="text-xs font-bold text-gray-400 print:text-gray-600">
                {stats.sentimentBreakdown?.shifts?.posShift >= 0 ? '+' : ''}{stats.sentimentBreakdown?.shifts?.posShift || 0}% shift
              </span>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-gray-800 print:border-gray-300 print:bg-gray-50">
              <span className="text-[11px] font-semibold text-gray-400 uppercase print:text-gray-700">
                Negative Share
              </span>
              <div className="text-2xl font-black text-rose-400 print:text-black">
                {stats.sentimentBreakdown?.current?.negPercent || 0}%
              </div>
              <span className="text-xs font-bold text-gray-400 print:text-gray-600">
                {stats.sentimentBreakdown?.shifts?.negShift >= 0 ? '+' : ''}{stats.sentimentBreakdown?.shifts?.negShift || 0}% shift
              </span>
            </div>
          </div>
        )}

        {/* Executive Summary */}
        {narrative.executiveSummary && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-3 print:border-none print:p-0">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 print:text-black">
              <Sparkles className="h-4 w-4 text-indigo-400 print:hidden" />
              <span>Executive Summary</span>
            </h2>
            <p className="text-sm text-gray-200 leading-relaxed font-sans whitespace-pre-line print:text-black">
              {narrative.executiveSummary}
            </p>
          </div>
        )}

        {/* Top Themes Analysis */}
        {narrative.topThemesAnalysis && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 print:border-none print:p-0">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 print:text-black">
              <Layers className="h-4 w-4 text-purple-400 print:hidden" />
              <span>Top Feedback Themes Analysis</span>
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed font-sans print:text-black">
              {narrative.topThemesAnalysis}
            </p>

            {stats.topThemes && stats.topThemes.length > 0 && (
              <div className="grid grid-cols-2 gap-3 pt-2 print:grid-cols-2">
                {stats.topThemes.map((t) => (
                  <div key={t.themeId} className="p-3 rounded-xl bg-gray-950/80 border border-gray-800 flex items-center justify-between text-xs print:bg-gray-100 print:border-gray-300 print:text-black">
                    <span className="font-bold text-white print:text-black">{t.name}</span>
                    <span className="font-bold text-gray-300 print:text-black">{t.count} items ({t.percentChange >= 0 ? '+' : ''}{t.percentChange}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sentiment Shift Commentary */}
        {narrative.sentimentShiftCommentary && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-3 print:border-none print:p-0">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 print:text-black">
              <BarChart2 className="h-4 w-4 text-emerald-400 print:hidden" />
              <span>Sentiment Shift Commentary</span>
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed font-sans print:text-black">
              {narrative.sentimentShiftCommentary}
            </p>
          </div>
        )}

        {/* Notable Verbatim Quotes */}
        {narrative.notableQuotes && narrative.notableQuotes.length > 0 && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 print:border-none print:p-0">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2 print:text-black">
              <MessageSquare className="h-4 w-4 text-rose-400 print:hidden" />
              <span>Notable Customer Verbatim Quotes</span>
            </h2>

            <div className="space-y-3">
              {narrative.notableQuotes.map((nq, i) => (
                <blockquote key={i} className="p-4 rounded-2xl bg-gray-950/80 border border-gray-800 space-y-2 print:bg-gray-50 print:border-gray-300 print:text-black">
                  <p className="text-sm text-gray-200 italic font-sans print:text-black">&quot;{nq.quote}&quot;</p>
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-1 print:text-gray-700">
                    <span className="font-semibold">{nq.channel} • {nq.sentiment}</span>
                    {nq.takeaway && <span>Takeaway: {nq.takeaway}</span>}
                  </div>
                </blockquote>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Strategic Actions */}
        {narrative.recommendedActions && narrative.recommendedActions.length > 0 && (
          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/20 space-y-4 print:border-none print:p-0 print:bg-transparent">
            <h2 className="text-lg font-extrabold text-white flex items-center space-x-2 print:text-black">
              <CheckSquare className="h-5 w-5 text-indigo-400 print:hidden" />
              <span>Recommended Strategic Actions</span>
            </h2>

            <div className="space-y-2.5">
              {narrative.recommendedActions.map((action, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-gray-900 border border-indigo-500/20 flex items-start space-x-3 text-xs text-gray-200 print:bg-gray-50 print:border-gray-300 print:text-black">
                  <span className="h-5 w-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 text-[11px] print:bg-gray-200 print:text-black">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed font-sans pt-0.5">{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Loading shareable report...</span>
          </div>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  );
}
