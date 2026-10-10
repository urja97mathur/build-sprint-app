// Convex checks sign-in tokens against the keys Convex Auth serves at this site's /.well-known/ (see http.js).
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: 'convex',
    },
  ],
};
