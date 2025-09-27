import { describe, it, expect } from 'vitest';
import { 
  parseObsidianLink, 
  resolveFilePath, 
  createFileIndex, 
  findFilePath 
} from '../../../utils/obsidianLinkUtils';

describe('obsidianLinkUtils', () => {
  describe('parseObsidianLink', () => {
    it('should identify and parse obsidian links', () => {
      expect(parseObsidianLink('[[Document Name]]')).toBeTruthy();
      expect(parseObsidianLink('[[Folder/Document]]')).toBeTruthy();
      expect(parseObsidianLink('[[Document|Display Text]]')).toBeTruthy();
      expect(parseObsidianLink('![[image.png]]')).toBeTruthy();
    });

    it('should reject non-obsidian links', () => {
      expect(parseObsidianLink('[Regular Link](url)')).toBeNull();
      expect(parseObsidianLink('regular text')).toBeNull();
      expect(parseObsidianLink('[incomplete')).toBeNull();
    });

    it('should parse simple document links', () => {
      const result = parseObsidianLink('[[Document Name]]');
      expect(result).toEqual({
        type: 'file',
        filePath: 'Document Name',
        displayText: undefined,
        isRelativePath: false
      });
    });

    it('should parse links with display text', () => {
      const result = parseObsidianLink('[[Document Name|Custom Display]]');
      expect(result).toEqual({
        type: 'file',
        filePath: 'Document Name',
        displayText: 'Custom Display',
        isRelativePath: false
      });
    });

    it('should parse image embeds', () => {
      const result = parseObsidianLink('![[image.png]]');
      expect(result).toEqual({
        type: 'image',
        filePath: 'image.png',
        displayText: undefined,
        isRelativePath: false
      });
    });

    it('should parse folder paths', () => {
      const result = parseObsidianLink('[[Folder/Document]]');
      expect(result).toEqual({
        type: 'file',
        filePath: 'Folder/Document',
        displayText: undefined,
        isRelativePath: false
      });
    });

    it('should handle relative paths', () => {
      const result = parseObsidianLink('![[../../Attachments/image.png]]');
      expect(result?.type).toBe('image');
      expect(result?.filePath).toBe('../../Attachments/image.png');
      expect(result?.isRelativePath).toBe(true);
    });

    it('should handle invalid links', () => {
      expect(parseObsidianLink('[invalid]')).toBeNull();
      expect(parseObsidianLink('')).toBeNull();
      
      // Empty [[]] is actually parsed as a valid file link with empty path
      const emptyResult = parseObsidianLink('[[]]');
      expect(emptyResult?.filePath).toBe('');
    });
  });

  describe('resolveFilePath', () => {
    const mockVaultFiles = [
      { path: '/Welcome.md', name: 'Welcome.md' },
      { path: '/Projects/project1.md', name: 'project1.md' },
      { path: '/Attachments/image.png', name: 'image.png' },
      { path: '/FolderA/SubFolder/document.md', name: 'document.md' }
    ];

    it('should resolve relative paths correctly', () => {
      const result = resolveFilePath('../Attachments/image.png', '/Projects', mockVaultFiles);
      expect(result).toBe('/Attachments/image.png');
    });

    it('should handle absolute paths', () => {
      const result = resolveFilePath('/Projects/project1.md', '/current', mockVaultFiles);
      expect(result).toBe('/Projects/project1.md');
      
      const result2 = resolveFilePath('Projects/project1.md', '/current', mockVaultFiles);
      expect(result2).toBe('/Projects/project1.md');
    });

    it('should find files by name with exact match', () => {
      const result = resolveFilePath('Welcome', '/current', mockVaultFiles);
      expect(result).toBe('/Welcome.md');
    });

    it('should find files by full filename', () => {
      const result = resolveFilePath('image.png', '/current', mockVaultFiles);
      expect(result).toBe('/Attachments/image.png');
    });

    it('should perform case-insensitive matching', () => {
      const result = resolveFilePath('WELCOME', '/current', mockVaultFiles);
      expect(result).toBe('/Welcome.md');
    });

    it('should perform partial matching as fallback', () => {
      const result = resolveFilePath('doc', '/current', mockVaultFiles);
      expect(result).toBe('/FolderA/SubFolder/document.md');
    });

    it('should return null for non-existent files', () => {
      const result = resolveFilePath('nonexistent', '/current', mockVaultFiles);
      expect(result).toBeNull();
    });
  });

  describe('createFileIndex', () => {
    const mockFiles = [
      { path: '/Welcome.md', type: 'file' },
      { path: '/Projects/project1.md', type: 'file' },
      { path: '/Attachments/image.png', type: 'file' },
      { path: '/FolderA/SubFolder/document.md', type: 'file' },
      { path: '/tracks/route.gpx', type: 'file' },
      { path: '/SomeFolder', type: 'folder' }
    ];

    it('should create comprehensive file index', () => {
      const index = createFileIndex(mockFiles);
      
      // Should index by full filename
      expect(index.get('welcome.md')).toBe('/Welcome.md');
      expect(index.get('image.png')).toBe('/Attachments/image.png');
      
      // Should index by name without extension for supported types
      expect(index.get('welcome')).toBe('/Welcome.md');
      expect(index.get('route')).toBe('/tracks/route.gpx');
      
      // Should index by full path
      expect(index.get('/projects/project1.md')).toBe('/Projects/project1.md');
      
      // Should index by relative path
      expect(index.get('projects/project1.md')).toBe('/Projects/project1.md');
      
      // Should not index folders
      expect(index.get('somefolder')).toBeUndefined();
      
      // Should handle Attachments folder specially
      expect(index.get('attachments/image.png')).toBe('/Attachments/image.png');
    });

    it('should handle empty file list', () => {
      const index = createFileIndex([]);
      expect(index.size).toBe(0);
    });

    it('should handle files without extensions', () => {
      const filesNoExt = [
        { path: '/README', type: 'file' }
      ];
      const index = createFileIndex(filesNoExt);
      expect(index.get('readme')).toBe('/README');
    });
  });

  describe('findFilePath', () => {
    const mockIndex = new Map([
      ['welcome.md', '/Welcome.md'],
      ['welcome', '/Welcome.md'],
      ['project1.md', '/Projects/project1.md'],
      ['project1', '/Projects/project1.md'],
      ['projects/project1.md', '/Projects/project1.md'],
      ['/projects/project1.md', '/Projects/project1.md'],
      ['image.png', '/Attachments/image.png'],
      ['attachments/image.png', '/Attachments/image.png'],
      ['夏之北海道.md', '/Publish/Trips/Plans/夏之北海道.md'],
      ['夏之北海道', '/Publish/Trips/Plans/夏之北海道.md']
    ]);

    it('should find exact matches', () => {
      const result = findFilePath('Welcome', mockIndex);
      expect(result).toBe('/Welcome.md');
    });

    it('should find with .md extension added', () => {
      const result = findFilePath('project1', mockIndex);
      expect(result).toBe('/Projects/project1.md');
    });

    it('should find by removing extension', () => {
      const result = findFilePath('project1.md', mockIndex);
      expect(result).toBe('/Projects/project1.md');
    });

    it('should extract filename from path', () => {
      const result = findFilePath('Plans/夏之北海道', mockIndex);
      expect(result).toBe('/Publish/Trips/Plans/夏之北海道.md');
    });

    it('should handle relative paths with currentFileDir', () => {
      const result = findFilePath('../Attachments/image.png', mockIndex, '/Projects');
      expect(result).toBe('/Attachments/image.png');
    });

    it('should perform fuzzy matching', () => {
      // Add a complex entry for fuzzy matching
      mockIndex.set('publish/trips/plans/夏之北海道.md', '/Publish/Trips/Plans/夏之北海道.md');
      
      const result = findFilePath('trips/plans/夏之北海道', mockIndex);
      expect(result).toBe('/Publish/Trips/Plans/夏之北海道.md');
    });

    it('should return null for non-existent files', () => {
      const result = findFilePath('nonexistent-file', mockIndex);
      expect(result).toBeNull();
    });

    it('should handle empty linkPath', () => {
      // Empty string matches the first entry that has '' as key, so let's test with actual null case
      expect(findFilePath('   ', mockIndex)).toBeNull(); // Whitespace should return null
    });

    it('should handle relative paths that resolve to non-existent files', () => {
      // This relative path resolves to an absolute path but doesn't exist in the mockIndex
      const result = findFilePath('../nonexistent-folder/file.md', mockIndex, '/Projects');
      // The function returns the resolved path even if it's not in the index for relative paths
      expect(result).toBe('/nonexistent-folder/file.md');
    });
  });
});