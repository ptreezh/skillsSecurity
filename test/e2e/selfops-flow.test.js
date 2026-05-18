/**
 * SelfOpsPanel E2E Tests
 * Tests for four-self system integration
 */

import { test, expect } from '@playwright/test';

test.describe('四自运营系统流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('should display four-self panel', async ({ page }) => {
    // Navigate to four-self panel
    await page.click('text=四自系统');

    // Verify panel loads
    await expect(page.locator('.self-ops-panel')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.tabs')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.click('text=四自系统');

    // Click promotion tab
    await page.click('.tab >> text=自推广追踪');
    await expect(page.locator('.promotion-tab')).toBeVisible();

    // Click governance tab
    await page.click('.tab >> text=自进化治理');
    await expect(page.locator('.governance-tab')).toBeVisible();

    // Click health tab
    await page.click('.tab >> text=自运维激励');
    await expect(page.locator('.health-tab')).toBeVisible();

    // Click revenue tab
    await page.click('.tab >> text=自运营收益');
    await expect(page.locator('.revenue-tab')).toBeVisible();
  });

  test('should display revenue data', async ({ page }) => {
    await page.click('text=四自系统');

    // Verify stats cards exist
    await expect(page.locator('.stat-card')).toHaveCount(2, { timeout: 5000 });
    await expect(page.locator('.tier-benefits')).toBeVisible();
  });

  test('should display health action cards', async ({ page }) => {
    await page.click('text=四自系统');
    await page.click('.tab >> text=自运维激励');

    // Verify action cards with rewards
    await expect(page.locator('.action-card')).toHaveCount(3);
    await expect(page.locator('text=+50 ASK')).toBeVisible();
    await expect(page.locator('text=+10 ASK')).toBeVisible();
    await expect(page.locator('text=+100 ASK')).toBeVisible();
  });

  test('should show governance voting power', async ({ page }) => {
    await page.click('text=四自系统');
    await page.click('.tab >> text=自进化治理');

    // Verify voting power section
    await expect(page.locator('.voting-power')).toBeVisible();
  });

  test('should show tier benefits in revenue tab', async ({ page }) => {
    await page.click('text=四自系统');
    await page.click('.tab >> text=自运营收益');

    // Verify tier benefits list
    await expect(page.locator('.tier-benefits ul li')).toHaveCount(3);
  });
});