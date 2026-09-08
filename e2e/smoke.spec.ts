import { expect, test } from '@playwright/test';

test.describe('Amorçage & garde de route', () => {
  test('la racine redirige vers /auth/login quand on n\'est pas connecté', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('la page de connexion affiche le formulaire complet', async ({ page }) => {
    await page.goto('/auth/login');

    // Angular Router pose le titre de route (« Connexion »).
    await expect(page).toHaveTitle(/Connexion/i);
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();

    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Se connecter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuer avec Google/i })).toBeVisible();

    // Panneau branding
    await expect(page.getByText('Espace Administration')).toBeVisible();
  });

  test('une route protégée redirige vers la connexion avec returnUrl', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/\/auth\/login\?returnUrl=%2Fusers/);
  });

  test('une route inconnue retombe sur la connexion', async ({ page }) => {
    await page.goto('/chemin/qui-nexiste-pas');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('la page de connexion est servie sans erreur console bloquante', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible();
    expect(errors, `Erreurs JS non gérées: ${errors.join(' | ')}`).toHaveLength(0);
  });
});
