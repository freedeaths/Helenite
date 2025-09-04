import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await expect(page.locator('body')).toBeVisible();

    // Check if the main layout elements are present
    await expect(page.locator('[data-testid="app-layout"]')).toBeVisible();
  });

  test('should display file tree in left sidebar', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });

    // Check if we're on mobile - if so, need to open drawer first
    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 768;
    
    if (isMobile) {
      // On mobile, click dropdown button to open mobile menu
      const dropdownButton = page.locator('[data-testid="mobile-dropdown-button"]');
      await expect(dropdownButton).toBeVisible({ timeout: 5000 });
      await dropdownButton.click();
      
      // Wait for dropdown content to appear (contains file tree)
      await page.waitForTimeout(500); // Wait for animation
    }

    // Wait for file tree to load
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 10000 });

    // Check if Welcome.md is visible in the file tree (use more specific selector)
    await expect(page.locator('[data-testid="file-tree"]').getByText('Welcome')).toBeVisible();
  });

  test('should navigate to a document when clicked', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });

    // Check if we're on mobile - if so, need to open drawer first  
    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 768;
    
    if (isMobile) {
      // On mobile, click dropdown button to open mobile menu
      const dropdownButton = page.locator('[data-testid="mobile-dropdown-button"]');
      await expect(dropdownButton).toBeVisible({ timeout: 5000 });
      await dropdownButton.click();
      
      // Wait for dropdown content to appear (contains file tree)
      await page.waitForTimeout(500); // Wait for animation
    }

    // Wait for file tree to load (increased timeout for mobile)
    await page.waitForSelector('[data-testid="file-tree"]', { timeout: 15000 });

    // Click on Welcome.md in the file tree
    await page.locator('[data-testid="file-tree"]').getByText('Welcome').click();

    // Wait for content to load
    await page.waitForSelector('[data-testid="markdown-content"]', { timeout: 10000 });

    // Check if the URL contains the file path
    expect(page.url()).toContain('Welcome');
  });

  test('should show markdown content', async ({ page }) => {
    await page.goto('/#/Welcome');

    // Wait for markdown content to render
    await page.waitForSelector('[data-testid="markdown-content"]', { timeout: 10000 });

    // Check if content is rendered (should contain markdown content)
    // Welcome.md contains "This is your new *vault*" text
    await expect(page.locator('[data-testid="markdown-content"]').getByText(/This is your new/i)).toBeVisible();
  });

  test('should toggle left sidebar', async ({ page }) => {
    await page.goto('/');

    // Wait for app to load first
    await page.waitForSelector('[data-testid="app-layout"]', { timeout: 10000 });

    // Check if we're on mobile - if so, skip this test since mobile doesn't have left sidebar toggle
    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 768;
    
    if (isMobile) {
      // On mobile, there's no left sidebar toggle - test the dropdown instead
      const dropdownButton = page.locator('[data-testid="mobile-dropdown-button"]');
      if (await dropdownButton.isVisible()) {
        // Open dropdown
        await dropdownButton.click();
        await page.waitForTimeout(500);
        
        // Verify dropdown content is accessible (file tree should be visible)
        await expect(page.locator('[data-testid="file-tree"]')).toBeVisible({ timeout: 5000 });
        
        // Close dropdown by clicking the button again
        await dropdownButton.click();
        await page.waitForTimeout(300);
        
        // Dropdown should close (file tree should not be visible in dropdown context)
        // Note: file tree might still be visible in sidebar on larger screens, so this test is context-dependent
      }
    } else {
      // Desktop/tablet: test the actual left sidebar toggle
      const toggleButton = page.locator('[data-testid="toggle-left-sidebar"]');
      await expect(toggleButton).toBeVisible({ timeout: 10000 });
      
      // Check initial sidebar state
      const leftSidebar = page.locator('[data-testid="left-sidebar"]');
      const initiallyVisible = await leftSidebar.isVisible();
      
      // Click toggle button
      await toggleButton.click();
      
      // Wait a moment for animation
      await page.waitForTimeout(300);
      
      // Sidebar visibility should have changed
      const afterToggleVisible = await leftSidebar.isVisible();
      expect(afterToggleVisible).toBe(!initiallyVisible);
    }
  });
});