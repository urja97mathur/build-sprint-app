// A trusted contact's mobile number, as + and country code with digits only.
// Indian numbers may be typed without a country code; any other country needs its + code.
export function normalisePhone(input) {
  let text = String(input ?? '').replace(/[\s().-]/g, '');
  if (text.startsWith('00')) text = `+${text.slice(2)}`;
  const indian = /^(?:\+?91|0)?([6-9]\d{9})$/.exec(text);
  if (indian) return `+91${indian[1]}`;
  return /^\+[1-9]\d{7,14}$/.test(text) && !text.startsWith('+91') ? text : null;
}
