'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  User,
  Shield,
  MessageSquare,
  Ticket,
  Star,
  Award,
  TrendingUp,
  Users,
  Search,
  X,
  FileText,
  HelpCircle,
  Trash2,
  Tag,
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

// Sample suggested questions for quick demo clicks
const SUGGESTED_QUESTIONS = [
  'What are customers saying about onboarding?',
  'Are there any recurring billing or refund complaints?',
  'What features are users requesting most often?',
  'How do users feel about recent performance and speed?',
];

function AskContent() {
  const { data: session, status } = useSession();
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const currentUser = session?.user;

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Submit Question to POST /api/ask
  const handleAskQuestion = async (qText) => {
    const targetQuestion = (qText || question).trim();
    if (!targetQuestion || loading) return;

    setLoading(true);
    setError('');

    const questionId = Date.now().toString();

    // Optimistically push question to local chat state
    setMessages((prev) => [
      ...prev,
      {
        id: questionId,
        question: targetQuestion,
        answer: null,
        citedItems: [],
        timestamp: new Date(),
        loading: true,
      },
    ]);

    setQuestion('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: targetQuestion }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to generate answer.');
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === questionId
              ? {
                  ...msg,
                  loading: false,
                  error: data.error || 'Failed to process question',
                  answer: "I couldn't process that question right now. Please try again.",
                }
              : msg
          )
        );
        return;
      }

      // Update message with answer & cited sources from backend
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === questionId
            ? {
                ...msg,
                loading: false,
                answer: data.answer,
                citedItems: data.citedItems || [],
              }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
      setError('An error occurred while communicating with Ask LOOP.');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === questionId
            ? {
                ...msg,
                loading: false,
                answer: 'Network error occurred while asking question.',
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleAskQuestion(question);
  };

  const handleClearHistory = () => {
    setMessages([]);
    setError('');
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
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col justify-between">
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
                <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold text-white leading-tight">Ask LOOP — Grounded Q&amp;A</h1>
                  <p className="text-[11px] text-gray-400">
                    Semantic vector search &amp; Claude AI context retrieval
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

              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="p-1.5 rounded-xl bg-gray-900 hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 border border-gray-800 transition-colors"
                  title="Clear Conversation History"
                >
                  <Trash2 className="h-4 w-4" />
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

      {/* Main Chat Thread Area */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 space-y-6">
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

        {/* Empty State: Suggested Questions */}
        {messages.length === 0 ? (
          <div className="glass-card p-10 rounded-3xl border border-gray-800 text-center space-y-6 my-8">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
              <Sparkles className="h-8 w-8 text-white" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl font-bold text-white">Ask anything about your customer feedback</h2>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ask LOOP uses semantic vector search to retrieve relevant customer feedback items from your workspace, then grounds Claude AI answers strictly in those verifiable sources.
              </p>
            </div>

            {/* Suggested Question Chips */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
                Try asking a sample question
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
                {SUGGESTED_QUESTIONS.map((sq, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(sq)}
                    className="p-3.5 rounded-2xl bg-gray-900/80 hover:bg-gray-850 border border-gray-800/80 hover:border-indigo-500/40 text-xs text-gray-300 hover:text-white font-medium transition-all group flex items-start space-x-2.5"
                  >
                    <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                    <span>{sq}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Thread */
          <div className="space-y-8">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-4">
                {/* User Question Bubble (Right Aligned) */}
                <div className="flex justify-end">
                  <div className="max-w-xl p-4 rounded-2xl bg-indigo-600 text-white text-sm font-sans shadow-lg shadow-indigo-600/10 space-y-1">
                    <p className="leading-relaxed font-medium">{msg.question}</p>
                    <span className="text-[10px] text-indigo-200 block text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Ask LOOP Answer Bubble (Left Aligned) */}
                <div className="flex justify-start items-start space-x-3">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>

                  <div className="max-w-2xl space-y-4 flex-1">
                    <div className="glass-card p-5 rounded-2xl border border-gray-800 text-sm text-gray-200 leading-relaxed font-sans space-y-3">
                      {msg.loading ? (
                        <div className="flex items-center space-x-2 text-indigo-400 text-xs py-2">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Searching workspace embeddings &amp; generating grounded answer...</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="whitespace-pre-line">{msg.answer}</p>
                        </div>
                      )}
                    </div>

                    {/* Cited Sources Section */}
                    {!msg.loading && msg.citedItems && msg.citedItems.length > 0 && (
                      <div className="p-4 rounded-2xl bg-gray-900/60 border border-gray-800/80 space-y-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center space-x-1.5 text-indigo-400">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Verifiable Sources ({msg.citedItems.length})</span>
                          </span>
                          <span className="text-[10px] font-normal text-gray-500">
                            Items cited in response
                          </span>
                        </div>

                        {/* Sources Grid */}
                        <div className="space-y-2.5">
                          {msg.citedItems.map((item, i) => {
                            const channelInfo = channelsConfig[item.channel] || {
                              label: item.channel,
                              icon: Ticket,
                              color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
                            };
                            const ChannelIcon = channelInfo.icon;

                            return (
                              <div
                                key={item.id || i}
                                className="p-3 rounded-xl bg-gray-950/80 border border-gray-800/80 text-xs space-y-2 hover:border-gray-700 transition-colors"
                              >
                                <p className="text-gray-300 font-sans leading-relaxed">
                                  &quot;{item.content}&quot;
                                </p>
                                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-900">
                                  <span
                                    className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded border font-medium ${channelInfo.color}`}
                                  >
                                    <ChannelIcon className="h-3 w-3 shrink-0" />
                                    <span>{channelInfo.label}</span>
                                  </span>

                                  {item.customerLabel && (
                                    <span className="text-gray-400 font-medium">
                                      Sender: {item.customerLabel}
                                    </span>
                                  )}

                                  <span>
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        )}
      </main>

      {/* Bottom Sticky Input Bar */}
      <footer className="border-t border-gray-800/80 bg-gray-950/90 backdrop-blur-md sticky bottom-0 z-40 py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleFormSubmit} className="relative flex items-center">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your customer feedback..."
              disabled={loading}
              className="w-full pl-4 pr-12 py-3.5 rounded-2xl bg-gray-900 border border-gray-800 text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={loading || !question.trim()}
              className="absolute right-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-all shadow-md shadow-indigo-600/20"
              title="Send Question"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </form>
          <p className="text-[11px] text-gray-500 text-center mt-2">
            Ask LOOP retrieves feedback items from your workspace before generating grounded answers.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Loading Ask LOOP...</span>
          </div>
        </div>
      }
    >
      <AskContent />
    </Suspense>
  );
}
