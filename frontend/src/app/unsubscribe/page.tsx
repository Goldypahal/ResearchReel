"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BellOff, CheckCircle2, Loader2 } from 'lucide-react';
import { errorMessage, notificationsApi } from '@/lib/api';
import { Spinner, primaryBtn } from '@/components/common';

/**
 * Landing page for the "Unsubscribe" link in emails. It needs a click, so link
 * scanners that open emails can't unsubscribe people by accident.
 */
function Unsubscribe() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(token ? 'idle' : 'error');
  const [label, setLabel] = useState('');
  const [error, setError] = useState(token ? '' : 'This link is missing its unsubscribe code.');

  const confirm = async () => {
    setState('busy');
    try {
      const r = await notificationsApi.unsubscribe(token);
      setLabel(r.label.toLowerCase());
      setState('done');
    } catch (err) {
      setError(errorMessage(err) || 'This unsubscribe link is invalid.');
      setState('error');
    }
  };

  return (
    <main className="min-h-dvh flex items-start justify-center px-4">
      <div className="mt-24 w-full max-w-md rounded-2xl border border-[var(--border)] p-8 text-center">
        {state === 'done' ? (
          <>
            <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500" />
            <h1 className="text-xl font-bold">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-sm text-zinc-500">We won&apos;t email you about {label} any more.</p>
          </>
        ) : state === 'error' ? (
          <>
            <BellOff size={40} className="mx-auto mb-4 text-zinc-500" />
            <h1 className="text-xl font-bold">Link not valid</h1>
            <p role="alert" className="mt-2 text-sm text-zinc-500">{error}</p>
          </>
        ) : (
          <>
            <BellOff size={40} className="mx-auto mb-4 text-indigo-400" />
            <h1 className="text-xl font-bold">Unsubscribe from these emails?</h1>
            <p className="mt-2 text-sm text-zinc-500">You&apos;ll still see this activity in the app. Sign-in codes and security emails are always sent.</p>
            <button onClick={confirm} disabled={state === 'busy'} className={`${primaryBtn} mt-6`}>
              {state === 'busy' ? <Loader2 size={16} className="animate-spin" /> : 'Unsubscribe'}
            </button>
          </>
        )}
        <p className="mt-6 text-sm">
          <Link href="/settings?tab=notifications" className="text-indigo-400 hover:underline">Manage all email settings</Link>
        </p>
      </div>
    </main>
  );
}

export default function UnsubscribePage() {
  return <Suspense fallback={<Spinner />}><Unsubscribe /></Suspense>;
}
