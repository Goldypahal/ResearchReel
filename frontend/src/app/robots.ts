import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/server-api';

/** Public pages are crawlable; account areas and auth flows are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/reels', '/lectures', '/post/', '/profile/', '/support'],
        disallow: [
          '/auth/', '/home', '/settings', '/messages', '/notifications', '/library', '/saved', '/projects',
          '/ai', '/create', '/reels/create', '/lectures/host', '/mod', '/search', '/achievements', '/discover',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
