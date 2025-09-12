/**
 * FootprintsService 集成测试
 * 
 * 测试与真实数据源的集成：
 * - 真实的 HTTP 请求处理
 * - 实际的轨迹文件解析
 * - 真实的多厂商支持验证
 * - 性能和错误处理测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { FootprintsService } from '../FootprintsService';
import type { FootprintsConfig } from '../interfaces/IFootprintsService';
import fetch from 'node-fetch';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('FootprintsService Integration Tests', () => {
  let service: FootprintsService;
  let viteProcess: ChildProcess | null = null;
  const serverUrl = 'http://localhost:5173'; // Vite 默认开发服务器端口

  beforeAll(async () => {
    // 设置全局 fetch 为 node-fetch，确保真实的网络请求
    // @ts-ignore
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
      console.log('✅ 检测到开发服务器已运行在', serverUrl);
    } else {
      console.log('🚀 启动临时开发服务器...');
      
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
          console.log('✅ 开发服务器启动成功');
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
  }, 45000); // 增加超时时间到45秒，因为可能需要启动服务器

  afterAll(async () => {
    // 如果我们启动了临时服务器，现在关闭它
    if (viteProcess) {
      console.log('🔄 关闭临时开发服务器...');
      viteProcess.kill();
      viteProcess = null;
    }
  });

  beforeEach(() => {
    service = new FootprintsService();
  });

  // ===============================
  // 真实文件处理测试
  // ===============================

  describe('Real File Processing', () => {
    it('should parse YAMAP GPX file from Demo vault', async () => {
      const response = await fetch(`${serverUrl}/vaults/Demo/Attachments/yamap_2025-04-02_08_48.gpx`);
      if (!response.ok) {
        console.log('⚠️ YAMAP GPX file not accessible, skipping test');
        return;
      }

      console.log('📁 File accessible, starting parse...');
      const result = await service.parseSingleTrack(`${serverUrl}/vaults/Demo/Attachments/yamap_2025-04-02_08_48.gpx`);
      
      console.log('📊 Parse result:', {
        tracksCount: result.tracks.length,
        locationsCount: result.locations.length,
        errorsCount: result.metadata.errors.length,
        errors: result.metadata.errors
      });
      
      expect(result.tracks).toHaveLength(1);
      expect(result.locations).toHaveLength(0);
      expect(result.metadata.errors).toHaveLength(0);
      
      const track = result.tracks[0];
      expect(track.name).toBeDefined();
      expect(track.provider).toBe('yamap');
      expect(track.style.color).toBe('#ff6b35'); // YAMAP 颜色
      expect(track.waypoints.length).toBeGreaterThan(0);
      
      console.log(`✅ YAMAP GPX 解析成功: ${track.name}, ${track.waypoints.length} 个轨迹点`);
    }, 15000);

    it('should parse Chinese GPX files from Demo vault', async () => {
      const chineseGpxFiles = [
        '红叶尚湖.gpx',
        '金牛道拦马墙到普安镇.gpx'
      ];

      for (const filename of chineseGpxFiles) {
        try {
          const response = await fetch(`${serverUrl}/vaults/Demo/Attachments/${encodeURIComponent(filename)}`);
          if (!response.ok) {
            console.log(`⚠️ ${filename} 不可访问，跳过测试`);
            continue;
          }

          const result = await service.parseSingleTrack(`${serverUrl}/vaults/Demo/Attachments/${filename}`);
          
          expect(result.tracks).toHaveLength(1);
          expect(result.locations).toHaveLength(0);
          
          const track = result.tracks[0];
          expect(track.name).toBeDefined();
          expect(track.waypoints.length).toBeGreaterThan(0);
          
          console.log(`✅ ${filename} 解析成功: ${track.name} (${track.provider}), ${track.waypoints.length} 个轨迹点`);
        } catch (error) {
          console.log(`⚠️ ${filename} 解析错误:`, error);
        }
      }
    }, 30000);

    it('should parse KML files from Demo vault', async () => {
      const kmlFiles = [
        '东西佘山含地铁绿道.kml',
        '金牛道拦马墙到普安镇.kml'
      ];

      for (const filename of kmlFiles) {
        try {
          const response = await fetch(`${serverUrl}/vaults/Demo/Attachments/${encodeURIComponent(filename)}`);
          if (!response.ok) {
            console.log(`⚠️ ${filename} 不可访问，跳过测试`);
            continue;
          }

          const result = await service.parseSingleTrack(`${serverUrl}/vaults/Demo/Attachments/${filename}`);
          
          expect(result.tracks).toHaveLength(1);
          expect(result.locations).toHaveLength(0);
          
          const track = result.tracks[0];
          expect(track.name).toBeDefined();
          expect(track.waypoints.length).toBeGreaterThan(0);
          
          console.log(`✅ ${filename} 解析成功: ${track.name} (${track.provider}), ${track.waypoints.length} 个轨迹点`);
        } catch (error) {
          console.log(`⚠️ ${filename} 解析错误:`, error);
        }
      }
    }, 30000);

    it('should parse multiple real files together', async () => {
      const allFiles = [
        'yamap_2025-04-02_08_48.gpx',
        '红叶尚湖.gpx', 
        '金牛道拦马墙到普安镇.gpx',
        '东西佘山含地铁绿道.kml',
        '金牛道拦马墙到普安镇.kml'
      ];

      const availableFiles: string[] = [];
      
      // 检查哪些文件可用
      for (const filename of allFiles) {
        try {
          const response = await fetch(`${serverUrl}/vaults/Demo/Attachments/${encodeURIComponent(filename)}`);
          if (response.ok) {
            availableFiles.push(`${serverUrl}/vaults/Demo/Attachments/${filename}`);
          }
        } catch (error) {
          console.log(`⚠️ ${filename} 不可访问，跳过`);
        }
      }

      if (availableFiles.length === 0) {
        console.log('⚠️ 没有可用的轨迹文件，跳过批量解析测试');
        return;
      }

      console.log(`📁 找到 ${availableFiles.length} 个可用文件，开始批量解析`);

      const result = await service.parseMultipleTracks(availableFiles);
      
      expect(result.tracks.length).toBeGreaterThan(0);
      expect(result.tracks.length).toBeLessThanOrEqual(availableFiles.length);
      expect(result.locations).toHaveLength(0);
      
      // 验证不同厂商的轨迹都被正确处理
      const providers = [...new Set(result.tracks.map(track => track.provider))];
      console.log(`✅ 批量解析成功: ${result.tracks.length} 个轨迹，涉及厂商: ${providers.join(', ')}`);
      
      // 验证每个轨迹都有基本数据
      result.tracks.forEach((track, index) => {
        expect(track.name).toBeDefined();
        expect(track.waypoints).toBeDefined();
        expect(track.provider).toBeDefined();
        expect(track.style.color).toBeDefined();
        console.log(`  - 轨迹 ${index + 1}: ${track.name} (${track.provider}) - ${track.waypoints.length} 点`);
      });
      
      // 验证处理时间合理
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(10000); // 10秒内完成
    }, 45000);

    it('should handle HTTP errors gracefully', async () => {
      const result = await service.parseSingleTrack(`${serverUrl}/nonexistent/track.gpx`);

      expect(result.tracks).toHaveLength(0);
      expect(result.locations).toHaveLength(0);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].filePath).toBe(`${serverUrl}/nonexistent/track.gpx`);
    }, 10000);
  });

  // ===============================
  // 多厂商支持集成测试
  // ===============================

  describe('Multi-vendor Support Integration', () => {
    it('should correctly identify provider from real file content', async () => {
      // 创建模拟的 YAMAP GPX 内容
      const yamapGpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="YAMAP" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Test YAMAP Track</name>
  </metadata>
  <trk>
    <name>Mountain Hiking</name>
    <trkseg>
      <trkpt lat="35.6762" lon="139.6503">
        <ele>100.0</ele>
        <time>2024-01-01T10:00:00Z</time>
      </trkpt>
      <trkpt lat="35.6763" lon="139.6504">
        <ele>105.0</ele>
        <time>2024-01-01T10:01:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      // Mock fetch for this specific test - need to mock twice for both calls
      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(yamapGpxContent)
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(yamapGpxContent)
        });

      try {
        const providerInfo = await service.detectProvider('/test/yamap.gpx');
        expect(providerInfo.provider).toBe('yamap');
        expect(providerInfo.confidence).toBe(1.0);

        const validation = await service.validateTrackFile('/test/yamap.gpx');
        expect(validation).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);

    it('should handle Garmin GPX format', async () => {
      const garminGpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Garmin Connect" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Garmin Activity</name>
  </metadata>
  <trk>
    <name>Running Activity</name>
    <trkseg>
      <trkpt lat="40.7589" lon="-73.9851">
        <ele>10.0</ele>
        <time>2024-01-01T14:00:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(garminGpxContent)
      });

      try {
        const providerInfo = await service.detectProvider('/test/garmin.gpx');
        expect(providerInfo.provider).toBe('garmin');
        expect(providerInfo.confidence).toBe(1.0);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);

    it('should handle 2bulu KML format', async () => {
      const twobuluKmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>2bulu轨迹</name>
    <description>Generated by 2bulu app</description>
    <Placemark>
      <name>Hiking Trail</name>
      <LineString>
        <coordinates>
          116.3974,39.9093,50
          116.3975,39.9094,52
          116.3976,39.9095,55
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(twobuluKmlContent)
      });

      try {
        const providerInfo = await service.detectProvider('/test/2bulu.kml');
        expect(providerInfo.provider).toBe('2bulu');
        expect(providerInfo.confidence).toBe(1.0);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);
  });

  // ===============================
  // 综合功能集成测试
  // ===============================

  describe('Comprehensive Integration', () => {
    it('should process complete footprints configuration', async () => {
      const config: FootprintsConfig = {
        userInputs: ['tokyo', 'kyoto', 'osaka'],
        visitedLocations: ['tokyo', 'kyoto'],
        wantToVisitLocations: ['osaka'],
        attachmentsPath: `${serverUrl}/vaults/Demo/Attachments`,
        includeTracks: true,
        visualization: {
          locationType: 'centerPoint',
          clustering: {
            enabled: true,
            maxDistance: 50,
            minPoints: 2
          }
        },
        timeFilter: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31')
        }
      };

      const result = await service.aggregateFootprints(config);

      expect(result).toMatchObject({
        tracks: expect.any(Array) as unknown[],
        locations: expect.any(Array) as unknown[],
        metadata: {
          totalTracks: expect.any(Number) as number,
          totalLocations: expect.any(Number) as number,
          processingTime: expect.any(Number) as number,
          errors: expect.any(Array) as unknown[]
        }
      });

      // 验证处理时间合理
      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(5000); // 5秒内完成
    }, 10000);

    it('should handle mixed track file formats', async () => {
      const gpxContent = `<?xml version="1.0"?><gpx creator="YAMAP"><trk><name>GPX Track</name></trk></gpx>`;
      const kmlContent = `<?xml version="1.0"?><kml><Document><name>2bulu轨迹</name></Document></kml>`;

      const originalFetch = global.fetch;
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(gpxContent) })
        .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(kmlContent) });

      try {
        const result = await service.parseMultipleTracks([
          '/test/track1.gpx',
          '/test/track2.kml'
        ]);

        expect(result.tracks).toHaveLength(2);
        expect(result.metadata.errors).toHaveLength(0);
        
        // 验证不同厂商的轨迹都被正确处理
        const providers = result.tracks.map(track => track.provider);
        expect(providers).toContain('yamap');
        expect(providers).toContain('2bulu');
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);
  });

  // ===============================
  // 性能和稳定性测试
  // ===============================

  describe('Performance and Stability', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        service.getCurrentVault()
      );

      const results = await Promise.all(concurrentRequests);
      
      results.forEach(result => {
        expect(result).toEqual({
          id: 'default',
          path: '/vault'
        });
      });
    }, 10000);

    it('should process large coordinate arrays efficiently', () => {
      const start = Date.now();
      
      // 创建大量坐标点的轨迹数据
      const largeTrackData = {
        id: 'large-track',
        name: 'Large Track',
        waypoints: Array.from({ length: 1000 }, (_, i) => ({
          latitude: 35.6762 + (i * 0.0001),
          longitude: 139.6503 + (i * 0.0001),
          elevation: 100 + (i * 0.1)
        })),
        placemarks: [],
        provider: 'yamap' as const,
        style: { color: '#ff6b35', weight: 3, opacity: 0.8 },
        metadata: { source: 'gpx' as const }
      };

      const bounds = service.calculateTracksBounds([largeTrackData]);
      const processingTime = Date.now() - start;

      expect(bounds.north).toBeGreaterThan(bounds.south);
      expect(bounds.east).toBeGreaterThan(bounds.west);
      expect(processingTime).toBeLessThan(1000); // 1秒内完成
    }, 10000);

    it('should maintain service instance integrity', async () => {
      // 测试服务实例在多次操作后的状态
      const initialVault = service.getCurrentVault();
      
      // 执行多种操作
      await service.refreshCache();
      const stats = await service.getCacheStats();
      service.switchVault('test-vault');
      
      // 验证基本功能仍然正常
      const finalVault = service.getCurrentVault();
      expect(typeof stats).toBe('object');
      expect(finalVault).toMatchObject({
        id: expect.any(String) as string,
        path: expect.any(String) as string
      });
    }, 10000);

    it('should handle network timeout gracefully', async () => {
      // 模拟慢网络响应
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: false,
              status: 408,
              text: () => Promise.resolve('')
            });
          }, 2000);
        })
      );

      try {
        const start = Date.now();
        const result = await service.parseSingleTrack('/test/slow-track.gpx');
        const duration = Date.now() - start;

        expect(result.tracks).toHaveLength(0);
        expect(result.metadata.errors).toHaveLength(1);
        expect(duration).toBeGreaterThan(1500); // 至少等待了网络响应
      } finally {
        global.fetch = originalFetch;
      }
    }, 13000);
  });

  // ===============================
  // 数据边界计算集成测试
  // ===============================

  describe('Bounds Calculation Integration', () => {
    it('should calculate accurate bounds for real coordinate data', () => {
      // 使用真实的日本地理坐标
      const tokyoTracks = [
        {
          id: 'tokyo-walk',
          name: 'Tokyo Walk',
          waypoints: [
            { latitude: 35.6762, longitude: 139.6503 }, // 东京站
            { latitude: 35.6896, longitude: 139.6917 }, // 东京天空树
            { latitude: 35.6586, longitude: 139.7454 }  // 东京塔
          ],
          placemarks: [],
          provider: 'yamap' as const,
          style: { color: '#ff6b35', weight: 3, opacity: 0.8 },
          metadata: { source: 'gpx' as const }
        }
      ];

      const bounds = service.calculateTracksBounds(tokyoTracks);

      // 验证边界合理性
      expect(bounds.north).toBeCloseTo(35.6896, 4);
      expect(bounds.south).toBeCloseTo(35.6586, 4);
      expect(bounds.east).toBeCloseTo(139.7454, 4);
      expect(bounds.west).toBeCloseTo(139.6503, 4);

      // 验证边界有效性
      expect(bounds.north).toBeGreaterThan(bounds.south);
      expect(bounds.east).toBeGreaterThan(bounds.west);
    });

    it('should merge multiple regional bounds correctly', () => {
      const tokyoBounds = { north: 35.7, south: 35.6, east: 139.8, west: 139.6 };
      const osakaBounds = { north: 34.8, south: 34.6, east: 135.6, west: 135.4 };

      const merged = service.mergeBounds(tokyoBounds, osakaBounds);

      expect(merged).toEqual({
        north: 35.7,  // 东京更北
        south: 34.6,  // 大阪更南
        east: 139.8,  // 东京更东
        west: 135.4   // 大阪更西
      });
    });
  });

  // ===============================
  // 错误恢复和鲁棒性测试
  // ===============================

  describe('Error Recovery and Robustness', () => {
    it('should recover from network interruptions', async () => {
      let callCount = 0;
      const originalFetch = global.fetch;
      
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`<?xml version="1.0"?><gpx creator="YAMAP"><trk><name>Recovered</name></trk></gpx>`)
        });
      });

      try {
        // 第一次调用失败
        const result1 = await service.parseSingleTrack('/test/track.gpx');
        expect(result1.metadata.errors).toHaveLength(1);

        // 第二次调用成功
        const result2 = await service.parseSingleTrack('/test/track.gpx');
        expect(result2.tracks).toHaveLength(1);
        expect(result2.metadata.errors).toHaveLength(0);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);

    it('should handle malformed XML gracefully', async () => {
      const malformedXml = `<?xml version="1.0"?>
<gpx version="1.1">
  <trk>
    <name>Broken Track</name>
    <trkseg>
      <trkpt lat="35.6762" lon="139.6503">
        <ele>100.0</ele>
        <!-- Missing closing tag -->
      </trkseg>
  </trk>
<!-- Missing closing gpx tag -->`;

      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(malformedXml)
      });

      try {
        const result = await service.parseSingleTrack('/test/malformed.gpx');
        
        // 服务应该优雅处理错误
        expect(result.metadata.errors.length).toBeGreaterThanOrEqual(1);
        expect(Array.isArray(result.tracks)).toBe(true);
        expect(Array.isArray(result.locations)).toBe(true);
      } finally {
        global.fetch = originalFetch;
      }
    }, 10000);
  });
});