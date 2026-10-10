import { defineApp } from "convex/server";
import staticHosting from "@convex-dev/static-hosting/convex.config";

// App-owned root routing: convex/http.js registers its exact routes (/api/… and
// Convex Auth's /.well-known/… keys at the root), then hands everything else to
// the static site. Exact routes win over the static catch-all.
const app = defineApp();
app.use(staticHosting);

export default app;
