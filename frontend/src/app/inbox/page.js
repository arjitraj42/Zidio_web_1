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
  Clock,
  Search,
  X
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

// Status configurations for badge styling and inline selector
const statusConfig = {
  NEW: {
    label: 'New',
    color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20',
  },
  REVIEWED: {
    label: 'Reviewed',
    color: 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/20',
  },
  ACTIONED: {
    label: 'Actioned',
    color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/20',
  },
};

export default function InboxPage() {
  const { data: session, status } = useSession();
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Server-side Pagination & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
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
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const currentUser = session?.user;
  const canCreate = currentUser?.role === 'ADMIN' || currentUser?.role === 'ANALYST';

  // Debounce search query input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1); // Reset to page 1 on new search term
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Feedback Items with Search & Server-Side Pagination
  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const url = `/api/feedback?page=${page}&pageSize=${pageSize}&q=${encodeURIComponent(debouncedQuery)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to fetch feedback items');
        setLoading(false);
        return;
      }

      setFeedbackList(data.items || data.feedback || []);
      setTotalCount(data.total || data.pagination?.total || 0);
      setTotalPages(data.totalPages || data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      setError('An error occurred while loading feedback.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQuery]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchFeedback();
    }
  }, [status, fetchFeedback]);

  // Handle Optimistic Inline Status Change
  const handleStatusChange = async (feedbackId, newStatus) => {
    if (!canCreate || updatingStatusId) return;

    const previousList = [...feedbackList];
    setUpdatingStatusId(feedbackId);

    // Optimistic UI Update
    setFeedbackList((prev) =>
      prev.map((item) => (item.id === feedbackId ? { ...item, status: newStatus } : item))
    );

    try {
      const res = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert UI to previous state if patch fails
        setFeedbackList(previousList);
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      setFeedbackList(previousList);
      setError('Network error while updating feedback status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

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
      setPage(1); // Reset to first page to see the new item
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
        setPage(1); // Reset to first page
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
      setPage(1); // Reset to first page
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

    try {
      const res = await fetch('/api/feedback/bulk-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedFeedbackIds }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete selected feedback items');
        return;
      }

      setSuccessMsg(`Successfully deleted ${data.count} feedback items.`);
      setSelectedFeedbackIds([]);
      setPage(1); // Reset to page 1 after deletion
      fetchFeedback();
    } catch (err) {
      console.error(err);
      setError('An error occurred while deleting feedback.');
    } finally {
      setDeletingFeedback(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
          <span>Loading session data...</span>
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
              <Link
                href="/dashboard"
                className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors border border-gray-800"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Inbox className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">Workspace Inbox</h1>
                  <p className="text-[11px] text-gray-400">Stream feedback ingestion & status workflow</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-gray-900/80 border border-gray-800/80 text-xs">
                  <div className="flex items-center space-x-2">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="font-semibold text-gray-200">{currentUser.name || currentUser.email}</span>
                  </div>
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

      {/* Main Container Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner Messages */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center space-x-3 text-rose-300 text-sm animate-shake">
            <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center space-x-3 text-emerald-300 text-sm animate-fadeIn">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 2-Column Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Form Controls */}
          <div className="space-y-6">
            {/* Single Feedback Form */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Plus className="h-5 w-5 text-indigo-400" />
                <span>Single Feedback Entry</span>
              </h2>

              {canCreate ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Touchpoint Channel *
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => setChannel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="support_ticket">Support Ticket</option>
                      <option value="app_review">App Review</option>
                      <option value="nps_survey">NPS Survey</option>
                      <option value="sales_note">Sales Note</option>
                      <option value="community_post">Community Post</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Customer Label / Sender (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerLabel}
                      onChange={(e) => setCustomerLabel(e.target.value)}
                      placeholder="e.g. Acme Corp, User_102"
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Feedback Content *
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Enter customer quote or review text..."
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Submit Feedback</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  <span className="block font-semibold mb-1">Read-Only View</span>
                  Your role is <strong className="text-amber-200">{currentUser?.role}</strong>. Creating feedback requires ADMIN or ANALYST privileges.
                </div>
              )}
            </div>

            {/* CSV Bulk Ingestion Card */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-indigo-400" />
                <span>Bulk CSV Upload</span>
              </h2>

              {canCreate ? (
                <form onSubmit={handleBulkUpload} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">
                      Select CSV File
                    </label>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setUploadFile(e.target.files[0] || null)}
                      className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-850 file:text-indigo-300 hover:file:bg-gray-800 cursor-pointer"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-gray-200 font-semibold text-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {uploading ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                    ) : (
                      <span>Upload & Ingest CSV</span>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                  CSV ingestion restricted for VIEWER role.
                </div>
              )}
            </div>

            {/* Simulate Integration Channel Card */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-indigo-400" />
                <span>Simulate Integrations</span>
              </h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Demo sandbox: Pull sample customer feedback from simulated integration channels.
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
                  Simulation restricted for VIEWER role.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: List & Display */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800/80 flex flex-col space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-indigo-400" />
                    <span>Feedback Streams</span>
                  </h2>

                  {/* Search bar input with debouncing */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search feedback content..."
                      className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-gray-900 border border-gray-800 text-gray-200 text-xs focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-gray-600"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    {canCreate && feedbackList.length > 0 && (
                      <label className="flex items-center space-x-2 text-xs text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                        <input
                          type="checkbox"
                          checked={feedbackList.length > 0 && feedbackList.every(item => selectedFeedbackIds.includes(item.id))}
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
                        <span>Select All</span>
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
                  <p className="text-gray-300 font-medium">
                    {debouncedQuery ? `No feedback matches your search "${debouncedQuery}"` : 'No feedback yet in this workspace'}
                  </p>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto">
                    {debouncedQuery 
                      ? 'Try adjusting your search terms or clear the filter input.' 
                      : canCreate 
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
                    const currentStatus = item.status || 'NEW';

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
                          {/* Header details: Channel, Customer & Status */}
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

                            <div className="flex items-center space-x-3 text-gray-500 font-medium">
                              <span className="inline-flex items-center text-gray-400 text-xs">
                                <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-500" />
                                {new Date(item.createdAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>

                              {/* Inline Status Dropdown (ADMIN/ANALYST) or Static Badge (VIEWER) */}
                              {canCreate ? (
                                <select
                                  value={currentStatus}
                                  disabled={updatingStatusId === item.id}
                                  onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer bg-gray-950 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                    statusConfig[currentStatus]?.color || 'bg-gray-800 text-gray-300 border-gray-700'
                                  }`}
                                >
                                  <option value="NEW" className="bg-gray-900 text-indigo-300">NEW</option>
                                  <option value="REVIEWED" className="bg-gray-900 text-amber-300">REVIEWED</option>
                                  <option value="ACTIONED" className="bg-gray-900 text-emerald-300">ACTIONED</option>
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusConfig[currentStatus]?.color || 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                                  {currentStatus}
                                </span>
                              )}
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

              {/* Server-Side Pagination Footer */}
              {totalCount > 0 && (
                <div className="p-4 bg-gray-950/40 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Showing <strong className="text-gray-200">{(page - 1) * pageSize + 1}</strong> to{' '}
                    <strong className="text-gray-200">{Math.min(page * pageSize, totalCount)}</strong> of{' '}
                    <strong className="text-gray-200">{totalCount}</strong> items
                  </span>

                  <div className="flex items-center space-x-3">
                    <span className="text-gray-500">
                      Page <strong className="text-gray-300">{page}</strong> of <strong className="text-gray-300">{totalPages}</strong>
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                        className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-50 transition-all flex items-center space-x-1"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span>Prev</span>
                      </button>
                      <button
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={page >= totalPages || loading}
                        className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 hover:text-white disabled:opacity-50 transition-all flex items-center space-x-1"
                      >
                        <span>Next</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
