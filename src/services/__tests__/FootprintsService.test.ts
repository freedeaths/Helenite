/**
 * FootprintsService 单元测试
 *
 * 测试足迹数据管理服务的核心功能：
 * - GPX/KML 轨迹文件解析
 * - 多厂商支持（YAMAP, Garmin, 2bulu）
 * - 地理位置数据处理
 * - 边界计算和统计分析
 */

// Adding basic type safety for gpx-parser-builder imports

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FootprintsService } from '../FootprintsService';
import type {
  TrackData,
  LocationData,
  FootprintsConfig,
  GeoBounds
} from '../interfaces/IFootprintsService';
import type { IStorageService } from '../interfaces/IStorageService';


// Mock gpx-parser-builder
vi.mock('gpx-parser-builder', () => ({
  default: {
    parseGpx: vi.fn(),
    parse: vi.fn()
  }
}));

// Mock xml2js
vi.mock('xml2js', () => ({
  parseString: vi.fn()
}));

// Mock StorageService for unit tests
const createMockStorageService = (): IStorageService => {
  return {
    readFile: vi.fn(),
    readFileWithInfo: vi.fn(),
    exists: vi.fn(),
    getFileInfo: vi.fn(),
    listFiles: vi.fn(),
    normalizePath: vi.fn((path) => path),
    resolvePath: vi.fn((path) => path),
    isValidPath: vi.fn(() => true),
    getMimeType: vi.fn(() => 'text/plain'),
    isImageFile: vi.fn(() => false),
    isTrackFile: vi.fn((path) => path.endsWith('.gpx') || path.endsWith('.kml')),
    isMarkdownFile: vi.fn((path) => path.endsWith('.md')),
    clearCache: vi.fn(),
    preloadFiles: vi.fn(),
    initialize: vi.fn(),
    dispose: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    config: { basePath: '/test' }
  } as IStorageService;
};


