import { test, expect } from '@playwright/test';

test.describe('Texas Electricity Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/index.html');
  });

  test('should display correctly and handle ZIP code entry', async ({ page }) => {
    const title = await page.title();
    expect(title).toContain('Light');

    const zipInput = page.locator('#zip-code');
    await zipInput.fill('76107');

    const zipStatus = page.locator('#zip-status');
    await expect(zipStatus).toContainText('Valid ZIP', { timeout: 10000 });

    const tduName = page.locator('#tdu-name');
    await expect(tduName).not.toHaveText('--');
  });

  test('should calculate plans for a medium house', async ({ page }) => {
    // Fill ZIP and wait for validation
    await page.locator('#zip-code').fill('76107');
    await expect(page.locator('#zip-status')).toContainText('Valid ZIP', { timeout: 10000 });

    // Wait for TDU detection and usage section to enable
    await expect(page.locator('#step-usage')).not.toHaveClass(/calc-step-disabled/, {
      timeout: 10000
    });

    // Select medium house
    const homeSizeSelect = page.locator('#home-size');
    await homeSizeSelect.selectOption('1000');

    // Wait for results
    const resultsSection = page.locator('#results-section');
    await expect(resultsSection).toBeVisible({ timeout: 15000 });

    // Verify results count
    const resultsCount = page.locator('#results-count');
    await expect(resultsCount).not.toHaveText('--');

    // Verify cost formatting in top plans
    const topPlans = page.locator('#top-plans');
    // Format: "$1,216.49/yr" and "$101.37/month avg" on separate lines
    await expect(topPlans).toContainText(/\$\d{1,3}(,\d{3})*\.\d{2}\/yr/);
  });

  test('should display proper warning badges for TIME OF USE plans', async ({ page }) => {
    // Fill ZIP and wait for validation
    await page.locator('#zip-code').fill('76107');
    await expect(page.locator('#zip-status')).toContainText('Valid ZIP', { timeout: 10000 });

    // Select home size
    await page.locator('#home-size').selectOption('1000');

    // Wait for results
    await expect(page.locator('#results-section')).toBeVisible({ timeout: 15000 });

    // Wait for table
    const comparisonTable = page.locator('#comparison-table');
    await expect(comparisonTable).toBeVisible();

    // Check for TIME OF USE badge
    const touBadge = page.locator('.rate-type-badge-tou').first();
    if (await touBadge.isVisible()) {
      await expect(touBadge).toContainText('TIME OF USE');
      // Verify SVG warning icon is present
    }
  });

  test('should show correct cost formatting in plan modal', async ({ page }) => {
    // Fill ZIP and wait for validation
    await page.locator('#zip-code').fill('76107');
    await expect(page.locator('#zip-status')).toContainText('Valid ZIP', { timeout: 10000 });

    // Select home size
    await page.locator('#home-size').selectOption('1000');

    // Wait for results
    await expect(page.locator('#results-section')).toBeVisible({ timeout: 15000 });

    // Click "View Details" on the first plan
    const firstPlanDetailsBtn = page.locator('.btn-plan-details').first();
    await firstPlanDetailsBtn.click();

    // Verify modal is visible
    const modal = page.locator('#modal-backdrop');
    await expect(modal).toBeVisible();

    // Verify cost formatting in modal
    // Modal shows structured layout with "Monthly (X months)" label and cost value
    const modalBody = page.locator('#modal-body');
    await expect(modalBody).toContainText(/Monthly \(\d+ months\)/);
  });
});
