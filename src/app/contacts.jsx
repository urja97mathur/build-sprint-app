import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { normalisePhone } from '../../convex/lib/phone.js';
import { cleanName, MAX_CONTACTS } from '../../convex/lib/setup.js';
import {
  Back, CheckIcon, ChevronLeft, Field, Note, PencilIcon, PersonIcon, PlusIcon, StepBar, Top,
  fieldOf, go, nationalPart, problem, showPhone, withTimeout,
} from './ui.jsx';

// Chrome on Android can open the phone's contact list; other browsers type the details in.
const canPick = 'contacts' in navigator && 'ContactsManager' in window;
const initial = name => (String(name ?? '').trim()[0] ?? '?').toUpperCase();
// A number from her phone's contacts, as the +91 field shows it ("98765 43210"), or as written if it isn't Indian.
const forField = number => nationalPart(normalisePhone(number)) || number;

// Setup step 1, or `fromList`: adding another contact from "Trusted contacts".
// choose (how to add) → form (name and number; "Which number?" sheet if the contact has several) → saved.
export function AddContact({ fromList = false, nextStep }) {
  const addContact = useMutation(api.setup.addContact);
  const [mode, setMode] = useState(canPick ? 'choose' : 'form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [numbers, setNumbers] = useState([]); // several numbers from one contact: she picks one in the sheet
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  async function pick() {
    setMessage('');
    try {
      const [contact] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!contact) return; // she closed the list without choosing
      const found = [...new Set((contact.tel ?? []).map(number => number.trim()).filter(Boolean))];
      setName(contact.name?.[0] ?? '');
      setPhone(forField(found[0] ?? ''));
      setNumbers(found.length > 1 ? found : []);
      setErrors(found.length ? {} : { phone: 'This contact has no phone number. Enter one, or choose someone else.' });
    } catch {
      setMessage('Couldn’t open your contacts. Enter their details instead.');
    }
    setMode('form');
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !name.trim() || !phone.trim()) return;
    // What she typed after the fixed +91 (or a whole number with its own + code, from her phone's contacts).
    const full = normalisePhone(phone) ?? normalisePhone(`+91${phone.trim().replace(/^0+/, '')}`);
    const problems = {};
    if (!cleanName(name)) problems.name = 'Use 80 characters or fewer.';
    if (!full) problems.phone = 'Check this phone number';
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setMessage('');
    setBusy(true);
    try {
      await withTimeout(addContact({ name, phone: full }));
      setSaved({ name: cleanName(name), phone: full });
      setMode('saved');
    } catch (error) {
      const field = fieldOf(error);
      if (field) setErrors({ [field]: problem(error, 'Check this') });
      else setMessage(problem(error, 'Couldn’t save. Try again.'));
    }
    setBusy(false);
  }

  // From the form, back goes to the two ways to add; otherwise back to the list (or nowhere, in setup).
  const back = mode === 'form' && canPick
    ? <button type="button" className="icon-btn" aria-label="Back" onClick={() => setMode('choose')}><ChevronLeft /></button>
    : fromList ? <Back to="contacts" label="Back to trusted contacts" /> : null;
  const top = <Top back={back} right={fromList ? null : <StepBar step={1} />} />;
  const heading = (
    <>
      {!fromList && <p className="step">Step 1 of 2</p>}
      <h1 className="h-md">{fromList ? 'Add another contact.' : 'Add a trusted contact.'}</h1>
    </>
  );

  if (mode === 'saved') {
    return (
      <main className="screen">
        <Top right={fromList ? null : <StepBar step={1} />} />
        <div className="center">
          <div className="done"><CheckIcon /></div>
          <h1 className="h-md">Contact saved.</h1>
          <p className="sub">Let {saved.name} know you’ve chosen them, so an alert from us won’t surprise them.</p>
          <div className="card"><span className="av">{initial(saved.name)}</span><span>{saved.name}<small>{showPhone(saved.phone)}</small></span></div>
        </div>
        <button type="button" className="btn" onClick={() => go(fromList ? 'contacts' : nextStep ?? 'home')}>{fromList ? 'Done' : 'Continue'}</button>
      </main>
    );
  }

  if (mode === 'choose') {
    return (
      <main className="screen">
        {top}
        {heading}
        <p className="sub">{fromList ? 'Alerts go to your first contact for now.' : 'Someone we can alert if you ever need help on a walk.'}</p>
        <div className="opts">
          <button type="button" className="opt" onClick={pick}>
            <span className="ic"><PersonIcon /></span><span><b>Choose from contacts</b><small>Pick someone from your phone</small></span>
          </button>
          <button type="button" className="opt" onClick={() => setMode('form')}>
            <span className="ic"><PencilIcon /></span><span><b>Enter manually</b><small>Type a name and number</small></span>
          </button>
        </div>
        {message && <Note kind="bad">{message}</Note>}
      </main>
    );
  }

  return (
    <form className="screen" onSubmit={save} noValidate>
      {top}
      {heading}
      <Field id="contact-name" label="Their name" placeholder="e.g. Asha" value={name} onChange={e => setName(e.target.value)}
        error={errors.name} autoComplete="off" maxLength={80} disabled={busy} />
      <Field id="contact-phone" label="Their mobile number" prefix="+91" type="tel" inputMode="tel" placeholder="98765 43210" maxLength={20}
        value={phone} onChange={e => setPhone(e.target.value)} error={errors.phone} autoComplete="off" disabled={busy} />
      {message && <Note kind="bad">{message}</Note>}
      <div className="grow" />
      <button type="submit" className="btn" disabled={busy || !name.trim() || !phone.trim()}>{busy ? 'Saving…' : 'Save contact'}</button>
      {numbers.length > 1 && (
        <>
          <div className="scrim" />
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="which-number">
            <div className="grab" />
            <h2 id="which-number">Which number for {name || 'them'}?</h2>
            <p className="sub">Pick the one they always pick up.</p>
            {numbers.map(number => (
              <label key={number} className="choice">
                <input type="radio" name="number" checked={phone === forField(number)} onChange={() => setPhone(forField(number))} />
                <span>{showPhone(normalisePhone(number) ?? number)}</span>
              </label>
            ))}
            <button type="button" className="btn" onClick={() => setNumbers([])}>Use this number</button>
          </div>
        </>
      )}
    </form>
  );
}

export function ContactList() {
  const contacts = useQuery(api.setup.listContacts);
  return (
    <main className="screen">
      <Top back={<Back to="home" label="Back to home" />} />
      <h1 className="h-md">Trusted contacts.</h1>
      <p className="sub">We alert your first contact if you need help on a walk.</p>
      {contacts === undefined ? (
        <p className="sub" role="status">Loading your contacts…</p>
      ) : contacts.length ? (
        <ul className="people">
          {contacts.map(contact => (
            <li key={contact.id} className="person">
              <span className="av">{initial(contact.name)}</span>
              <span>{contact.name}<small>{showPhone(contact.phone)}</small></span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="sub">No trusted contacts yet.</p>
      )}
      <div className="grow" />
      {contacts !== undefined && (contacts.length < MAX_CONTACTS
        ? <button type="button" className="btn2" onClick={() => go('add-contact')}><PlusIcon />{contacts.length ? 'Add another contact' : 'Add a trusted contact'}</button>
        : <p className="fine">You can save up to {MAX_CONTACTS} trusted contacts.</p>)}
    </main>
  );
}
