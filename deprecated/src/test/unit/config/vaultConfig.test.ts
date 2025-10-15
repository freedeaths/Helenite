import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getVaultConfig, 
  isFolderExcluded, 
  isFileExcluded,
  isPathInExcludedFolder 
} from '../../../config/vaultConfig';

describe('vaultConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVaultConfig', () => {
    it('should return default configuration', () => {
      const config = getVaultConfig();
      
      expect(config.baseUrl).toBe('/vaults/Demo');
      expect(config.indexFile).toBe('Welcome.md');
      expect(config.excludedFolders).toContain('.obsidian');
      expect(config.excludedFolders).toContain('Attachments');
      expect(config.search.debounceMs).toBe(300);
    });

    it('should have reasonable search configuration', () => {
      const config = getVaultConfig();
      
      expect(config.search.maxResults).toBeGreaterThan(0);
      expect(config.search.maxMatchesPerFile).toBeGreaterThan(0);
      expect(config.search.debounceMs).toBeGreaterThan(0);
    });
  });

  describe('isFolderExcluded', () => {
    it('should exclude .obsidian folder', () => {
      expect(isFolderExcluded('.obsidian')).toBe(true);
    });

    it('should exclude Attachments folder', () => {
      expect(isFolderExcluded('Attachments')).toBe(true);
    });

    it('should not exclude regular folders', () => {
      expect(isFolderExcluded('Notes')).toBe(false);
      expect(isFolderExcluded('Projects')).toBe(false);
    });

    it('should exclude system folders', () => {
      expect(isFolderExcluded('.git')).toBe(true);
      expect(isFolderExcluded('node_modules')).toBe(true);
      expect(isFolderExcluded('.vscode')).toBe(true);
    });
  });

  describe('isFileExcluded', () => {
    it('should exclude system files', () => {
      expect(isFileExcluded('.DS_Store')).toBe(true);
      expect(isFileExcluded('desktop.ini')).toBe(true);
      expect(isFileExcluded('.gitignore')).toBe(true);
      expect(isFileExcluded('Thumbs.db')).toBe(true); // 修复：确保 Thumbs.db 被正确排除
    });

    it('should not exclude markdown files', () => {
      expect(isFileExcluded('document.md')).toBe(false);
      expect(isFileExcluded('README.md')).toBe(false);
    });

    it('should not exclude regular files', () => {
      expect(isFileExcluded('image.png')).toBe(false);
      expect(isFileExcluded('data.json')).toBe(false);
    });
  });

  describe('isPathInExcludedFolder', () => {
    it('should detect paths in excluded folders', () => {
      expect(isPathInExcludedFolder('.obsidian/config.json')).toBe(true);
      expect(isPathInExcludedFolder('Attachments/image.png')).toBe(true);
      expect(isPathInExcludedFolder('folder/Attachments/file.md')).toBe(true);
    });

    it('should not exclude paths in allowed folders', () => {
      expect(isPathInExcludedFolder('Notes/document.md')).toBe(false);
      expect(isPathInExcludedFolder('Projects/work/file.md')).toBe(false);
    });

    it('should handle nested excluded folders', () => {
      expect(isPathInExcludedFolder('.git/config')).toBe(true);
      expect(isPathInExcludedFolder('project/.git/hooks/pre-commit')).toBe(true);
    });
  });
});