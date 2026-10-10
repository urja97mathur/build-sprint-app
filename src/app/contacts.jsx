import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { normalisePhone } from '../../convex/lib/phone.js';
import { cleanName, MAX_CONTACTS } from '../../convex/lib/setup.js';
import { Field, PersonIcon, Status, TopBar, fieldOf, go, problem, showPhone, withTimeout } from './ui.jsx';

// Chrome on Android can open the phone's contact list; other browsers type the details in.
const canPick = 'contacts' in navigator && 'ContactsManager' in window;

// Setup step 1, or `fromList`: adding another contact from "Trusted contacts".
export function AddContact({ fromList = false, nextStep }) {
  const addContact = useMutation(api.setup.addContact);
  const [mode, setMode] = useState(canPick ? 'choose' : 'form'); // choose → form → saved
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [numbers, setNumbers] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick() {
    setMessage('');
    try {
      const [contact] = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!contact) return; // she closed the list without choosing
      const found = [...new Set((contact.tel ?? []).map(number => number.trim()).filter(Boolean))];
      setName(contact.name?.[0] ?? '');
      setNumbers(found);
      setPhone(found[0] ?? '');
      setErrors(found.length ? {} : { phone: 'This contact has no phone number. Enter one, or choose someone else.' });
    } catch {
      setMessage('Couldn’t open your contacts. Enter their details instead.');
    }
    setMode('form');
  }

  async function save(event) {
    event.preventDefault();
    if (busy || !name.trim() || !phone.trim()) return;
    const problems = {};
    if (!cleanName(name)) problems.name = 'Use 80 characters or fewer.';
    if (!normalisePhone(phone)) problems.phone = 'Check this phone number';
    setErrors(problems);
    if (Object.keys(problems).length) return;
    setMessage('');
    setBusy(true);
    try {
      await withTimeout(addContact({ name, phone }));
      setMode('saved');
    } catch (error) {
      const field = fieldOf(error);
      if (field) setErrors({ [field]: problem(error, 'Check this') });
      else setMessage(problem(error, 'Couldn’t save. Try again.'));
    }
    setBusy(false);
  }

  const heading = (
    <>
      {fromList ? <TopBar to="contacts" /> : <p className="step">Step 1 of 2</p>}
      <h1 className="title">Add trusted contact</h1>
    </>
  );

  if (mode === 'saved') {
    return (
      <main className="ui">
        {heading}
        <Status message="Contact saved. Let them know you’ve chosen them." />
        <button type="button" className="primary" onClick={() => go(fromList ? 'contacts' : nextStep ?? 'home')}>Continue</button>
      </main>
    );
  }

  return (
    <main className="ui">
      {heading}
      <p className="subtitle">They’ll be alerted if you need help.</p>
      {mode === 'choose' ? (
        <div className="actions">
          <button type="button" className="primary" onClick={pick}>Choose from contacts</button>
          <button type="button" className="secondary" onClick={() => setMode('form')}>Enter manually</button>
        </div>
      ) : (
        <>
          <form className="form" onSubmit={save} noValidate>
            <Field id="contact-name" label="Their name" placeholder="e.g. Asha" value={name} onChange={e => setName(e.target.value)}
              error={errors.name} autoComplete="off" maxLength={80} disabled={busy} />
            {numbers.length > 1 && (
              <fieldset className="field choices" disabled={busy}>
                <legend className="label">Which number?</legend>
                {numbers.map(number => (
                  <label key={number} className="choice">
                    <input type="radio" name="number" checked={phone === number} onChange={() => setPhone(number)} /> {number}
                  </label>
                ))}
              </fieldset>
            )}
            <Field id="contact-phone" label="Mobile number" placeholder="+91 98765 43210" type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              error={errors.phone} hint="Include the country code, like +91." autoComplete="off" inputMode="tel" maxLength={20} disabled={busy} />
            <button type="submit" className="primary" disabled={busy || !name.trim() || !phone.trim()}>{busy ? 'Saving…' : 'Save and continue'}</button>
          </form>
          {canPick && (
            <div className="actions">
              <button type="button" className="secondary" disabled={busy} onClick={pick}>Choose from contacts</button>
            </div>
          )}
        </>
      )}
      <Status message={message} error />
    </main>
  );
}

export function ContactList() {
  const contacts = useQuery(api.setup.listContacts);
  return (
    <main className="ui">
      <TopBar to="home" />
      <h1 className="title">Trusted contacts</h1>
      <p className="subtitle">They’ll be alerted if you need help.</p>
      {contacts === undefined ? (
        <Status message="Loading your contacts…" />
      ) : (
        <>
          {contacts.length ? (
            <ul className="rows">
              {contacts.map(contact => (
                <li key={contact.id} className="row">
                  <PersonIcon />
                  <span className="row-text">
                    <span>{contact.name}</span>
                    <span className="row-detail">{showPhone(contact.phone)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No trusted contacts yet.</p>
          )}
          <div className="actions list-actions">
            {contacts.length < MAX_CONTACTS
              ? <button type="button" className="primary" onClick={() => go('add-contact')}>{contacts.length ? 'Add another contact' : 'Add a trusted contact'}</button>
              : <p>You can save up to {MAX_CONTACTS} trusted contacts.</p>}
          </div>
        </>
      )}
    </main>
  );
}
