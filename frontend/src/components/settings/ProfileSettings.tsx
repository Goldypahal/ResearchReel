"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { errorMessage, usersApi } from '@/lib/api';
import { displayName } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/common/Avatar';
import { Card, Field, inputClass, PrimaryButton, SecondaryButton } from './Field';

const MAX_INTERESTS = 15;

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [draftTag, setDraftTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setInstitution(user.institution || '');
    setBio(user.bio || '');
    setInterests(user.research_interests || []);
  }, [user]);

  if (!user) return null;

  const addTag = () => {
    const t = draftTag.trim().replace(/^#/, '');
    if (!t) return;
    if (interests.length >= MAX_INTERESTS) return;
    if (!interests.some((x) => x.toLowerCase() === t.toLowerCase())) setInterests([...interests, t.slice(0, 40)]);
    setDraftTag('');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Your name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const updated = await usersApi.updateProfile({ full_name: fullName.trim(), institution: institution.trim(), bio: bio.trim(), research_interests: interests });
      updateUser({ ...user, ...updated });
      toast({ title: 'Profile saved', variant: 'success' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const onPickAvatar = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast({ title: 'Photos are limited to 2 MB', variant: 'destructive' }); return; }
    setUploading(true);
    try {
      const { avatar_url } = await usersApi.uploadAvatar(file);
      updateUser({ ...user, avatar_url });
      toast({ title: 'Profile photo updated', variant: 'success' });
    } catch (err) {
      toast({ title: 'Upload failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    try {
      await usersApi.removeAvatar();
      updateUser({ ...user, avatar_url: null });
    } catch (err) {
      toast({ title: 'Could not remove photo', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <Card title="Profile" description={`This is what people see on ${typeof window !== 'undefined' ? window.location.host : ''}/profile/${user.username}.`}>
      <div className="flex items-center gap-4">
        <Avatar src={user.avatar_url} name={displayName(user)} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onPickAvatar(e.target.files?.[0])} />
          <SecondaryButton type="button" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Camera size={14} /> {uploading ? 'Uploading…' : user.avatar_url ? 'Change photo' : 'Add photo'}
          </SecondaryButton>
          {user.avatar_url && (
            <SecondaryButton type="button" onClick={removeAvatar}><Trash2 size={14} /> Remove</SecondaryButton>
          )}
        </div>
      </div>

      <form onSubmit={save} className="space-y-5">
        {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</div>}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Name" htmlFor="s-name">
            <input id="s-name" className={inputClass} value={fullName} maxLength={100} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Username" htmlFor="s-username" hint="Usernames can't be changed yet.">
            <input id="s-username" className={inputClass} value={user.username} disabled />
          </Field>
        </div>
        <Field label="Institution" htmlFor="s-inst">
          <input id="s-inst" className={inputClass} placeholder="e.g. University of Edinburgh" value={institution} maxLength={200} onChange={(e) => setInstitution(e.target.value)} />
        </Field>
        <Field label="Bio" htmlFor="s-bio" hint={`${bio.length}/500`}>
          <textarea id="s-bio" rows={4} className={`${inputClass} resize-none`} placeholder="What you work on, in a sentence or two." maxLength={500} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        <Field label="Research interests" htmlFor="s-tags" hint="Used for recommendations and shown on your profile. Press Enter to add.">
          <div className="flex flex-wrap gap-2">
            {interests.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                #{t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setInterests(interests.filter((x) => x !== t))}><X size={12} /></button>
              </span>
            ))}
          </div>
          {interests.length < MAX_INTERESTS && (
            <input
              id="s-tags"
              className={inputClass}
              placeholder="e.g. protein folding"
              value={draftTag}
              onChange={(e) => setDraftTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              onBlur={addTag}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <PrimaryButton type="submit" busy={saving}>Save profile</PrimaryButton>
        </div>
      </form>
    </Card>
  );
}
