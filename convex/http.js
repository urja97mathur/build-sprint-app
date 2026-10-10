import { httpRouter } from 'convex/server';
import { registerStaticRoutes } from '@convex-dev/static-hosting';
import { httpAction } from './_generated/server.js';
import { components, internal } from './_generated/api.js';
import { handleCall } from './lib/call.js';
import { handleDemoCall } from './lib/demo.js';
import { auth } from './auth.js';

const http = httpRouter();
http.route({ path: '/api/call-setup', method: 'GET', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });
http.route({ path: '/api/call', method: 'POST', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });

// Public demo call before sign-up. The limits live in the database steps below.
const demoStore = ctx => ({
  reserve: args => ctx.runMutation(internal.demo.reserve, args),
  settle: args => ctx.runMutation(internal.demo.settle, args),
});
const demoCall = httpAction((ctx, request) => handleDemoCall(request, process.env, demoStore(ctx)));
http.route({ path: '/api/demo-call', method: 'GET', handler: demoCall });
http.route({ path: '/api/demo-call', method: 'POST', handler: demoCall });

// Convex Auth's public sign-in keys, at /.well-known/… where Convex looks for them.
auth.addHttpRoutes(http);

// Everything else is the static site (call page, demo page, setup pages). Keep this last.
registerStaticRoutes(http, components.staticHosting);
export default http;
