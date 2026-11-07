import type { MetadataRoute } from 'next';
import { SITE_URL, serverGet } from '@/lib/server-api';

// Rebuilt at most hourly; content changes are picked up on the next crawl.
export const revalidate = 3600;

type Lecture = { id: string; scheduled_at?: string | null; created_at?: string };
type Leader = { username: string };
type ExploreItem = { type: 'post' | 'reel'; id: string; created_at?: string; updated_at?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [lectures, leaderboard, explore] = await Promise.all([
    serverGet<Lecture[]>('/lectures', 3600),
    serverGet<{ leaders: Leader[] }>('/leaderboard?period=all', 3600),
    serverGet<ExploreItem[]>('/explore?limit=60', 3600),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/explore`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${SITE_URL}/reels`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${SITE_URL}/lectures`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/support`, changeFrequency: 'monthly', priority: 0.3 },
  ];
  for (const l of lectures || []) {
    const when = l.scheduled_at || l.created_at;
    entries.push({ url: `${SITE_URL}/lectures/${l.id}`, lastModified: when ? new Date(when) : undefined, changeFrequency: 'weekly', priority: 0.7 });
  }
  for (const p of leaderboard?.leaders || []) {
    entries.push({ url: `${SITE_URL}/profile/${encodeURIComponent(p.username)}`, changeFrequency: 'weekly', priority: 0.6 });
  }
  for (const item of explore || []) {
    if (item.type !== 'post') continue;
    const when = item.updated_at || item.created_at;
    entries.push({ url: `${SITE_URL}/post/${item.id}`, lastModified: when ? new Date(when) : undefined, changeFrequency: 'weekly', priority: 0.5 });
  }
  return [...new Map(entries.map((e) => [e.url, e])).values()];
}
