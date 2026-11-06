"use client";

import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Modal, Avatar, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { usersApi, errorMessage, type Profile } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/use-toast';

export default function EditProfileModal({ profile, open, onClose, onSaved }: { profile: Profile; open: boolean; onClose: () => void; onSaved: (p: Partial<Profile>) => void }) {
  const { updateUser } = useAuth();
  const [form, setForm] = useState({
    full_name: profile.full_name || '', bio: profile.bio || '', institution: profile.institution || '',
    website: profile.website || '', interests: (profile.research_interests || []).join(', '),
  });
  const [avatar, setAvatar] = useState(profile.avatar_url || null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast({ title: 'Image too large', description: 'Choose an image under 10 MB.', variant: 'destructive' });
    setUploading(true);
    try {
      const r = await usersApi.uploadAvatar(file);
      setAvatar(r.avatar_url); updateUser({ avatar_url: r.avatar_url }); onSaved({ avatar_url: r.avatar_url });
    } catch (err) { toast({ title: 'Could not upload photo', description: errorMessage(err), variant: 'destructive' }); }
    finally { setUploading(false); }
  };

  const removeAvatar = async () => {
    try { await usersApi.removeAvatar(); setAvatar(null); updateUser({ avatar_url: null }); onSaved({ avatar_url: null }); } catch (err) { toast({ title: 'Could not remove photo', description: errorMessage(err), variant: 'destructive' }); }
  };

  const save = async () => {
    setBusy(true);
    try {
      const u = await usersApi.update({
        full_name: form.full_name.trim(), bio: form.bio.trim() || null, institution: form.institution.trim() || null,
        website: form.website.trim() || null,
        research_interests: form.interests.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 20),
      });
      updateUser(u); onSaved(u);
      toast({ title: 'Profile updated', variant: 'success' });
      onClose();
    } catch (err) { toast({ title: 'Could not save profile', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar src={avatar} name={form.full_name} size={72} />
            {uploading && <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center"><Loader2 className="animate-spin" size={20} /></div>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button className="text-sm font-semibold text-indigo-400 inline-flex items-center gap-1.5" onClick={() => fileRef.current?.click()}><Camera size={15} /> Change photo</button>
            {avatar && <button className="text-xs text-zinc-500 hover:text-red-400 text-left" onClick={removeAvatar}>Remove photo</button>}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => uploadAvatar(e.target.files?.[0])} />
          </div>
        </div>
        <label className="block text-sm space-y-1"><span className="text-zinc-400">Name</span><input className={inputClass} value={form.full_name} maxLength={100} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <label className="block text-sm space-y-1"><span className="text-zinc-400">Bio</span><textarea className={`${inputClass} min-h-20`} value={form.bio} maxLength={500} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></label>
        <label className="block text-sm space-y-1"><span className="text-zinc-400">Institution</span><input className={inputClass} value={form.institution} maxLength={200} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></label>
        <label className="block text-sm space-y-1"><span className="text-zinc-400">Website</span><input className={inputClass} value={form.website} placeholder="https://" onChange={(e) => setForm({ ...form, website: e.target.value })} /></label>
        <label className="block text-sm space-y-1"><span className="text-zinc-400">Research interests</span><input className={inputClass} value={form.interests} placeholder="Physics, Machine learning, Ecology" onChange={(e) => setForm({ ...form, interests: e.target.value })} /></label>
        <div className="flex justify-end gap-2 pt-2">
          <button className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} onClick={save} disabled={busy || !form.full_name.trim()}>{busy && <Loader2 size={15} className="animate-spin" />} Save</button>
        </div>
      </div>
    </Modal>
  );
}
