# PLAN.md

Riskiest part first, then the remaining milestones from PRODUCT.md, in their simplest form.

Status (2026-10-07): The builder chose a real phone call for the product. The private phone-call test works: tapping “Call me” made Sarvam call the builder's Android phone, and she talked with the agent. iPhone is untested. Make the decisions below before the milestones they affect. See CALL_TEST_SETUP.md for the test's setup.

1. ✓ I can open the private page on my phone, tap “Call me”, my phone rings, I answer, and I talk with the AI companion. Done 2026-10-07 for the builder's own number only (Android). Not covered yet: iPhone, other people's numbers, and detecting answered or ended calls.
2. ✓ I can try a clearly labelled demo before signing up, without sending alerts or sharing my location, and judge whether the voice feels natural and reassuring. Done 2026-10-09: the public `/demo.html` page takes her mobile number and Sarvam's demo agent calls it once, for under a minute; all three limits tested on the builder's Android phone. Not covered yet: iPhone, the 20-a-day cap with real calls, and what the page says after the call.
3. I can create an account using email-code verification, save one trusted contact and a code word, practise the code word without sending an alert, and add more contacts later.
4. I can start a safety call, keep talking on the phone while I walk, and share my location for that session from the page. Test that newly recorded location updates keep reaching the backend with the screen locked during a phone call, on iPhone and Android, in a safe setting. If location stops, report the failure and assess an Android-only APK with the builder before continuing on that platform.
5. I can say my code word and have my trusted contact receive an emergency SMS with my latest location, without the AI announcing it aloud. Verify the SMS provider and account eligibility before integration or payment.
6. I can miss repeated check-ins and have my contact receive a check-on-me alert; stopping alone does not send an emergency alert.
7. I can have the app try my next saved contact if the first does not respond, and see whether a contact has acknowledged the alert through their private alert link, without contact signup.
8. I can confirm “I’m safe”, end the call and location sharing, and have alerted contacts receive an update. Ending only the call must keep the safety session active, with “Call me” and “I’m safe” visible.
9. I can close it, reopen it, and my data is still there.

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
- An installed app, unless the browser location test shows it is needed. Android-only APK is the agreed next option to assess after a failed test.
- The in-browser call: a two-second ringtone inside the page, then a blue-orb AI conversation in the browser with no “Answer” tap. Replaced by the real phone call on 2026-10-07.

## Decisions still needed before the relevant work

- **“I’m safe”:** she taps it on the page, says it to the AI, or both.
- **Demo before sign-up:** decided 2026-10-07. She enters her phone number and gets one real demo call: one per number, ever; at most 20 a day across everyone; at most 60 seconds, opening with “Hi, this is the demo call you asked for from the companion app.” See CALL_TEST_SETUP.md.
- **Code word and check-ins during a phone call:** the app does not hear the call, so Sarvam's agent would have to tell Convex when she says the code word or misses check-ins. Check what Sarvam supports before relying on it. This also decides how code-word practice works.
- **Call status:** the page cannot tell whether a call was answered or ended. Sarvam's outbound request accepts a `webhook_config`; check what it reports before relying on it. Also decide how long to wait on a call request before showing an error (the 10-second limit was for the in-browser call).
- **Location during a phone call:** the page must stay open in the browser during the call. Untested with the screen locked.
- **Demo label:** PRODUCT.md asks for “Demo only. No contacts are alerted or location shared.” The builder removed the demo line from the private call page on 2026-10-07. Since 2026-10-09 the demo call says it aloud (“yeh sirf demo hai…”); the demo page itself doesn't. Decide whether the page should say it too.
- **Demo call reviews:** the builder wants to see how demo calls go (answered, sound, whether it felt natural). Sarvam's call log shows this only if it keeps transcripts. Decide whether to read them, and how callers are told, before sharing the demo link widely.
- **Home headline:** whether Home keeps “A voice with you on your walk.” The builder removed it from the private call page.
- SMS provider selection, individual-account eligibility, and cost approval. Twilio is a candidate, not connected or approved for spending.
- Check-in intervals, how many missed replies trigger an alert, and how long to wait before trying the next saved contact.
- Retention periods for location and alert records.

If older IDEA_SCOPE.md details conflict with later approved decisions, follow PRODUCT.md, DESIGN.md, AGENTS.md, and the builder's latest instructions. Do not build older features such as offline scripts, spoken onboarding, automatic test alerts, or nights-out counts without fresh approval.
