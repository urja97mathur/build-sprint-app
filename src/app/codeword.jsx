import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { cleanPhrase } from '../../convex/lib/setup.js';
import { Recognition, listenOnce, phraseMatches } from './practice.js';
import { Field, Status, TimeoutError, go, problem, withTimeout } from './ui.jsx';

const UNSUPPORTED = 'Practice doesn’t work in this browser. Open this link in Chrome or Safari to practise.';
const MESSAGES = {
  listening: { text: 'Say your phrase now.' },
  recognised: { text: 'Phrase recognised. In a real safety call, this would trigger an emergency alert.' },
  missed: { text: 'We didn’t catch that. Try again or change your phrase.', error: true },
  microphone: { text: 'We couldn’t use your microphone. Allow it for this page in your browser’s settings, then try again.', error: true },
  network: { text: 'Couldn’t reach speech recognition. Check your connection and try again.', error: true },
  unsupported: { text: UNSUPPORTED, error: true },
};

// Setup step 2. Chosen once and practised before saving. Practice never sends an alert.
export function CodeWord() {
  const savePhrase = useMutation(api.setup.saveCodePhrase);
  const [phrase, setPhrase] = useState('');
  const [state, setState] = useState(Recognition ? 'idle' : 'unsupported');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const clean = cleanPhrase(phrase);
  const recognised = state === 'recognised';

  function change(value) {
    setPhrase(value);
    setSaveMessage('');
    // A changed phrase needs a fresh practice.
    if (state !== 'unsupported') setState('idle');
  }

  async function practise() {
    if (!clean || state === 'listening') return;
    setState('listening');
    const result = await listenOnce();
    if (result.error) {
      if (['not-allowed', 'audio-capture'].includes(result.error)) setState('microphone');
      else if (['service-not-allowed', 'language-not-supported', 'unsupported'].includes(result.error)) setState('unsupported');
      else if (result.error === 'network') setState('network');
      else setState('missed');
      return;
    }
    setState(result.heard.some(heard => phraseMatches(clean, heard)) ? 'recognised' : 'missed');
  }

  async function save() {
    if (saving || !recognised) return;
    setSaving(true);
    setSaveMessage('');
    try {
      await withTimeout(savePhrase({ phrase: clean, practised: true }));
      go('home', { replace: true });
    } catch (error) {
      setSaveMessage(error instanceof TimeoutError
        ? 'We couldn’t confirm your code phrase was saved. Try again.'
        : problem(error, 'Couldn’t save your phrase. Try again.'));
      setSaving(false);
    }
  }

  const status = saveMessage ? { text: saveMessage, error: true } : saving ? { text: 'Saving your phrase…' } : MESSAGES[state] ?? { text: '' };
  return (
    <main className="ui">
      <p className="step">Step 2 of 2</p>
      <h1 className="title">Choose your code phrase</h1>
      <p className="subtitle">Say this to your AI companion if you need help.</p>
      <Field id="phrase" label="Your code phrase" hiddenLabel placeholder="e.g. sunflower" value={phrase} onChange={e => change(e.target.value)}
        autoComplete="off" autoCapitalize="off" maxLength={60} disabled={saving || state === 'listening'} />
      <p className="warning">You can’t change it later.</p>
      {recognised ? (
        <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save and finish'}</button>
      ) : (
        <button type="button" className="secondary" onClick={practise} disabled={!clean || state === 'listening' || state === 'unsupported'}>
          {state === 'listening' ? 'Listening…' : 'Practise phrase'}
        </button>
      )}
      <Status message={status.text} error={status.error} />
      <p className="note center">Practice sends no alerts.</p>
    </main>
  );
}
