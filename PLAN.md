# PLAN.md

The landing page and working voice demo are one end-to-end milestone, riskiest part first. Then the remaining milestones from PRODUCT.md, in their simplest form. The earlier one-hour target applied to the landing page alone; it is not a confirmed estimate for the complete demo.

Status: On 2026-10-06 the builder authorized a smaller first test before the full demo: a private “Call me” page that requests a real Sarvam outbound call to her configured test number. It replaces browser audio for this test. Page and backend implementation are authorized; the calling connection and a private replacement key are still required before a real call can be verified. No milestone is confirmed complete.

Current task: Open the private phone-call test page → tap “Call me” → phone rings → answer → hear the existing Sarvam agent. No signup, location or alerts. First confirm this works before expanding milestone 1 below. See CALL_TEST_SETUP.md. Earlier browser-orb details below are deferred while this test is evaluated.

1. I can open the landing page on my phone at the project's `.convex.site` link, understand what the safety call does, and tap “Try a demo call”. After microphone permission if needed, I hear a two-second ringtone while connecting, then automatically enter the blue-orb AI conversation once connected, without an “Answer” tap. I can speak, hear live AI replies, end the demo, and return to the landing page. No signup, alerts, or location sharing. Sarvam is the preferred voice service; verify its browser connection and safe client access. If connection is not ready after the ring, show “Connecting…”; show the connection error after 10 seconds from the start of the connection attempt. Test the complete demo, ringtone playback, two-way audio, and ending the demo on actual phones. Let users try it to judge whether the voice feels natural and reassuring; do not treat a static page or prerecorded monologue as completion. ← next
2. I can create an account using email-code verification, save one trusted contact and a code word, practise the code word without sending an alert, and add more contacts later.
3. I can start a safety call, keep talking while I walk, and share my location for that session. Test two-way voice and newly recorded location updates with the screen locked on iPhone and Android, in a safe setting. If either stops, report the failure and assess an Android-only APK with the builder before continuing on that platform.
4. I can say my code word and have my trusted contact receive an emergency SMS with my latest location, without the AI announcing it aloud. Verify the SMS provider and account eligibility before integration or payment.
5. I can miss repeated check-ins and have my contact receive a check-on-me alert; stopping alone does not send an emergency alert.
6. I can have the app try my next saved contact if the first does not respond, and see whether a contact has acknowledged the alert through their private alert link, without contact signup.
7. I can confirm “I’m safe”, end the call and location sharing, and have alerted contacts receive an update. Ending only the call must keep the safety session active, with “Call me” and “I’m safe” visible.
8. I can close it, reopen it, and my data is still there.

Work on one milestone at a time, end to end. Before writing code, explain the intended outcome and plan, then wait for the builder's yes. After the builder confirms the milestone works, commit, push, and add one line to PROGRESS.md.

Run the thirty-minute, no-code voice check from PRODUCT.md while building. It has not been run. The final product success measure is 3 of 5 testers starting a second safety call on a different walk within a week, without a reminder, and ending it with “I’m safe”.

## Parked (not now)

- Automatic police alerts.
- Cameras, audio or video recording.
- Volunteers.
- Smartwatch support.
- Safe-route recommendations.
- Continuous tracking outside a safety session.
- Additional voice and language choices.
- A trusted person joining the call.
- City-based personalisation.
- Sending a test SMS when adding a trusted contact.
- An installed app, unless the browser voice/location test shows it is needed. Android-only APK is the agreed next option to assess after a failed test.

## Decisions still needed before the relevant work

- Sarvam browser connection and safe client access.
- SMS provider selection, individual-account eligibility, and cost approval. Twilio is a candidate, not connected or approved for spending.
- Check-in intervals, how many missed replies trigger an alert, and how long to wait before trying the next saved contact.
- Retention periods for location and alert records.

If older IDEA_SCOPE.md details conflict with later approved decisions, follow PRODUCT.md, DESIGN.md, AGENTS.md, and the builder's latest instructions. Do not build older features such as offline scripts, spoken onboarding, automatic test alerts, or nights-out counts without fresh approval.
