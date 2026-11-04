// The pages moved to Vercel on 2026-11-04, and sign-in only finishes at SITE_URL. Links to the old pages on the
// .convex.site address forward to the same page there. Browsers keep anything after a # across the redirect.
export const OLD_PAGES = ['/', '/index.html', '/demo.html', '/call-test.html', '/app.html'];

export function forwardToSite(request, env) {
  const site = env.SITE_URL?.trim().replace(/\/$/, '');
  if (!site) return new Response('Not found', { status: 404 });
  const { pathname, search } = new URL(request.url);
  return new Response(null, { status: 302, headers: { Location: `${site}${pathname}${search}`, 'Cache-Control': 'no-store' } });
}
