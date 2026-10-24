// Sending email to the owner through Resend's API. The recipient is fixed (MAIL_TO); nothing a visitor types
// ever reaches a header except the Reply-To address, which the contract has already checked is an email.

export interface Mail {
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

export const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export async function sendMail(env: Env, mail: Mail): Promise<boolean> {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.MAIL_TO],
      subject: mail.subject.replace(/[\r\n]+/g, ' ').slice(0, 200),
      text: mail.text,
      html: mail.html,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  return response.ok;
}
