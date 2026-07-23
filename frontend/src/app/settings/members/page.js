'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Users, 
  ShieldAlert, 
  ShieldCheck, 
  UserPlus, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Mail,
  Shield
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

export default function MembersPage() {
  const { data: session, status } = useSession();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // New Member Form State
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
  });
  const [adding, setAdding] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const currentUser = session?.user;
  const isAdmin = currentUser?.role === 'ADMIN';

  // Fetch Members List
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/workspace/members');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load workspace members');
        setLoading(false);
        return;
      }

      setMembers(data.members || []);
    } catch (err) {
      setError('An error occurred while fetching members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMembers();
    }
  }, [status, fetchMembers]);

  // Handle Role Change (ADMIN ONLY)
  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/workspace/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update member role');
        setUpdatingId(null);
        return;
      }

      setSuccessMsg(`Role updated to ${newRole} successfully.`);
      fetchMembers();
    } catch (err) {
      setError('Failed to execute role change.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Handle Add Member (ADMIN ONLY)
  const handleAddMember = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/workspace/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMember),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create member');
        setAdding(false);
        return;
      }

      setSuccessMsg(`Member ${data.member.name} added to workspace.`);
      setNewMember({ name: '', email: '', password: '', role: 'VIEWER' });
      fetchMembers();
    } catch (err) {
      setError('An error occurred while adding member.');
    } finally {
      setAdding(false);
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

      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <Link href="/dashboard" className="inline-flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium mb-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
              <Users className="h-8 w-8 text-indigo-400" />
              <span>Workspace Members Management</span>
            </h1>
            <p className="text-gray-400 text-sm">
              Workspace: <strong className="text-indigo-300">{currentUser?.workspaceName}</strong> ({currentUser?.workspaceId})
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

        {/* Non-Admin Restriction Alert Banner */}
        {!isAdmin && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-start space-x-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Restricted View (Read-Only Mode)</strong>
              <span>
                You are logged in as <strong className="text-amber-200">{currentUser?.role}</strong>. Only Workspace Admins can modify member roles or add new users. API endpoints will strictly enforce 403 Forbidden checks for unauthorized modifications.
              </span>
            </div>
          </div>
        )}

        {/* Global Feedback Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center space-x-2">
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

        {/* Add Member Form (ADMIN ONLY UI) */}
        {isAdmin && (
          <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <UserPlus className="h-5 w-5 text-indigo-400" />
              <span>Add New Workspace Member</span>
            </h2>

            <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm"
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  placeholder="email@acme.com"
                  value={newMember.email}
                  onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm"
                />
              </div>

              <div>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-950/60 border border-gray-800 focus:border-indigo-500 text-white text-sm"
                >
                  <option value="VIEWER">VIEWER (Read-Only)</option>
                  <option value="ANALYST">ANALYST (Read & Query)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={adding}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {adding ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Add Member</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Members Table Card */}
        <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-6 border-b border-gray-800/80 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              <span>Current Workspace Members</span>
            </h2>
            <button
              onClick={fetchMembers}
              className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Refresh Members"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-950/60 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4">Member Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No members found in this workspace.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-900/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-white flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center">
                          {member.name.charAt(0)}
                        </div>
                        <span>{member.name}</span>
                        {member.id === currentUser?.id && (
                          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">You</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-gray-400">
                        <span className="inline-flex items-center space-x-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-500" />
                          <span>{member.email}</span>
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            member.role === 'ADMIN'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : member.role === 'ANALYST'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        {isAdmin ? (
                          <select
                            disabled={updatingId === member.id}
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            className="bg-gray-950 border border-gray-800 focus:border-indigo-500 text-xs text-gray-200 rounded-lg px-2.5 py-1.5 font-medium cursor-pointer"
                          >
                            <option value="ADMIN">Make ADMIN</option>
                            <option value="ANALYST">Make ANALYST</option>
                            <option value="VIEWER">Make VIEWER</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Read-Only</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
