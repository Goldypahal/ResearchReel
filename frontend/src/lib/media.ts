import { API_ORIGIN } from '@/lib/api/client';

/**
 * Files the API serves from /uploads are stored as root-relative paths; the web
 * app runs on another origin, so resolve them against the API origin.
 */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}
