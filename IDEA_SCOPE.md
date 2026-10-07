The current test, in one line: Tap “Call me” on a private page → Sarvam calls her phone → she answers and talks to the existing AI agent. The builder authorized this narrow outbound-call test on 2026-10-06; earlier browser-orb details below are deferred for this test. It has no location sharing or alerts yet.

Why me: I'm the user. After work night is often the only time I have to run. Most nights I don't go, because I'm scared to go alone. When I have gone and felt unsafe, I called my parents, but they were in a different city and couldn't have done anything. Every safety app I've seen only guarantees that someone knows if something bad happens. None of them tries to stop it. I've also been a PM for five and a half years and took a consumer app to 100K+ downloads, so I know how to get this in front of people.

GOAL

The job: When I’m walking alone late at night or early in the morning and notice someone following me or a group of boys staring at me from a distance, I want someone with me who knows where I am and can get help if I need it, so I can run errands after work, go for a night run, or stay out late with friends without having to cut back on my plans.

The one goal they hire it for: Life. "I want to go out alone at night and not give things up because of fear."

Action count: Five actions today: try calling someone; if they don’t answer, try someone else or pretend to be on a call; message a trusted person about what is happening; look for nearby help or cut the walk short; confirm arrival safely. Three with my product: tap “Call me”, say the code word if needed, and confirm “I’m safe”.

The sin it rides: Wrath for the launch, because anger at unsafe streets is widely shared. Pride later, with "I did my night run."

USER

The trigger: She's alone on foot after dark on an empty or badly lit stretch and senses someone behind her. An earlier moment matters too: at home around 9 PM, deciding whether to go at all.

Today's path, step by step: She walks faster, crosses the road or steps into a shop. She fakes a call or rings someone to stay on the line. She shares WhatsApp live location if she has a free hand. She texts "reached" at home. Afterwards she avoids that road, takes a cab, or stops going out at that hour, which is not solving it at all.

Who they trust on this decision: Friends, flatmates and colleagues like her, her running group, and the family members who worry about her.

Would they pay? Few women pay for safety apps, but they pay for the problem: cab fares for walkable distances, gym memberships instead of running outside, pepper spray, and family location apps like Life360. SoundSafe charges about $2 a month for AI fake calls.

PRODUCT

Call format:

- Original idea (future option, not v1): Tap "Call me" → her phone rings → she answers an incoming phone call.
- Current v1: Tap "Call me" → a ringtone plays inside the page for two seconds while connecting → the blue-orb AI conversation starts automatically once connected. No “Answer” tap and no incoming phone call. If it is not connected after the ring, show “Connecting…”; after 10 seconds from the tap, show the connection error. Ringtone playback and audibility still need phone testing.

Start with a phone-browser page on the project's .convex.site link. Voice and location with the screen locked still need testing; do not assume they work.

Onboarding: She tries the labelled demo voice conversation inside the page before signing up. The demo does not share location or send alerts. After the demo, she creates an account, adds a trusted contact, and chooses and practises a code word. Practice sends no alerts. See PRODUCT.md and DESIGN.md for the approved setup flow.

The core loop:

I'm on an empty stretch and I can feel someone behind me. I tap “Call me” to start my safety session. A ringtone plays inside the page for two seconds while connecting. After the ring, the blue-orb AI conversation starts automatically once connected, without another tap. If it is not ready, the screen shows “Connecting…” rather than pretending the call is connected. The AI must not invent my location or give unverified route advice.

He's still there. I say my code word or tap “Alert my contact” if I can't speak. My trusted contacts receive an emergency SMS with my latest available location. If automatic sending fails, I can open a prepared SMS and send it myself; opening SMS is not proof it was sent.

The screen quietly shows the confirmed alert status. The AI never announces the alert aloud. A contact can acknowledge they are responding; this does not mean help has arrived. If nobody responds, the app tries my next saved contact, if any.

An unexpected stop prompts a check-in. Repeated missed check-ins send a check-on-me alert with my latest available location; a stop alone does not mean an emergency.

I reach safety and tap “I’m safe”. The call, safety session, and location sharing end, and alerted contacts receive a safety update. Ending only the call keeps the safety session active, with “Call me” and “I’m safe” visible.

Coming back: "Reached safely" replaces the text I already send. A nudge at my usual time. A weekly count of nights out.

The AI-first part: Onboarding. The companion sets her up through a spoken conversation, then writes and stores call scripts in her language so the on-street call works offline.

MARKET

Tailwinds: Realistic voice AI is now cheap, including Hindi and Indian accents. iPhone Check In and Android safety features have normalised check-ins. In a 2020 YouGov survey, 52% of urban Indian women felt unsafe walking alone at night and 56% stayed in.

Competitors: The one to beat is calling a real person, who may not pick up or may be in another city. WhatsApp live location needs hands and data. Safetipin is for planning, not the moment. SoundSafe does AI fake calls but is iPhone only, with no location and no alert. Walk With Me AI is the closest concept. Flows I liked: SoundSafe saving the caller as a real contact, and WhatsApp's no-install viewing.

Size and fit: more than 100 women
