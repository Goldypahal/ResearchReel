"use client";

import { useEffect } from 'react';
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

  useEffect(() => {
    let keyBuffer = '';
    let bufferTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut keypresses inside input elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (e.key === 'Escape' && options.onCloseModal) {
          options.onCloseModal();
        }
        return;
      }

      const key = e.key;

      if (key === 'Escape' && options.onCloseModal) {
        options.onCloseModal();
        return;
      }

      if (key === '/' && options.onOpenSearch) {
        e.preventDefault();
        options.onOpenSearch();
        return;
      }

      if (key.toLowerCase() === 'n' && options.onOpenCreate) {
        e.preventDefault();
        options.onOpenCreate();
        return;
      }

      if (key.toLowerCase() === 'a' && options.onOpenAskAI) {
        e.preventDefault();
        options.onOpenAskAI();
        return;
      }

      if (key.toLowerCase() === 'u' && options.onOpenUpload) {
        e.preventDefault();
        options.onOpenUpload();
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
  }, [router, options]);
}
