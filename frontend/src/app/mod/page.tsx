"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Flag, Users, Activity, ScrollText, Search } from 'lucide-react';
import { moderationApi, healthApi, errorMessage, type ModReport, type ModUser } from '@/lib/api';
import { Spinner, ErrorState, EmptyState, inputClass, secondaryBtn, dangerBtn } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

type Tab = 'overview' | 'reports' | 'users' | 'audit';

function Overview() {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [health, setHealth] = useState<{ status: string; services: Record<string, { status: string; latency_ms?: number }> } | null>(null);
  useEffect(() => { moderationApi.stats().then(setStats).catch(() => {}); healthApi.get().then(setHealth).catch(() => {}); }, []);
  const labels: Record<string, string> = { users: 'Users', new_users_7d: 'New users (7d)', posts: 'Posts', reels: 'Reels', papers: 'Papers', pending_reports: 'Pending reports', suspended_users: 'Suspended' };
  return (
    <div className="space-y-6">
      {!stats ? <Spinner /> : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(stats).map(([k, v]) => <div key={k} className="rounded-xl border border-[var(--border)] p-4"><p className="text-2xl font-bold">{v}</p><p className="text-xs text-zinc-500">{labels[k] || k}</p></div>)}
        </div>
      )}
      {health && (
        <section className="rounded-2xl border border-[var(--border)] p-4 space-y-2">
          <h3 className="font-semibold text-sm">System status: <span className={health.status === 'UP' ? 'text-emerald-400' : 'text-amber-300'}>{health.status}</span></h3>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {Object.entries(health.services).map(([k, s]) => (
              <li key={k} className="flex justify-between p-2 rounded-lg bg-[var(--foreground)]/[0.03]"><span className="capitalize">{k}</span><span className={s.status === 'UP' || s.status === 'CONFIGURED' || s.status === 'S3' || s.status === 'LOCAL_DISK' ? 'text-emerald-400' : 'text-amber-300'}>{s.status.replace('_', ' ').toLowerCase()}{s.latency_ms !== undefined ? ` · ${s.latency_ms}ms` : ''}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Reports() {
  const [status, setStatus] = useState<'pending' | 'resolved' | 'dismissed'>('pending');
  const [items, setItems] = useState<ModReport[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { setItems(null); moderationApi.reports(status).then(setItems).catch((e) => setError(errorMessage(e))); }, [status]);
  useEffect(() => { load(); }, [load]);
  const resolve = async (r: ModReport, action: 'remove' | 'dismiss') => {
    try { await moderationApi.resolve(r.id, action); toast({ title: action === 'remove' ? 'Content removed' : 'Report dismissed', variant: 'success' }); load(); }
    catch (err) { toast({ title: 'Action failed', description: errorMessage(err), variant: 'destructive' }); }
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2">{(['pending', 'resolved', 'dismissed'] as const).map((s) => <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm capitalize ${status === s ? 'bg-indigo-600 text-white' : 'bg-[var(--foreground)]/5'}`}>{s}</button>)}</div>
      {error ? <ErrorState message={error} /> : !items ? <Spinner /> : items.length === 0 ? <EmptyState icon={<Flag size={28} />} title="No reports" /> : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id} className="rounded-2xl border border-[var(--border)] p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 capitalize font-semibold">{r.reason}</span>
                <span className="text-zinc-500">{r.video_id ? 'Reel' : 'Post'} by {r.author_username ? <Link className="text-indigo-400" href={`/profile/${r.author_username}`}>@{r.author_username}</Link> : 'unknown'}</span>
                <span className="text-zinc-500">· reported by @{r.reporter_username} {timeAgo(r.created_at)}</span>
                {r.content_removed && <span className="text-amber-300">· already removed</span>}
              </div>
              {r.content_preview && <p className="text-sm whitespace-pre-wrap line-clamp-4">{r.content_preview}</p>}
              {r.details && r.details !== r.reason && <p className="text-xs text-zinc-400">Reporter note: {r.details}</p>}
              <div className="flex gap-2">
                <Link href={r.video_id ? `/reels?id=${r.video_id}` : `/post/${r.post_id}`} className={`${secondaryBtn} py-1.5`}>View</Link>
                {status === 'pending' && <><button className={`${dangerBtn} py-1.5`} onClick={() => resolve(r, 'remove')}>Remove content</button><button className={`${secondaryBtn} py-1.5`} onClick={() => resolve(r, 'dismiss')}>Dismiss</button></>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UsersPanel() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<ModUser[] | null>(null);
  const load = useCallback((query = '') => { setItems(null); moderationApi.users({ q: query || undefined }).then(setItems).catch(() => setItems([])); }, []);
  useEffect(() => { load(); }, [load]);
  const update = async (u: ModUser, body: { status?: string; role?: 'user' | 'moderator' | 'admin' }) => {
    try { await moderationApi.updateUser(u.id, body); toast({ title: 'User updated', variant: 'success' }); load(q); } catch (err) { toast({ title: 'Update failed', description: errorMessage(err), variant: 'destructive' }); }
  };
  const suspend = async (u: ModUser) => {
    try { await moderationApi.suspend(u.id, !u.is_suspended); toast({ title: u.is_suspended ? 'User reinstated' : 'User suspended', variant: 'success' }); load(q); } catch (err) { toast({ title: 'Action failed', description: errorMessage(err), variant: 'destructive' }); }
  };
  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(q.trim()); }} className="relative max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" /><input className={`${inputClass} pl-9`} placeholder="Search username, name or email" value={q} onChange={(e) => setQ(e.target.value)} /></form>
      {!items ? <Spinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="text-xs text-zinc-500 text-left"><tr><th className="p-3 font-medium">User</th><th className="p-3 font-medium">Verification</th><th className="p-3 font-medium">Role</th><th className="p-3 font-medium">Reports</th><th className="p-3 font-medium" /></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="p-3"><Link href={`/profile/${u.username}`} className="font-semibold hover:underline">@{u.username}</Link><p className="text-xs text-zinc-500">{u.email}{!u.email_verified && ' · unverified email'}</p></td>
                  <td className="p-3"><select className="bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-xs" value={u.verification_status} onChange={(e) => update(u, { status: e.target.value })}>
                    {['unverified', 'verified', 'student', 'scholar', 'faculty'].map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-3">{me?.role === 'admin' && u.id !== me.id ? (
                    <select className="bg-transparent border border-[var(--border)] rounded-lg px-2 py-1 text-xs" value={u.role} onChange={(e) => update(u, { role: e.target.value as 'user' | 'moderator' | 'admin' })}>
                      {['user', 'moderator', 'admin'].map((r) => <option key={r} value={r}>{r}</option>)}</select>) : <span className="text-xs capitalize">{u.role}</span>}</td>
                  <td className="p-3 text-xs">{u.report_count}</td>
                  <td className="p-3 text-right">{u.id !== me?.id && <button onClick={() => suspend(u)} className={`text-xs font-semibold ${u.is_suspended ? 'text-emerald-400' : 'text-red-400'}`}>{u.is_suspended ? 'Reinstate' : 'Suspend'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Audit() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof moderationApi.auditLog>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { moderationApi.auditLog().then(setItems).catch((e) => setError(errorMessage(e))); }, []);
  if (error) return <ErrorState message={error} />;
  if (!items) return <Spinner />;
  if (!items.length) return <EmptyState title="No moderation actions yet" />;
  return (
    <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] text-sm">
      {items.map((a) => <li key={a.id} className="p-3 flex justify-between gap-3"><span><strong>@{a.actor_username}</strong> {a.action.replace(/_/g, ' ')} <span className="text-zinc-500">{a.target_type}</span></span><span className="text-xs text-zinc-500">{timeAgo(a.created_at)}</span></li>)}
    </ul>
  );
}

export default function ModerationPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    return <EmptyState icon={<Shield size={32} />} title="Moderators only" description="You don't have access to this page." />;
  }
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity }, { id: 'reports', label: 'Reports', icon: Flag }, { id: 'users', label: 'Users', icon: Users },
    ...(user.role === 'admin' ? [{ id: 'audit' as Tab, label: 'Audit log', icon: ScrollText }] : []),
  ];
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-indigo-400" /> Moderation</h1>
      <div className="flex gap-1 border-b border-[var(--border)]">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${tab === t.id ? 'border-indigo-500' : 'border-transparent text-zinc-500'}`}><t.icon size={15} /> {t.label}</button>)}
      </div>
      {tab === 'overview' && <Overview />}
      {tab === 'reports' && <Reports />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}
