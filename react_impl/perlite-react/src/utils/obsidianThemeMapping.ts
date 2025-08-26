/**
 * Comprehensive Obsidian Theme Variable Mapping
 * 
 * This module provides complete mapping between Obsidian theme CSS variables
 * and their semantic meanings for use with Mantine components.
 */

export interface ObsidianThemeVariables {
  // Background colors
  '--background-primary': string;
  '--background-primary-alt': string;
  '--background-secondary': string;
  '--background-secondary-alt': string;
  '--background-modifier-border': string;
  '--background-modifier-form-field': string;
  '--background-modifier-form-field-highlighted': string;
  '--background-modifier-box-shadow': string;
  '--background-modifier-success': string;
  '--background-modifier-error': string;
  '--background-modifier-error-rgb': string;
  '--background-modifier-error-hover': string;
  '--background-modifier-cover': string;
  
  // Text colors
  '--text-normal': string;
  '--text-muted': string;
  '--text-faint': string;
  '--text-error': string;
  '--text-error-hover': string;
  '--text-highlight-bg': string;
  '--text-highlight-bg-active': string;
  '--text-selection': string;
  '--text-on-accent': string;
  '--text-accent': string;
  '--text-accent-hover': string;
  
  // Interactive elements
  '--interactive-normal': string;
  '--interactive-hover': string;
  '--interactive-accent': string;
  '--interactive-accent-rgb': string;
  '--interactive-accent-hover': string;
  '--interactive-success': string;
  
  // Scrollbars
  '--scrollbar-active-thumb-bg': string;
  '--scrollbar-bg': string;
  '--scrollbar-thumb-bg': string;
  
  // Titlebar (for desktop apps)
  '--titlebar-background': string;
  '--titlebar-background-focused': string;
  '--titlebar-border-width': string;
  '--titlebar-text-color-focused': string;
  '--titlebar-text-color-unfocused': string;
  '--titlebar-text-weight': string;
  
  // Tables
  '--table-header-bg': string;
  '--table-header-bg-hover': string;
  '--table-row-alt-bg': string;
  '--table-row-hover-bg': string;
  '--table-border-color': string;
  
  // Code
  '--code-background': string;
  '--code-normal': string;
  '--code-comment': string;
  '--code-function': string;
  '--code-important': string;
  '--code-keyword': string;
  '--code-operator': string;
  '--code-property': string;
  '--code-punctuation': string;
  '--code-string': string;
  '--code-tag': string;
  '--code-value': string;
  
  // Blockquotes and callouts
  '--blockquote-border': string;
  '--embed-border': string;
  '--embed-background': string;
  
  // Tags
  '--tag-background': string;
  '--tag-background-hover': string;
  '--tag-color': string;
  '--tag-color-hover': string;
  '--tag-decoration': string;
  '--tag-decoration-hover': string;
  '--tag-padding-x': string;
  '--tag-padding-y': string;
  '--tag-radius': string;
  
  // Graph
  '--graph-line': string;
  '--graph-node': string;
  '--graph-node-unresolved': string;
  '--graph-node-focused': string;
  '--graph-node-tag': string;
  '--graph-node-attachment': string;
  
  // Sidebar
  '--nav-item-color': string;
  '--nav-item-color-hover': string;
  '--nav-item-color-active': string;
  '--nav-item-color-selected': string;
  '--nav-item-background-hover': string;
  '--nav-item-background-active': string;
  '--nav-item-background-selected': string;
  '--nav-item-weight': string;
  '--nav-item-weight-hover': string;
  '--nav-item-weight-active': string;
  '--nav-item-white-space': string;
  '--nav-collapse-icon-color': string;
  '--nav-collapse-icon-color-collapsed': string;
  
  // Indentation guides
  '--indentation-guide-color': string;
  '--indentation-guide-color-active': string;
  '--indentation-guide-width': string;
  
  // Checkbox
  '--checkbox-color': string;
  '--checkbox-color-hover': string;
  '--checkbox-border-color': string;
  '--checkbox-border-color-hover': string;
  '--checklist-done-color': string;
  '--checklist-done-decoration': string;
  
