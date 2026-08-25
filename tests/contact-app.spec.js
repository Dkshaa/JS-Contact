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

  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();
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

test('shows the contact name character count', async ({ page }) => {
  await expect(page.locator('#contactNameCount')).toHaveText('0 of 60 characters');

  await page.getByLabel('Add a contact').fill('Zara');
  await expect(page.locator('#contactNameCount')).toHaveText('4 of 60 characters');

  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#contactNameCount')).toHaveText('0 of 60 characters');
});

test('restores a removed custom contact with undo', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();

  await expect(page.getByText('Zara', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo remove' }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Zara from favorites' })).toBeVisible();
  await expect(page.locator('#addContactStatus')).toHaveText('Zara was restored.');
});

test('toggles the favorites filter with Alt+F', async ({ page }) => {
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await page.keyboard.press('Alt+f');

  await expect(page.locator('#favoritesOnly')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#favoritesOnly')).toBeFocused();
  await expect(page.locator('#searchStatus')).toHaveText('Showing 1 favorite contact.');
});

test('restores saved favorites without case sensitivity', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('mini-contact-app.favorite-contacts', JSON.stringify(['anna']));
  });
  await page.reload();

  await expect(page.getByRole('button', { name: 'Remove Anna from favorites' })).toBeVisible();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (1)');
});

test('groups accented and non-alphabetic contact names predictably', async ({ page }) => {
  for (const name of ['123 Services', 'Élodie']) {
    await page.getByLabel('Add a contact').fill(name);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
  }

  await expect(page.locator('.collection-header h5')).toHaveText([
    '#', 'A', 'B', 'C', 'D', 'E', 'V',
  ]);
});

test('clears favorites without removing custom contacts', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Add Zara to favorites' }).click();
  await page.getByText('Backup and restore').click();
  await page.getByRole('button', { name: 'Clear favorites', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm clear favorites' }).click();

  await expect(page.getByText('Zara', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add Zara to favorites' })).toBeVisible();
  await expect(page.locator('#favoritesOnly')).toHaveText('Favorites (0)');
  await expect(page.locator('#dataStatus')).toHaveText(
    'All favorites were cleared. Custom contacts were kept.',
  );
});

test('synchronizes the native search clear action', async ({ page }) => {
  const search = page.getByRole('searchbox', { name: 'Search contacts' });

  await search.fill('chris');
  await search.evaluate((input) => {
    input.value = '';
    input.dispatchEvent(new Event('search'));
  });

  await expect(page.locator('#searchStatus')).toHaveText('Showing all 25 contacts.');
  await expect(page).not.toHaveURL(/\?q=/);
});

test('shows filtered result counts in the browser tab title', async ({ page }) => {
  await expect(page).toHaveTitle('My Contacts');

  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await expect(page).toHaveTitle('2 found — My Contacts');

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page).toHaveTitle('My Contacts');
});

test('enables the clear favorites action only when needed', async ({ page }) => {
  await page.getByText('Backup and restore').click();
  const clearFavorites = page.getByRole('button', { name: 'Clear favorites', exact: true });

  await expect(clearFavorites).toBeDisabled();
  await page.getByRole('button', { name: 'Add Anna to favorites' }).click();
  await expect(clearFavorites).toBeEnabled();
});

test('discards stale undo actions when saved data is cleared', async ({ page }) => {
  await page.getByLabel('Add a contact').fill('Zara');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Zara', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo remove' })).toBeVisible();

  await page.getByText('Backup and restore').click();
  await page.getByRole('button', { name: 'Clear saved data' }).click();
  await page.getByRole('button', { name: 'Confirm clear' }).click();

  await expect(page.getByRole('button', { name: 'Undo remove' })).toBeHidden();
});

test('copies a shareable link with the active filters', async ({ page }) => {
  await page.evaluate(() => {
    window.copiedContactLink = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedContactLink = value;
        },
      },
    });
  });
  await page.getByRole('searchbox', { name: 'Search contacts' }).fill('chris');
  await page.getByRole('button', { name: 'Copy link' }).click();

  await expect(page.locator('#shareStatus')).toHaveText('Filtered contact link copied.');
  await expect.poll(() => page.evaluate(() => window.copiedContactLink)).toBe(page.url());
});

test('toggles contact sections between ascending and descending order', async ({ page }) => {
  const headers = page.locator('.collection-header h5');

  await expect(headers.first()).toHaveText('A');
  await expect(headers.last()).toHaveText('V');
  await page.getByRole('button', { name: 'Order: A–Z' }).click();

  await expect(headers.first()).toHaveText('V');
  await expect(headers.last()).toHaveText('A');
  await expect(page.getByRole('button', { name: 'Order: Z–A' })).toBeVisible();
});
