"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Grid, PlaySquare, BookOpen, BarChart2, MessageCircle, Link as LinkIcon, Building2, Settings, Upload, Award } from 'lucide-react';
import { usersApi, reelsApi, documentsApi, messagesApi, errorMessage, type Profile, type Reel, type Paper } from '@/lib/api';
import { Avatar, VerifiedBadge, Spinner, ErrorState, EmptyState, secondaryBtn, primaryBtn } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import ProfileMenu from '@/components/profile/ProfileMenu';
import Feed from '@/components/feed/Feed';
import PaperCard from '@/components/library/PaperCard';
import FollowListModal from '@/components/profile/FollowListModal';
import EditProfileModal from '@/components/profile/EditProfileModal';
import AnalyticsPanel from '@/components/profile/AnalyticsPanel';
import DOIImportModal from '@/components/profile/DOIImportModal';
import { compactNumber } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

type Tab = 'posts' | 'reels' | 'papers' | 'analytics';

function ReelsGrid({ username }: { username: string }) {
  const [reels, setReels] = useState<Reel[] | null>(null);
  useEffect(() => { reelsApi.list({ author: username, limit: 30 }).then((r) => setReels(r.reels)).catch(() => setReels([])); }, [username]);
  if (!reels) return <Spinner />;
  if (!reels.length) return <EmptyState icon={<PlaySquare size={28} />} title="No reels yet" />;
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {reels.map((r) => (
        <Link key={r.id} href={`/reels?id=${r.id}`} className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {r.thumbnail_url && <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover group-hover:opacity-80" />}
          <span className="absolute bottom-1.5 left-2 text-xs text-white font-semibold drop-shadow">▶ {compactNumber(r.view_count)}</span>
        </Link>
      ))}
    </div>
  );
}

