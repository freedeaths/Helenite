/**
 * StorageService 单元测试
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageService } from '../infra/StorageService';
import { StorageConfig, StorageError, StorageErrorType } from '../types/StorageTypes';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof global.fetch;

describe('StorageService', () => {
  let storageService: StorageService;
  let config: StorageConfig;

  beforeEach(() => {
    config = {
      basePath: 'https://example.com/vault',
      timeout: 5000,
      cache: true
    };

    storageService = new StorageService(config);
    mockFetch.mockReset();
  });

  afterEach(async () => {
    await storageService.dispose();
  });

  describe('构造函数和配置', () => {
    test('应该正确初始化配置', () => {
      expect(storageService.config).toEqual({
        basePath: 'https://example.com/vault',
        timeout: 5000,
        cache: true
      });
    });

    test('应该设置默认配置值', () => {
      const service = new StorageService({ basePath: 'https://test.com' });
      expect(service.config.timeout).toBe(30000);
      expect(service.config.cache).toBe(true);
    });
  });

  describe('路径处理', () => {
    test('normalizePath - 应该移除前导斜杠', () => {
      expect(storageService.normalizePath('/docs/file.md')).toBe('docs/file.md');
      expect(storageService.normalizePath('///docs/file.md')).toBe('docs/file.md');
    });

    test('normalizePath - 应该处理相对路径', () => {
      expect(storageService.normalizePath('docs/./file.md')).toBe('docs/file.md');
      expect(storageService.normalizePath('docs/sub/../file.md')).toBe('docs/file.md');
    });

    test('resolvePath - 应该生成正确的路径', () => {
      expect(storageService.resolvePath('docs/file.md')).toBe('https://example.com/vault/docs/file.md');
      expect(storageService.resolvePath('/docs/file.md')).toBe('https://example.com/vault/docs/file.md');
    });

    test('resolvePath - 应该处理basePath末尾斜杠', () => {
      const service = new StorageService({ basePath: 'https://example.com/vault/' });
      expect(service.resolvePath('docs/file.md')).toBe('https://example.com/vault/docs/file.md');
    });

    test('isValidPath - 应该验证路径安全性', () => {
      expect(storageService.isValidPath('docs/file.md')).toBe(true);
      expect(storageService.isValidPath('../../../etc/passwd')).toBe(false);
      expect(storageService.isValidPath('docs/file<script>.md')).toBe(false);
      expect(storageService.isValidPath('')).toBe(false);
    });
  });

  describe('MIME类型检测', () => {
    test('getMimeType - 应该正确识别常见文件类型', () => {
      expect(storageService.getMimeType('file.md')).toBe('text/markdown');
      expect(storageService.getMimeType('image.jpg')).toBe('image/jpeg');
      expect(storageService.getMimeType('track.gpx')).toBe('application/gpx+xml');
      expect(storageService.getMimeType('unknown.xyz')).toBe('application/octet-stream');
    });

    test('isImageFile - 应该正确识别图片文件', () => {
      expect(storageService.isImageFile('photo.jpg')).toBe(true);
      expect(storageService.isImageFile('icon.png')).toBe(true);
      expect(storageService.isImageFile('document.md')).toBe(false);
    });

    test('isTrackFile - 应该正确识别轨迹文件', () => {
      expect(storageService.isTrackFile('route.gpx')).toBe(true);
      expect(storageService.isTrackFile('places.kml')).toBe(true);
      expect(storageService.isTrackFile('document.md')).toBe(false);
    });

    test('isMarkdownFile - 应该正确识别Markdown文件', () => {
      expect(storageService.isMarkdownFile('README.md')).toBe(true);
      expect(storageService.isMarkdownFile('doc.markdown')).toBe(true);
      expect(storageService.isMarkdownFile('image.jpg')).toBe(false);
    });
  });

  describe('文件操作', () => {
    beforeEach(async () => {
      // Mock 健康检查成功
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
      await storageService.initialize();
    });

    test('readFile - 应该成功读取文件', async () => {
      const mockContent = 'Hello, World!';
      mockFetch.mockResolvedValueOnce(new Response(mockContent));

      const content = await storageService.readFile('test.txt');

      expect(content).toBe(mockContent);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/vault/test.txt',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    test('readFile - 应该处理404错误', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 404 }));

      try {
        await storageService.readFile('nonexistent.txt');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(StorageError);
        expect((error as StorageError).type).toBe(StorageErrorType.FILE_NOT_FOUND);
      }
    });

    test('readFile - 应该支持二进制模式', async () => {
      const mockBuffer = new ArrayBuffer(8);
      mockFetch.mockResolvedValueOnce(new Response(mockBuffer));

      const content = await storageService.readFile('image.jpg', { binary: true });

      expect(content).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/vault/image.jpg',
        expect.any(Object)
      );
    });

    test('exists - 文件存在时应该返回true', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', {
        status: 200,
        headers: new Headers({
          'content-length': '100',
          'content-type': 'text/plain'
        })
      }));

      const exists = await storageService.exists('test.txt');
      expect(exists).toBe(true);
    });

    test('exists - 文件不存在时应该返回false', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 404 }));

      const exists = await storageService.exists('nonexistent.txt');
      expect(exists).toBe(false);
    });

    test('getFileInfo - 应该返回正确的文件信息', async () => {
      const mockHeaders = new Headers({
        'content-length': '1234',
        'content-type': 'text/markdown',
        'last-modified': 'Wed, 01 Jan 2025 00:00:00 GMT',
        'etag': '"abc123"'
      });

      mockFetch.mockResolvedValueOnce(new Response('', {
        status: 200,
        headers: mockHeaders
      }));

      const fileInfo = await storageService.getFileInfo('test.md');

      expect(fileInfo).toEqual({
        path: 'test.md',
        size: 1234,
        mimeType: 'text/markdown',
        lastModified: new Date('Wed, 01 Jan 2025 00:00:00 GMT'),
        exists: true,
        etag: '"abc123"'
      });
    });

    test('readFileWithInfo - 应该返回文件内容和信息', async () => {
      const mockContent = 'Test content';
      const mockHeaders = new Headers({
        'content-length': '12',
        'content-type': 'text/plain',
        'last-modified': 'Wed, 01 Jan 2025 00:00:00 GMT'
      });

      mockFetch
        .mockResolvedValueOnce(new Response(mockContent))  // readFile
        .mockResolvedValueOnce(new Response('', { status: 200, headers: mockHeaders })); // getFileInfo

      const result = await storageService.readFileWithInfo('test.txt');

      expect(result.content).toBe(mockContent);
      expect(result.info.size).toBe(12);
      expect(result.info.mimeType).toBe('text/plain');
    });

    test('listFiles - 在非本地静态存储应该抛出错误', async () => {
      await expect(storageService.listFiles('/docs'))
        .rejects
        .toThrow(StorageError);
    });
  });

  describe('缓存功能', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
      await storageService.initialize();
    });

    test('应该缓存读取的文件', async () => {
      const mockContent = 'Cached content';
      mockFetch.mockResolvedValue(new Response(mockContent));

      // 第一次读取
      await storageService.readFile('test.txt');
      // 第二次读取应该使用缓存
      const content = await storageService.readFile('test.txt');

      expect(content).toBe(mockContent);
      // fetch 只应该被调用一次 (除了初始化时的健康检查)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('应该支持清除缓存', async () => {
      const mockContent = 'Content to cache';

      // 为每次fetch调用创建新的Response对象
      mockFetch
        .mockResolvedValueOnce(new Response(mockContent))  // 首次读取
        .mockResolvedValueOnce(new Response(mockContent)); // 缓存清除后读取

      // 读取文件
      await storageService.readFile('test.txt');

      // 清除缓存
      await storageService.clearCache('test.txt');

      // 再次读取应该重新fetch
      await storageService.readFile('test.txt');

      expect(mockFetch).toHaveBeenCalledTimes(3); // 健康检查 + 首次读取 + 缓存清除后读取
    });

    test('应该支持预加载文件', async () => {
      mockFetch.mockResolvedValue(new Response('preloaded content'));

      await storageService.preloadFiles(['file1.txt', 'file2.txt']);

      // 应该为每个文件发起请求 (加上健康检查)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('服务管理', () => {
    test('initialize - 应该进行健康检查', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

      await storageService.initialize();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/vault/',
        expect.objectContaining({
          method: 'HEAD',
          signal: expect.any(AbortSignal)
        })
      );
    });

    test('initialize - 健康检查失败时应该抛出错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(storageService.initialize())
        .rejects
        .toThrow(StorageError);
    });

    test('healthCheck - 应该正确检查服务状态', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));

      const isHealthy = await storageService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    test('healthCheck - 404状态也应该视为健康', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 404 }));

      const isHealthy = await storageService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    test('healthCheck - 网络错误应该返回false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await storageService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    test('未初始化时操作应该抛出错误', async () => {
      const uninitializedService = new StorageService(config);

      await expect(uninitializedService.readFile('test.txt'))
        .rejects
        .toThrow(StorageError);
    });

    test('dispose - 应该清理资源', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
      await storageService.initialize();

      await storageService.dispose();

      // 销毁后应该无法使用
      await expect(storageService.readFile('test.txt'))
        .rejects
        .toThrow(StorageError);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效路径', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
      await storageService.initialize();

      await expect(storageService.readFile('../../../etc/passwd'))
        .rejects
        .toThrow(StorageError);
    });

    test('应该处理网络超时', async () => {
      mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
      await storageService.initialize();

      mockFetch.mockRejectedValueOnce(new DOMException('Timeout', 'AbortError'));

      await expect(storageService.readFile('test.txt'))
        .rejects
        .toThrow(StorageError);
    });
  });
});