/** Route rules shared by the app shell (layout + sign-in guard) and the session-expiry handler. */

/** Full-screen pages rendered without the app chrome (landing, sign-in, unsubscribe). */
export const isStandaloneRoute = (path: string) =>
  path === '/' || path === '/auth' || path.startsWith('/auth/') || path === '/unsubscribe';

/** Pages a signed-out visitor can open (shared links); everything else asks them to sign in. */
export const isPublicAppRoute = (path: string) =>
  path.startsWith('/post/') || path.startsWith('/profile/') || path === '/explore' || path === '/reels' ||
  path === '/support' || path === '/lectures' || (path.startsWith('/lectures/') && path !== '/lectures/host');

export const requiresAuth = (path: string) => !isStandaloneRoute(path) && !isPublicAppRoute(path);
