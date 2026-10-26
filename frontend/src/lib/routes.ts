/** Route rules shared by the app shell (layout + auth guard) and the session-expiry handler. */
const STANDALONE_PREFIXES = ['/auth'];

/** Full-screen pages rendered without the app chrome (landing and auth screens). */
export const isStandaloneRoute = (path: string) =>
  path === '/' || STANDALONE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

/** Pages a signed-out visitor can open (shared links); everything else asks them to sign in. */
export const isPublicAppRoute = (path: string) =>
  path.startsWith('/post/') || path.startsWith('/profile/') || path === '/explore' || path === '/reels' ||
  path === '/support' || path.startsWith('/lectures');

export const requiresAuth = (path: string) => !isStandaloneRoute(path) && !isPublicAppRoute(path);
