/**
 * CSS Variable Bridge for Mantine Components
 * 
 * This module creates a bridge between Obsidian theme CSS variables 
 * and Mantine component styling system.
 */

import type { MantineThemeOverride, MantineColorsTuple } from '@mantine/core';

/**
 * Maps Obsidian CSS variables to Mantine theme properties
 */
export interface ObsidianToMantineMapping {
  // Color mappings
  colors: {
    primary: string;      // --interactive-accent
    secondary: string;    // --text-muted  
    background: string;   // --background-primary
    surface: string;      // --background-secondary
    border: string;       // --background-modifier-border
    text: string;         // --text-normal
    textMuted: string;    // --text-muted
    accent: string;       // --text-accent
  };
  
  // Interactive state mappings
  states: {
    hover: string;        // --interactive-hover
    active: string;       // --interactive-accent
    focus: string;        // --interactive-accent
  };
}

/**
 * Reads CSS variables from document and creates Obsidian->Mantine mapping
 */
export function getObsidianThemeVariables(): ObsidianToMantineMapping {
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    colors: {
      primary: computedStyle.getPropertyValue('--interactive-accent').trim(),
      secondary: computedStyle.getPropertyValue('--text-muted').trim(),
      background: computedStyle.getPropertyValue('--background-primary').trim(),
      surface: computedStyle.getPropertyValue('--background-secondary').trim(),
      border: computedStyle.getPropertyValue('--background-modifier-border').trim(),
      text: computedStyle.getPropertyValue('--text-normal').trim(),
      textMuted: computedStyle.getPropertyValue('--text-muted').trim(),
      accent: computedStyle.getPropertyValue('--text-accent').trim(),
    },
    states: {
      hover: computedStyle.getPropertyValue('--interactive-hover').trim(),
      active: computedStyle.getPropertyValue('--interactive-accent').trim(),
      focus: computedStyle.getPropertyValue('--interactive-accent').trim(),
    }
  };
}

/**
 * Creates Mantine color tuple from a single color value
 */
function createColorTuple(baseColor: string): MantineColorsTuple {
  // For now, create a simple tuple with the base color
  // In the future, this could generate proper color variations
  return [
    baseColor,
    baseColor, 
    baseColor,
    baseColor,
    baseColor,
    baseColor, // index 5 is the default shade
    baseColor,
    baseColor,
    baseColor,
    baseColor,
  ];
}

/**
 * Generates a Mantine theme that respects Obsidian CSS variables
 */
export function createObsidianMantineTheme(): MantineThemeOverride {
  const obsidianVars = getObsidianThemeVariables();
  
  return {
    primaryColor: 'obsidian-primary',
    colors: {
      'obsidian-primary': createColorTuple(obsidianVars.colors.primary),
      'obsidian-secondary': createColorTuple(obsidianVars.colors.secondary),
      'obsidian-accent': createColorTuple(obsidianVars.colors.accent),
    },
    
    // Override default component styles to use CSS variables
    components: {
      ActionIcon: {
        styles: (theme) => ({
          root: {
            // Default styles that work with CSS variables
            color: 'var(--text-normal)',
            '&:hover': {
              backgroundColor: 'var(--background-modifier-border)',
            }
          }
        })
      },
      
      Button: {
        styles: (theme) => ({
          root: {
            // Default styles that work with CSS variables
            color: 'var(--text-normal)',
            borderColor: 'var(--background-modifier-border)',
            '&:hover': {
              backgroundColor: 'var(--background-modifier-border)',
            }
          }
        })
      },

      Tooltip: {
        styles: (theme) => ({
          tooltip: {
            backgroundColor: 'var(--background-secondary)',
            color: 'var(--text-normal)',
            borderColor: 'var(--background-modifier-border)',
            fontSize: '12px',
          }
        })
      }
    },

    // Override default colors and other theme properties
    other: {
      // Custom CSS variables for components that need them
      cssVariables: {
        '--mantine-color-body': 'var(--background-primary)',
        '--mantine-color-text': 'var(--text-normal)',
        '--mantine-color-dimmed': 'var(--text-muted)',
        '--mantine-color-border': 'var(--background-modifier-border)',
      }
    }
  };
}

/**
 * Updates Mantine theme when Obsidian theme variables change
 */
export function updateMantineThemeVariables(): void {
  const obsidianVars = getObsidianThemeVariables();
  
  // Import comprehensive mapping
  import('./obsidianThemeMapping').then(({ autoDetectAndApplyObsidianTheme }) => {
    autoDetectAndApplyObsidianTheme();
  });
  
  // Update CSS custom properties that Mantine components use
  const root = document.documentElement;
  
  root.style.setProperty('--mantine-color-body', obsidianVars.colors.background);
  root.style.setProperty('--mantine-color-text', obsidianVars.colors.text);
  root.style.setProperty('--mantine-color-dimmed', obsidianVars.colors.textMuted);
  root.style.setProperty('--mantine-color-border', obsidianVars.colors.border);
  root.style.setProperty('--mantine-primary-color', obsidianVars.colors.primary);
}

/**
 * Set up theme change observer
 * Watches for changes in Obsidian theme variables and updates Mantine accordingly
 */
export function setupThemeChangeObserver(): void {
  // Watch for theme attribute changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && 
          (mutation.attributeName === 'data-theme' || mutation.attributeName === 'class')) {
        // Theme has changed, update Mantine variables
        setTimeout(updateMantineThemeVariables, 50); // Small delay to ensure CSS has updated
      }
    });
  });

  // Start observing
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  });

  // Also watch for CSS variable changes (if supported)
  if ('ResizeObserver' in window) {
    // Initial update
    updateMantineThemeVariables();
  }
}