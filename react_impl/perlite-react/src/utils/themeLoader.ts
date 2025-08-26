export interface ObsidianTheme {
  name: string;
  version: string;
  author: string;
  cssPath: string;
}

export const AVAILABLE_THEMES: ObsidianTheme[] = [
  {
    name: 'Royal Velvet',
    version: '0.11.2',
    author: 'caro401',
    cssPath: '/vault/.obsidian/themes/Royal Velvet/theme.css'
  },
  {
    name: 'Shiba Inu',
    version: '1.0.0',
    author: 'faroukx',
    cssPath: '/vault/.obsidian/themes/Shiba Inu/theme.css'
  },
  {
    name: 'Terminal',
    version: '1.0.0',
    author: 'unknown',
    cssPath: '/vault/.obsidian/themes/Terminal/theme.css'
  }
];

class ThemeManager {
  private currentThemeLink: HTMLLinkElement | null = null;

  async loadTheme(theme: ObsidianTheme): Promise<void> {
    try {
      // Remove existing theme
      if (this.currentThemeLink) {
        document.head.removeChild(this.currentThemeLink);
        this.currentThemeLink = null;
      }

      // Create new theme link
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = theme.cssPath;
      link.id = 'obsidian-theme';
      
      // Add to document head
      document.head.appendChild(link);
      this.currentThemeLink = link;

      // Wait for theme to load
      return new Promise((resolve, reject) => {
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`Failed to load theme: ${theme.name}`));
      });
    } catch (error) {
      console.error('Error loading theme:', error);
      throw error;
    }
  }

  unloadTheme(): void {
    if (this.currentThemeLink) {
      document.head.removeChild(this.currentThemeLink);
      this.currentThemeLink = null;
    }
  }

  async loadDefaultTheme(): Promise<void> {
    const defaultTheme = AVAILABLE_THEMES.find(theme => theme.name === 'Royal Velvet');
    if (defaultTheme) {
      await this.loadTheme(defaultTheme);
    }
  }
}

export const themeManager = new ThemeManager();