import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Connexion faite UNE fois : l'état (localStorage `auth_*`) est sauvegardé
 * dans `.auth/user.json` et réutilisé par le projet `chromium-auth` →
 * plus de login par test (évite N appels parallèles à l'API distante).
 */
export const STORAGE_STATE = 'e2e/.auth/user.json';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

setup('authenticate', async ({ page, context }) => {
  mkdirSync('e2e/.auth', { recursive: true });

  if (!EMAIL || !PASSWORD) {
    // Pas d'identifiants : on écrit un état vide pour que le projet
    // `chromium-auth` puisse démarrer (ses specs se sautent d'elles-mêmes).
    await context.storageState({ path: STORAGE_STATE });
    setup.skip(true, 'E2E_EMAIL / E2E_PASSWORD non fournis');
    return;
  }

  await page.goto('/auth/login');
  await page.locator('#username').fill(EMAIL);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: /Se connecter/i }).click();
  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 45_000 });
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();

  await context.storageState({ path: STORAGE_STATE });
});
