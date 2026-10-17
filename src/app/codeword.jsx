import { useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { cleanPhrase } from '../../convex/lib/setup.js';
import { Recognition, listenOnce, phraseMatches } from './practice.js';
import {
  AlertIcon, Back, CheckIcon, ChevronLeft, Field, LockIcon, MicIcon, Note, Spinner, StepBar, Top, TimeoutError, WaveIcon,
  go, problem, withTimeout,
} from './ui.jsx';

// The practice screen for each state: the disc, the words, and what the buttons do.
const PRACTICE = {
  say: { disc: 'd-call', Icon: MicIcon, title: 'Say your phrase now.', text: 'Speak as you would on a call.' },
  listening: { disc: 'd-listen', Icon: WaveIcon, title: 'Listening…' },
  recognised: { disc: 'd-ok', Icon: CheckIcon, title: 'Got it. We heard your phrase.', text: 'Simran listens for this phrase on your calls.' },
  missed: { disc: 'd-bad', Icon: AlertIcon, title: 'We didn’t catch that.', text: 'Try again a little closer to your phone.' },
  microphone: { disc: 'd-bad', Icon: AlertIcon, title: 'We couldn’t use your microphone.', text: 'Allow it for this page in your browser’s settings, then try again.' },
  network: { disc: 'd-bad', Icon: AlertIcon, title: 'Couldn’t reach speech recognition.', text: 'Check your connection and try again.' },
};

// Setup step 2. Chosen once, and saved only after a successful practice (AGENTS.md). Practice uses the phone's
// browser, not Simran, and never sends an alert.
export function CodeWord({ contactName }) {
  const savePhrase = useMutation(api.setup.saveCodePhrase);
  const [phrase, setPhrase] = useState('');
  const [state, setState] = useState(Recognition ? 'choose' : 'unsupported');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const listening = useRef(null);
  const clean = cleanPhrase(phrase);
  const contact = contactName || 'your trusted contact';

  async function practise() {
    if (!clean || state === 'say' || state === 'listening') return;
    setSaveMessage('');
    setState('say');
    listening.current = new AbortController();
    const result = await listenOnce({ onSpeech: () => setState('listening'), signal: listening.current.signal });
    if (result.cancelled) return;
    if (result.error) {
      if (['not-allowed', 'audio-capture'].includes(result.error)) setState('microphone');
      else if (['service-not-allowed', 'language-not-supported', 'unsupported'].includes(result.error)) setState('unsupported');
      else if (result.error === 'network') setState('network');
      else setState('missed');
      return;
    }
    setState(result.heard.some(heard => phraseMatches(clean, heard)) ? 'recognised' : 'missed');
  }

  function backToPhrase() {
    listening.current?.abort();
    setState('choose');
  }

  async function save() {
    if (saving || state !== 'recognised') return;
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

  const view = PRACTICE[state];
  if (view) {
    const { Icon } = view;
    return (
      <main className="screen">
        <Top back={<button type="button" className="icon-btn" aria-label="Back to your phrase" disabled={saving} onClick={backToPhrase}><ChevronLeft /></button>}
          right={<StepBar step={2} />} />
        <p className="step">Step 2 of 2 · practise</p>
        <div className="phrase">“{clean}”</div>
        <div className="center">
          <div className={`disc ${view.disc}`}><Icon /></div>
          <p className="st" role={view.disc === 'd-bad' ? 'alert' : 'status'}>{view.title}</p>
          {view.text && <p className="sub">{view.text}</p>}
        </div>
        {saveMessage && <Note kind="bad">{saveMessage}</Note>}
        {state === 'say' || state === 'listening' ? (
          <button type="button" className="btn2" onClick={backToPhrase}>Cancel</button>
        ) : state === 'recognised' ? (
          <div className="stack">
            <button type="button" className={`btn${saving ? ' busy' : ''}`} onClick={save} disabled={saving} aria-busy={saving}>
              {saving && <Spinner light />}{saving ? 'Saving…' : 'Save phrase'}
            </button>
            <p className="link"><button type="button" className="text-link" disabled={saving} onClick={practise}>Practise again</button></p>
          </div>
        ) : (
          <div className="stack">
            <button type="button" className="btn" onClick={practise}><MicIcon />Try again</button>
            <p className="link"><button type="button" className="text-link" onClick={backToPhrase}>Change phrase</button></p>
          </div>
        )}
      </main>
    );
  }

  return (
    <form className="screen" onSubmit={event => { event.preventDefault(); practise(); }} noValidate>
      <Top right={<StepBar step={2} />} />
      <p className="step">Step 2 of 2</p>
      <h1 className="h-md">Choose your code phrase.</h1>
      <p className="sub">Say it during a call and we’ll quietly alert {contact}. Simran won’t mention it.</p>
      <Field id="phrase" label="Your code phrase" placeholder="e.g. Did you water the plants?" value={phrase}
        onChange={event => setPhrase(event.target.value)} autoComplete="off" autoCapitalize="off" maxLength={60}
        hint="Pick something you’d say naturally on a phone call. You can’t change it later." />
      {state === 'unsupported' && (
        <Note>Practice isn’t available in this browser. Open this link in Chrome to practise and save your phrase.</Note>
      )}
      <div className="grow" />
      <button type="submit" className="btn" disabled={!clean || state === 'unsupported'}><MicIcon />Practise saying it</button>
    </form>
  );
}

// Home → Code word, once it's saved: hidden, and it can't be changed.
export function CodeWordSaved({ contactName }) {
  return (
    <main className="screen">
      <Top back={<Back to="home" label="Back to home" />} />
      <h1 className="h-md">Code word.</h1>
      <p className="sub">Say it during a call and we’ll quietly alert {contactName || 'your trusted contact'}.</p>
      <div className="vault">
        <div className="lock"><LockIcon /></div>
        <p className="dots" aria-label="Code word hidden">••••••••••</p>
        <span className="saved"><CheckIcon />Saved</span>
      </div>
      <Note live={false}>Your code word is saved and can’t be changed. It stays hidden so no one can read it over your shoulder.</Note>
    </main>
  );
}
