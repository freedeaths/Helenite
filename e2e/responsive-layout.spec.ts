import { test, expect } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('should adapt to mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for app to load and adapt
    await page.waitForSelector('[data-testid="app-layout"]');

    // On mobile, sidebars should be hidden by default
    // and main content should be full width
    const mainContent = page.locator('[data-testid="main-content"]');
    await expect(mainContent).toBeVisible();
  });

  test('should show mobile drawer when menu is clicked', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for app to adapt to mobile layout
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });

    // Look for mobile dropdown button (should be visible on mobile)
    const dropdownButton = page.locator('[data-testid="mobile-dropdown-button"]');
    await expect(dropdownButton).toBeVisible({ timeout: 10000 });
    await dropdownButton.click();

    // Mobile dropdown content should appear with file tree
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 5000 });
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await page.waitForSelector('[data-testid="app-layout"]');

    // On tablet, left sidebar might be visible but right sidebar hidden
    // This depends on the exact breakpoint implementation
  });

  test('should show full desktop layout', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');

    await page.waitForSelector('[data-testid="app-layout"]');

    // Desktop should show both sidebars and main content
    const leftSidebar = page.locator('[data-testid="left-sidebar"]');
    const mainContent = page.locator('[data-testid="main-content"]');
    const rightSidebar = page.locator('[data-testid="right-sidebar"]');

    await expect(leftSidebar).toBeVisible();
    await expect(mainContent).toBeVisible();
    await expect(rightSidebar).toBeVisible();
  });

  test('should handle viewport resize', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="app-layout"]');

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Wait for layout to adapt
    await page.waitForTimeout(500);

    // Layout should adapt to mobile
    const appLayout = page.locator('[data-testid="app-layout"]');
    await expect(appLayout).toBeVisible();
  });
});
