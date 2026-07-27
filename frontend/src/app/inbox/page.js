'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Inbox,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Ticket,
  Star,
  Award,
  TrendingUp,
  Users,
  Shield,
  Clock
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

// Channel configurations for UI rendering (labels, icons, and styling colors)
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

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Pagination states
  const [skip, setSkip] = useState(0);
  const [take] = useState(10); // Sane page size for display
  const [totalCount, setTotalCount] = useState(0);

  // New feedback form states
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState('support_ticket');
  const [customerLabel, setCustomerLabel] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bulk upload states
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [simulating, setSimulating] = useState(null);
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState([]);
  const [deletingFeedback, setDeletingFeedback] = useState(false);

  const currentUser = session?.user;
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'ANALYST';

  // Fetch Feedback Items
  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/feedback?take=${take}&skip=${skip}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch feedback items');
        setLoading(false);
        return;
      }

      setFeedbackList(data.feedback || []);
      setTotalCount(data.pagination?.total || 0);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading feedback.');
    } finally {
      setLoading(false);
    }
  }, [take, skip]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFeedback();
    }
  }, [status, fetchFeedback]);

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          channel,
          customerLabel: customerLabel.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit feedback');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Feedback item successfully added!');
      setContent('');
      setCustomerLabel('');
      setChannel('support_ticket');
      setSkip(0); // Reset to first page to see the new item
      fetchFeedback();
    } catch (err) {
      console.error(err);
      setError('An error occurred while submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Bulk CSV Upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setError('');
    setSuccessMsg('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/feedback/bulk-upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to upload CSV file');
        if (data.failures) {
          setUploadResult(data);
        }
        return;
      }

      setUploadResult(data);
      if (data.importedCount > 0) {
        setSuccessMsg(`Successfully imported ${data.importedCount} feedback items.`);
        setUploadFile(null);
        const fileInput = document.getElementById('csv-file-input');
        if (fileInput) fileInput.value = '';
        setSkip(0); // Reset to first page
        fetchFeedback();
      } else if (data.failedCount > 0) {
        setError('All uploaded CSV rows failed validation. See details below.');
      } else {
        setError('No rows found in the uploaded CSV.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during bulk upload.');
    } finally {
      setUploading(false);
    }
  };

  // Handle Bulk Integration Feed Simulation
  const handleSimulateChannel = async (channel) => {
    setSimulating(channel);
    setError('');
    setSuccessMsg('');
    setUploadResult(null);

    try {
      const res = await fetch('/api/feedback/simulate-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to simulate integration pull');
        return;
      }

      const friendlyNames = {
        app_review: 'App Store Reviews',
        support_ticket: 'Support Desk Tickets',
        sales_note: 'Sales Call Notes',
      };
      const channelName = friendlyNames[channel] || channel;

      setSuccessMsg(`${data.count} new items successfully imported from simulated ${channelName}.`);
      setSkip(0); // Reset to first page
      fetchFeedback();
    } catch (err) {
      console.error(err);
      setError('An error occurred while simulating the integration pull.');
    } finally {
      setSimulating(null);
    }
  };

  // Handle Bulk Feedback Deletion
  const handleBulkDelete = async () => {
    if (selectedFeedbackIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete the ${selectedFeedbackIds.length} selected feedback items?`)) return;

    setDeletingFeedback(true);
    setError('');
    setSuccessMsg('');
    setUploadResult(null);

    try {
      const res = await fetch('/api/feedback/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFeedbackIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete selected items.');
        return;
      }

      setSuccessMsg(`Successfully deleted ${data.count} feedback items.`);
      setSelectedFeedbackIds([]);
      fetchFeedback();
    } catch (err) {
      console.error(err);
      setError('An error occurred while deleting selected feedback.');
    } finally {
      setDeletingFeedback(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-gray-300">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Loading session data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 p-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="ambient-glow w-[500px] h-[500px] bg-indigo-600/15 top-[-100px] left-[-100px]" />
      <div className="ambient-glow w-[400px] h-[400px] bg-purple-600/10 bottom-[-50px] right-[-50px]" />

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <Link href="/dashboard" className="inline-flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mb-2 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <Inbox className="h-8 w-8 text-indigo-400" />
              <span>Feedback Inbox</span>
            </h1>
            <p className="text-gray-400 text-sm">
              Workspace Scope: <strong className="text-indigo-300">{currentUser?.workspaceName}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Role: {currentUser?.role}
            </span>

            <LogoutButton />
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2 animate-pulse">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* CSV Bulk Upload Summary Result */}
        {uploadResult && (
          <div className="p-5 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <span>CSV Upload Summary</span>
              </h3>
              <button 
                onClick={() => setUploadResult(null)}
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              >
                Dismiss
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800">
                <div className="text-2xl font-extrabold text-emerald-400">
                  {uploadResult.importedCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Imported
                </div>
              </div>
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800">
                <div className="text-2xl font-extrabold text-rose-400">
                  {uploadResult.failedCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Failed Rows
                </div>
              </div>
              <div className="bg-gray-950/40 p-3 rounded-xl border border-gray-800 col-span-2 md:col-span-1">
                <div className="text-2xl font-extrabold text-indigo-400">
                  {uploadResult.importedCount + uploadResult.failedCount}
                </div>
                <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                  Total Processed
                </div>
              </div>
            </div>

            {uploadResult.failures && uploadResult.failures.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400">
                  Failure Details:
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-800/60 bg-gray-950/80 rounded-xl border border-gray-800 p-3 font-mono text-[11px]">
                  {uploadResult.failures.map((fail, index) => (
                    <div key={index} className="py-1.5 flex gap-2 text-rose-400">
                      <span className="font-bold shrink-0 text-rose-300">[Row {fail.row}]</span>
                      <span className="text-gray-300">{fail.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Create Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Ingest Feedback</span>
              </h2>

              {canCreate ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Feedback Content <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Paste customer message, app review, support transcript..."
                      className="w-full px-4 py-3 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm placeholder-gray-500 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Feedback Channel <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 text-white text-sm transition-all"
                    >
                      <option value="support_ticket">Support Ticket</option>
                      <option value="app_review">App Review</option>
                      <option value="nps_survey">NPS Survey</option>
                      <option value="sales_note">Sales Note</option>
                      <option value="community_post">Community Post</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Customer / Company <span className="text-gray-500">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={customerLabel}
                      onChange={(e) => setCustomerLabel(e.target.value)}
                      placeholder="e.g. Acme Corp or Jane Doe"
                      className="w-full px-4 py-2.5 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm placeholder-gray-500 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Ingest Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <span className="block font-semibold mb-1">Submission Restricted</span>
                  Your assigned role is <strong className="text-amber-200">{currentUser?.role}</strong> (read-only). Feedback entry is only permitted for ADMIN or ANALYST roles.
                </div>
              )}
            </div>

            {/* CSV Bulk Upload Card */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Inbox className="h-5 w-5 text-indigo-400" />
                <span>Bulk Upload CSV</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Upload a CSV file containing feedback items to import them in bulk. Required columns: <code className="text-indigo-300 font-mono">content</code>, <code className="text-indigo-300 font-mono">channel</code>. Optional columns: <code className="text-indigo-300 font-mono">customer_label</code>, <code className="text-indigo-300 font-mono">created_at</code>.
              </p>

              {canCreate ? (
                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Select CSV File
                    </label>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-950/60 border border-gray-800 text-gray-300 text-xs file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer cursor-pointer transition-all"
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <a
                      href="/sample_feedback.csv"
                      download="sample_feedback.csv"
                      className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center space-x-1 transition-colors"
                    >
                      <span>Download sample CSV template</span>
                    </a>
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Upload & Import</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <span className="block font-semibold mb-1">Import Restricted</span>
                  Your assigned role is <strong className="text-amber-200">{currentUser?.role}</strong> (read-only). CSV feedback upload is only permitted for ADMIN or ANALYST roles.
                </div>
              )}
            </div>

            {/* Simulate Integration Channel Card */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <span>Simulate Integrations</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                Demo sandbox: Pull sample customer feedback from simulated integration channels. Generates randomized entries with realistic tone and dates.
              </p>

              {canCreate ? (
                <div className="space-y-3 pt-2">
                  <button
                    onClick={() => handleSimulateChannel('app_review')}
                    disabled={simulating !== null}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-200 font-semibold text-xs transition-all flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span>Pull from App Store</span>
                    </span>
                    {simulating === 'app_review' ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-white transition-colors" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSimulateChannel('support_ticket')}
                    disabled={simulating !== null}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-200 font-semibold text-xs transition-all flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="flex items-center space-x-2">
                      <Ticket className="h-4 w-4 text-rose-400" />
                      <span>Pull from Support Desk</span>
                    </span>
                    {simulating === 'support_ticket' ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-white transition-colors" />
                    )}
                  </button>

                  <button
                    onClick={() => handleSimulateChannel('sales_note')}
                    disabled={simulating !== null}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-200 font-semibold text-xs transition-all flex items-center justify-between group disabled:opacity-50"
                  >
                    <span className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-indigo-400" />
                      <span>Pull from Sales Notes</span>
                    </span>
                    {simulating === 'sales_note' ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <ArrowRight className="h-3.5 w-3.5 text-gray-500 group-hover:text-white transition-colors" />
                    )}
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <span className="block font-semibold mb-1">Simulation Restricted</span>
                  Your assigned role is <strong className="text-amber-200">{currentUser?.role}</strong> (read-only). Feed simulation is only permitted for ADMIN or ANALYST roles.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: List & Display */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800/80 flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                    <span>Feedback Streams</span>
                  </h2>
                  <div className="flex items-center space-x-3">
                    {canCreate && feedbackList.length > 0 && (
                      <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                        <input
                          type="checkbox"
                          checked={feedbackList.every(item => selectedFeedbackIds.includes(item.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allCurrentIds = feedbackList.map(item => item.id);
                              const newSelection = Array.from(new Set([...selectedFeedbackIds, ...allCurrentIds]));
                              setSelectedFeedbackIds(newSelection);
                            } else {
                              const currentIds = feedbackList.map(item => item.id);
                              setSelectedFeedbackIds(selectedFeedbackIds.filter(id => !currentIds.includes(id)));
                            }
                          }}
                          className="h-3.5 w-3.5 rounded border-gray-800 bg-gray-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-950 accent-indigo-500 cursor-pointer"
                        />
                        <span>Select All on Page</span>
                      </label>
                    )}
                    <button
                      onClick={fetchFeedback}
                      className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                      title="Refresh List"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Bulk Actions Banner */}
                {canCreate && selectedFeedbackIds.length > 0 && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs animate-pulse">
                    <span className="text-indigo-300 font-semibold">
                      {selectedFeedbackIds.length} items selected
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedFeedbackIds([])}
                        className="px-2.5 py-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-white border border-gray-800 hover:border-gray-700 transition-colors"
                      >
                        Clear Selection
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        disabled={deletingFeedback}
                        className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                      >
                        {deletingFeedback ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <span>Delete Selected</span>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="py-24 text-center text-gray-500 space-y-3">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-indigo-400" />
                  <p className="text-sm">Fetching workspace feedback items...</p>
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="py-24 px-6 text-center space-y-3">
                  <Inbox className="h-12 w-12 mx-auto text-gray-600 mb-2" />
                  <p className="text-gray-300 font-medium">No feedback yet in this workspace</p>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto">
                    {canCreate 
                      ? 'Add your very first feedback item above to start analyzing tenant intelligence streams.'
                      : 'Ask a workspace Administrator or Analyst to ingest feedback items.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/60">
                  {feedbackList.map((item) => {
                    const channelInfo = channelsConfig[item.channel] || {
                      label: item.channel,
                      icon: MessageSquare,
                      color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                    };
                    const ChannelIcon = channelInfo.icon;
                    const isSelected = selectedFeedbackIds.includes(item.id);

                    return (
                      <div key={item.id} className="p-6 hover:bg-gray-900/20 transition-all duration-200 flex gap-4 items-start">
                        {canCreate && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFeedbackIds([...selectedFeedbackIds, item.id]);
                              } else {
                                setSelectedFeedbackIds(selectedFeedbackIds.filter(id => id !== item.id));
                              }
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-800 bg-gray-950 text-indigo-650 focus:ring-indigo-500 focus:ring-offset-gray-950 accent-indigo-500 cursor-pointer"
                          />
                        )}
                        <div className="flex-1 space-y-4">
                          {/* Header details: Channel & Customer */}
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center space-x-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold border ${channelInfo.color}`}>
                                <ChannelIcon className="h-3.5 w-3.5 mr-1.5" />
                                {channelInfo.label}
                              </span>
                              {item.customerLabel && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 font-medium">
                                  <User className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                                  {item.customerLabel}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-4 text-gray-500 font-medium">
                              <span className="inline-flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-600" />
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">
                                {item.status}
                              </span>
                            </div>
                          </div>

                          {/* Content text */}
                          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                            {item.content}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Footer */}
              {totalCount > 0 && (
                <div className="p-4 bg-gray-950/40 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Showing <strong className="text-gray-200">{skip + 1}</strong> to{' '}
                    <strong className="text-gray-200">{Math.min(skip + take, totalCount)}</strong> of{' '}
                    <strong className="text-gray-200">{totalCount}</strong> items
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSkip(Math.max(0, skip - take))}
                      disabled={skip === 0 || loading}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-50 transition-all flex items-center space-x-1"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Prev</span>
                    </button>
                    <button
                      onClick={() => setSkip(skip + take)}
                      disabled={skip + take >= totalCount || loading}
                      className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-50 transition-all flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
