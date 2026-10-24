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
  const say: Record<Outcome, string> = {
    sent: "Thanks, your message is on its way. I'll reply by email.",
    invalid: 'Something in the form needs another look. Please check it and send again.',
    limited: `That's several messages in a short time. Please try again in an hour, or email me at ${email}.`,
    error: `It couldn't be sent just now. Please email me at ${email}.`,
  };

  /* For the time trap: a form sent within seconds of appearing is a script, not a person. */
  (form.elements.namedItem('shown') as HTMLInputElement).value = String(Date.now());

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    button.disabled = true;
    status.textContent = 'Sending…';
    delete form.dataset.outcome;
    let outcome: Outcome = 'error';
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new URLSearchParams([...new FormData(form)].map(([k, v]) => [k, String(v)])),
        headers: { Accept: 'application/json' },
      });
      outcome = ((await response.json()) as { outcome?: Outcome }).outcome ?? 'error';
    } catch {
      /* offline, or the API is down: the error message offers the address */
    }
    form.dataset.outcome = outcome;
    status.textContent = say[outcome];
    button.disabled = false;
    if (outcome === 'sent') {
      form.reset();
      (form.elements.namedItem('shown') as HTMLInputElement).value = String(Date.now());
      track('form_sent');
    }
  });
}
