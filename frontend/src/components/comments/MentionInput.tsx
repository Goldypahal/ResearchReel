"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { usersApi, type UserCard } from '@/lib/api';
import Avatar from '@/components/common/Avatar';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { cn, displayName } from '@/lib/utils';

/** The @word being typed just before the caret, if any. */
const activeMention = (value: string, caret: number) => {
  const before = value.slice(0, caret);
  const m = before.match(/(^|[\s(])@([A-Za-z0-9_.]{0,30})$/);
  return m ? { query: m[2], start: caret - m[2].length - 1 } : null;
};

export interface MentionInputHandle {
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  ariaLabel: string;
  autoFocus?: boolean;
  disabled?: boolean;
  maxLength?: number;
}

/**
 * Auto-growing textarea with @mention suggestions. Enter sends, Shift+Enter
 * adds a line; while suggestions are open, arrows/Enter/Tab pick one.
 */
const MentionInput = forwardRef<MentionInputHandle, Props>(function MentionInput(
  { value, onChange, onSubmit, placeholder, ariaLabel, autoFocus, disabled, maxLength = 2000 },
  ref
) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{ query: string; start: number } | null>(null);
  const [results, setResults] = useState<UserCard[]>([]);
  const [highlight, setHighlight] = useState(0);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = area.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    },
  }));

  // Grow with the content, up to a limit.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  // Look people up while an @mention is being typed.
  useEffect(() => {
    if (!mention || mention.query.length < 1) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      usersApi.search(mention.query, 6)
        .then((rows) => { if (!cancelled) { setResults(rows); setHighlight(0); } })
        .catch(() => { if (!cancelled) setResults([]); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(t); };
  }, [mention]);

  const open = Boolean(mention && mention.query.length >= 1 && results.length);

  const track = (el: HTMLTextAreaElement) => {
    const m = activeMention(el.value, el.selectionStart ?? el.value.length);
    setMention(m);
    if (!m || !m.query) setResults([]);
  };

  const pick = (u: UserCard) => {
    if (!mention) return;
    const el = area.current;
    const caret = el?.selectionStart ?? value.length;
    const next = `${value.slice(0, mention.start)}@${u.username} ${value.slice(caret)}`;
    onChange(next);
    setMention(null);
    setResults([]);
    const pos = mention.start + u.username.length + 2;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos); });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (open) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => (h + 1) % results.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => (h - 1 + results.length) % results.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(results[highlight]); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMention(null); setResults([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <textarea
        ref={area}
        rows={1}
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        onChange={(e) => { onChange(e.target.value); track(e.target); }}
        onClick={(e) => track(e.currentTarget)}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => { setMention(null); setResults([]); }, 150)}
        className="block w-full resize-none bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
      />
      {open && (
        <ul role="listbox" aria-label="People to mention" className="absolute bottom-full left-0 z-30 mb-2 w-72 max-w-[85vw] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
          {results.map((u, i) => (
            <li key={u.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                onMouseEnter={() => setHighlight(i)}
                className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm', i === highlight && 'bg-[var(--foreground)]/5')}
              >
                <Avatar src={u.avatar_url} name={displayName(u)} size="xs" />
                <span className="min-w-0 truncate font-medium">{displayName(u)}</span>
                <VerifiedBadge status={u.verification_status} size={11} />
                <span className="ml-auto truncate text-xs text-muted-foreground">@{u.username}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

export default MentionInput;
