"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { User as UserIcon, Shield, Palette, BadgeCheck, Trash2, Loader2, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { authApi, usersApi, errorMessage } from '@/lib/api';
import { Modal, inputClass, primaryBtn, secondaryBtn, dangerBtn, VerifiedBadge } from '@/components/common';
import { toast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/format';

type Tab = 'account' | 'verification' | 'security' | 'appearance';

function AccountTab() {
  const { user, updateUser } = useAuth();
  const [f, setF] = useState({ full_name: user?.full_name || '', username: user?.username || '', bio: user?.bio || '', institution: user?.institution || '', website: user?.website || '', interests: (user?.research_interests || []).join(', ') });
  const [busy, setBusy] = useState(false);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await usersApi.update({
        full_name: f.full_name.trim(), username: f.username.trim().toLowerCase() !== user?.username ? f.username.trim().toLowerCase() : undefined,
        bio: f.bio.trim() || null, institution: f.institution.trim() || null, website: f.website.trim() || null,
        research_interests: f.interests.split(',').map((s) => s.trim()).filter(Boolean),
      });
      updateUser(u);
      toast({ title: 'Profile saved', variant: 'success' });
    } catch (err) { toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="space-y-4 max-w-lg">
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Email</span><input className={inputClass} value={user?.email || ''} disabled /></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Name</span><input className={inputClass} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} maxLength={100} /></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Username</span><input className={inputClass} value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} maxLength={30} /><span className="text-xs text-zinc-500">Changing it changes your profile link.</span></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Bio</span><textarea className={`${inputClass} min-h-20`} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} maxLength={500} /></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Institution</span><input className={inputClass} value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} maxLength={200} /></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Website</span><input className={inputClass} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://" /></label>
      <label className="block space-y-1 text-sm"><span className="text-zinc-400">Research interests</span><input className={inputClass} value={f.interests} onChange={(e) => setF({ ...f, interests: e.target.value })} placeholder="Comma separated" /></label>
      <button className={primaryBtn} disabled={busy || !f.full_name.trim() || f.username.length < 3}>{busy && <Loader2 size={15} className="animate-spin" />} Save changes</button>
    </form>
  );
}

