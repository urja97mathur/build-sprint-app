# Private phone-call test

A real outbound phone call: tap “Call me” → phone rings → answer → talk to the Sarvam agent. It worked on 2026-10-07 on the builder's Android phone. This test has no sign-in, location, alerts, or browser voice conversation. It is not a completed safety product.

The static page is hosted by Convex. The browser calls `/api/call`; Convex calls Sarvam. Provider acceptance only means “Call requested”, never “Connected”. If Sarvam refuses the request, the page shows “Couldn’t place the call. Try again.” and the status code (for example 401) is written to the Convex logs. Connection/request failures are not retried automatically. One request per browser tab is allowed until a new testing tab is opened; this is an accidental-repeat guard, not a distributed rate limit. The private access token and fixed server-side destination restrict the test to the builder. Do not publish the private link or open calling to the public before implementing authenticated access and durable request limits.

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
