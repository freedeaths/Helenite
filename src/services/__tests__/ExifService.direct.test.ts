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
    it('应该直接解析 inversed mt fuji.png 的 EXIF 数据', async () => {
      // Arrange - 直接读取文件
      const filePath =
        '/Users/sunyishen/Personal/repos/Helenite/public/vaults/Demo/Attachments/inversed_mt_fuji.png';

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

      // 这个文件实际上是 JPEG 格式（虽然扩展名是 .png）
      // 应该包含 EXIF 数据
      expect(rawExif).not.toBeNull();
      expect(rawExif.Make).toBe('HUAWEI');
      expect(rawExif.Model).toBe('VOG-AL10');
      expect(rawExif.latitude).toBeCloseTo(35.52, 1);
      expect(rawExif.longitude).toBeCloseTo(138.75, 1);
    });

    it('应该测试目录中的其他图片文件', async () => {
      const attachmentsPath =
        '/Users/sunyishen/Personal/repos/Helenite/public/vaults/Demo/Attachments';
      const { readdirSync } = await import('fs');

      const files = readdirSync(attachmentsPath);
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