  // Toggles
  '--toggle-border-color': string;
  '--toggle-border-color-hover': string;
  '--toggle-border-color-active': string;
  '--toggle-border-width': string;
  '--toggle-radius': string;
  '--toggle-thumb-color': string;
  '--toggle-thumb-radius': string;
  '--toggle-track-background': string;
  '--toggle-track-background-active': string;
  
  // Sliders
  '--slider-track-background': string;
  '--slider-track-background-active': string;
  '--slider-thumb-border-color': string;
  '--slider-thumb-border-width': string;
  '--slider-thumb-color': string;
  '--slider-thumb-radius': string;
  
  // Ribbons
  '--ribbon-background': string;
  '--ribbon-background-collapsed': string;
  
  // Modals
  '--modal-background': string;
  '--modal-border': string;
  '--modal-border-width': string;
  '--modal-radius': string;
  '--modal-community-sidebar-background': string;
  
  // Prompts
  '--prompt-border': string;
  '--prompt-border-color': string;
  '--prompt-border-width': string;
  
  // Dividers
  '--divider-color': string;
  '--divider-width': string;
  '--divider-vertical-height': string;
  
  // Publish (for Obsidian Publish)
  '--publish-sidebar-background': string;
  '--publish-sidebar-background-hover': string;
}

/**
 * Maps Obsidian CSS variables to Mantine theme properties
 */
export interface MantineThemeMapping {
  // Primary color mappings
  primaryColor: keyof ObsidianThemeVariables;
  
  // Component-specific mappings
  components: {
    ActionIcon: {
      subtle: {
        color: keyof ObsidianThemeVariables;
        background: keyof ObsidianThemeVariables;
        backgroundHover: keyof ObsidianThemeVariables;
      };
      filled: {
        color: keyof ObsidianThemeVariables;
        background: keyof ObsidianThemeVariables;
        backgroundHover: keyof ObsidianThemeVariables;
      };
    };
    
    Button: {
      light: {
        color: keyof ObsidianThemeVariables;
        background: keyof ObsidianThemeVariables;
        backgroundHover: keyof ObsidianThemeVariables;
        border: keyof ObsidianThemeVariables;
      };
      filled: {
        color: keyof ObsidianThemeVariables;
        background: keyof ObsidianThemeVariables;
        backgroundHover: keyof ObsidianThemeVariables;
      };
      subtle: {
        color: keyof ObsidianThemeVariables;
        background: keyof ObsidianThemeVariables;
        backgroundHover: keyof ObsidianThemeVariables;
      };
    };
    
    Tooltip: {
      background: keyof ObsidianThemeVariables;
      color: keyof ObsidianThemeVariables;
      border: keyof ObsidianThemeVariables;
    };
    
    Modal: {
      background: keyof ObsidianThemeVariables;
      border: keyof ObsidianThemeVariables;
    };
    
    Input: {
      background: keyof ObsidianThemeVariables;
      color: keyof ObsidianThemeVariables;
      border: keyof ObsidianThemeVariables;
      backgroundFocused: keyof ObsidianThemeVariables;
    };
    
    Checkbox: {
      color: keyof ObsidianThemeVariables;
      borderColor: keyof ObsidianThemeVariables;
      background: keyof ObsidianThemeVariables;
    };
    
    Table: {
      headerBackground: keyof ObsidianThemeVariables;
      rowHoverBackground: keyof ObsidianThemeVariables;
      borderColor: keyof ObsidianThemeVariables;
    };
  };
  
  // Global mappings
  global: {
    body: keyof ObsidianThemeVariables;
    text: keyof ObsidianThemeVariables;
    textMuted: keyof ObsidianThemeVariables;
    border: keyof ObsidianThemeVariables;
    backgroundPrimary: keyof ObsidianThemeVariables;
    backgroundSecondary: keyof ObsidianThemeVariables;
  };
}

/**
 * Default mapping configuration from Obsidian variables to Mantine components
 */
