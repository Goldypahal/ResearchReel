import type { MetadataRoute } from 'next';
import { SITE_URL, serverGet } from '@/lib/server-api';

// Rebuilt at most hourly; content changes are picked up on the next crawl.
export const revalidate = 3600;

type Row = { id?: string; username?: string; created_at?: string; starts_at?: string; updated_at?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [upcoming, past, people, trending] = await Promise.all([
    serverGet<Row[]>('/lectures?when=upcoming&limit=50', 3600),
    serverGet<Row[]>('/lectures?when=past&limit=50', 3600),
    serverGet<Row[]>('/users/leaderboard?period=all', 3600),
    serverGet<Row[]>('/posts/trending', 3600),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/reels`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/lectures`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.3 },
  ];

  for (const l of [...(upcoming || []), ...(past || [])]) {
    if (l.id) entries.push({ url: `${SITE_URL}/lectures/${l.id}`, lastModified: l.starts_at ? new Date(l.starts_at) : undefined, changeFrequency: 'weekly', priority: 0.7 });
  }
  for (const p of people || []) {
    if (p.username) entries.push({ url: `${SITE_URL}/profile/${encodeURIComponent(p.username)}`, changeFrequency: 'weekly', priority: 0.6 });
  }
  for (const p of trending || []) {
    if (p.id) entries.push({ url: `${SITE_URL}/post/${p.id}`, lastModified: p.updated_at || p.created_at ? new Date((p.updated_at || p.created_at) as string) : undefined, changeFrequency: 'weekly', priority: 0.5 });
  }

  // De-duplicate (a lecture can be both upcoming and past across the boundary).
  return [...new Map(entries.map((e) => [e.url, e])).values()];
}
