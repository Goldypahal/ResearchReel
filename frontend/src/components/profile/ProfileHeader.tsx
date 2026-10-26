"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CalendarDays, ExternalLink, MessageCircle, Settings, Upload } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, messagesApi, type Profile } from '@/lib/api';
import { displayName, formatCount } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import FollowButton from '@/components/common/FollowButton';
import FollowModal from './FollowModal';

const STATUS_LABEL: Record<string, string> = {
  scholar: 'Verified scholar',
  faculty: 'Faculty',
  student: 'Verified student',
  admin: 'ResearchReel team',
};

interface ProfileHeaderProps {
  profile: Profile;
  onFollowChange?: (following: boolean) => void;
  onImportPapers?: () => void;
}

export default function ProfileHeader({ profile, onFollowChange, onImportPapers }: ProfileHeaderProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [listType, setListType] = useState<'followers' | 'following' | null>(null);
  const [startingChat, setStartingChat] = useState(false);

  const isOwn = profile.is_self;
  const statusLabel = STATUS_LABEL[profile.verification_status];
  const joined = new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const message = async () => {
    if (!user) {
      router.push(`/auth/login?next=${encodeURIComponent(`/profile/${profile.username}`)}`);
      return;
    }
    setStartingChat(true);
    try {
      const conv = await messagesApi.startConversation(profile.username);
      router.push(`/messages?c=${conv.id}`);
    } catch (err) {
      toast({ title: 'Could not start a conversation', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setStartingChat(false);
    }
  };

  const stat = (value: number, label: string, onClick?: () => void) => {
    const body = (
      <>
        <span className="mr-1 font-bold">{formatCount(value)}</span>
        <span className="text-muted-foreground">{label}</span>
      </>
    );
    return onClick ? (
      <button type="button" onClick={onClick} className="text-sm hover:opacity-70">{body}</button>
    ) : (
      <div className="text-sm">{body}</div>
    );
  };

  return (
    <div className="w-full border-b border-[var(--border)] px-4 pb-8 pt-6">
      <div className="flex items-start gap-5 md:gap-10">
        <Avatar src={profile.avatar_url} name={displayName(profile)} size="xl" className="md:h-36 md:w-36" />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="flex min-w-0 items-center gap-1.5 text-xl font-semibold tracking-tight md:text-2xl">
              <span className="truncate">{profile.username}</span>
              <VerifiedBadge status={profile.verification_status} size={18} />
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              {isOwn ? (
                <>
                  <Link href="/settings" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 text-xs font-bold hover:bg-[var(--foreground)]/5">
                    <Settings size={13} /> Edit profile
                  </Link>
                  {onImportPapers && (
                    <button
                      onClick={onImportPapers}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-600/10 px-3 text-xs font-bold text-emerald-400 hover:bg-emerald-600/20"
                      title="Add your publications by DOI or ORCID"
                    >
                      <Upload size={12} /> Add publications
                    </button>
                  )}
                </>
              ) : (
                <>
                  {user ? (
                    <FollowButton username={profile.username} initialFollowing={profile.is_following} onChange={onFollowChange} className="h-8" />
                  ) : (
                    <Link href={`/auth/login?next=${encodeURIComponent(`/profile/${profile.username}`)}`} className="inline-flex h-8 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-500">
                      Follow
                    </Link>
                  )}
                  <button
                    onClick={message}
                    disabled={startingChat}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] px-4 text-xs font-bold hover:bg-[var(--foreground)]/5 disabled:opacity-60"
                  >
                    <MessageCircle size={13} /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 md:gap-9">
            {stat(profile.post_count, profile.post_count === 1 ? 'post' : 'posts')}
            {stat(profile.follower_count, profile.follower_count === 1 ? 'follower' : 'followers', () => setListType('followers'))}
            {stat(profile.following_count, 'following', () => setListType('following'))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-bold">{displayName(profile)}</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {statusLabel && <span>{statusLabel}</span>}
              {profile.institution && <span className="inline-flex items-center gap-1"><Building2 size={12} /> {profile.institution}</span>}
              {profile.orcid_id && (
                <a href={`https://orcid.org/${profile.orcid_id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-[var(--foreground)]">
                  ORCID {profile.orcid_id} <ExternalLink size={11} />
                </a>
              )}
              <span className="inline-flex items-center gap-1"><CalendarDays size={12} /> Joined {joined}</span>
            </div>
            {profile.bio ? (
              <p className="max-w-lg whitespace-pre-line text-sm leading-relaxed">{profile.bio}</p>
            ) : isOwn ? (
              <Link href="/settings" className="text-sm text-indigo-400 hover:underline">Add a bio so people know what you work on</Link>
            ) : null}
            {!!profile.research_interests?.length && (
              <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                {profile.research_interests.map((tag) => (
                  <Link key={tag} href={`/explore?tag=${encodeURIComponent(tag)}`} className="text-indigo-400 hover:underline">#{tag}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <FollowModal
        isOpen={listType !== null}
        type={listType || 'followers'}
        username={profile.username}
        onClose={() => setListType(null)}
      />
    </div>
  );
}
