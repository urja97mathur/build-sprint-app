# Private phone-call test

A real outbound phone call: tap “Call me” → phone rings → answer → talk to the Sarvam agent. It worked on 2026-10-07 on the builder's Android phone. This test has no sign-in, location, alerts, or browser voice conversation. It is not a completed safety product.

The static page is hosted by Convex. The browser calls `/api/call`; Convex calls Sarvam. Provider acceptance only means “Call requested”, never “Connected”. If Sarvam refuses the request, the server writes the status code (for example 401) to the Convex logs and replies “Couldn’t place the call. Try again.” with status 502. The network in front of Convex replaces 502 and 504 replies with its own “error code: 502” page, so the page actually shows the “We couldn’t confirm the call request…” message instead (found 2026-10-07; not yet fixed). The demo call avoids this by using 424. Connection/request failures are not retried automatically. One request per browser tab is allowed until a new testing tab is opened; this is an accidental-repeat guard, not a distributed rate limit. The private access token and fixed server-side destination restrict the test to the builder. Do not publish the private link or open calling to the public before implementing authenticated access and durable request limits.

## Convex environment settings

Set these in the Convex dashboard on the Production deployment (Settings → Environment Variables), which hosts the page. Never put real values in this file or frontend code.

- `CALL_TEST_ACCESS_TOKEN`: randomly generated private test access, at least 32 characters.
- `SARVAM_API_KEY`: the full Voice Agents API key. In Sarvam Voice Agents, open Settings → API Key, create a key, and copy it from the pop-up shown when it is created. On 2026-10-07 a key copied from elsewhere and a shortened key copied from the key list were both refused with “Invalid API key format.” Never paste a key into chat.
- `SARVAM_ORG_ID`: organization ID from the Instant outbound request URL in Sarvam's Deploy with code (the part after `orgs/`).
- `SARVAM_WORKSPACE_ID`: workspace ID from that URL (the part after `workspaces/`).
- `SARVAM_OUTBOUND_CONFIG`: JSON containing `app_config` from the selected agent's Instant outbound request, on one line. A working shape: `{"app_config":{"app_id":"…","app_version":1,"app_type":"agent","connection_config":{"connection_id":"…","agent_phone_number":"…"}}}`. `app_version` is a plain number, without quotes. `agent_phone_number` is the calling number rented through Sarvam (Deploy → Phone numbers); it must show under the connection. No agent variables are sent at present; if the agent needs them, add them inside `app_config`. Do not include the API key.
- `SARVAM_TEST_PHONE_NUMBER`: the builder's own mobile, the phone that rings, with `+` and country code and no spaces. Not the rented number.

Official contract: https://docs.sarvam.ai/conversations/api/instant-outbound/create

## Run and deploy

`npm run dev` opens the local page. `npm test` checks server rejection, fixed destination, confirmation and uncertain outcomes using fake Sarvam responses. `npm run build` builds the static assets. `npm run deploy` deploys the Convex backend and uploads the page to the production `.convex.site` address. In a non-interactive terminal it stops at Convex's confirmation prompt; run `npx convex deploy -y`, then `npx @convex-dev/static-hosting deploy --skip-convex`.

Open the hosted address with `#access=YOUR_PRIVATE_TEST_ACCESS_TOKEN`. The page keeps access in tab session storage and removes it from the visible address. It never stores or requests the Sarvam key.

Until the required server settings exist, the button stays unavailable and the page explains that calling is not ready. After setup, tap once, answer the real call, and verify the conversation. Finish the call on the phone. This page does not detect answered or ended calls yet.

On uncertainty, check the phone and Sarvam call log before another test. No webhook, recording or transcript collection has been added to this app. Check the Sarvam agent's own retention and recording settings separately before user testing.

## Demo call (milestone 2)

Public page: `/demo.html` on the production `.convex.site` address. She enters an Indian mobile number and gets one real demo call. The browser calls `/api/demo-call`; the limits are checked in Convex (`convex/demo.js`), never in the page:

1. One demo call per phone number, ever: “This number already had its demo call.” Numbers are stored only as a keyed fingerprint, never as numbers.
2. At most `DEMO_DAILY_LIMIT` demo calls a day across everyone (20 when unset), resetting at midnight India time: “Demo calls are full today. Try tomorrow.”
3. At most 60 seconds: the demo agent's “Max call length” in Sarvam is set to 1 minute. Each call sends the opening as `initial_bot_message`: “Hi, this is the demo call you asked for from the companion app. I’m Simran, an AI, not a real person. Meri awaaz clear aa rahi hai?” (changed 2026-10-09 to add her name and a sound check). The demo agent's instructions then follow four steps: sound check, one question about the walk, “this is only a demo; no one is alerted and no location is shared”, and “did it feel natural?”, then it ends the call.

A call Sarvam clearly refuses frees the number and the day's slot; an unconfirmed one keeps both, because the phone may still ring. Error replies use status 424, not 502/504 (see above). Anyone can type someone else's number, and that person gets one unexpected call; the limits cap this at 20 calls a day. Milestone 1's private call is unchanged.

Demo settings, on the Production deployment:

- `SARVAM_DEMO_OUTBOUND_CONFIG`: same shape as `SARVAM_OUTBOUND_CONFIG`, with the demo agent's `app_id` and `app_version`, and the same connection and rented number.
- `DEMO_NUMBER_SECRET`: random, at least 32 characters; set on 2026-10-07. Changing it forgets which numbers already had a demo.
- `DEMO_DAILY_LIMIT`: optional whole number; 20 when unset. Set it to 0 to test the daily limit without placing calls, then remove it.
- It also uses `SARVAM_API_KEY`, `SARVAM_ORG_ID` and `SARVAM_WORKSPACE_ID`.

Sarvam demo agent: duplicate the agent, and in its Settings tab set “Max call length” to 1 minute. Setting the same opening as its greeting is a fallback in case Sarvam ignores the one sent with the call. Whether the minute counts from ringing or from answering is untested.
