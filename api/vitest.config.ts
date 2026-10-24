// Tests run inside workerd, the Workers runtime, with a local D1 and KV built from wrangler.jsonc.
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations');
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, RESEND_API_KEY: 'test-key', MAIL_TO: 'owner@example.com' } },
      }),
    ],
    test: { setupFiles: ['./test/setup.ts'] },
  };
});
