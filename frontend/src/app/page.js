import Link from 'next/link';
import {
  Sparkles,
  MessageSquare,
  TrendingUp,
  Shield,
  Layers,
  FileText,
  Tag,
  Inbox,
  ArrowRight,
  CheckCircle2,
  Lock,
  Cpu,
  BarChart3,
  Users,
  Search,
  Database,
  ExternalLink,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-gray-100 font-sans antialiased selection:bg-indigo-500 selection:text-white flex flex-col justify-between overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="ambient-glow w-[600px] h-[600px] bg-indigo-600/20 top-[-150px] left-[-150px]" />
      <div className="ambient-glow w-[500px] h-[500px] bg-purple-600/20 bottom-[-100px] right-[-100px]" />
      <div className="ambient-glow w-[400px] h-[400px] bg-pink-600/15 top-[30%] right-[10%]" />

      {/* Top Glassmorphism Navigation Bar */}
      <header className="relative z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <div className="h-full w-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white block leading-none">
                Project LOOP
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                AI Feedback Intelligence Platform
              </span>
            </div>
          </div>

          {/* Nav Links & Auth CTAs */}
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex text-xs font-semibold text-gray-300 hover:text-white px-3 py-2 transition-colors"
            >
              Dashboard
            </Link>

            <Link
              href="/inbox"
              className="hidden sm:inline-flex text-xs font-semibold text-gray-300 hover:text-white px-3 py-2 transition-colors"
            >
              Inbox
            </Link>

            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold text-xs border border-gray-800 hover:border-gray-700 transition-all"
            >
              Sign In
            </Link>

            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/25 hover:scale-[1.02]"
            >
              Create Workspace
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 py-12 space-y-16">
        {/* Hero Pitch Section */}
        <div className="text-center max-w-4xl mx-auto space-y-6 pt-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-indigo-950/80 border border-indigo-800/40 text-indigo-300 text-xs font-semibold shadow-inner">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>Powered by Google Gemini 1.5 &amp; Claude RAG</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-none">
            Turn Scattered Feedback Into <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Ranked, Evidence-Backed Actions
            </span>
          </h1>

          <p className="text-gray-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Project LOOP ingests customer feedback across support tickets, reviews, NPS surveys, and sales calls — automatically classifying sentiment, detecting emerging themes, and generating executive reports.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Launch Live Dashboard</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>

            <Link
              href="/login"
              className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold text-sm px-6 py-3.5 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
            >
              <Lock className="h-4 w-4 text-gray-400" />
              <span>Sign In to Demo Workspace</span>
            </Link>
          </div>
        </div>

        {/* Live Seeded Credentials Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/30 via-gray-900/60 to-gray-950 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Shield className="h-4 w-4" />
              <span>Seeded Demo Credentials (Ready to Test)</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Password for all: demo1234
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
            <Link
              href="/login"
              className="p-4 rounded-2xl bg-gray-900/90 border border-purple-500/30 hover:border-purple-500/60 transition-all block group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-purple-300">ADMIN ROLE</span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-purple-300 transition-colors" />
              </div>
              <p className="font-mono text-gray-200 font-semibold">admin@acme.com</p>
              <p className="text-[10px] text-gray-500 mt-1">Full control, report export &amp; theme merge</p>
            </Link>

            <Link
              href="/login"
              className="p-4 rounded-2xl bg-gray-900/90 border border-indigo-500/30 hover:border-indigo-500/60 transition-all block group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-indigo-300">ANALYST ROLE</span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-indigo-300 transition-colors" />
              </div>
              <p className="font-mono text-gray-200 font-semibold">analyst@acme.com</p>
              <p className="text-[10px] text-gray-500 mt-1">Ingest feedback, AI classification &amp; Q&amp;A</p>
            </Link>

            <Link
              href="/login"
              className="p-4 rounded-2xl bg-gray-900/90 border border-emerald-500/30 hover:border-emerald-500/60 transition-all block group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-extrabold text-emerald-300">VIEWER ROLE</span>
                <ExternalLink className="h-3.5 w-3.5 text-gray-500 group-hover:text-emerald-300 transition-colors" />
              </div>
              <p className="font-mono text-gray-200 font-semibold">viewer@acme.com</p>
              <p className="text-[10px] text-gray-500 mt-1">Read-only dashboard &amp; executive reports</p>
            </Link>
          </div>
        </div>

        {/* Feature Grid: "Every Work of Project LOOP" */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Complete Feature Capabilities
            </h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">
              Everything built into Project LOOP from multi-channel ingestion to vector-grounded Q&amp;A.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1: Ingestion & Inbox */}
            <Link href="/inbox" className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 hover:border-indigo-500/50 transition-all group block">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Inbox className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center justify-between">
                  <span>Feedback Inbox &amp; Ingestion</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Single feedback submission, CSV bulk upload, and simulated channel stream across Support Tickets, Reviews, NPS, and Sales Notes.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">CSV Bulk Upload</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Channel Simulator</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Filters &amp; Search</span>
              </div>
            </Link>

            {/* Feature 2: Ask LOOP Q&A */}
            <Link href="/ask" className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 hover:border-purple-500/50 transition-all group block">
              <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors flex items-center justify-between">
                  <span>Ask LOOP Grounded Q&amp;A</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  RAG Q&amp;A engine searching 1536-dimensional pgvector embeddings to answer product questions backed by verbatim customer quotes.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Vector Embeddings</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Exact Customer Quotes</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">No Hallucination</span>
              </div>
            </Link>

            {/* Feature 3: Executive VoC Reports */}
            <Link href="/reports" className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 hover:border-pink-500/50 transition-all group block">
              <div className="h-12 w-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                <FileText className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition-colors flex items-center justify-between">
                  <span>Executive VoC Reports</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-pink-400" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Automated narrative reports with sentiment distribution, theme volume shifts, critical issue summaries, and PDF print export.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">PDF Print View</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Theme Volume Trends</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Action Items</span>
              </div>
            </Link>

            {/* Feature 4: Theme Intelligence */}
            <Link href="/themes" className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 hover:border-emerald-500/50 transition-all group block">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Tag className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                  <span>Theme Clusters &amp; Trends</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Create, re-classify, and merge feedback themes with real-time volume spike detection and sentiment distribution.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Theme Merging</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Spike Alerts</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">AI Re-classification</span>
              </div>
            </Link>

            {/* Feature 5: Multi-Tenant RBAC */}
            <Link href="/settings/members" className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4 hover:border-cyan-500/50 transition-all group block">
              <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center justify-between">
                  <span>Multi-Tenant &amp; RBAC</span>
                  <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400" />
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Strict workspace tenant isolation with 3 role tiers: Admin (Full control), Analyst (Ingestion &amp; AI), and Viewer (Read-only).
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Admin</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Analyst</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Viewer</span>
              </div>
            </Link>

            {/* Feature 6: Hardened Security */}
            <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Shield className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Production Hardened</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Standardized JSON API error handling, custom 404/403 pages, accessible keyboard navigation, and zero unhandled crashes.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">NextAuth JWT</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Custom 404 / 403</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-900 text-gray-300 border border-gray-800">Zod Validation</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/80 py-8 px-6 text-center text-gray-500 text-xs bg-gray-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Project LOOP. Next.js 14 • PostgreSQL • Prisma • Tailwind CSS</p>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-400 hover:text-white transition-colors">Sign In</Link>
            <Link href="/signup" className="text-gray-400 hover:text-white transition-colors">Create Workspace</Link>
            <Link href="/dashboard" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Go to Dashboard →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