describe('FootprintsService', () => {
  let service: FootprintsService;
  let mockStorageService: IStorageService;
  beforeEach(() => {
    mockStorageService = createMockStorageService();
    service = new FootprintsService(mockStorageService);
    vi.clearAllMocks();
  });

  // ===============================
  // 核心解析功能测试
  // ===============================

  describe('parseSingleTrack', () => {
    it('should parse a single GPX track file successfully', async () => {
      // Mock storage service response
      const gpxContent = `<?xml version="1.0"?>
        <gpx version="1.1" creator="YAMAP">
          <trk>
            <name>Test Track</name>
            <trkseg>
              <trkpt lat="35.6762" lon="139.6503">
                <ele>10.0</ele>
                <time>2024-01-01T12:00:00Z</time>
              </trkpt>
              <trkpt lat="35.6763" lon="139.6504">
                <ele>11.0</ele>
                <time>2024-01-01T12:01:00Z</time>
              </trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(gpxContent);

      // Mock GPX parser
      const { default: gpxParser } = await import('gpx-parser-builder');
      (gpxParser.parseGpx as ReturnType<typeof vi.fn>).mockReturnValue({
        trk: [{
          name: 'Test Track',
          trkseg: [{
            trkpt: [
              { $: { lat: '35.6762', lon: '139.6503' }, ele: '10.0', time: '2024-01-01T12:00:00Z' },
              { $: { lat: '35.6763', lon: '139.6504' }, ele: '11.0', time: '2024-01-01T12:01:00Z' }
            ]
          }]
        }]
      });

      const result = await service.parseSingleTrack('/test/track.gpx');

      expect(result.tracks).toHaveLength(1);
      expect(result.locations).toHaveLength(0);
      expect(result.metadata.totalTracks).toBe(1);
      expect(result.metadata.totalLocations).toBe(0);
      expect(result.metadata.errors).toHaveLength(0);

      const track = result.tracks[0];
      expect(track.name).toBe('Test Track');
      expect(track.waypoints).toHaveLength(2);
      expect(track.waypoints[0]).toMatchObject({
        latitude: 35.6762,
        longitude: 139.6503,
        elevation: 10.0
      });
      expect(track.provider).toBe('yamap');
      expect(track.style.color).toBe('#ff6b35'); // YAMAP 颜色
    });

    it('should handle parsing errors gracefully', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('File not found'));

      const result = await service.parseSingleTrack('/nonexistent/track.gpx');

      expect(result.tracks).toHaveLength(0);
      expect(result.locations).toHaveLength(0);
      expect(result.metadata.totalTracks).toBe(0);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0]).toMatchObject({
        filePath: '/nonexistent/track.gpx',
        error: 'File not found'
      });
    });

    it('should parse KML file with 2bulu provider', async () => {
      const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
        <kml xmlns="http://www.opengis.net/kml/2.2">
          <Document>
            <name>2bulu Track</name>
            <Placemark>
              <LineString>
                <coordinates>139.6503,35.6762,10 139.6504,35.6763,11</coordinates>
              </LineString>
            </Placemark>
          </Document>
        </kml>`;

      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(kmlContent);

      // Mock xml2js parser
      const { parseString } = await import('xml2js');
      (parseString as ReturnType<typeof vi.fn>).mockImplementation((_xml, callback) => {
        callback(null, {
          kml: {
            Document: {
              name: ['2bulu Track'],
              Placemark: [{
                LineString: {
                  coordinates: '139.6503,35.6762,10 139.6504,35.6763,11'
                }
              }]
            }
          }
        });
      });

      const result = await service.parseSingleTrack('/test/track.kml');

      expect(result.tracks).toHaveLength(1);
      const track = result.tracks[0];
      expect(track.name).toBe('2bulu Track');
      expect(track.provider).toBe('2bulu');
      expect(track.style.color).toBe('#e74c3c'); // 2bulu 颜色
      expect(track.waypoints).toHaveLength(2);
    });
  });

  describe('parseMultipleTracks', () => {
    it('should parse multiple track files', async () => {
      // Mock multiple fetch calls
      (mockStorageService.readFile as ReturnType<typeof vi.fn>) = vi.fn()
        .mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="YAMAP"><trk><name>Track 1</name></trk></gpx>`)
        .mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="Garmin"><trk><name>Track 2</name></trk></gpx>`);

      // Mock GPX parser for multiple calls
      const { default: gpxParser } = await import('gpx-parser-builder');
      (gpxParser.parseGpx as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ trk: [{ name: 'Track 1', trkseg: [] }] })
        .mockReturnValueOnce({ trk: [{ name: 'Track 2', trkseg: [] }] });

      const result = await service.parseMultipleTracks(['/test/track1.gpx', '/test/track2.gpx']);

      expect(result.tracks).toHaveLength(2);
      expect(result.locations).toHaveLength(0);
      expect(result.metadata.totalTracks).toBe(2);
      expect(result.metadata.errors).toHaveLength(0);

      expect(result.tracks[0].name).toBe('Track 1');
      expect(result.tracks[0].provider).toBe('yamap');
      expect(result.tracks[1].name).toBe('Track 2');
      expect(result.tracks[1].provider).toBe('garmin');
    });

    it('should handle mixed success and failure', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>) = vi.fn()
        .mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="YAMAP"><trk><name>Track 1</name></trk></gpx>`)
        .mockRejectedValueOnce(new Error('Track 2 not found'));

      const { default: gpxParser } = await import('gpx-parser-builder');
      (gpxParser.parseGpx as ReturnType<typeof vi.fn>)
        .mockReturnValueOnce({ trk: [{ name: 'Track 1', trkseg: [] }] });

      const result = await service.parseMultipleTracks(['/test/track1.gpx', '/test/track2.gpx']);

      expect(result.tracks).toHaveLength(1);
      expect(result.metadata.totalTracks).toBe(1);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].filePath).toBe('/test/track2.gpx');
    });
  });

  describe('aggregateFootprints', () => {
    it('should aggregate tracks and locations from config', async () => {
      const config: FootprintsConfig = {
        userInputs: ['tokyo', 'osaka'],
        visitedLocations: ['tokyo'],
        wantToVisitLocations: ['osaka'],
        attachmentsPath: '/test/attachments',
        includeTracks: true,
        visualization: {
          locationType: 'centerPoint',
          clustering: {
            enabled: true,
            maxDistance: 50,
            minPoints: 3
          }
        }
      };

      // Mock scanTrackFiles
      vi.spyOn(service, 'scanTrackFiles').mockResolvedValue(['/test/track1.gpx']);

      // Mock parseMultipleTracks
      vi.spyOn(service, 'parseMultipleTracks').mockResolvedValue({
        tracks: [{
          id: 'track1',
          name: 'Test Track',
          waypoints: [],
          placemarks: [],
          provider: 'yamap',
          style: { color: '#ff6b35', weight: 3, opacity: 0.8 },
          metadata: { source: 'gpx' }
        }],
        locations: [],
        metadata: { totalTracks: 1, totalLocations: 0, processingTime: 100, errors: [] }
      });

      // Mock processUserInputs
      vi.spyOn(service, 'processUserInputs').mockResolvedValue([]);

      // Mock processPhotoExif
      vi.spyOn(service, 'processPhotoExif').mockResolvedValue([]);

      const result = await service.aggregateFootprints(config);

      expect(result.tracks).toHaveLength(1);
      expect(result.metadata.totalTracks).toBe(1);
      expect(service.scanTrackFiles).toHaveBeenCalledWith('/test/attachments');
      expect(service.processUserInputs).toHaveBeenCalledWith(['tokyo', 'osaka']);
      expect(service.processPhotoExif).toHaveBeenCalledWith('/test/attachments');
    });

    it('should handle config without tracks', async () => {
      const config: FootprintsConfig = {
        userInputs: ['tokyo'],
        includeTracks: false,
        visualization: { locationType: 'centerPoint' }
      };

      vi.spyOn(service, 'processUserInputs').mockResolvedValue([]);

      const result = await service.aggregateFootprints(config);

      expect(result.tracks).toHaveLength(0);
      expect(result.metadata.totalTracks).toBe(0);
      expect(service.processUserInputs).toHaveBeenCalledWith(['tokyo']);
    });
  });

  // ===============================
  // 轨迹文件操作测试
  // ===============================

  describe('detectProvider', () => {
    it('should detect YAMAP provider from GPX content', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="YAMAP">`);

      const result = await service.detectProvider('/test/yamap.gpx');

      expect(result.provider).toBe('yamap');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect Garmin provider from GPX content', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="Garmin">`);

      const result = await service.detectProvider('/test/garmin.gpx');

      expect(result.provider).toBe('garmin');
      expect(result.confidence).toBe(1.0);
    });

    it('should detect 2bulu provider from KML content', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><kml><Document><name>2bulu track</name></Document></kml>`);

      const result = await service.detectProvider('/test/2bulu.kml');

      expect(result.provider).toBe('2bulu');
      expect(result.confidence).toBe(1.0);
    });

    it('should return unknown provider for unrecognized content', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><gpx creator="Unknown">`);

      const result = await service.detectProvider('/test/unknown.gpx');

      expect(result.provider).toBe('unknown');
      expect(result.confidence).toBe(0.1); // GenericGPXParser 提供兜底置信度
    });

    it('should handle file read errors', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('File not found'));

      const result = await service.detectProvider('/nonexistent.gpx');

      expect(result.provider).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });

  describe('validateTrackFile', () => {
    it('should validate GPX file format', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><gpx version="1.1">`);

      const result = await service.validateTrackFile('/test/valid.gpx');

      expect(result).toBe(true);
    });

    it('should validate KML file format', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2">`);

      const result = await service.validateTrackFile('/test/valid.kml');

      expect(result).toBe(true);
    });

    it('should reject invalid file format', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(`This is not a valid track file`);

      const result = await service.validateTrackFile('/test/invalid.txt');

      expect(result).toBe(false);
    });

    it('should handle file read errors', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('File not found'));

      const result = await service.validateTrackFile('/nonexistent.gpx');

      expect(result).toBe(false);
    });
  });

  describe('scanTrackFiles', () => {
    it('should return mock track files', async () => {
      const result = await service.scanTrackFiles('/test/attachments');

      expect(result).toHaveLength(2);
      expect(result).toContain('/test/attachments/track1.gpx');
      expect(result).toContain('/test/attachments/track2.kml');
    });
  });

  // ===============================
  // 数据处理和分析测试
  // ===============================

  describe('calculateTracksBounds', () => {
    it('should calculate bounds for multiple tracks', () => {
      const tracks: TrackData[] = [
        {
          id: 'track1',
          name: 'Track 1',
          waypoints: [
            { latitude: 35.6762, longitude: 139.6503 },
            { latitude: 35.6763, longitude: 139.6504 }
          ],
          placemarks: [],
          provider: 'yamap',
          style: { color: '#ff6b35', weight: 3, opacity: 0.8 },
          metadata: { source: 'gpx' }
        },
        {
          id: 'track2',
          name: 'Track 2',
          waypoints: [
            { latitude: 35.6765, longitude: 139.6505 },
            { latitude: 35.6760, longitude: 139.6500 }
          ],
          placemarks: [],
          provider: 'garmin',
          style: { color: '#0066cc', weight: 3, opacity: 0.8 },
          metadata: { source: 'gpx' }
        }
      ];

      const bounds = service.calculateTracksBounds(tracks);

      expect(bounds).toEqual({
        north: 35.6765,
        south: 35.6760,
        east: 139.6505,
        west: 139.6500
      });
    });

    it('should return zero bounds for empty tracks', () => {
      const bounds = service.calculateTracksBounds([]);

      expect(bounds).toEqual({
        north: 0,
        south: 0,
        east: 0,
        west: 0
      });
    });
  });

  describe('calculateLocationsBounds', () => {
    it('should calculate bounds for multiple locations', () => {
      const locations: LocationData[] = [
        {
          id: 'tokyo',
          type: 'city',
          name: 'tokyo',
          displayName: 'Tokyo',
          visitStatus: 'visited',
          visualization: {
            centerPoint: [139.6917, 35.6895]
          },
          aggregation: {
            photoCount: 5,
            userInputCount: 1,
            totalVisits: 3
          },
          sources: {
            photos: [],
            userInputs: []
          }
        },
        {
          id: 'osaka',
          type: 'city',
          name: 'osaka',
          displayName: 'Osaka',
          visitStatus: 'wantToVisit',
          visualization: {
            centerPoint: [135.5023, 34.6937]
          },
          aggregation: {
            photoCount: 0,
            userInputCount: 1,
            totalVisits: 0
          },
          sources: {
            photos: [],
            userInputs: []
          }
        }
      ];

      const bounds = service.calculateLocationsBounds(locations);

      expect(bounds).toEqual({
        north: 35.6895,
        south: 34.6937,
        east: 139.6917,
        west: 135.5023
      });
    });

    it('should return zero bounds for empty locations', () => {
      const bounds = service.calculateLocationsBounds([]);

      expect(bounds).toEqual({
        north: 0,
        south: 0,
        east: 0,
        west: 0
      });
    });
  });

  describe('mergeBounds', () => {
    it('should merge two bounds correctly', () => {
      const bounds1: GeoBounds = {
        north: 35.7,
        south: 35.6,
        east: 139.8,
        west: 139.6
      };

      const bounds2: GeoBounds = {
        north: 35.8,
        south: 35.5,
        east: 139.7,
        west: 139.5
      };

      const merged = service.mergeBounds(bounds1, bounds2);

      expect(merged).toEqual({
        north: 35.8,
        south: 35.5,
        east: 139.8,
        west: 139.5
      });
    });
  });

  describe('getTrackStatistics', () => {
    it('should return default statistics structure', () => {
      const track: TrackData = {
        id: 'track1',
        name: 'Test Track',
        waypoints: [
          { latitude: 35.6762, longitude: 139.6503, elevation: 10 },
          { latitude: 35.6763, longitude: 139.6504, elevation: 15 }
        ],
        placemarks: [],
        provider: 'yamap',
        style: { color: '#ff6b35', weight: 3, opacity: 0.8 },
        metadata: { source: 'gpx' }
      };

      const stats = service.getTrackStatistics(track);

      expect(stats).toMatchObject({
        totalDistance: expect.any(Number) as number,
        totalTime: expect.any(Number) as number,
        averageSpeed: expect.any(Number) as number,
        elevationGain: expect.any(Number) as number,
        elevationLoss: expect.any(Number) as number,
        maxElevation: expect.any(Number) as number,
        minElevation: expect.any(Number) as number
      });
    });
  });

  // ===============================
  // 地理编码测试
  // ===============================

  describe('geocodeLocation', () => {
    it('should return null for unimplemented geocoding', async () => {
      const result = await service.geocodeLocation('Tokyo');

      expect(result).toBeNull();
    });
  });

  // ===============================
  // 缓存和 Vault 管理测试
  // ===============================

  describe('refreshCache', () => {
    it('should execute without errors', async () => {
      await expect(service.refreshCache()).resolves.not.toThrow();
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats object', async () => {
      const stats = await service.getCacheStats();

      expect(stats).toEqual({});
    });
  });

  describe('getCurrentVault', () => {
    it('should return default vault info', () => {
      const vaultInfo = service.getCurrentVault();

      expect(vaultInfo).toEqual({
        id: 'default',
        path: '/vault'
      });
    });
  });

  describe('switchVault', () => {
    it('should execute without errors', () => {
      expect(() => service.switchVault('test-vault')).not.toThrow();
    });
  });

  // ===============================
  // 私有方法测试（通过公共接口）
  // ===============================

  describe('private methods (tested via public interface)', () => {
    it('should generate consistent track IDs', async () => {
      // 清除之前的mocks，确保测试隔离
      vi.clearAllMocks();
      vi.resetAllMocks();

      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`<?xml version="1.0"?><gpx creator="YAMAP"><trk><name>Test</name></trk></gpx>`);

      const { default: gpxParser } = await import('gpx-parser-builder');
      const mockParseGpx = vi.fn().mockReturnValue({
        trk: [{ name: 'Test', trkseg: [] }]
      });

      // 确保 mock 被正确应用
      (gpxParser as { parseGpx: typeof vi.fn }).parseGpx = mockParseGpx;

      const result1 = await service.parseSingleTrack('/test/track.gpx');
      const result2 = await service.parseSingleTrack('/test/track.gpx');

      expect(result1.tracks[0].id).toBe(result2.tracks[0].id);
    });

    it('should apply correct styles based on provider', async () => {
      const testCases = [
        { creator: 'YAMAP', provider: 'yamap', expectedColor: '#ff6b35' },
        { creator: 'Garmin', provider: 'garmin', expectedColor: '#0066cc' },
        { creator: 'Unknown', provider: 'unknown', expectedColor: '#3498db' }
      ];

      for (const testCase of testCases) {
        (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`<?xml version="1.0"?><gpx creator="${testCase.creator}"><trk><name>Test</name></trk></gpx>`);

        const { default: gpxParser } = await import('gpx-parser-builder');
        (gpxParser.parseGpx as ReturnType<typeof vi.fn>).mockReturnValue({
          trk: [{ name: 'Test', trkseg: [] }]
        });

        const result = await service.parseSingleTrack('/test/track.gpx');

        expect(result.tracks[0].style.color).toBe(testCase.expectedColor);
        expect(result.tracks[0].provider).toBe(testCase.provider);
      }
    });
  });

  // ===============================
  // 错误处理测试
  // ===============================

  describe('error handling', () => {
    it('should handle invalid GPX parser results', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`<?xml version="1.0"?><gpx></gpx>`);

      const { default: gpxParser } = await import('gpx-parser-builder');
      (gpxParser.parseGpx as ReturnType<typeof vi.fn>).mockReturnValue(null);

      const result = await service.parseSingleTrack('/test/empty.gpx');

      expect(result.tracks).toHaveLength(0);
      expect(result.metadata.errors).toHaveLength(1);
    });

    it('should handle XML parsing errors in KML', async () => {
      (mockStorageService.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(`<?xml version="1.0"?><kml>invalid xml`);

      const { parseString } = await import('xml2js');
      (parseString as ReturnType<typeof vi.fn>).mockImplementation((_xml, callback) => {
        callback(new Error('XML parsing error'), null);
      });

      const result = await service.parseSingleTrack('/test/invalid.kml');

      expect(result.tracks).toHaveLength(0);
      expect(result.metadata.errors).toHaveLength(1);
      expect(result.metadata.errors[0].error).toContain('XML parsing failed');
    });
  });

  // ===============================
  // 未实现功能测试
  // ===============================

  describe('unimplemented features', () => {
    it('should return empty arrays for user input processing', async () => {
      const result = await service.processUserInputs(['tokyo', 'osaka']);

      expect(result).toEqual([]);
    });

    it('should return empty arrays for photo EXIF processing', async () => {
      const result = await service.processPhotoExif('/test/photos');

      expect(result).toEqual([]);
    });
  });
});