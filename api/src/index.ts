// The portfolio's API on Cloudflare Workers. POST /contact takes a message from the form; POST /e takes an event
// from the page's beacon. Cron jobs roll up and clean the data and send the weekly digest (cron.ts).
import { handleContact } from './contact';
import { scheduled } from './cron';
import { handleEvent } from './events';

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (request.method === 'POST' && pathname === '/contact') return handleContact(request, env, ctx);
    if (request.method === 'POST' && pathname === '/e') return handleEvent(request, env, ctx);
    return new Response('Not found', { status: 404 });
  },
  scheduled,
} satisfies ExportedHandler<Env>;
