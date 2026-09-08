import { defineConfig, devices } from '@playwright/test';

/**
 * Tests end-to-end du panel Amisache.
 *
 * Le panel pointe sur `https://api.nutito.org` avec une clé API placeholder
 * dans `environment.ts` → pas d'accès réel à l'API depuis la config versionnée.
 * Les specs couvrent donc le socle non authentifié (boot, redirections des
 * guards, page de connexion, validation du formulaire). Le parcours connecté
 * vit dans `e2e/authenticated.spec.ts`, sauté tant que `E2E_EMAIL` /
 * `E2E_PASSWORD` ne sont pas fournis (voir ce fichier).
 *
 * Lancer :  npm run e2e            (ligne de commande + rapport HTML)
 *           npm run e2e:ui         (mode interactif)
 *           npm run e2e:report     (rouvrir le dernier rapport)
 */
const PORT = Number(process.env.E2E_PORT ?? 4200);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Démarre `ng serve` si rien n'écoute déjà sur le port (réutilise sinon).
  webServer: {
    command: `npm run start -- --port ${PORT} --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
