import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';
import { Shield, Building2, UserCheck, Key, Database, LayoutDashboard } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 p-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="ambient-glow w-[500px] h-[500px] bg-indigo-600/15 top-[-100px] left-[-100px]" />
      <div className="ambient-glow w-[400px] h-[400px] bg-purple-600/10 bottom-[-50px] right-[-50px]" />

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
              <LayoutDashboard className="h-4 w-4" />
              <span>Project LOOP Dashboard</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-gray-400 text-sm">
              Tenant Intelligence Workspace: <strong className="text-indigo-300">{user.workspaceName}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Shield className="h-3.5 w-3.5 mr-1.5" />
              Role: {user.role}
            </span>

            <LogoutButton />
          </div>
        </div>

        {/* User Session Diagnostics Card */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-indigo-400" />
            <span>Authenticated Server Session Payload</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">User ID</span>
              <code className="text-indigo-300 text-xs break-all block font-mono">{user.id}</code>
            </div>

            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Workspace ID (Tenant Scope)</span>
              <code className="text-purple-300 text-xs break-all block font-mono">{user.workspaceId}</code>
            </div>

            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">User Email</span>
              <span className="text-gray-200 text-sm font-medium block">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800/80 space-y-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Assigned Role (RBAC)</span>
              <span className="text-emerald-400 text-sm font-bold block">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Tenant Scope Demonstration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <Building2 className="h-6 w-6 text-indigo-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Multi-Tenant Isolation</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Every API route uses <code className="text-indigo-300">session.user.workspaceId</code> to filter PostgreSQL queries automatically.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <Key className="h-6 w-6 text-purple-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Role-Based Access Control</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Session role <code className="text-purple-300">{user.role}</code> guards administrative actions (e.g. ADMIN write, ANALYST read).
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-gray-800">
            <Database className="h-6 w-6 text-emerald-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Session Persistence</h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Encrypted JWT session cookie persists across browser page refreshes for 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
