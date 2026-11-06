"use client";

import React, { useState } from 'react';
import { Modal, primaryBtn, secondaryBtn, inputClass } from '@/components/common';
import { moderationApi, errorMessage } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const REASONS: [string, string][] = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or hate'],
  ['misinformation', 'Scientific misinformation'],
  ['plagiarism', 'Plagiarism'],
  ['copyright', 'Copyright violation'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
];

export default function ReportDialog({ open, onClose, postId, videoId }: { open: boolean; onClose: () => void; postId?: string; videoId?: string }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await moderationApi.report({ post_id: postId, video_id: videoId, reason, details });
      toast({ title: 'Report sent', description: 'Thanks — our moderators will review it.', variant: 'success' });
      onClose();
      setDetails('');
    } catch (err) {
      toast({ title: 'Could not send report', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Report content">
      <div className="p-5 space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm text-zinc-400 mb-2">Why are you reporting this?</legend>
          {REASONS.map(([value, label]) => (
            <label key={value} className="flex items-center gap-3 text-sm cursor-pointer">
              <input type="radio" name="reason" value={value} checked={reason === value} onChange={() => setReason(value)} className="accent-indigo-500" />
              {label}
            </label>
          ))}
        </fieldset>
        <textarea className={`${inputClass} min-h-20`} placeholder="Add details (optional)" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} />
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} onClick={submit} disabled={busy}>Submit report</button>
        </div>
      </div>
    </Modal>
  );
}
