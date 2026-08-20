const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('filters contacts and reports the visible result count', async ({ page }) => {
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');

  await expect(page.locator('#searchStatus')).toHaveText('2 contacts found.');
  await expect(page.locator('.collection-item:not([hidden]) .contact-name')).toHaveCount(2);
  await expect(page.locator('.collection-item:not([hidden]) mark')).toHaveCount(2);
  await expect(page).toHaveURL(/\?q=chris$/);
});

test('focuses search with the slash keyboard shortcut', async ({ page }) => {
  await page.keyboard.press('/');

  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toBeFocused();
});

test('persists favorites and edited custom contacts', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was added.');

  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove Zara from favorites' })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was updated to Maria.');

  await page.reload();
  await expect(page.getByText('Maria', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Maria from favorites' })).toBeVisible();
  await expect(page.getByText('Zara', { exact: true })).toHaveCount(0);
});

test('cancels a custom contact edit without changing the contact', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByText('Maria', { exact: true })).toHaveCount(0);
  await expect(page.locator('#addContactStatus')).toHaveText('Editing Zara was canceled.');
  await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
});

test('cancels contact editing with the Escape key', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Zara' }).click();
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByLabel('Add a contact').press('Escape');

  await expect(page.getByLabel('Add a contact')).toHaveValue('');
  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.locator('#addContactStatus')).toHaveText('Editing Zara was canceled.');
});

test('keeps letter sections alphabetized when a new section is added', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Maria');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.locator('.collection-header h5')).toHaveText(['A', 'B', 'C', 'D', 'M', 'V']);
});

test('finds contacts without requiring accent marks', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('José');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('jose');

  await expect(page.locator('.collection-item:not([hidden]) .contact-name')).toHaveText(['José']);
  await expect(page.locator('#searchStatus')).toHaveText('1 contact found.');
});

test('normalizes saved contacts and ignores invalid entries', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem(
      'mini-contact-app.custom-contacts',
      JSON.stringify(['  Zara   Jane  ', 'ZARA JANE', 'x'.repeat(61), 42]),
    );
  });
  await page.reload();

  await expect(page.getByText('Zara Jane', { exact: true })).toHaveCount(1);
  await expect(page.locator('[data-custom="true"]')).toHaveCount(1);
});

test('shows how many custom contacts are saved', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  await expect(page.locator('#savedContactStatus')).toHaveText('No custom contacts saved.');

  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#savedContactStatus')).toHaveText('1 custom contact saved.');

  await page.getByRole('button', { name: 'Remove Zara' }).click();
  await expect(page.locator('#savedContactStatus')).toHaveText('No custom contacts saved.');
});

test('offers to reset filters when no contacts match', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('not-a-contact');

  await expect(page.locator('#emptyState')).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();

  await expect(page.locator('#emptyState')).toBeHidden();
  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
  await expect(page.getByRole('searchbox', { name: 'Search contacts' })).toBeFocused();
});

test('shows the number of favorite contacts in the filter', async ({ page }) => {
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (0)');

  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (1)');

  await page.locator('#favoritesOnly').click();
  await expect(page.locator('#favoritesOnly')).toHaveText('Show all (1 favorite)');
});
