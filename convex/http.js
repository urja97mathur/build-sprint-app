import { httpRouter } from 'convex/server';
import { registerStaticRoutes } from '@convex-dev/static-hosting';
import { httpAction } from './_generated/server.js';
import { components, internal } from './_generated/api.js';
import { handleCall } from './lib/call.js';
import { handleDemoCall } from './lib/demo.js';
import { handleCodeWord } from './lib/alerts.js';
import { handleCallEnded } from './lib/checkins.js';
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

// Sarvam's main agent calls this mid-call (its `code_word_heard` tool) when it hears her code phrase.
http.route({
  path: '/api/code-word',
  method: 'POST',
  handler: httpAction((ctx, request) => handleCodeWord(request, args => ctx.runMutation(internal.alerts.recordCodeWord, args))),
});

// Sarvam reports here when a safety call ends; a call ending while the session is on starts check-in calls.
http.route({
  path: '/api/call-ended',
  method: 'POST',
  handler: httpAction((ctx, request) => handleCallEnded(request, args => ctx.runMutation(internal.checkins.callEnded, args))),
});

// Convex Auth's public sign-in keys, at /.well-known/… where Convex looks for them.
auth.addHttpRoutes(http);

// Everything else is the static site (call page, demo page, setup pages). Keep this last.
registerStaticRoutes(http, components.staticHosting);
export default http;