export const DEFAULT_OBSIDIAN_MANTINE_MAPPING: MantineThemeMapping = {
  primaryColor: '--interactive-accent',
  
  components: {
    ActionIcon: {
      subtle: {
        color: '--text-normal',
        background: 'transparent' as any,
        backgroundHover: '--background-modifier-border',
      },
      filled: {
        color: '--text-on-accent',
        background: '--interactive-accent',
        backgroundHover: '--interactive-accent-hover',
      },
    },
    
    Button: {
      light: {
        color: '--text-normal',
        background: 'transparent' as any,
        backgroundHover: '--background-modifier-border',
        border: '--background-modifier-border',
      },
      filled: {
        color: '--text-on-accent',
        background: '--interactive-accent',
        backgroundHover: '--interactive-accent-hover',
      },
      subtle: {
        color: '--text-normal',
        background: 'transparent' as any,
        backgroundHover: '--background-secondary',
      },
    },
    
    Tooltip: {
      background: '--background-secondary',
      color: '--text-normal',
      border: '--background-modifier-border',
    },
    
    Modal: {
      background: '--modal-background',
      border: '--modal-border',
    },
    
    Input: {
      background: '--background-modifier-form-field',
      color: '--text-normal',
      border: '--background-modifier-border',
      backgroundFocused: '--background-modifier-form-field-highlighted',
    },
    
    Checkbox: {
      color: '--checkbox-color',
      borderColor: '--checkbox-border-color',
      background: '--background-primary',
    },
    
    Table: {
      headerBackground: '--table-header-bg',
      rowHoverBackground: '--table-row-hover-bg',
      borderColor: '--table-border-color',
    },
  },
  
  global: {
    body: '--background-primary',
    text: '--text-normal',
    textMuted: '--text-muted',
    border: '--background-modifier-border',
    backgroundPrimary: '--background-primary',
    backgroundSecondary: '--background-secondary',
  },
};

/**
 * Reads CSS variables from document and creates theme mapping
 */
export function createObsidianThemeMapping(): Partial<ObsidianThemeVariables> {
  const computedStyle = getComputedStyle(document.documentElement);
  const mapping: Partial<ObsidianThemeVariables> = {};
  
  // Read all available CSS variables
  const variableNames = Object.keys(DEFAULT_OBSIDIAN_MANTINE_MAPPING.global) as (keyof ObsidianThemeVariables)[];
  
  // Add component-specific variables
  Object.values(DEFAULT_OBSIDIAN_MANTINE_MAPPING.components).forEach(component => {
    Object.values(component).forEach(variant => {
      if (typeof variant === 'object') {
        Object.values(variant).forEach(prop => {
          if (typeof prop === 'string' && prop.startsWith('--')) {
            variableNames.push(prop as keyof ObsidianThemeVariables);
          }
        });
      }
    });
  });
  
  // Remove duplicates and read values
  [...new Set(variableNames)].forEach(varName => {
    if (typeof varName === 'string' && varName.startsWith('--')) {
      const value = computedStyle.getPropertyValue(varName).trim();
      if (value) {
        mapping[varName] = value;
      }
    }
  });
  
  return mapping;
}

/**
 * Applies Obsidian theme mapping to CSS variables for Mantine
 */
export function applyObsidianMantineMapping(mapping: Partial<ObsidianThemeVariables>): void {
  const root = document.documentElement;
  
  // Apply global mappings
  const globalMapping = DEFAULT_OBSIDIAN_MANTINE_MAPPING.global;
  
  Object.entries(globalMapping).forEach(([mantineProperty, obsidianVariable]) => {
    if (mapping[obsidianVariable as keyof ObsidianThemeVariables]) {
      const cssProperty = `--mantine-${mantineProperty.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssProperty, `var(${obsidianVariable})`);
    }
  });
  
  // Apply primary color
  if (mapping[DEFAULT_OBSIDIAN_MANTINE_MAPPING.primaryColor]) {
    root.style.setProperty('--mantine-primary-color', `var(${DEFAULT_OBSIDIAN_MANTINE_MAPPING.primaryColor})`);
  }
}

/**
 * Auto-detects and applies available Obsidian theme variables
 */
export function autoDetectAndApplyObsidianTheme(): void {
  const themeMapping = createObsidianThemeMapping();
  applyObsidianMantineMapping(themeMapping);
  
  console.log('Applied Obsidian theme mapping:', Object.keys(themeMapping));
}