# DESIGN.md

Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## Call page (real phone call) — updated 2026-10-07

The product uses a real phone call: she taps “Call me”, her phone rings, she answers, and the conversation happens on her phone's call screen, not on the page. The private call page is at `/call-test.html` (moved from the main address on 2026-10-10). White screen. Top to bottom:

1. “DEMO” label, 14px, letter-spaced.
2. Soft blue swirl orb (see References and Colours). It turns slowly in every state and stays still when the phone is set to reduce motion. It cannot react to the call. About 58% of the screen width, at most 240px.
3. “Tap below. Your phone will ring. Answer to talk with your AI companion.”
4. “Call me” button, charcoal. When unavailable: solid grey (#6B6B6B) with a white label, 5.33:1 contrast.
5. Status line.

No headline, no phone icon, and no “Demo only. No alerts or location sharing.” line; the builder removed them on 2026-10-07. Nothing on this page says that no alerts are sent.

Status messages:

- Checking: “Checking the call setup…”
- Ready (empty): “Ready when you are.”
- Loading: “Asking your AI companion to call you…”
- Requested: “Call requested. Answer when your phone rings. This doesn’t confirm the call connected.”
- Missing configuration: “The calling connection isn’t set up yet. Your phone won’t ring until it’s connected.” If the settings disappear between opening the page and tapping, the shorter “The calling connection isn’t set up yet.” appears.
- Unconfirmed: “We couldn’t confirm the call request. It may still ring. Check your phone and Sarvam’s call log before trying again.” Never retry automatically after an unconfirmed request.
- Sarvam refused the call: “Couldn’t place the call. Try again.” The status code goes to the Convex logs only. On the live page this currently shows as the Unconfirmed message instead, because the server's 502 reply is replaced by the network in front of Convex (see CALL_TEST_SETUP.md).
- No private link: “Open your private test link to use this demo.”
- Already requested in this tab: “A call was already requested in this tab. Check your phone and Sarvam’s call log before starting another test.”
- Setup check failed: “Couldn’t check the call setup. Refresh to try again.”

Button labels by state: “Call me”, “Call not ready”, “Requesting call…”, “Call requested”, “Check your phone”, “Try again”. Browser tab title: “Walking companion · Call test”. The builder kept these on 2026-10-07.

The page cannot yet detect whether a call was answered or ended. The in-page ringtone and in-browser orb conversation described in older sections below are replaced by the phone call; those places are marked.

## Public pages — redesigned 2026-10-10 from the builder's screens

Reference: `design/screens-2026-10-05.png` (see References). The builder approved it as the design for all public pages on 2026-10-10. The private call page above keeps its own look. Where this section and older sections below differ in words or layout, this section wins; their states, errors and timeouts still apply.

**Style.** White page, system font, charcoal text. Small `<` chevron at the top left for Back. Headlines 28px bold: centred on Welcome, Account, Log in, Verify and Home; left-aligned on the two setup steps, under “Step 1 of 2” / “Step 2 of 2” (14px grey). Supporting text grey (#5C5C5C). Fields: rectangles with 8px corners, a grey border (#949494, darker than the image so it stays visible) and example text inside. Main buttons: charcoal rounded rectangles (12px corners); a second choice is white with a grey outline. Links are underlined. The approved swirl orb stays.

**Pages, in order** (the main address, `/`, unless noted; `/app.html` forwards there):

1. **Welcome**, first for anyone signed out: “A voice with you on your walk.” → “Hear how your AI safety call would sound.” → “Try a demo call” → “Demo only. No alerts or location sharing.” → “Already have an account?” / “Log in” (added; not in the image). The walking illustration goes between the words and the button once the builder saves it as its own image.
2. **Demo** (`/demo.html`): `<` → “DEMO CALL” → orb → “Hear the AI conversation.” → “Your mobile number” (+91) → “Call me” → status → “Set up my safety call” link. The image's “End demo” is replaced by the phone-number field and “Call me”, because the demo is a real phone call. After the call is requested, or if the number already had its demo, “Would this feel natural on your walk?” appears above the link.
3. **Account**: `<` → “Set up your safety call” → “Your name” (e.g. Taylor Smith) → “Your email” (you@example.com) → “Continue” → divider → “Already have an account?” / “Log in”. **Log in** follows the same layout: “Welcome back” → “Log in to your safety call.” → “Your email” → “Send code” → “New here?” / “Create account”.
4. **Verify**: `<` → “Check your email” → “Enter the code sent to your email at [email].” → six code boxes → “Verify” → “Resend code” → “Change email”.
5. **Setup, step 1**: “Step 1 of 2” → “Add trusted contact” → “They’ll be alerted if you need help.” → “Choose from contacts” / “Enter manually”. Typing shows “Their name” and “Mobile number” (with “Include the country code, like +91.”) → “Save and continue”. Saved: “Contact saved. Let them know you’ve chosen them.” → “Continue”.
6. **Setup, step 2**: “Step 2 of 2” → “Choose your code phrase” → “Say this to your AI companion if you need help.” → field (e.g. sunflower) → “You can’t change it later.” → “Practise phrase” (outlined); after a successful practice, “Save and finish” → status → “Practice sends no alerts.”
7. **Home**: “A voice with you on your walk.” → green check + “Safety setup ready” (or the missing step with “Finish setup”) → rows with icons and `>`: “Trusted contacts”, “Code word” (shows “Saved”, never the phrase, and doesn't open), “Try demo” → “Log out” link (added). “Call me” arrives in milestone 4, without a phone icon (removed 2026-10-07).
8. **Not drawn, same style:** “Let’s finish setting up your account” (name), and **Trusted contacts** (list of names and numbers → “Add another contact”).

The image's **active call** screen is not built: it's milestone 4, and Mute/Speaker belong to the phone's own call screen.

## Demo page — built 2026-10-07

Public page at `/demo.html` for milestone 2. Its layout is now in “Public pages” above. “Call me” is available only once the number looks like an Indian mobile number.

Messages are the same as the call page for checking, ready, loading, requested, missing configuration and refused, plus:

- Invalid number: “Check this phone number”
- Number already used: “This number already had its demo call.”
- Daily limit reached: “Demo calls are full today. Try tomorrow.”
- Unconfirmed: “We couldn’t confirm the call request. It may still ring. Check your phone before trying again.” (The public can't see Sarvam's call log.)

Browser tab title: “Walking companion · Demo call”. The field label, “+91” prefix, field shape, tab title and unconfirmed wording were chosen while building; the builder has not yet confirmed them.

## 1. The feeling, in labels

- **Soft animated orb:** Gives the AI a presence without a human face. It turns slowly; it cannot respond to the voice, because the call happens in the phone app.
- **Open space around the orb:** Keeps attention on the conversation rather than a dashboard.
- **Few rounded controls:** Keeps the manual alert and “I’m safe” within reach. Mute and speaker are in the phone's call app.
- **Quiet status text:** Explains connection, location sharing, and alerts without interrupting the call.
- **Gentle motion with readable status:** Supports the calm feeling; motion is never the only way to understand what is happening.

## 2. References, one per component

[Component]: [image file or link]
Take: [exactly what to copy]
Ignore: [what isn't the point]

### Screens

**Screens:** `design/screens-2026-10-05.png`, the builder's generated screens (Welcome, Demo, Account, Verify, Safety setup, Home, Active call), approved as the design for the public pages on 2026-10-10.

Take: layout, words, the `<` back chevron, rectangular fields with example text, charcoal rounded-rectangle buttons with outlined second choices, six code boxes, “Step 1 of 2”, and Home's icon rows with a green check.

Ignore: anything that assumes the old in-browser call (the demo's “End demo”, Mute/Speaker), the phone icon on “Call me”, the image's own orb (the swirl orb is approved), and the fake phone status bar.

### Orb

**Orb:** The builder's active-call mockup, shared in chat on 2026-10-07. An active-call mockup with the same orb is saved as `design/active-call-2026-10-05.png`. A ChatGPT Voice screenshot was shared the same day; the builder preferred the mockup's orb.

Take: A soft sky-blue sphere with two deeper-blue swirls, white S-shaped streaks between them, and a soft edge. Slow, gentle motion, generous open space, very little text.

Ignore: ChatGPT branding, its exact screen, and controls unrelated to this safety flow. Do not use a human avatar or imply a real person is answering.

The mockup also shows a full active-call screen: “Connected to your AI companion”, the orb, “I’m here with you.”, “Location sharing is on”, Mute, Speaker, “Alert my contact”, “I’m safe” and “End call”. With a real phone call, mute and speaker belong to the phone's call app and the page cannot yet confirm the call connected, so that screen needs redesign before it is built.

## 3. Type and colour

Font: The device’s system font. Use the same family throughout the app.

Sizes (for the web app, in CSS pixels):

- Headlines: **28px**.
- Main text and input fields: **16px**.
- Button labels: **16px**, slightly bold.
- Supporting text and timestamps: **14px**.

Important call and alert messages must be **16px or larger**. Allow text to grow with the user’s accessibility settings and browser text scaling; do not clip enlarged text. These are starting sizes and can be adjusted after reviewing the screens.

Colours: Dark charcoal text (**#202123**) on a white background (**#FFFFFF**). Main-action buttons use charcoal (**#202123**) with white labels (**#FFFFFF**). Errors use red (**#B91C1C**) for readable text on white, alongside a clear explanation; do not rely on colour alone or replace the call with a full-screen red alert. Keep blue for the orb. Orb colours, matched by eye from the builder's mockup and approved on 2026-10-07: deep blue **#5B8DEF** (swirls), sky blue **#A9CCF6** (body), pale blue **#D6E8FB** (edge), and **#F5F9FF** (white streaks). Ask before changing them. Unavailable main-action buttons use solid grey (**#6B6B6B**) with a white label (5.33:1 contrast). Green (**#16A34A**) is used only for the check next to “Safety setup ready” on Home (approved 2026-10-10).

## 4. Screens

[Screen]: for [what]. Top to bottom: [what's on it]. Main action: [button words] → [where it goes]
Empty: [words] · Loading: [words] · Error: [words] · Done: [words]

### Active safety-call screen

**Needs redesign for the phone call.** This screen was designed for the in-browser call. With a real phone call, the conversation, mute and speaker are in the phone's call app, the in-page ringtone and “no Answer tap” no longer apply, and the page cannot yet tell whether the call connected, was answered or ended. The alert, SMS, safety-update and “I’m safe” rules below still apply. Redesign this screen after the decisions in PLAN.md.

**For:** Staying on an AI call while walking, asking for help without changing screens, and confirming safety.

**Top to bottom:** Connection status → soft animated orb → “I’m here with you” only while connected → current location, when available, and location-sharing status → quiet check-in or alert updates → mute, speaker, a discreet manual alert button, and “I’m safe” → secondary “End call” control.

**Main action:** “I’m safe” → end the safety session and location sharing, update alerted contacts, and return home with confirmation.

#### Empty

- Words: “Ready when you are.”
- Main action: “Call me” → start connecting.
- No call or location sharing has started yet.

#### Loading

Replaced by the phone call; see Call page. Kept for reference.

- Words: “Connecting your call…”
- On tapping “Call me”, play a ringtone inside the page for **two seconds** while the connection starts. There is no “Answer” button and no incoming phone call. After the ring, automatically begin the blue-orb conversation only if connected; otherwise keep showing “Connecting…”. Do not start AI speech over the ringtone.
- Show gentle motion and a “Cancel” control.
- After **10 seconds from the initial tap**, including the two-second ring, without a connection, stop any startup audio and switch to Error. Cancel also stops the ring and connection attempt. Ringtone playback and audibility must be checked on actual phones; do not guarantee that nearby people hear it.
- Never show “Connected” or play a pretend conversation before the connection succeeds.
- Show location-sharing status separately from call status.

#### Connected

The page cannot detect a connected phone call yet; show this only once it can be confirmed.

- Status: “Connected to your AI companion.”
- Supporting words: “I’m here with you.”
- The orb responds while listening and speaking; normal movement is soft and slow.
- Check-ins and alert updates stay on this screen.
- The code word sends an emergency alert; the AI never announces the alert aloud.
- Keep alert updates quiet and readable rather than replacing the call with a large red SOS screen.

#### Error

- Failed connection: “We couldn’t connect.”
- Dropped connection: “Your call disconnected.”
- Actions: “Try again” and “Alert my contact”.
- Keep the failure visible; a dropped call never counts as “I’m safe”.
- Show “Your location is still being shared” or “Your location is still being saved” only when that is actually working. Otherwise, show that location sharing is unavailable or its last update time.

#### Manual alert result

- After “Alert my contact”: show “Sending alert…” while sending.
- On confirmed sending success: show “Alert sent”. This does not mean the contact has received or read it, or that help has arrived.
- On failure: show “Couldn’t send, try SMS.” with a “Try SMS” action.
- “Try SMS” opens a prepared message for her to send. Opening the SMS app does not mark the alert as sent.
- If delivery confirmation is available, show it separately. Show a contact’s acknowledgement only when they actually acknowledge the alert.
- **Sending timeout: 10 seconds.** If sending is still unconfirmed, show “We couldn’t confirm the alert was sent. Try SMS.” Keep the alert’s status unconfirmed; a timeout does not prove failure. If confirmation arrives later, update the status to “Alert sent”. Repeated attempts must reuse the same alert so they do not create duplicate alerts.

#### Prepared SMS

- Include the app’s name, her name, the reason for the alert, the location-sharing link, and the time with its time zone.
- Identify the app as the source; do not make it look like she typed the message herself.
- When data is unavailable, include the last available location link and label it “Last known location, recorded at [time]”. Do not describe it as updating live.
- If no usable sharing link is available, include a map link to the last known coordinates, if available.
- If no location is available, say “Location unavailable.”
- Her contact should be able to understand the reason and location time from the SMS text alone.

Example for an emergency alert:

“[App]: Urja triggered an emergency alert during her safety call. She needs help now. Alert time: [date, time, time zone]. Last known location, recorded at [date, time, time zone]: [location link].”

Example for missed check-ins:

“[App]: Urja started a safety call and isn’t responding to check-ins. Please check on her. Alert time: [date, time, time zone]. Last known location, recorded at [date, time, time zone]: [location link].”

#### Done

- Reached only when she confirms “I’m safe”.
- Words: “Session ended. Location sharing stopped.”
- End the call and location sharing, and send a safety update to contacts who were alerted.
- Show whether that update was sent; show a failure if it could not be sent.
- Action: “Back home”.
- Provide a separate, secondary “End call” control. Tapping it asks: “End the call without marking yourself safe?” with “Keep talking” and “End call”. Ending only the call stops audio but keeps the safety session, location sharing, and missed-check-in monitoring active. Show “Call ended. Your safety session is still on.” and “Location sharing is still on.” while sharing is working. Keep “Call me” and “I’m safe” both visible. “Call me” reconnects audio within the existing session; it does not create another session. “I’m safe” ends the safety session explicitly; never interpret call disconnection as safety. If location sharing is unavailable, show its actual status instead of claiming it is on.

### Account screen

**For:** Creating an account after the demo, before trusted-contact setup.

**Top to bottom:** Back → “Set up your safety call” → “First, a little about you.” → “Your name” field → “Email” field → “Continue” → “Already have an account? Log in”.

**Main action:** “Continue” → email-code verification → add a trusted contact once the email is verified.

- **Empty:** Blank name and email fields. Continue becomes available when both are filled.
- **Loading:** “Continuing…” Prevent repeat taps.
- **Error:** Keep her details. Show the problem beside the relevant field, or “Couldn’t continue. Try again.”
- **Done:** Email verified; move to trusted-contact setup.

Use the calm, spacious style. Do not ask for city, a trusted contact, or a code word on this screen.

```text
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Set up your safety call    │
│                             │
│  First, a little about you. │
│                             │
│  Your name                  │
│  [                        ] │
│                             │
│  Email                      │
│  [                        ] │
│                             │
│        [ Continue ]         │
│                             │
│  Already have an account?   │
│           Log in            │
└─────────────────────────────┘
```

### Email verification

**Approved method:** Send a code to her email. She enters the code in the app to verify her email.

Flow: Account details → send email code → enter code → successful verification → trusted-contact setup.

**Approved layout, top to bottom:** Back → “Check your email” → “Enter the code sent to [email]” → “Verification code” field → “Verify” → “Resend code” → “Change email”.

- **Empty:** “Verify” becomes available after she enters a code.
- **Loading:** “Verifying…” Prevent repeat taps.
- **Error:** “That code didn’t work. Check it and try again.” For an expired code: “Your code expired. Request a new one.”
- **Done:** Email verified → add a trusted contact.
- **Resend:** Allow “Resend code” after 30 seconds. Show “New code sent” only after confirmed success.
- **Change email:** Return to the account screen with her name kept.

**Verification timeout: 10 seconds.** If verification remains unconfirmed, keep the entered code and show “We couldn’t confirm verification. Try again.” Do not move to setup or Home until verification is confirmed. If success arrives later, continue once without creating another account. Returning-user verification follows the login rules below.

### Returning-user login

**For:** Returning to her saved safety setup using an email code, without a password.

**Top to bottom:** Back → “Welcome back” → “Log in to your safety call.” → “Email” field → “Send code” → “New here? Create account”.

**Main flow:** “Send code” → the existing email-code screen → successful verification → Home. If setup is unfinished, return her to the missing setup step. If she is already logged in, opening the app goes straight to Home.

- **Empty:** “Send code” becomes available when the email looks valid.
- **Loading:** “Sending code…” Prevent repeat taps.
- **Error:** Keep her email. Show “Couldn’t send the code. Try again.”
- **Done:** Open the email-code screen after sending succeeds. On an unconfirmed sending timeout, allow code entry with the uncertainty message described below; do not claim sending succeeded.

“Create account” opens the account screen. Reuse the approved email-code verification layout and resend behaviour.

**Code-sending timeout: 10 seconds**, for account creation, login, and resend. Keep the email and show “We couldn’t confirm the code was sent. Check your inbox or try again.” Open verification with the email preserved so she can enter a code if it arrives; do not claim “New code sent” without confirmation. Prevent resend for 30 seconds after each request.

If a verified login email has no account, show “Let’s finish setting up your account”, ask for her name, then continue to trusted-contact setup. Do not reveal account existence before email verification.

```text
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Welcome back               │
│                             │
│  Log in to your safety call.│
│                             │
│  Email                      │
│  [                        ] │
│                             │
│       [ Send code ]         │
│                             │
│  New here? Create account   │
└─────────────────────────────┘
```

### Add trusted contact

**For:** Choosing her first trusted contact after email verification.

**Top to bottom:** Back → “Who should we contact?” → “Choose someone who can respond when you need help.” → “Choose from contacts” → “Enter manually” → alert explanation → “You can add more later.”

**Main flow:** “Choose from contacts” → phone-contact selection → confirm the selected name and mobile number → “Save and continue” → choose her code word.

Ask for contact access only when she taps “Choose from contacts”, and only if access is required by the supported contact picker. Do not request access on opening the screen. Phone contacts are not WhatsApp contacts; do not promise WhatsApp contact-list access.

**Manual fallback:** If she declines access, selection is unsupported, or she prefers typing, “Enter manually” shows their name and mobile number with a country code. Keep this option available.

**Selected contact:** Show the name and number for confirmation. If there are multiple numbers, let her choose the intended mobile number. She can change the selection before saving.

**Explanation:** “They’ll receive your location if you trigger an alert or miss check-ins.”

**Expectation:** “Let them know you’ve chosen them.” Saving a number does not mean the contact has agreed to help or will respond.

- **Empty:** No contact selected. Keep “Save and continue” unavailable until a name and valid mobile number are present.
- **Loading:** “Saving…” Prevent repeat taps.
- **Error:** Keep her selection or entries. Show “Check this phone number” or “Couldn’t save. Try again.” If contact access is unavailable, keep manual entry available.
- **Done:** Contact saved → choose her code word.

```text
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Who should we contact?     │
│                             │
│  Choose someone who can     │
│  respond when you need help.│
│                             │
│  [ Choose from contacts ]   │
│       Enter manually        │
│                             │
│  They’ll receive your       │
│  location if you trigger an │
│  alert or miss check-ins.   │
│                             │
│  Let them know you’ve       │
│  chosen them.               │
│                             │
│  You can add more later.    │
└─────────────────────────────┘
              │ select a contact
              ▼
       Confirm name and number
              │ “Save and continue”
              ▼
       Choose your code word
```

For v1, do not send a test message or invitation when saving a contact. Show “Contact saved. Let them know you’ve chosen them.” A test-message feature is parked for later.

### Code-word screen

**For:** Choosing a discreet code phrase, practising recognition, and saving it before using a real safety call.

**Top to bottom:** Back → “Ask for help discreetly” → “Say this phrase during your call to alert your trusted contacts.” → “Your code phrase” field → “Choose something you can remember, but wouldn’t say casually during a call.” → “You can change it later.” → “Practise phrase” → “Practice sends no alerts.”

**Main flow:** Enter phrase → “Practise phrase” → microphone permission if needed → say the phrase aloud → successful recognition → “Save and finish” → Home.

- **Empty:** No phrase entered; practice requires a phrase.
- **Listening:** “Say your phrase now.”
- **Recognised:** “Phrase recognised. In a real safety call, this would trigger an emergency alert.” Show “Save and finish”.
- **Not recognised:** “We didn’t catch that. Try again or change your phrase.”
- **Microphone unavailable:** Explain how to enable it and offer retry.
- **Practice unavailable in this browser** (for example, inside WhatsApp's or Instagram's built-in browser): “Practice doesn’t work in this browser. Open this link in Chrome or Safari to practise.” Keep her typed phrase. Added 2026-10-10.
- **Saved:** Go to Home with “Safety setup ready.”

Practice never sends an alert. During a real call, the AI never announces the phrase or alert aloud. Keep the manual alert button available if recognition fails.

**Saving:** “Saving your phrase…” Disable repeat saves.

**Save error:** “Couldn’t save your phrase. Try again.” Keep the phrase and successful practice result so she does not need to repeat practice unless she changes the phrase.

**Save timeout: 10 seconds.** If saving remains unconfirmed, show “We couldn’t confirm your code phrase was saved. Try again.” Stay on this screen and never show “Safety setup ready” until saving is confirmed. A retry updates the same phrase rather than creating a duplicate; a late success continues to Home once.

```text
┌─────────────────────────────┐
│  ← Back                     │
│                             │
│  Ask for help discreetly    │
│                             │
│  Say this phrase during     │
│  your call to alert your    │
│  trusted contacts.          │
│                             │
│  Your code phrase           │
│  [                        ] │
│                             │
│  Choose something you can   │
│  remember, but wouldn’t say │
│  casually during a call.    │
│  You can change it later. │
│                             │
│      [ Practise phrase ]    │
│                             │
│  Practice sends no alerts.  │
└─────────────────────────────┘
```

### Trusted-contact alert page

**For:** Letting a trusted contact understand an alert, see her latest location, call her, and acknowledge they are responding.

**Access:** Open directly from the alert message through a private link. No contact signup is required.

**Top to bottom:** “[App] · Safety alert” → reason-specific headline → reason for the alert → alert time with time zone → location map or link → location’s last update time with time zone → “Call Urja” → “I’m responding” → “Responding doesn’t mean help has arrived.” Use the user’s actual name in place of Urja.

- **Emergency headline:** “Urja needs help”. Explanation: “She triggered an emergency alert during her call.”
- **Missed-check-in headline:** “Please check on Urja”. Explain that she isn’t answering check-ins; do not label this a confirmed emergency.
- **Call action:** “Call Urja” opens a phone call to her; it does not mark the contact as responding automatically.
- **Acknowledge action:** “I’m responding” records the contact’s acknowledgement only after saving succeeds.

#### States

- **Loading:** “Loading alert details…”
- **Error:** “Couldn’t load the alert. Use the details in your message to contact Urja.”
- **Acknowledging:** “Saving your response…”
- **Acknowledgement saved:** “Your response is recorded.” This does not mean help has arrived.
- **Acknowledgement failed:** “Couldn’t save your response. Try again.”
- **Safe:** Only after she confirms safety: “Urja marked herself safe at [time]. Location sharing has ended.”
- **Unavailable link:** “This alert link is unavailable.” Never interpret an unavailable link as safe.

```text
┌─────────────────────────────┐
│  [App] · Safety alert       │
│                             │
│  Urja needs help            │
│                             │
│  She triggered an emergency │
│  alert during her call.     │
│                             │
│  Alert raised: 10:42 PM IST  │
│                             │
│  [ Location map / link ]    │
│  Last updated: 10:42 PM IST │
│                             │
│        [ Call Urja ]        │
│     [ I’m responding ]      │
│                             │
│  Responding doesn’t mean    │
│  help has arrived.          │
└─────────────────────────────┘
```

## 5. The first screen's words

### Approved screen flow

First visit: Welcome → “Try a demo call” → Demo call → “Set up my safety call” → Name and email → Email-code verification → Add trusted contact → Choose and practise code word → Home. Returning users can choose “Log in” on the account screen.

Returning user: Home → “Call me” → her phone rings → she answers and talks on the phone's call screen → “I’m safe” → Session-ended confirmation → Home. How the page shows the active session during the call needs redesign (see Active safety-call screen).

During the active call, code-word alerts, missed-check-in alerts, and contact acknowledgements appear on the page. A call request that fails or cannot be confirmed stays visible, with “Try again” and “Alert my contact”. The 10-second connection limit applied to the in-browser call; the limit for a phone-call request is undecided (see PLAN.md).

### Welcome

Headline: “A voice with you on your walk.”
Under it: “Hear how your AI safety call would sound.”
Button: “Try a demo call” → the labelled demo call screen.
Demo note: “Demo only. No alerts or location sharing.”

### Demo call

Top to bottom: “DEMO CALL” label → animated orb → “Hear the AI conversation.” → “End demo”.
This was designed for the in-browser demo. How the demo works with a real phone call is undecided (see PLAN.md).
After the demo: “Set up my safety call” → account creation or login, then contact and code-word setup.

### Home

For: Starting a real safety call after setup and accessing safety settings.

Top to bottom:

1. “A voice with you on your walk.”
2. One large “Call me” button.
3. “Safety setup ready” when setup is complete; otherwise show the specific missing item.
4. Small links: “Trusted contacts”, “Code word”, and “Try demo”.

Main action: “Call me” → her phone rings → she answers. Answering is the second of four actions.

The private call page shows the orb above “Call me” (builder's choice, 2026-10-07). Whether Home keeps the headline is undecided (see PLAN.md).

```text
┌─────────────────────────────┐
│            HOME             │
│                             │
│  A voice with you           │
│  on your walk.              │
│                             │
│         [ Call me ]         │
│                             │
│  ✓ Safety setup ready       │
│                             │
│  Trusted contacts           │
│  Code word · Try demo       │
└─────────────────────────────┘
              │ tap “Call me”
              ▼
     Phone rings, she answers
              │
              ▼
       Active safety call
              │ “I’m safe”
              ▼
    Session-ended confirmation
              ▼
             Home
```

#### Home states

- **Setup incomplete:** Show the specific missing step, such as “Add a trusted contact”, with “Finish setup”. Do not show “Safety setup ready”.
- **Loading:** “Loading your safety setup…” Keep “Call me” unavailable until the app knows what is ready.
- **Error:** After **10 seconds** without loading successfully, show “Couldn’t load your safety setup”, with “Try again”. Keep a separate “Try demo” option, clearly labelled as a demo.
- **Ready:** Show “Call me”, “Safety setup ready”, and links to trusted contacts, code word, and demo.
- **After a completed session:** “Session ended. Location sharing stopped.” Show any failed contact update separately.

If location permission is missing, show the specific issue and ask for permission when she taps “Call me”. The phone call itself needs no microphone permission in the browser. Do not label everything ready while a required permission is missing.

## 6. Principles

- [a rule that holds on every screen]
- Keep the conversation central and the number of decisions small.
- Identify the voice as AI; do not imply a real person is on the call. On the phone call, this depends on the Sarvam agent's greeting, which has not been checked.
- Use text alongside animation to communicate status.
- Never promise protection, invent location, or give unverified route advice.
- Stopping alone does not mean danger; repeated missed check-ins and the code word have different alert meanings.
- Keep “Alert sent”, delivery confirmation, “Contact acknowledged”, and “Help arrived” separate. Never claim a later stage based only on an earlier one.
- Never announce an alert aloud during the AI call.
- Ask for permissions only when they are needed.
- Confirm safety explicitly; being near home or losing the call does not mean she is safe.
- Keep location sharing limited to the safety session, and stop it when she confirms safety.
