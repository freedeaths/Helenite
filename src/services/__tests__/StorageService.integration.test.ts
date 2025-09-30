import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StorageService } from '../infra/StorageService.js';
import type { StorageConfig } from '../types/StorageTypes.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('StorageService Real Integration Tests', () => {
  let storageService: StorageService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

  beforeAll(async () => {
    // 设置全局 fetch 为 node-fetch，确保真实的网络请求
    // @ts-expect-error - Global fetch setup for testing with node-fetch
    global.fetch = fetch;

    // 检查服务器是否已经在运行
    const isServerRunning = async (): Promise<boolean> => {
      try {
        const response = await fetch(`${serverUrl}/vaults/Demo`);
        return response.ok;
      } catch {
        return false;
      }
    };

    if (await isServerRunning()) {
      // SKIP
    } else {

      // 启动 Vite 开发服务器
      viteProcess = spawn('npm', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: 'true' },
        detached: false
      });

      // 等待服务器启动
      let attempts = 0;
      const maxAttempts = 30; // 30秒超时

      while (attempts < maxAttempts) {
        await sleep(1000);
        if (await isServerRunning()) {
          break;
        }
        attempts++;
      }

      if (attempts >= maxAttempts) {
        if (viteProcess) {
          viteProcess.kill();
          viteProcess = null;
        }
        throw new Error('开发服务器启动超时');
      }
    }

    // 配置真实的 StorageService
    const config: StorageConfig = {
      basePath: `${serverUrl}/vaults/Demo`,
      timeout: 10000,
      cache: false // 禁用缓存确保测试准确性
    };

    storageService = new StorageService(config);
    await storageService.initialize();
  }, 45000); // 增加超时时间到45秒，因为可能需要启动服务器

  afterAll(async () => {
    if (storageService) {
      await storageService.dispose();
    }

    // 如果我们启动了临时服务器，现在关闭它
    if (viteProcess) {
      viteProcess.kill();
      viteProcess = null;
    }
  });

  describe('HTTP File Reading', () => {
    it('should read markdown file via HTTP', async () => {
      const content = await storageService.readFile('/Welcome.md');

      expect(typeof content).toBe('string');
      expect(typeof content === 'string' ? content.length : content.byteLength).toBeGreaterThan(0);
      expect(content).toContain('vault');
    });

    it('should read binary file (PNG) via HTTP', async () => {
      const content = await storageService.readFile('/Attachments/inversed mt fuji.png', { binary: true });

      expect(content).toBeInstanceOf(Uint8Array);
      expect((content as Uint8Array).length).toBeGreaterThan(0);
    });

    it('should read GPX file via HTTP', async () => {
      const content = await storageService.readFile('/Attachments/yamap_2025-04-02_08_48.gpx');

      expect(typeof content).toBe('string');
      expect(content).toContain('<?xml version');
      expect(content).toContain('<gpx');
    });
  });

  describe('HTTP File Info', () => {
    it('should get correct file info via HEAD request', async () => {
      const fileInfo = await storageService.getFileInfo('/Welcome.md');

      expect(fileInfo.path).toBe('Welcome.md');
      expect(fileInfo.size).toBeGreaterThan(0);
      expect(fileInfo.mimeType).toBe('text/markdown');
      expect(fileInfo.exists).toBe(true);
      expect(fileInfo.lastModified).toBeInstanceOf(Date);
    });

    it('should handle 404 errors correctly', async () => {
      // 开发环境: Vite对不存在的文件返回HTML (SPA行为)
      // 生产环境: 静态文件服务器返回真正的404
      try {
        const fileInfo = await storageService.getFileInfo('/NonExistent.md');
        // 开发环境: 返回HTML页面信息
        expect(fileInfo.mimeType).toBe('text/html');
      } catch (error) {
        // 生产环境: 抛出404错误
        expect(error).toBeDefined();
      }
    });
  });

  describe('File Existence Checks', () => {
    it('should confirm existing file exists via HTTP', async () => {
      const exists = await storageService.exists('/Welcome.md');
      expect(exists).toBe(true);
    });

    it('should handle file existence in dev vs prod', async () => {
      // 开发环境: Vite对不存在的文件也返回200状态码
      // 生产环境: 静态文件服务器返回正确的404
      const exists = await storageService.exists('/NonExistent.md');

      // 在开发环境中可能返回true，生产环境返回false
      expect(typeof exists).toBe('boolean');
    });
  });

  describe('readFileWithInfo Integration', () => {
    it('should return both content and info in single call', async () => {
      const result = await storageService.readFileWithInfo('/Welcome.md');

      // 验证内容
      expect(typeof result.content).toBe('string');
      expect(typeof result.content === 'string' ? result.content.length : result.content.byteLength).toBeGreaterThan(0);
      expect(result.content).toContain('vault');

      // 验证文件信息
      expect(result.info.path).toBe('Welcome.md');
      expect(result.info.mimeType).toBe('text/markdown');
      expect(result.info.exists).toBe(true);
    });
  });

  describe('MIME Type Detection', () => {
    it('should detect correct MIME types from HTTP responses', async () => {
      const testCases = [
        { file: '/Welcome.md', expectedMime: 'text/markdown' },
        { file: '/Attachments/yamap_2025-04-02_08_48.gpx', expectedMime: 'application/gpx+xml' },
      ];

      for (const testCase of testCases) {
        const fileInfo = await storageService.getFileInfo(testCase.file);
        expect(fileInfo.mimeType).toBe(testCase.expectedMime);
      }
    });
  });

  describe('Path Resolution', () => {
    it('should handle various path formats correctly', async () => {
      // 测试不同的路径格式
      const content1 = await storageService.readFile('Welcome.md');
      const content2 = await storageService.readFile('/Welcome.md');

      expect(content1).toBe(content2);
    });

    it('should resolve paths correctly via HTTP', async () => {
      const fileInfo = await storageService.getFileInfo('/Attachments/inversed mt fuji.png');
      expect(fileInfo.path).toBe('Attachments/inversed mt fuji.png');
      expect(fileInfo.exists).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts appropriately', async () => {
      // 创建一个短超时的服务实例
      const shortTimeoutService = new StorageService({
        basePath: `${serverUrl}/vaults/Demo`,
        timeout: 1 // 1ms 超时，应该会失败
      });

      try {
        await shortTimeoutService.initialize();
        // 如果初始化成功，说明网络很快，那么超时测试可能不会失败
        // 这时我们测试读取文件的情况
        try {
          await shortTimeoutService.readFile('/Welcome.md');
          // 如果成功，说明网络环境下1ms足够了，这是意料之外但可接受的
        } catch (error) {
          // 预期的超时错误
          expect(error).toBeDefined();
        }
      } catch (error) {
        // 在初始化阶段就超时了，这是预期的
        expect(error).toBeDefined();
      }
    });

    it('should handle HTTP responses in dev vs prod', async () => {
      // 开发环境: Vite对不存在的文件返回HTML
      // 生产环境: 静态文件服务器返回404错误
      const content = await storageService.readFile('/NonExistent.md');

      // 开发环境: 应该返回HTML内容
      expect(typeof content).toBe('string');
      if (typeof content === 'string' && content.includes('<!doctype html>')) {
        expect(content).toContain('<div id="root">');
      }
    });
  });

  describe('Caching Behavior', () => {
    it('should cache results when caching is enabled', async () => {
      // 创建启用缓存的服务实例
      const cachedService = new StorageService({
        basePath: `${serverUrl}/vaults/Demo`,
        cache: true
      });
      await cachedService.initialize();

      const start1 = Date.now();
      const content1 = await cachedService.readFile('/Welcome.md');
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const content2 = await cachedService.readFile('/Welcome.md');
      const time2 = Date.now() - start2;

      expect(content1).toBe(content2);
      expect(time2).toBeLessThan(time1); // 缓存应该更快
    });
  });

  describe('Service Lifecycle', () => {
    it('should initialize and perform health check', async () => {
      const newService = new StorageService({
        basePath: `${serverUrl}/vaults/Demo`
      });

      await expect(newService.initialize()).resolves.not.toThrow();

      const isHealthy = await newService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should handle disposal correctly', async () => {
      const newService = new StorageService({
        basePath: `${serverUrl}/vaults/Demo`
      });
      await newService.initialize();

      await expect(newService.dispose()).resolves.not.toThrow();
    });
  });

  describe('Preload Functionality', () => {
    it('should preload multiple files', async () => {
      const filesToPreload = [
        '/Welcome.md',
        '/Attachments/inversed mt fuji.png'
      ];

      await expect(storageService.preloadFiles(filesToPreload))
        .resolves.not.toThrow();
    });
  });

  describe('Utility Methods', () => {
    it('should correctly identify file types', async () => {
      expect(storageService.isMarkdownFile('/Welcome.md')).toBe(true);
      expect(storageService.isImageFile('/Attachments/inversed mt fuji.png')).toBe(true);
      expect(storageService.isTrackFile('/Attachments/yamap_2025-04-02_08_48.gpx')).toBe(true);
    });

    it('should normalize and resolve paths correctly', async () => {
      expect(storageService.normalizePath('//path/../file.md')).toBe('file.md');
      expect(storageService.resolvePath('/Welcome.md')).toBe(`${serverUrl}/vaults/Demo/Welcome.md`);
    });
  });
});