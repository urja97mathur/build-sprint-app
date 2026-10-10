// Practising the code phrase in the browser. The phone's speech recognition listens here, not Simran,
// so a match here doesn't prove Simran will catch the phrase on a call.

export const Recognition = globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition;

const simplify = text => String(text ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');

function distance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

// How closely what was heard contains the phrase, from 0 to 1, ignoring spaces, capitals and punctuation.
// Lenient on spelling, because speech recognition writes Hinglish words in different ways ("paani", "pani").
export function similarity(phrase, heard) {
  const a = simplify(phrase);
  const b = simplify(heard);
  if (!a || !b) return 0;
  if (b.includes(a)) return 1;
  let best = 1 - distance(a, b) / Math.max(a.length, b.length);
  for (let size = Math.max(1, a.length - 3); size <= a.length + 3; size++) {
    for (let start = 0; start + size <= b.length; start++) {
      best = Math.max(best, 1 - distance(a, b.slice(start, start + size)) / Math.max(a.length, size));
    }
  }
  return best;
}

export const phraseMatches = (phrase, heard) => similarity(phrase, heard) >= 0.75;

// Listens once and resolves with what was heard ({ heard: [...] }) or the browser's error ({ error }).
export function listenOnce(lang = 'en-IN', timeoutMs = 12000) {
  return new Promise(resolve => {
    let settled = false;
    let recognition;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => { recognition?.abort(); finish({ heard: [] }); }, timeoutMs);
    try {
      recognition = new Recognition();
      recognition.lang = lang;
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 5;
      recognition.onresult = event => finish({ heard: Array.from(event.results[0] ?? [], alternative => alternative.transcript) });
      recognition.onerror = event => finish({ error: event.error });
      recognition.onend = () => finish({ heard: [] });
      recognition.start();
    } catch {
      finish({ error: 'unsupported' });
    }
  });
}
