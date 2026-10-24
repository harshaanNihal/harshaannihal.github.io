// Secrets, set with `wrangler secret put` (and api/.dev.vars locally). Both optional: without them the API still
// stores messages and events, and only the emails are skipped.
interface Env {
  RESEND_API_KEY?: string;
  MAIL_TO?: string;
}

declare namespace Cloudflare {
  interface Env {
    RESEND_API_KEY?: string;
    MAIL_TO?: string;
    /** Only in tests: the migrations, read by vitest.config.ts. */
    TEST_MIGRATIONS?: import('cloudflare:test').D1Migration[];
  }
}
