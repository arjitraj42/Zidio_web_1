import Link from 'next/link';
import { 
  Database, 
  Zap, 
  Globe, 
  CheckCircle2, 
  Server, 
  Terminal, 
  ArrowRight, 
  ShieldCheck, 
  Layers, 
  Code2
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="ambient-glow w-[500px] h-[500px] bg-indigo-600/30 top-[-100px] left-[-100px]" />
      <div className="ambient-glow w-[400px] h-[400px] bg-purple-600/20 bottom-[-50px] right-[-50px]" />

      {/* Navigation Bar */}
      <header className="relative z-10 border-b border-gray-800/60 bg-gray-950/40 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <div className="h-full w-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <Zap className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Zidio</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
              Vercel Ready
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Hero */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-sm font-medium">
            <Code2 className="h-4 w-4 text-indigo-400" />
            <span>Next.js + JavaScript + Tailwind + PostgreSQL</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Hello World from <br />
            <span className="gradient-text">Zidio App Engine</span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl leading-relaxed">
            Your full-stack foundation is configured, connected, and ready for deployment to Vercel from day one.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              <Server className="h-5 w-5" />
              <span>Test Health API</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </a>

            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-gray-200 font-semibold px-6 py-3 rounded-xl border border-gray-800 hover:border-gray-700 transition-all"
            >
              <Globe className="h-5 w-5 text-gray-400" />
              <span>Deploy on Vercel</span>
            </a>
          </div>
        </div>

        {/* Feature & Setup Architecture Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Card 1: Next.js + JavaScript */}
          <div className="glass-card p-6 rounded-2xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Next.js 15 App Router</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Clean JavaScript (ES6+) code structure with Tailwind CSS styling and modular layout templates.
            </p>
          </div>

          {/* Card 2: PostgreSQL + Prisma */}
          <div className="glass-card p-6 rounded-2xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">PostgreSQL Database</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Configured with Prisma ORM client singleton in <code className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded">src/lib/db.js</code> for seamless queries.
            </p>
          </div>

          {/* Card 3: Vercel Ready */}
          <div className="glass-card p-6 rounded-2xl transition-all duration-300">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
              <Globe className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Zero-Config Vercel</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Ready for automatic GitHub push & Vercel deployment with environment variable bindings.
            </p>
          </div>
        </div>

        {/* Deployment Checklist */}
        <div className="glass-card p-8 rounded-2xl border border-gray-800">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            <span>Day One Vercel Push Guide</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-950/40 border border-gray-800/60">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-200 block">1. Connect PostgreSQL Database</strong>
                <span className="text-gray-400">Add your PostgreSQL <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">DATABASE_URL</code> to <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">.env.local</code> and Vercel dashboard.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-950/40 border border-gray-800/60">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-200 block">2. Push Git Repository</strong>
                <span className="text-gray-400">Run <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">git remote add origin &lt;YOUR_REPO_URL&gt;</code> and push your initial commit.</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-950/40 border border-gray-800/60">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-200 block">3. Import into Vercel</strong>
                <span className="text-gray-400">Visit <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">vercel.com/new</code>, select your repository, set <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">DATABASE_URL</code> env, and deploy!</span>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg bg-gray-950/40 border border-gray-800/60">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-200 block">4. Sync Database Schema</strong>
                <span className="text-gray-400">Run <code className="text-xs bg-gray-900 px-1 py-0.5 rounded text-indigo-300">npm run db:push</code> to create database tables on your hosted PostgreSQL instance.</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/60 py-6 px-6 text-center text-gray-500 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Zidio Platform. Built with Next.js & Tailwind CSS.</p>
          <div className="flex items-center space-x-4 text-xs">
            <span className="text-gray-400">Environment: <code className="text-indigo-400">{process.env.NODE_ENV}</code></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
