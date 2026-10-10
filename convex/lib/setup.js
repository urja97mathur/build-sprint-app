// Rules for her safety setup, shared by the server and the setup pages.

export const MAX_CONTACTS = 10;

export function cleanName(input) {
  const name = String(input ?? '').trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= 80 ? name : null;
}

export function cleanPhrase(input) {
  const phrase = String(input ?? '').trim().replace(/\s+/g, ' ');
  return phrase.length >= 3 && phrase.length <= 60 ? phrase : null;
}

// The first missing setup step, in DESIGN.md's order, or null when setup is ready.
export function nextStep({ name, contacts, codeWordSaved }) {
  if (!name) return 'name';
  if (!contacts) return 'contact';
  if (!codeWordSaved) return 'codeword';
  return null;
}
