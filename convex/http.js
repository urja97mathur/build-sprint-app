import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server.js';
import { internal } from './_generated/api.js';
import { handleCall } from './lib/call.js';
import { handleDemoCall } from './lib/demo.js';

const http = httpRouter();
http.route({ path: '/call-setup', method: 'GET', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });
http.route({ path: '/call', method: 'POST', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });

// Public demo call before sign-up. The limits live in the database steps below.
const demoStore = ctx => ({
  reserve: args => ctx.runMutation(internal.demo.reserve, args),
  settle: args => ctx.runMutation(internal.demo.settle, args),
});
const demoCall = httpAction((ctx, request) => handleDemoCall(request, process.env, demoStore(ctx)));
http.route({ path: '/demo-call', method: 'GET', handler: demoCall });
http.route({ path: '/demo-call', method: 'POST', handler: demoCall });
export default http;
