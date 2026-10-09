# Product flow

Decision (2026-10-07): The product uses a real phone call. She taps “Call me”, Sarvam calls her phone, she answers, and she talks with the AI companion on her phone's call screen. This replaces the earlier in-page ringtone and in-browser orb conversation. Answering adds an action, so the count is four. The private phone-call test worked on 2026-10-07 (the builder's Android phone, her own number only). The questions this raises are listed under “Decisions still needed” in PLAN.md.

## 1. The job

When I'm walking alone late at night or early in the morning and notice someone following me or a group of boys staring at me from a distance, I want someone with me who knows where I am and can get help if I need it, so I can run errands after work, go for a night run, or stay out late with friends without having to cut back on my plans.

## 2. The switch

What they'd fire: Staying home and doing nothing, or sharing live location on WhatsApp with loved ones before leaving.

Push: She cancels night runs, takes a cab for a walkable distance, and calls someone just to hear a voice.

Pull: Not having to think twice before heading out at night; walking home on an empty street without feeling scared.

Anxiety: The voice sounds fake and makes her more nervous.

Habit: Sharing location on WhatsApp before heading out, in one click, with no new app to install.

## 3. The flow

### Today

1. She feels followed and tries calling someone.
2. If they don’t answer, she tries someone else or pretends to be on a call.
3. She messages a trusted person to explain what’s happening; her location may already be shared.
4. She looks for nearby help, enters a busy place, or cuts her walk short.
5. Once safe, she sends an “I’m home” message.

### With my product

1. **“Call me.”** She taps once. Her phone rings with a call from the AI companion's number, and she answers. The conversation happens on her phone's call screen. The page shows only what it can confirm, such as “Call requested”; it cannot yet tell whether the call was answered or ended.
2. **Stay connected.** The conversation continues while she decides where to go. Location sharing runs for this safety session from the page, which stays open in her browser during the call. Whether location keeps updating with the screen locked during a phone call is untested.
3. **Ask for help without opening another screen.** Her code word sends an emergency alert and her latest location to chosen contacts. The conversation continues. How the code word reaches the app during a phone call is undecided (see PLAN.md).
4. **Handle silence.** An unexpected stop prompts a check-in. Repeated missed replies trigger a “please check on her” alert, clearly sent by the app. Contacts can acknowledge that they’re responding. How the app learns about missed replies during a phone call is undecided (see PLAN.md).
5. **“I’m home” or “I’m safe.”** She confirms safety. The session and location sharing end, and alerted contacts receive an update. Whether she taps this on the page, says it to the AI, or both is undecided (see PLAN.md).

### What must not happen

- **Step 1:** A failed call must never appear connected.
- **Step 2:** The AI must not invent her location, give unverified route advice, or promise protection.
- **Step 3:** The code word must have one meaning: send an emergency alert. The AI never announces it aloud.
- **Step 4:** Stopping alone must not mean danger. “Alert sent,” “contact responding,” and “help arrived” must remain separate.
- **Step 5:** Being near home must not automatically mean she is safe. Tracking must end when she closes the session.

### Things it takes to get the job done

Today: **5** · With my product: **4** (tap “Call me”, answer the call, code word if needed, confirm safe).

## 4. Onboarding

- **First value:** The demo call, when she hears the voice and it sounds real.
- **Smallest commitment:** One trusted contact and her code word.
- **The worry it removes:** “The voice sounds fake.”
- **The steps from opening the link to first value:** Open the link → tap “Try a demo call” → hear the natural AI voice. This is first value. Then choose “Set up my safety call” → create an account → add one trusted contact → choose and practise a code word.
- **The demo with a real phone call:** Decided 2026-10-09 and working. She enters her mobile number on the demo page and gets one real call from the demo agent, Simran: one per number, ever; at most 20 a day across everyone; under a minute. Simran says it's a demo and that she's an AI, checks the sound, asks one question about the walk, says no one is alerted and no location is shared, and asks whether it felt natural. See CALL_TEST_SETUP.md.
- **Login:** After the demo, when she chooses “Set up my safety call.” New users create an account with their name and email; returning users log in.
- **What we don’t ask on day one:** Anything beyond name, email, one trusted contact, and a code word; permissions before they’re needed.
- **What we ask later, and when:** City (optional), after her demo call.

### Flow

1. **Try a demo call before signing up.** She hears a short, natural AI conversation so she can judge the voice herself.
2. **Ask: “Would this feel natural on your walk?”** Offer “Set up my safety call” as the next action.
3. **Create an account or log in after the demo.** Collect her name and email for a new account. City is optional after the demo and is not required to complete setup. Ask for permissions only when they’re needed.
4. **Add one trusted contact.** Explain when the app sends a missed-check-in alert or an emergency alert.
5. **Choose and practise her code word.** Explain that it sends an emergency alert during a safety call. Practice does not send a real alert.

Clearly label the demo: **“Demo only. No contacts are alerted or location shared.”** Make it clear that the voice is AI, rather than a real person answering the call.

## 5. v1

**Does (the must haves: one person finishes the one job):** She tries the demo, sets up a trusted contact and a code word (she can add more contacts later), and starts a safety call when she feels uneasy walking alone. The AI keeps talking, her code word sends an emergency alert with her location, and repeated missed check-ins send a check-on-her alert, trying her next contact if the first doesn’t respond. She confirms “I’m safe” to end the session and location sharing.

**Doesn’t (not this sprint: parked, not forgotten):** Automatic police alerts, cameras or recording, volunteers, smartwatch support, safe-route recommendations, continuous tracking, or a guarantee that someone will come to help.

**Nice to have (only after the must haves work):** More voice and language choices, a trusted person joining the call, and optional city-based personalisation.

**How I’ll know it worked (what they do again, not what they say):** 3 of my 5 testers start a second safety call on a different walk within a week, without a reminder, and end it with “I’m safe”.

## 6. The riskiest guess

**If this is false, the product is pointless:** The AI call sounds like a real person, so when she hears it on a dark street she feels calmer, not more nervous.

**Thirty-minute check, no code (run it while you build), and what happened:** Not run yet.

## 7. Milestones

1. I can tap “Call me”, my phone rings, I answer, and I talk with the AI companion. (Done 2026-10-07 on the private test page, for the builder's own number.)
2. I can try a clearly labelled demo before signing up, without sending alerts or sharing my location. (Done 2026-10-09: one real demo call per number, under a minute.)
3. I can create an account, save one trusted contact and a code word, and add more contacts later.
4. I can start a safety call, keep talking while I walk, and share my location for that session.
5. I can say my code word and have my trusted contact receive an emergency alert with my latest location, without the AI announcing it aloud.
6. I can miss repeated check-ins and have my contact receive a check-on-me alert; stopping alone does not send an emergency alert.
7. I can have the app try my next saved contact if the first does not respond, and see whether a contact has acknowledged the alert.
8. I can confirm “I’m safe”, end the call and location sharing, and have alerted contacts receive an update.
9. I can close it, reopen it, and my data is still there.
