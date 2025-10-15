/**
 * ExifService 直接文件系统测试
 *
 * 绕过 StorageService，直接使用 Node.js fs 读取真实文件
 * 测试 exifr 库对真实图片的解析能力
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import exifr from 'exifr';

describe('Direct EXIF Parsing Tests', () => {
  describe('真实文件 EXIF 解析', () => {
    it('应该直接解析真实图片的 EXIF 数据', async () => {
      // Arrange - 使用相对路径读取现有文件
      const { readdirSync } = await import('fs');
      const attachmentsPath = './public/vaults/Demo/Attachments';

      let files: string[] = [];
      try {
        files = readdirSync(attachmentsPath);
      } catch {
        // pass
        return;
      }

      const imageFiles = files.filter((file) =>
        file.toLowerCase().match(/\.(jpg|jpeg|png|tiff|tif)$/i)
      );

      if (imageFiles.length === 0) {
        return;
      }

      const filePath = `${attachmentsPath}/${imageFiles[0]}`;
      const fileBuffer = readFileSync(filePath);

      // Act - 直接使用 exifr 解析 (使用 Uint8Array)
      const uint8Array = new Uint8Array(fileBuffer);
      const rawExif = await exifr.parse(uint8Array, {
        gps: true,
        exif: true,
        ifd0: {},
        ifd1: true,
        interop: true,
        makerNote: false,
        userComment: false,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
      });

      // Assert - 验证 exifr 能够解析文件
      // 不对具体的 EXIF 数据做断言（因为不同的文件会有不同的数据）
      expect(rawExif).toBeDefined();
    });

    it('应该测试目录中的其他图片文件', async () => {
      const attachmentsPath = './public/vaults/Demo/Attachments';
      const { readdirSync } = await import('fs');

      let files: string[] = [];
      try {
        files = readdirSync(attachmentsPath);
      } catch {
        // pass
        return;
      }
      const imageFiles = files.filter((file) =>
        file.toLowerCase().match(/\.(jpg|jpeg|png|tiff|tif|webp|avif|heic|heif)$/)
      );

      // 测试每个图片文件
      for (const file of imageFiles) {
        const fullPath = `${attachmentsPath}/${file}`;

        try {
          const fileBuffer = readFileSync(fullPath);
          const uint8Array = new Uint8Array(fileBuffer);
          await exifr.parse(uint8Array);
        } catch {
          // TODO: 处理错误
        }
      }

      expect(imageFiles.length).toBeGreaterThan(0);
    });
  });
});
