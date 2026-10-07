import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server.js';
import { handleCall } from './lib/call.js';

const http = httpRouter();
http.route({ path: '/call-setup', method: 'GET', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });
http.route({ path: '/call', method: 'POST', handler: httpAction((_ctx, request) => handleCall(request, process.env)) });
export default http;
