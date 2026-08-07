'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      <div className="max-w-md w-full glass-card p-8 rounded-3xl border border-rose-500/20 bg-rose-950/10 text-center space-y-6 shadow-2xl">
        <div className="h-16 w-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20">
            403 — Access Forbidden
          </span>
          <h1 className="text-2xl font-black text-white">Action Restricted</h1>
          <p className="text-xs text-gray-300 leading-relaxed">
            Your current account role does not have permission to access this resource or perform this administrative action.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20"
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
          <Link
            href="/inbox"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 font-semibold text-xs border border-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Inbox</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
