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
      const filePath = '/Users/sunyishen/Personal/repos/Helenite/public/vaults/Demo/Attachments/inversed mt fuji.png';
      
      try {
        const fileBuffer = readFileSync(filePath);
        console.log(`📁 File size: ${fileBuffer.length} bytes`);

        // Act - 直接使用 exifr 解析 (使用 Uint8Array)
        const uint8Array = new Uint8Array(fileBuffer);
        const rawExif = await exifr.parse(uint8Array, {
          gps: true,
          exif: true,
          ifd0: true,
          ifd1: true,
          interop: true,
          makerNote: false,
          userComment: false,
          translateKeys: true,
          translateValues: true,
          reviveValues: true
        });

        // Assert
        console.log('🔍 Raw EXIF data from exifr:', JSON.stringify(rawExif, null, 2));
        
        if (rawExif) {
          console.log('✅ EXIF data found!');
        } else {
          console.log('❌ No EXIF data in this PNG file');
        }

        // 这个文件实际上是 JPEG 格式（虽然扩展名是 .png）
        // 应该包含 EXIF 数据
        expect(rawExif).not.toBeNull();
        expect(rawExif.Make).toBe('HUAWEI');
        expect(rawExif.Model).toBe('VOG-AL10');
        expect(rawExif.latitude).toBeCloseTo(35.52, 1);
        expect(rawExif.longitude).toBeCloseTo(138.75, 1);
        
      } catch (error) {
        console.error('❌ Failed to read file:', error);
        throw error;
      }
    });

    it('应该测试目录中的其他图片文件', async () => {
      const attachmentsPath = '/Users/sunyishen/Personal/repos/Helenite/public/vaults/Demo/Attachments';
      const { readdirSync } = await import('fs');
      
      try {
        const files = readdirSync(attachmentsPath);
        const imageFiles = files.filter(file => 
          file.toLowerCase().match(/\.(jpg|jpeg|png|tiff|tif|webp|avif|heic|heif)$/)
        );

        console.log(`📁 Found ${imageFiles.length} image files:`);
        imageFiles.forEach(file => console.log(`  - ${file}`));

        // 测试每个图片文件
        for (const file of imageFiles) {
          const fullPath = `${attachmentsPath}/${file}`;
          console.log(`\n🔍 Testing: ${file}`);
          
          try {
            const fileBuffer = readFileSync(fullPath);
            const uint8Array = new Uint8Array(fileBuffer);
            const rawExif = await exifr.parse(uint8Array);
            
            if (rawExif) {
              console.log(`  ✅ Has EXIF data`);
              if (rawExif.latitude && rawExif.longitude) {
                console.log(`  📍 GPS: ${rawExif.latitude}, ${rawExif.longitude}`);
              }
              if (rawExif.Make) {
                console.log(`  📷 Camera: ${rawExif.Make} ${rawExif.Model || ''}`);
              }
            } else {
              console.log(`  ❌ No EXIF data`);
            }
          } catch (error) {
            console.log(`  ⚠️ Failed to parse: ${error}`);
          }
        }

        expect(imageFiles.length).toBeGreaterThan(0);
        
      } catch (error) {
        console.error('❌ Failed to read directory:', error);
        throw error;
      }
    });
  });
});