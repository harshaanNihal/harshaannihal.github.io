// The contact form, with JavaScript: it sends in place and says what happened. Without JavaScript the browser posts
// the form itself and the API sends the visitor on to /contact/sent/ or /contact/error/.
import { track } from './beacon';

type Outcome = 'sent' | 'invalid' | 'limited' | 'error';

export function initContactForm() {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]')!;
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const email = form.dataset.email;
  /* When the API turns a field down, it names it. */
  const fieldSay: Record<string, string> = {
    name: 'Please add your name.',
    email: "That email address doesn't look complete. Please check it.",
    message: `Your message needs at least ${(form.elements.namedItem('message') as HTMLTextAreaElement).minLength} characters.`,
  };
  const say: Record<Exclude<Outcome, 'sent'>, string> = {
    invalid: 'Something in the form needs another look. Please check it and send again.',
    limited: `That's several messages in a short time. Please try again in an hour, or email me at ${email}.`,
    error: `It couldn't be sent just now. Please email me at ${email}.`,
  };

  /* For the time trap: a form sent within seconds of appearing is a script, not a person. */
  (form.elements.namedItem('shown') as HTMLInputElement).value = String(Date.now());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    button.disabled = true;
    status.textContent = 'Sending…';
    delete form.dataset.outcome;
    let reply: { outcome?: Outcome; field?: string } = {};
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams([...data].map(([k, v]) => [k, String(v)])),
        headers: { Accept: 'application/json' },
      });
      reply = await response.json();
    } catch {
      /* offline, or the API is down: the error message offers the address */
    }
    const outcome = reply.outcome ?? 'error';
    const name = reply.field ?? '';
    const fieldMessage = fieldSay[name];
    const field = fieldMessage ? form.elements.namedItem(name) : null;
    form.dataset.outcome = outcome;
    button.disabled = false;
    if (outcome === 'sent') {
      status.textContent = `Thanks, ${String(data.get('name')).trim()}. It's on its way, and I'll reply to ${data.get('email')}.`;
      form.reset();
      (form.elements.namedItem('shown') as HTMLInputElement).value = String(Date.now());
      track('form_sent');
    } else if (fieldMessage && field instanceof HTMLElement) {
      status.textContent = fieldMessage;
      field.setAttribute('aria-invalid', 'true');
      field.addEventListener('input', () => field.removeAttribute('aria-invalid'), { once: true });
      field.focus();
    } else {
      status.textContent = say[outcome];
    }
  });
}
