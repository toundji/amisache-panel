import { expect, test } from '@playwright/test';

/**
 * Parcours connecté — l'authentification vient du projet `setup`
 * (`auth.setup.ts`), rejouée via `storageState`. Ces specs ne tournent
 * que dans le projet `chromium-auth` et se sautent si aucun identifiant
 * (`E2E_EMAIL` / `E2E_PASSWORD`) n'a été fourni.
 */
const HAS_CREDS = !!process.env.E2E_EMAIL && !!process.env.E2E_PASSWORD;

test.describe('Parcours connecté', () => {
  test.skip(!HAS_CREDS, 'E2E_EMAIL / E2E_PASSWORD non fournis');

  test('le tableau de bord se charge après connexion', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/localhost:\d+\/$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    await expect(page.locator('app-topbar')).toBeAttached();
  });

  const routes: Array<[string, RegExp]> = [
    ['/churches', /Entités ecclésiales/i],
    ['/churches/tree', /Arborescence des entités/i],
    ['/clergy-members', /Clerg[ée]/i],
    ['/liturgy/schedules', /Horaires liturgiques/i],
    ['/liturgy/requests', /Demandes/i],
    ['/liturgy/donations', /Dons/i],
    ['/payment/methods', /Moyens de paiement/i],
    ['/payment/transactions', /Paiements/i],
    ['/community/groups', /Groupes/i],
    ['/community/publications', /Publications/i],
  ];

  for (const [path, heading] of routes) {
    test(`navigation vers ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).not.toHaveURL(/\/auth\/login/);
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible();
    });
  }

  test('la fiche utilisateur montre la carte Sessions & appareils', async ({ page }) => {
    await page.goto('/users');
    const firstUser = page.locator('table tbody a').first();
    await expect(firstUser).toBeVisible();
    await firstUser.click();
    await expect(page).toHaveURL(/\/users\/[0-9a-f-]{8,}/i);
    await expect(page.getByText('Sessions & appareils')).toBeVisible();
  });
});
