// Copy the email address. The icon turns into a check and screen readers hear it.
export function initCopyEmail() {
  document.querySelectorAll<HTMLElement>('[data-copy]').forEach((button) => {
    const label = button.querySelector('[data-copy-label]');
    const status = button.parentElement?.querySelector('[data-copy-status]');
    const original = label?.textContent ?? '';
    let timer = 0;
    button.addEventListener('click', () => {
      const text = button.getAttribute('data-copy')!;
      const done = () => {
        if (label) label.textContent = 'Copied';
        if (status) status.textContent = 'Email address copied';
        button.classList.add('is-copied');
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (label) label.textContent = original;
          if (status) status.textContent = '';
          button.classList.remove('is-copied');
        }, 2200);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done, () => window.prompt('Copy this email:', text));
      } else {
        window.prompt('Copy this email:', text);
      }
    });
  });
}