function VerificationTab() {
  const { user, refreshUser } = useAuth();
  const [orcid, setOrcid] = useState(user?.orcid_id || '');
  const [uni, setUni] = useState(user?.institution || '');
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try { await authApi.linkOrcid(orcid.trim()); await refreshUser(); toast({ title: 'ORCID linked', description: 'You now have a verified researcher badge.', variant: 'success' }); }
    catch (err) { toast({ title: 'Could not link ORCID', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const student = async () => {
    setBusy(true);
    try { await authApi.studentVerification(uni.trim()); await refreshUser(); toast({ title: 'Student status saved', variant: 'success' }); }
    catch (err) { toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-6 max-w-lg">
      <p className="text-sm flex items-center gap-2">Current status: <strong className="capitalize">{user?.verification_status}</strong> <VerifiedBadge status={user?.verification_status} /></p>
      <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <h3 className="font-semibold">Researcher (ORCID)</h3>
        <p className="text-sm text-zinc-500">Link your ORCID iD to get a verified researcher badge and import your publications.</p>
        <div className="flex gap-2"><input className={inputClass} placeholder="0000-0002-1825-0097" value={orcid} onChange={(e) => setOrcid(e.target.value)} /><button className={primaryBtn} disabled={busy || !orcid.trim()} onClick={link}>Link</button></div>
      </section>
      <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
        <h3 className="font-semibold">Student</h3>
        <p className="text-sm text-zinc-500">Mark your account as a student account. Moderators may review student badges.</p>
        <div className="flex gap-2"><input className={inputClass} placeholder="University" value={uni} onChange={(e) => setUni(e.target.value)} /><button className={secondaryBtn} disabled={busy || !uni.trim() || ['scholar', 'faculty'].includes(user?.verification_status || '')} onClick={student}>Save</button></div>
      </section>
    </div>
  );
}

function SecurityTab() {
  const { logout } = useAuth();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof authApi.sessions>>>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const loadSessions = () => authApi.sessions().then(setSessions).catch(() => {});
  useEffect(() => { loadSessions(); }, []);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return toast({ title: 'New password must be at least 8 characters', variant: 'destructive' });
    setBusy(true);
    try { await authApi.changePassword(cur, next); setCur(''); setNext(''); toast({ title: 'Password changed', variant: 'success' }); }
    catch (err) { toast({ title: 'Could not change password', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    try { await authApi.revokeSession(id); loadSessions(); } catch (err) { toast({ title: 'Could not sign out session', description: errorMessage(err), variant: 'destructive' }); }
  };
  const deleteAccount = async () => {
    try { await usersApi.deleteAccount(); toast({ title: 'Account deleted' }); await logout(); }
    catch (err) { toast({ title: 'Could not delete account', description: errorMessage(err), variant: 'destructive' }); }
  };

  return (
    <div className="space-y-8 max-w-lg">
      <form onSubmit={change} className="space-y-3">
        <h3 className="font-semibold">Change password</h3>
        <input type="password" className={inputClass} placeholder="Current password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
        <input type="password" className={inputClass} placeholder="New password (8+ characters)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        <button className={primaryBtn} disabled={busy || !cur || !next}>Update password</button>
      </form>
      <section className="space-y-3">
        <h3 className="font-semibold">Where you&apos;re signed in</h3>
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]">
              {/iOS|Android/.test(s.device_name) ? <Smartphone size={18} /> : <Monitor size={18} />}
              <div className="flex-1 text-sm"><p className="font-medium">{s.device_name}{s.current && <span className="ml-2 text-xs text-emerald-400">This device</span>}</p><p className="text-xs text-zinc-500">Signed in {timeAgo(s.created_at)}{s.ip_address ? ` · ${s.ip_address}` : ''}</p></div>
              {!s.current && <button className="text-xs text-red-400" onClick={() => revoke(s.id)}>Sign out</button>}
            </li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 pt-4 border-t border-[var(--border)]">
        <h3 className="font-semibold text-red-400">Delete account</h3>
        <p className="text-sm text-zinc-500">Your profile, posts and reels will be removed. This cannot be undone.</p>
        <button className={dangerBtn} onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete my account</button>
      </section>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete your account?">
        <div className="p-5 space-y-3">
          <p className="text-sm text-zinc-400">Type <strong>DELETE</strong> to confirm.</p>
          <input className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          <div className="flex justify-end gap-2"><button className={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button><button className={dangerBtn} disabled={confirmText !== 'DELETE'} onClick={deleteAccount}>Delete forever</button></div>
        </div>
      </Modal>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex gap-3">
      {(['black', 'white'] as const).map((t) => (
        <button key={t} onClick={() => setTheme(t)} className={`w-40 p-4 rounded-2xl border text-left ${theme === t ? 'border-indigo-500' : 'border-[var(--border)]'}`}>
          <div className={`h-16 rounded-lg mb-2 ${t === 'black' ? 'bg-zinc-950 border border-zinc-800' : 'bg-white border border-zinc-200'}`} />
          <p className="text-sm font-semibold">{t === 'black' ? 'Dark' : 'Light'}</p>
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('account');
  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'account', label: 'Profile', icon: UserIcon }, { id: 'verification', label: 'Verification', icon: BadgeCheck },
    { id: 'security', label: 'Security', icon: Shield }, { id: 'appearance', label: 'Appearance', icon: Palette },
  ];
  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-[200px_1fr] gap-8">
      <nav className="space-y-1">
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium ${tab === t.id ? 'bg-[var(--foreground)]/5' : 'text-zinc-400 hover:text-zinc-200'}`}><t.icon size={16} /> {t.label}</button>
        ))}
        <Link href="/support" className="block px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">Help &amp; legal</Link>
      </nav>
      <div className="min-w-0 pt-1 md:pt-12">
        {tab === 'account' && <AccountTab />}
        {tab === 'verification' && <VerificationTab />}
        {tab === 'security' && <SecurityTab />}
        {tab === 'appearance' && <AppearanceTab />}
      </div>
    </div>
  );
}
