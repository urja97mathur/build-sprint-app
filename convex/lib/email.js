// Sign-in codes by email, sent through Resend. The key stays in Convex's environment settings.

export const CODE_MINUTES = 15;
const DEFAULT_FROM = 'Walking companion <onboarding@resend.dev>';

// Six random digits, with no bias towards any digit.
export function newLoginCode() {
  const limit = Math.floor(2 ** 32 / 1e6) * 1e6;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return String(value[0] % 1e6).padStart(6, '0');
}

export async function sendLoginCode(email, code, env, fetcher = fetch, timeoutMs = 10000) {
  if (!env.AUTH_RESEND_KEY?.trim()) throw new Error('Email sending isn’t set up yet.');
  const response = await fetcher('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AUTH_RESEND_KEY.trim()}` },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM?.trim() || DEFAULT_FROM,
      to: [email],
      subject: `${code} is your Walking companion code`,
      text: `Your code is ${code}. It expires in ${CODE_MINUTES} minutes.\n\nIf you didn’t ask for this code, you can ignore this email.`,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    // Only the status code goes to the Convex logs: never the address, the code, or Resend's reply.
    console.error(`Resend refused the sign-in email (${response.status}).`);
    throw new Error('Couldn’t send the code.');
  }
}
