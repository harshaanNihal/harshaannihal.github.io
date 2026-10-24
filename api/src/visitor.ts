// Telling visitors apart without remembering them. Each UTC day gets a random salt in KV that expires minutes
// after the day ends. A visitor is the hash of that salt, the site, the IP address and the browser, so the same
// person counts once per day, and once the salt is gone nothing can link their visits across days or back to
// their IP. The IP is only ever in memory.

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

let cached: { day: string; salt: string } | null = null;

export async function saltFor(kv: KVNamespace, day: string): Promise<string> {
  if (cached?.day === day) return cached.salt;
  const key = `salt:${day}`;
  let salt = await kv.get(key);
  if (!salt) {
    salt = hex(crypto.getRandomValues(new Uint8Array(32)));
    const endOfDay = Date.parse(`${day}T00:00:00Z`) + 86_400_000;
    await kv.put(key, salt, { expiration: Math.floor(endOfDay / 1000) + 300 });
  }
  cached = { day, salt };
  return salt;
}

/* For tests: forget the salt this isolate remembered. */
export const forgetSalt = () => { cached = null; };

export async function visitorId(kv: KVNamespace, day: string, site: string, ip: string, ua: string): Promise<string> {
  const salt = await saltFor(kv, day);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}|${site}|${ip}|${ua}`));
  return hex(digest).slice(0, 16);
}
