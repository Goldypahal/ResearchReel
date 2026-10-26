"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, fetchApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface Report {
  id: string;
  reporter_id: string;
  post_id: string;
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_username?: string;
  post_caption?: string;
  post_author_username?: string;
}

interface UserRecord {
  id: string;
  email: string;
  username: string;
  full_name: string;
  verification_status: string;
  role: string;
  orcid_id?: string;
  created_at: string;
}


export default function ModPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isStaff = user?.role === 'admin' || user?.role === 'moderator';
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notification, setNotification] = useState('');

  // 1. Protection & Redirect Check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login');
      } else if (user.role !== 'admin' && user.role !== 'moderator') {
        router.push('/home');
      }
    }
  }, [user, authLoading, router]);

  // 2. Fetch Data
  const fetchData = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const [r, u] = await Promise.all([
        fetchApi<Report[]>('/moderation/reports'),
        fetchApi<UserRecord[]>('/moderation/users'),
      ]);
      setReports(r || []);
      setUsers(u || []);
    } catch (err) {
      setErrorMsg(errorMessage(err, 'An error occurred while loading data.'));
    } finally {
      setLoading(false);
    }
  }, [isStaff]);

  useEffect(() => {
    if (isStaff) {
      fetchData();
    }
  }, [isStaff, fetchData]);

  // 3. Resolve Report
  const handleResolveReport = async (reportId: string, action: 'delete_post' | 'dismiss') => {
    try {
      await fetchApi(`/moderation/reports/${reportId}/resolve`, { method: 'POST', body: JSON.stringify({ action }) });

      setNotification(`Report successfully resolved with: ${action}`);
      setTimeout(() => setNotification(''), 3000);
      fetchData();
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Failed to resolve report'));
    }
  };

  // 4. Verify/Moderate User
  const handleVerifyUser = async (userId: string, status: string, role?: string) => {
    try {
      await fetchApi(`/moderation/users/${userId}/verify`, { method: 'POST', body: JSON.stringify({ status, role }) });

      setNotification(`User status updated to: ${status}`);
      setTimeout(() => setNotification(''), 3000);
      fetchData();
    } catch (err) {
      setErrorMsg(errorMessage(err, 'Failed to update user status'));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500 font-bold uppercase tracking-widest text-xs animate-pulse">Loading Mod Dashboard...</div>
      </div>
    );
  }

  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return null; // Let the redirect trigger
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-white selection:bg-red-500/30">
      <main className="max-w-7xl mx-auto px-4 pt-12 pb-24 space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800/80 pb-6 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] italic">Moderation & Safety (Section 6.1.2)</span>
            <h2 className="text-4xl font-black tracking-tight text-white italic">Enforcement Queue</h2>
          </div>
          <button 
            onClick={fetchData} 
            className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            Refresh Queue
          </button>
        </div>

        {/* Global Notifications / Error messages */}
        {errorMsg && (
          <div className="p-4 bg-red-900/30 border border-red-500/30 rounded-2xl text-red-200 text-xs font-medium">
            {errorMsg}
          </div>
        )}
        {notification && (
          <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl text-emerald-200 text-xs font-medium animate-bounce">
            {notification}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Verification Queue (Section 3.6.1 Verifications) */}
           <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] space-y-6 flex flex-col shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/05 rounded-full blur-[80px] -z-0"></div>
              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em]">Pending Verifications</h3>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold rounded-full">
                  {users.filter(u => u.verification_status !== 'verified').length} Actionable
                </span>
              </div>

              <div className="space-y-4 relative z-10 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                 {users.filter(u => u.verification_status !== 'verified').map(u => (
                   <div key={u.id} className="p-5 bg-black/60 border border-zinc-800/80 rounded-2xl hover:border-indigo-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center font-bold text-xs text-indigo-400">
                              {(u.full_name || u.username).substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                               <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors tracking-tight">{u.full_name || u.username}</h4>
                               <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                                 {u.email}
                               </span>
                               {u.orcid_id && (
                                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mt-0.5">
                                   ORCID: {u.orcid_id}
                                 </span>
                               )}
                            </div>
                         </div>
                         <div className="text-right">
                           <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-[8px] font-black text-zinc-400 uppercase tracking-widest rounded-md">
                             {u.verification_status}
                           </span>
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <button 
                           onClick={() => handleVerifyUser(u.id, 'verified', u.orcid_id ? 'scholar' : 'student')}
                           className="flex-1 h-9 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                         >
                           Approve
                         </button>
                         <button 
                           onClick={() => handleVerifyUser(u.id, 'unverified')}
                           className="flex-1 h-9 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all text-zinc-300"
                         >
                           Reject
                         </button>
                      </div>
                   </div>
                 ))}

                 {users.filter(u => u.verification_status !== 'verified').length === 0 && (
                   <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-wider bg-black/20 rounded-2xl border border-dashed border-zinc-800">
                     No users pending verification
                   </div>
                 )}
              </div>
           </div>

           {/* Content Reports (Section 7.1 Moderation) */}
           <div className="p-8 bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] space-y-6 flex flex-col shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/05 rounded-full blur-[80px] -z-0"></div>
              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em]">Community Reports</h3>
                <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] font-bold rounded-full">
                  {reports.filter(r => r.status === 'pending').length} Pending
                </span>
              </div>

              <div className="space-y-4 relative z-10 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                 {reports.filter(r => r.status === 'pending').map(r => (
                   <div key={r.id} className="p-5 bg-red-500/05 border border-red-500/10 rounded-2xl hover:border-red-500/30 transition-all group">
                      <div className="space-y-2 mb-4">
                         <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest block">Reason: {r.reason}</span>
                              <h4 className="text-sm font-bold text-white uppercase tracking-tight line-clamp-2 mt-1">
                                &quot;{r.post_caption || 'No caption'}&quot;
                              </h4>
                            </div>
                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                         </div>
                         <p className="text-xs text-zinc-400 bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                           {r.details || 'No additional details provided.'}
                         </p>
                         <div className="flex justify-between text-[9px] font-black text-zinc-500 uppercase tracking-widest pt-1">
                           <span>Reporter: @{r.reporter_username || 'anonymous'}</span>
                           <span>Author: @{r.post_author_username || 'unknown'}</span>
                         </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                         <button 
                           onClick={() => handleResolveReport(r.id, 'delete_post')}
                           className="flex-1 h-9 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-red-600/10"
                         >
                           Remove Post
                         </button>
                         <button 
                           onClick={() => handleResolveReport(r.id, 'dismiss')}
                           className="flex-1 h-9 bg-zinc-900 border border-zinc-800 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-all text-zinc-300"
                         >
                           Dismiss
                         </button>
                      </div>
                   </div>
                 ))}

                 {reports.filter(r => r.status === 'pending').length === 0 && (
                   <div className="p-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-wider bg-black/20 rounded-2xl border border-dashed border-zinc-800">
                     No pending content reports
                   </div>
                 )}
              </div>
           </div>

        </div>

      </main>
    </div>
  );
}
