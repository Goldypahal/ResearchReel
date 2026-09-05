"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcutOptions {
  onOpenSearch?: () => void;
  onOpenCreate?: () => void;
  onOpenAskAI?: () => void;
  onOpenUpload?: () => void;
  onCloseModal?: () => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutOptions = {}) {
  const router = useRouter();
  const optionsRef = useRef(options);

  // Keep ref synchronized without triggering effect re-execution
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    let keyBuffer = '';
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      const opts = optionsRef.current;
      const target = e.target as HTMLElement;

      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape' && opts.onCloseModal) {
          opts.onCloseModal();
        }
        return;
      }

      const key = e.key;

      if (key === 'Escape' && opts.onCloseModal) {
        opts.onCloseModal();
        return;
      }

      if (key === '/' && opts.onOpenSearch) {
        e.preventDefault();
        opts.onOpenSearch();
        return;
      }

      if (key.toLowerCase() === 'n' && opts.onOpenCreate) {
        e.preventDefault();
        opts.onOpenCreate();
        return;
      }

      if (key.toLowerCase() === 'a' && opts.onOpenAskAI) {
        e.preventDefault();
        opts.onOpenAskAI();
        return;
      }

      if (key.toLowerCase() === 'u' && opts.onOpenUpload) {
        e.preventDefault();
        opts.onOpenUpload();
        return;
      }

      // Two-key sequence handling for navigation (G H, G D, G L, G P, G R, G M)
      if (key.toLowerCase() === 'g') {
        keyBuffer = 'g';
        clearTimeout(bufferTimeout);
        bufferTimeout = setTimeout(() => {
          keyBuffer = '';
        }, 1000);
        return;
      }

      if (keyBuffer === 'g') {
        const nextKey = key.toLowerCase();
        keyBuffer = '';
        clearTimeout(bufferTimeout);

        switch (nextKey) {
          case 'h':
            router.push('/home');
            break;
          case 'd':
            router.push('/discover');
            break;
          case 'l':
            router.push('/library');
            break;
          case 'p':
            router.push('/projects');
            break;
          case 'r':
            router.push('/reels');
            break;
          case 'm':
            router.push('/messages');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(bufferTimeout);
    };
  }, [router]);
}
