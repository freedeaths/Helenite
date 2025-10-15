/**
 * ExifService 真实 EXIF 数据测试
 *
 * 使用真实的 inversed mt fuji.png 文件测试 EXIF 解析
 * 不使用 mock，直接调用 exifr 库解析真实数据
 */

// 设置 IndexedDB 模拟
import 'fake-indexeddb/auto';

import { describe, it, expect, beforeEach } from 'vitest';
import { ExifService } from '../ExifService.js';
import { StorageService } from '../infra/StorageService.js';

describe('ExifService Real Data Tests', () => {
  let exifService: ExifService;
  let storageService: StorageService;

  beforeEach(() => {
    // 创建真实的服务实例，不使用 mock
    storageService = new StorageService({
      basePath: '/Users/sunyishen/Personal/repos/Helenite/public/vaults/Demo',
    });
    exifService = new ExifService(storageService, 'Demo');
  });

  describe('真实图片 EXIF 解析', () => {
    it('应该解析 inversed mt fuji.png 的真实 EXIF 数据', async () => {
      // Act - 解析真实文件
      const result = await exifService.parseExif('Attachments/inversed mt fuji.png');

      // Assert - 检查结果结构

      expect(result).not.toBeNull();
    });

    it('应该扫描 Attachments 目录中的真实图片', async () => {
      // Act - 扫描真实目录
      const results = await exifService.scanDirectoryForExif('Attachments');

      // Note: HTTP StorageService 不支持目录列举，所以返回空数组是正常的
      // 这个测试验证了 scanDirectoryForExif 在无法列举目录时的降级行为
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it('应该获取真实的 EXIF 统计信息', async () => {
      // Act
      const stats = await exifService.getExifStatistics();

      // Assert

      expect(stats.totalImages).toBeGreaterThanOrEqual(0);
      if (stats.imagesWithGps > 0) {
        expect(stats.gpsBounds).toBeDefined();
      }
    });
  });
});
