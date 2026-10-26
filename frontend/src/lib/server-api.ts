import 'server-only';

/**
 * Server-side reads for metadata, share images and the sitemap. Uses the
 * internal API address when the web app runs next to the API (Docker), and
 * caches responses briefly so link previews don't hit the API on every crawl.
 */
const BASE = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

export async function serverGet<T>(path: string, revalidate = 300): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return (body?.data ?? null) as T | null;
  } catch {
    return null;
  }
}

/** Public site address used for absolute URLs in metadata and the sitemap. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/** Trims text for descriptions without cutting words in half. */
export function excerpt(text: string | null | undefined, max = 180): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20))}…`;
}

export type PublicPost = {
  id: string; caption: string | null; content_type: string; tags: string[] | null; created_at: string;
  username: string; full_name: string | null; verification_status: string | null; avatar_url: string | null;
  document_title: string | null; summary_text: string | null; media_urls: string[] | null;
  reaction_count: number; comment_count: number;
};

export type PublicProfile = {
  username: string; full_name: string | null; bio: string | null; institution: string | null;
  verification_status: string | null; avatar_url: string | null; research_interests: string[] | null;
  follower_count: number; post_count: number;
};

export type PublicLecture = {
  id: string; title: string; description: string; topic: string; tags: string[]; starts_at: string;
  duration_minutes: number; status: string; host_name: string | null; host_username: string;
  host_verification_status: string | null; host_institution: string | null; registered_count: number;
};
