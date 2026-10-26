"use client";

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authApi, errorMessage } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/lib/analytics';

export type AuthStep = 'form' | 'verify';

/** Only allow same-site relative paths as a post-login destination. */
const safeNext = (raw: string | null) => (raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/home');

/**
 * Shared sign-in / sign-up / email-code flow used by the landing page,
 * /auth/login and /auth/register so they all behave the same way.
 */
export function useAuthFlow() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<AuthStep>('form');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = useCallback(
    (user: Parameters<typeof login>[0]) => {
      login(user);
      router.push(safeNext(params.get('next')));
    },
    [login, router, params]
  );

  const run = useCallback(async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = (addr: string, password: string) =>
    run(async () => {
      setEmail(addr);
      const result = await authApi.login(addr, password);
      if (result.requiresVerification || !result.user) {
        setStep('verify');
        setNotice('Confirm your email to finish signing in. We just sent you a new code.');
        trackEvent('login_requires_verification', {});
        return;
      }
      trackEvent('login_success', { userId: result.user.id });
      finish(result.user);
    }, 'We could not sign you in. Check your email and password.');

  const signUp = (payload: { email: string; username: string; password: string; full_name: string }) =>
    run(async () => {
      setEmail(payload.email);
      await authApi.register(payload);
      trackEvent('register_submitted', {});
      setStep('verify');
    }, 'We could not create your account. Please try again.');

  const verify = (code: string) =>
    run(async () => {
      const result = await authApi.verifyOtp(email, code);
      if (!result.user) throw new Error('Verification did not return an account. Please sign in.');
      trackEvent('email_verified', { userId: result.user.id });
      finish(result.user);
    }, 'That code did not work. Request a new one and try again.');

  const resend = () =>
    run(async () => {
      await authApi.resendOtp(email);
      setNotice(`A new code is on its way to ${email}.`);
    }, 'We could not send a new code. Please wait a minute and try again.');

  const back = () => {
    setStep('form');
    setError(null);
    setNotice(null);
  };

  return { step, email, error, notice, busy, signIn, signUp, verify, resend, back, setError };
}
