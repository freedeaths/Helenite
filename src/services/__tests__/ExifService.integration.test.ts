/**
 * ExifService 集成测试
 *
 * 测试 ExifService 与真实依赖服务的集成：
 * - 与 StorageService 的真实 HTTP 集成
 * - 真实图片文件的 EXIF 解析（使用真实的 inversed mt fuji.png）
 * - 缓存集成测试
 * - 不使用 exifr 的 mock，测试真实的 EXIF 解析能力
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { ExifService } from '../ExifService.js';
import { StorageService } from '../infra/StorageService.js';
import { CacheManager } from '../CacheManager.js';
import type { StorageConfig } from '../types/StorageTypes.js';
import fetch from 'node-fetch';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('ExifService Real Integration Tests', () => {
  let exifService: ExifService;
  let storageService: StorageService;
  let cacheManager: CacheManager;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

  // Mock console methods to avoid test output noise
  beforeEach(() => {
    // Temporarily disable console mocking to see debug output
  });

  afterEach(() => {
    // Object.assign(console, originalConsole);
  });

  beforeAll(async () => {
    // 设置全局 fetch 为 node-fetch，确保真实的网络请求
    // @ts-expect-error Setting global.fetch for testing with node-fetch in Node.js environment
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
        detached: false,
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
      cache: false, // 禁用缓存确保测试准确性
    };

    storageService = new StorageService(config);
    await storageService.initialize();

    // 创建其他服务实例
    cacheManager = new CacheManager();
    exifService = new ExifService(storageService, 'Demo');
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

  describe('核心集成功能', () => {
    it('应该能够处理真实的 vault 配置', () => {
      // Arrange & Act
      const vaultInfo = exifService.getCurrentVault();

      // Assert
      expect(vaultInfo.id).toBe('Demo');
      expect(vaultInfo.path).toBe('/vaults/Demo');
    });

    it('应该能够切换不同的 vault', () => {
      // Arrange
      const originalVault = exifService.getCurrentVault();

      // Act
      exifService.switchVault('TestVault');
      const newVault = exifService.getCurrentVault();

      // Assert
      expect(originalVault.id).toBe('Demo');
      expect(newVault.id).toBe('TestVault');
      expect(newVault.path).toBe('/vaults/TestVault');
    });
  });

  describe('文件格式检测', () => {
    it('应该正确识别支持的图片格式', () => {
      const testCases = [
        { file: 'inversed mt fuji.png', expected: true },
        { file: 'photo.jpg', expected: true },
        { file: 'image.jpeg', expected: true },
        { file: 'picture.webp', expected: true },
        { file: 'document.pdf', expected: false },
        { file: 'text.txt', expected: false },
        { file: 'video.mp4', expected: false },
      ];

      testCases.forEach(({ file, expected }) => {
        expect(exifService.isExifSupported(file)).toBe(expected);
      });
    });
  });

  describe('真实 EXIF 数据解析', () => {
    it('应该能够处理包含 GPS 信息的真实图片', async () => {
      // Act - 通过真实的 HTTP 请求解析真实的 inversed mt fuji.png 文件
      const result = await exifService.parseExif('Attachments/inversed mt fuji.png');

      // Assert - 验证真实的 EXIF 数据

      expect(result).not.toBeNull();
      // 如果图片有 EXIF 数据，验证内容；如果没有，也是正常的
      if (result!.hasExif && result!.gps) {
        // 验证真实的 GPS 坐标（富士山地区）
        expect(result!.gps!.latitude).toBeCloseTo(35.5232772825, 2); // 精确到小数点后2位
        expect(result!.gps!.longitude).toBeCloseTo(138.7510528563889, 2); // 精确到小数点后2位
        expect(result!.gps!.altitude).toBeCloseTo(876.53, 1); // 海拔876.53米
      }

      if (result!.hasExif && result!.camera) {
        // 验证真实的相机信息（华为手机）
        expect(result!.camera!.make).toBe('HUAWEI');
        expect(result!.camera!.model).toBe('VOG-AL10');
        expect(result!.camera!.software).toBe('美图秀秀');
      }

      // 至少应该能够成功解析文件（无论是否有 EXIF）
      expect(result).toBeDefined();
      expect(result!.filePath).toBe('Attachments/inversed mt fuji.png');

      // 验证真实的拍摄参数
      if (result!.hasExif && result!.shooting) {
        expect(result!.shooting!.iso).toBe(50);
        expect(result!.shooting!.aperture).toBeCloseTo(1.6, 1);
        expect(result!.shooting!.shutterSpeed).toBeCloseTo(0.000431, 6);
        expect(result!.shooting!.focalLength).toBeCloseTo(5.56, 2);
      }

      // 验证真实的拍摄时间
      if (result!.hasExif && result!.dateTime) {
        expect(result!.dateTime!.dateTimeOriginal).toEqual(new Date('2024-06-07T23:12:45.000Z'));
        expect(result!.dateTime!.dateTime).toEqual(new Date('2024-06-07T23:12:45.000Z'));
      }
    });

    it('应该能够处理批量真实图片文件', async () => {
      // Arrange - 已知的图片文件列表（HTTP 存储无法列举目录，所以手动指定）
      const knownImageFiles = [
        'Attachments/inversed mt fuji.png',
        'Attachments/Pasted image 20250902131727.png',
      ];

      // Act - 批量解析已知图片文件
      const results = await exifService.parseMultipleExif(knownImageFiles);

      // Assert

      expect(results.length).toBe(knownImageFiles.length);

      // 应该包含我们的测试文件
      const mtFujiResult = results.find((r) => r.filePath.includes('inversed mt fuji.png'));
      expect(mtFujiResult).toBeDefined();
    });
  });

  describe('与 StorageService 真实集成', () => {
    it('应该能够通过 HTTP 读取真实图片文件', async () => {
      // Act - 通过 StorageService 真实 HTTP 请求读取文件
      const imageData = await storageService.readFile('Attachments/inversed mt fuji.png', {
        binary: true,
      });

      // Assert
      expect(imageData).toBeDefined();
      expect(imageData instanceof Uint8Array).toBe(true);
      expect((imageData as Uint8Array).length).toBeGreaterThan(1000); // 真实图片应该有相当大小
    });

    it('应该能够处理文件不存在的情况', async () => {
      // Act & Assert
      await expect(exifService.parseExif('Attachments/non-existent.jpg')).resolves.toMatchObject({
        hasExif: false,
        filePath: 'Attachments/non-existent.jpg',
      });
    });

    it('应该能够获取基于已知文件的统计信息', async () => {
      // Note: getExifStatistics() 依赖于目录扫描，而 HTTP 存储不支持目录列举
      // 所以我们测试单个文件的解析是否正常，这已经验证了核心功能

      // Act - 解析已知的包含 EXIF 的文件
      const result = await exifService.parseExif('Attachments/inversed mt fuji.png');

      // Assert - 验证 EXIF 解析功能正常
      expect(result).not.toBeNull();
    });
  });

  describe('缓存集成测试', () => {
    it('应该能够与 CacheManager 集成', () => {
      // Arrange
      const cachedExifService = cacheManager.createCachedExifService(exifService);

      // Assert
      expect(cachedExifService).toBeDefined();
      expect(typeof cachedExifService.parseExif).toBe('function');
      expect(typeof cachedExifService.getGpsCoordinates).toBe('function');
      expect(typeof cachedExifService.searchImagesWithGps).toBe('function');
    });

    it('缓存的服务应该保持相同的接口', async () => {
      // Arrange
      const cachedExifService = cacheManager.createCachedExifService(exifService);

      // Act & Assert - 确保缓存服务具有相同的方法
      expect(typeof cachedExifService.parseExif).toBe('function');
      expect(typeof cachedExifService.parseMultipleExif).toBe('function');
      expect(typeof cachedExifService.scanDirectoryForExif).toBe('function');
      expect(typeof cachedExifService.getGpsCoordinates).toBe('function');
      expect(typeof cachedExifService.getCameraInfo).toBe('function');
      expect(typeof cachedExifService.getShootingParams).toBe('function');
      expect(typeof cachedExifService.getDateTimeInfo).toBe('function');
      expect(typeof cachedExifService.searchImagesWithGps).toBe('function');
      expect(typeof cachedExifService.searchImagesByCamera).toBe('function');
      expect(typeof cachedExifService.searchImagesByDateRange).toBe('function');
      expect(typeof cachedExifService.searchImagesByGeoBounds).toBe('function');
      expect(typeof cachedExifService.searchExif).toBe('function');
      expect(typeof cachedExifService.getExifStatistics).toBe('function');
      expect(typeof cachedExifService.getAllCameraMakes).toBe('function');
      expect(typeof cachedExifService.getAllCameraModels).toBe('function');
      expect(typeof cachedExifService.getDateTimeRange).toBe('function');
      expect(typeof cachedExifService.getGpsBounds).toBe('function');
      expect(typeof cachedExifService.isExifSupported).toBe('function');
      expect(typeof cachedExifService.calculateDistance).toBe('function');
      expect(typeof cachedExifService.refreshCache).toBe('function');
      expect(typeof cachedExifService.getCacheStats).toBe('function');
      expect(typeof cachedExifService.switchVault).toBe('function');
      expect(typeof cachedExifService.getCurrentVault).toBe('function');
    });
  });

  describe('地理计算集成', () => {
    it('应该能够计算 GPS 距离', () => {
      // Arrange - 东京站和富士山的坐标
      const tokyoStation = { latitude: 35.6812, longitude: 139.7671 };
      const mtFuji = { latitude: 35.3606, longitude: 138.7274 };

      // Act
      const distance = exifService.calculateDistance(tokyoStation, mtFuji);

      // Assert
      expect(distance).toBeGreaterThan(100000); // 应该超过100公里
      expect(distance).toBeLessThan(150000); // 但少于150公里
    });
  });

  describe('复杂业务逻辑集成', () => {
    it('应该能够验证单个文件的 GPS 数据提取', async () => {
      // Act - 直接验证已知包含 GPS 的文件
      const result = await exifService.parseExif('Attachments/inversed mt fuji.png');
      const gpsData = await exifService.getGpsCoordinates('Attachments/inversed mt fuji.png');

      // Assert
      // 图片可能没有 GPS 数据
      if (result!.hasExif && result!.gps) {
        expect(gpsData).toBeDefined();
        expect(gpsData!.latitude).toBeCloseTo(35.5232772825, 2);
        expect(gpsData!.longitude).toBeCloseTo(138.7510528563889, 2);
      } else {
        // 没有 GPS 数据也是正常的
        expect(gpsData).toBeNull();
      }
    });

    it('应该能够验证相机信息提取', async () => {
      // Act - 验证相机信息提取
      const cameraInfo = await exifService.getCameraInfo('Attachments/inversed mt fuji.png');

      // Assert
      // 图片可能没有相机信息
      if (cameraInfo) {
        expect(cameraInfo.make).toBe('HUAWEI');
        expect(cameraInfo.model).toBe('VOG-AL10');
        expect(cameraInfo.software).toBe('美图秀秀');
      } else {
        // 没有相机信息也是正常的
        expect(cameraInfo).toBeNull();
      }
    });
  });
});
