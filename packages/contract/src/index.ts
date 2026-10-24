// What the site sends the API: a contact message from the form, and an analytics event from the beacon. The form,
// the beacon and the API all read these, so a field can't be renamed on one side only.
import { z } from 'zod';

/* The form's limits, also used for the inputs' maxlength and minlength. */
export const limits = {
  name: 100,
  email: 200,
  messageMin: 10,
  message: 5000,
} as const;

export const contactMessage = z.object({
  name: z.string().trim().min(1).max(limits.name),
  email: z.email().max(limits.email),
  message: z.string().trim().min(limits.messageMin).max(limits.message),
  /** The honeypot: hidden from people, so only a bot fills it in. */
  website: z.string().optional(),
  /** When the form was shown (ms since the epoch), set by the page script for the time trap. Empty without
      JavaScript, which is fine. */
  shown: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),
});

export type ContactMessage = z.infer<typeof contactMessage>;

/* What happened on the page. "leave" carries how long the page was open; "email_click" is a click on a mailto link. */
export const eventNames = ['view', 'leave', 'case_open', 'email_click', 'email_copy', 'form_sent', 'outbound', 'theme'] as const;

export const pageEvent = z.object({
  name: z.enum(eventNames),
  /** The page path, such as / or /blog/. */
  path: z.string().startsWith('/').max(200),
  /** document.referrer; the API keeps only its host. */
  referrer: z.string().max(500).optional(),
  /** location.search, for campaign tags (utm_*) and ref tags. */
  query: z.string().max(500).optional(),
  /** The viewport's width in CSS pixels; the API keeps only a bucket. */
  width: z.number().int().min(0).max(20000).optional(),
  /** For "leave": how long the page was open, in ms. */
  duration: z.number().int().min(0).max(86_400_000).optional(),
  /** What the event was about: a case study's id, a link's host, the theme picked. */
  detail: z.string().max(100).optional(),
});

export type PageEvent = z.infer<typeof pageEvent>;
