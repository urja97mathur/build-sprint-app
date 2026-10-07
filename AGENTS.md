# Project instructions

Read PRODUCT.md for the product flow and DESIGN.md before building or changing a screen. Preserve the approved scope. If a design choice is not covered, ask the builder rather than guessing.

When you run a shell command, always pass workdir set to the absolute path of the folder it runs in.

## Current authorization

On 2026-10-06 the builder authorized a small real-phone-call test page: “Call me” → Convex requests a Sarvam outbound call → her phone rings → she answers. It worked on 2026-10-07 on her Android phone, and she chose the real phone call for the full product. Calls stay restricted to the builder's configured test number, and service keys stay in Convex environment settings. Do not build sign-in, location, alerts or the next milestone until the builder says yes to it. See CALL_TEST_SETUP.md for setup and limitations, and “Decisions still needed” in PLAN.md.

## 1. How the product works

**Interface:** A page on the project's `.convex.site` link. She opens it in a phone browser, with no install, and taps “Call me”. Sarvam calls her phone; she answers and talks with the AI companion on her phone's call screen. The page shows only what it can confirm, such as “Call requested”; it cannot yet tell whether the call was answered or ended. A soft blue swirl orb sits above “Call me”. The action count is four: “Call me”, answer, code phrase if needed, and “I’m safe”. The full product flow includes a code phrase for requesting help and “I’m safe” to close the safety session; how both work during a phone call is undecided (see PLAN.md).

**Business logic:** During a real safety session, keep the AI conversation going and share location. Her code phrase or manual alert button triggers an emergency SMS; repeated missed check-ins trigger a check-on-her SMS. Try the next saved contact if the first does not respond. Ending only the call keeps the safety session, location sharing, and check-in monitoring active. Confirming “I’m safe” ends the session and location sharing and updates alerted contacts.

Sending an alert, confirming delivery, a contact acknowledging, and help arriving are separate events. Never claim a later event from an earlier one. Demo and code-phrase practice never send real alerts or share location.

### Database

Use Convex for all database tables and backend logic. The builder approved these proposed tables:

| Table | What it remembers |
| --- | --- |
| Users | Name, email, verification status, optional phone number and city |
| Trusted contacts | Selected names, phone numbers, and contact order |
| Code phrases | Her current phrase and successful practice |
| Safety sessions | Start time, call status, session status, and explicit safety confirmation |
| Session locations | Latest coordinates, accuracy, measurement time, and receipt time |
| Check-ins | Requests, response deadlines, and answered or missed status |
| Alerts | Reason, trigger, location snapshot, and whether she later confirmed safety |
| Alert deliveries | Each contact's message, sending and delivery status, acknowledgement, and protected alert-page access |

Convex Auth manages sign-in records. Do not add a separate database or authentication service. Do not add an AI-answer editing table or record audio or video.

Keep only selected phone contacts, not her whole address book. Successful code-phrase practice is required before marking that part of setup ready. Repeated code-phrase detection must not create duplicate open emergency alerts. Acknowledgement alone never closes an alert or marks her safe.

The contact page's “Call her” action requires her phone number. Hide that action until a number is saved; name and email alone do not supply it. Use a separate protected link per contact so one contact cannot acknowledge as another.

### Third-party services

| Service | Decision and purpose | Secret-key location |
| --- | --- | --- |
| Sarvam | Chosen for the AI voice: real outbound phone calls through its Instant outbound API, from a number rented through Sarvam. Use the full Voice Agents API key (Settings → API Key). Calls cost per minute. | Convex server environment settings |
| Resend | Chosen direction for delivering email login codes; Convex Auth handles sign-in | Convex server environment settings |
| Twilio | Candidate for automatic SMS, not a final selection; verify eligibility and Indian SMS access for an individual builder before payment or integration | Convex server environment settings |
| GitHub | Stores project code | Development tools; no GitHub secret in the client |

Permanent service keys must never be embedded in the client or committed to GitHub. If connecting voice requires an additional backend or outside service, explain the concrete requirement and ask before adding it. Do not purchase services without the builder's approval.

### Browser before an installed app

The page runs on `.convex.site`. The builder's direction is to skip an installed app unless the browser cannot do the job; this supersedes the earlier Android/iPhone app-first proposal. The voice is now a normal phone call, so the riskiest browser part is location.

Test on both iPhone and Android phones, in the safety-call milestone:

1. Open the page, start a safety call with session location updates, and answer the call.
2. In a safe setting, lock the screen mid-call while walking.
3. Check that the call continues and that newly recorded location updates reach the backend, rather than merely showing the last position.
4. If both keep working, continue with the web approach.
5. If location stops, report the device and observed failure. That is the reason to assess an Android-only APK (an installable Android app) next; do not silently change platforms.

This test has not been run. Passing it does not prove SMS alerts, check-in handling, or the entire safety flow works; those need their own tests. Never describe the product as reliable or complete based only on code inspection.

### Hosting and tooling

- Codex writes code; GitHub stores it; Convex provides database, backend, Convex Auth, and static website hosting.
- Read the installed `.agents/skills/convex-dev-static-hosting/SKILL.md` before hosting work.
- Deploying the website means `npm run deploy`; pushing to GitHub does not deploy it. In a non-interactive terminal, `npm run deploy` stops at Convex's confirmation prompt; run `npx convex deploy -y`, then `npx @convex-dev/static-hosting deploy --skip-convex`.
- Use applicable Build Sprint skills installed in this project.
- Never use another host, database, or authentication service without asking the builder first.

### Not in v1

Automatic police alerts, cameras or recording, volunteers, smartwatch support, safe-route recommendations, continuous tracking, additional voices and languages, a trusted person joining the call, city-based personalisation, or a guarantee that help will arrive. Login is in v1. An installed app is deferred until browser testing shows a need.

## 2. How we work

- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before anything else, and DESIGN.md before any screen work.
- Before writing code, tell me in two or three sentences what you think I'm after, then your plan. Wait for my yes. Don't guess.
- One milestone at a time: the next one in PLAN.md, working end to end. Nothing outside it.
- If I ask for something new mid-milestone, add it to the parked list in PLAN.md and carry on.
- Never say "done" until you've seen it work (a test, or a screenshot at phone width) and told me how to check it on my phone.
- When I report a bug, find the cause before changing anything. Fix only that.
- After I confirm a milestone works: commit, push, and add one line to PROGRESS.md.
- Never put a key or password in code, in a VITE_ variable (those are sent to every visitor) or in a committed file.

## Bug reports

When the builder names the part—interface, business logic, database, or third party—look there first. If evidence points elsewhere, explain why in plain words.

## Working with the builder

Use short, plain sentences. Say what you are about to do before doing it. Ask one concrete question at a time. Explain a skill the first time you use it. Check work before saying it is done, state what has not been tested, stay in scope, and suggest one next step.
