# Private phone-call test

Latest direction: a real outbound phone call. Tap “Call me” → phone rings → answer → talk to the Sarvam agent. This test has no sign-in, location, alerts, or browser voice conversation. It is not a completed safety product.

The static page is hosted by Convex. The browser calls `/api/call`; Convex calls Sarvam. Provider acceptance only means “Call requested”, never “Connected”. Connection/request failures are not retried automatically. One request per browser tab is allowed until a new testing tab is opened; this is an accidental-repeat guard, not a distributed rate limit. The private access token and fixed server-side destination restrict the test to the builder. Do not publish the private link or open calling to the public before implementing authenticated access and durable request limits.

## Convex environment settings

Set these in the Convex dashboard for the deployment used to host the page. Never put real values in this file or frontend code.

- `CALL_TEST_ACCESS_TOKEN`: randomly generated private test access, at least 32 characters.
- `SARVAM_API_KEY`: a replacement key; do not use the key pasted into chat.
- `SARVAM_ORG_ID`: organization ID from the generated Instant outbound request URL.
- `SARVAM_WORKSPACE_ID`: workspace ID from that URL.
- `SARVAM_OUTBOUND_CONFIG`: JSON containing `app_config` copied from the selected agent's Instant outbound request. It must include `app_id`, numeric `app_version`, and `connection_config` with `connection_id` and `agent_phone_number`. Preserve required agent variables inside `app_config`. Do not include the API key.
- `SARVAM_TEST_PHONE_NUMBER`: the builder's test receiving number with `+` and country code.

Official contract: https://docs.sarvam.ai/conversations/api/instant-outbound/create

## Run and deploy

`npm run dev` opens the local page. `npm test` checks server rejection, fixed destination, confirmation and uncertain outcomes using fake Sarvam responses. `npm run build` builds the static assets. `npm run deploy` deploys the Convex backend and uploads the page to the production `.convex.site` address.

Open the hosted address with `#access=YOUR_PRIVATE_TEST_ACCESS_TOKEN`. The page keeps access in tab session storage and removes it from the visible address. It never stores or requests the Sarvam key.

Until the required server settings exist, the button stays unavailable and the page explains that calling is not ready. After setup, tap once, answer the real call, and verify the conversation. Finish the call on the phone. This page does not detect answered or ended calls yet.

On uncertainty, check the phone and Sarvam call log before another test. No webhook, recording or transcript collection has been added to this app. Check the Sarvam agent's own retention and recording settings separately before user testing.