function PapersList({ username, isSelf, refreshKey }: { username: string; isSelf: boolean; refreshKey: number }) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  useEffect(() => {
    setPapers(null);
    documentsApi.list(isSelf ? { scope: 'mine' } : { author: username }).then((r) => setPapers(r.documents)).catch(() => setPapers([]));
  }, [username, isSelf, refreshKey]);
  if (!papers) return <Spinner />;
  if (!papers.length) return <EmptyState icon={<BookOpen size={28} />} title="No papers yet" description={isSelf ? 'Upload a PDF or import your publications by DOI or ORCID.' : undefined} />;
  return <div className="space-y-3">{papers.map((p) => <PaperCard key={p.id} paper={p} showUploader={false} />)}</div>;
}

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('posts');
  const [list, setList] = useState<'followers' | 'following' | null>(null);
  const [editing, setEditing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [paperKey, setPaperKey] = useState(0);

  const load = useCallback(() => {
    setError('');
    usersApi.profile(username).then(setProfile).catch((e) => setError(errorMessage(e)));
  }, [username]);
  useEffect(() => { load(); setTab('posts'); }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!profile) return <Spinner />;

  const message = async () => {
    try { const c = await messagesApi.start(profile.username); router.push(`/messages?c=${c.id}`); }
    catch (err) { toast({ title: 'Could not start conversation', description: errorMessage(err), variant: 'destructive' }); }
  };

  if (profile.is_blocked) {
    const unblock = async () => {
      try { await usersApi.unblock(profile.username); load(); toast({ title: `Unblocked @${profile.username}` }); }
      catch (err) { toast({ title: 'Could not unblock', description: errorMessage(err), variant: 'destructive' }); }
    };
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <Avatar src={profile.avatar_url} name={profile.full_name} size={96} className="mx-auto opacity-60" />
        <div>
          <h1 className="text-xl font-semibold">@{profile.username}</h1>
          <p className="text-sm text-zinc-500 mt-1">You blocked this account. You can’t see each other’s posts or message each other.</p>
        </div>
        <button onClick={unblock} className={secondaryBtn}>Unblock</button>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'posts', label: 'Posts', icon: Grid },
    { id: 'reels', label: 'Reels', icon: PlaySquare },
    { id: 'papers', label: 'Papers', icon: BookOpen },
    ...(profile.is_self ? [{ id: 'analytics' as Tab, label: 'Analytics', icon: BarChart2 }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start">
        <Avatar src={profile.avatar_url} name={profile.full_name} size={128} className="text-4xl" />
        <div className="flex-1 min-w-0 space-y-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
            <h1 className="text-xl font-semibold">@{profile.username}</h1>
            {profile.is_self ? (
              <>
                <button className={secondaryBtn} onClick={() => setEditing(true)}>Edit profile</button>
                <Link href="/settings" className="p-2 rounded-xl hover:bg-[var(--foreground)]/5" aria-label="Settings"><Settings size={18} /></Link>
              </>
            ) : (
              <>
                <FollowButton username={profile.username} initial={profile.is_following} onChange={(f, n) => setProfile((p) => p && { ...p, is_following: f, followers_count: n ?? p.followers_count })} />
                <button className={secondaryBtn} onClick={message}><MessageCircle size={15} /> Message</button>
                <ProfileMenu profile={profile} onChange={(patch) => setProfile((p) => p && { ...p, ...patch })} />
              </>
            )}
          </div>
          <div className="flex justify-center sm:justify-start gap-6 text-sm">
            <span><strong>{compactNumber(profile.post_count)}</strong> posts</span>
            <button onClick={() => setList('followers')} className="hover:underline"><strong>{compactNumber(profile.followers_count)}</strong> followers</button>
            <button onClick={() => setList('following')} className="hover:underline"><strong>{compactNumber(profile.following_count)}</strong> following</button>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold flex items-center justify-center sm:justify-start gap-1.5">{profile.full_name} <VerifiedBadge status={profile.verification_status} size={16} /></p>
            {profile.follows_you && <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-[var(--foreground)]/10 text-zinc-400">Follows you</span>}
            {profile.institution && <p className="text-sm text-zinc-400 flex items-center justify-center sm:justify-start gap-1.5"><Building2 size={14} /> {profile.institution}</p>}
            {profile.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
            <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1 text-sm">
              {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-400 inline-flex items-center gap-1"><LinkIcon size={13} /> {profile.website.replace(/^https?:\/\//, '')}</a>}
              {profile.orcid_id && <a href={`https://orcid.org/${profile.orcid_id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400">ORCID {profile.orcid_id}</a>}
              <Link href={profile.is_self ? '/achievements' : `/achievements?u=${profile.username}`} className="text-amber-300 inline-flex items-center gap-1"><Award size={13} /> Achievements</Link>
            </div>
            {profile.research_interests?.length ? (
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 pt-1">
                {profile.research_interests.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent(t)}`} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">{t}</Link>)}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="border-t border-[var(--border)] flex justify-center gap-8" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wider border-t-2 -mt-px ${tab === t.id ? 'border-[var(--foreground)]' : 'border-transparent text-zinc-500'}`}>
            <t.icon size={14} /> {t.label}{t.id === 'reels' ? ` ${profile.reel_count}` : t.id === 'papers' ? ` ${profile.paper_count}` : ''}
          </button>
        ))}
      </div>

      <div className="max-w-xl mx-auto w-full">
        {tab === 'posts' && <Feed author={profile.username} emptyTitle="No posts yet" emptyDescription={profile.is_self ? 'Share your first post with the community.' : `@${profile.username} hasn't posted yet.`} />}
        {tab === 'analytics' && profile.is_self && <AnalyticsPanel />}
      </div>
      {tab === 'reels' && <ReelsGrid username={profile.username} />}
      {tab === 'papers' && (
        <div className="space-y-4">
          {profile.is_self && (
            <div className="flex gap-2 justify-end">
              <button className={secondaryBtn} onClick={() => setImporting(true)}>Import by DOI / ORCID</button>
              <Link href="/library" className={primaryBtn}><Upload size={15} /> Upload PDF</Link>
            </div>
          )}
          <PapersList username={profile.username} isSelf={profile.is_self} refreshKey={paperKey} />
        </div>
      )}

      {list && <FollowListModal username={profile.username} type={list} open onClose={() => { setList(null); load(); }} />}
      {profile.is_self && editing && <EditProfileModal profile={profile} open={editing} onClose={() => setEditing(false)} onSaved={(p) => setProfile((cur) => cur && { ...cur, ...p })} />}
      <DOIImportModal isOpen={importing} onClose={() => setImporting(false)} onImported={() => setPaperKey((k) => k + 1)} />
    </div>
  );
}
