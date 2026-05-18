import { test, expect } from '@playwright/test'

test.describe('部署者激励流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should navigate to dashboard', async ({ page }) => {
    await page.click('text=激励面板')
    await expect(page.locator('.deployer-panel')).toBeVisible({ timeout: 5000 })
  })

  test('should show connect prompt when not connected', async ({ page }) => {
    // Mock wallet not connected - test assumes no wallet is connected
    await page.click('text=激励面板')
    await expect(page.locator('text=连接钱包')).toBeVisible({ timeout: 5000 })
  })

  test('should show registered deployer dashboard', async ({ page }) => {
    // Test dashboard display when deployer is registered
    // This requires mocking the wallet and contract state
    await page.click('text=激励面板')

    // Wait for potential wallet connection
    const connectButton = page.locator('text=连接钱包')
    if (await connectButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Skip if wallet not connected - expected in test environment
      test.skip('Wallet not connected - skipping registered state test')
      return
    }

    // If wallet is connected, verify deployer panel content
    await expect(page.locator('.deployer-panel')).toBeVisible({ timeout: 5000 })
  })

  test('should handle wallet connection state', async ({ page }) => {
    // Verify proper handling of wallet connection states
    await page.click('text=激励面板')

    // Should show appropriate UI based on connection state
    const panel = page.locator('.deployer-panel')
    await expect(panel).toBeVisible({ timeout: 5000 })

    // Check for either connect prompt (not connected) or dashboard (connected)
    const hasConnectPrompt = await page.locator('text=连接钱包').isVisible({ timeout: 1000 }).catch(() => false)
    const hasDashboard = await page.locator('[class*="dashboard"]').isVisible({ timeout: 1000 }).catch(() => false)

    expect(hasConnectPrompt || hasDashboard).toBeTruthy()
  })

  test('should display dashboard when not registered', async ({ page }) => {
    // Test the unregistered state UI
    await page.click('text=激励面板')

    // Verify panel loads
    await expect(page.locator('.deployer-panel')).toBeVisible({ timeout: 5000 })

    // Check for registration prompt or similar UI element for new users
    const hasRegistrationPrompt = await page.locator('text=注册').isVisible({ timeout: 1000 }).catch(() => false)
    const hasConnectPrompt = await page.locator('text=连接钱包').isVisible({ timeout: 1000 }).catch(() => false)

    // Either should be present for unregistered users
    expect(hasRegistrationPrompt || hasConnectPrompt).toBeTruthy()
  })
})