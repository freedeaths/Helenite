/**
 * FootprintsService 实现
 * 
 * 统一的足迹数据管理服务，支持：
 * - GPX/KML 轨迹文件解析（多厂商支持）
 * - 地理位置数据聚合（用户输入 + 照片 EXIF）
 * - 统一的地图数据输出接口
 */

import type { 
  IFootprintsService, 
  TrackPoint, 
  TrackPhoto, 
  TrackData, 
  LocationData,
  GeoBounds,
  FootprintsConfig,
  FootprintsData
} from './interfaces/IFootprintsService';

// 重用现有的解析器基础架构，但转换数据结构
interface TrackDataParser {
  canParse(content: string): boolean;
  parse(content: string): Promise<UnifiedTrackData>;
  getProviderInfo(content: string): { provider: string; confidence: number };
}

// 桥接：老数据结构 → 新数据结构
interface UnifiedTrackData {
  name: string;
  description?: string;
  trackPoints: Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    time?: Date;
    name?: string;
    description?: string;
  }>;
  photos: Array<{
    url: string;
    name?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    time?: Date;
    thumbnailUrl?: string;
  }>;
  metadata: {
    source: 'gpx' | 'kml';
    provider?: 'yamap' | 'garmin' | '2bulu' | 'foooooot' | 'google' | 'unknown';
    totalDistance?: number;
    totalTime?: number;
    maxElevation?: number;
    minElevation?: number;
  };
}

// GPX 解析器基类（保留现有逻辑）
abstract class BaseGPXParser implements TrackDataParser {
  canParse(content: string): boolean {
    return content.trim().startsWith('<?xml') && content.includes('<gpx');
  }

  abstract parse(content: string): Promise<UnifiedTrackData>;
  abstract getProviderInfo(content: string): { provider: string; confidence: number };

  protected parseGPXContent(gpxObject: unknown): Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    time?: Date;
    name?: string;
    description?: string;
  }> {
    const points: Array<{
      latitude: number;
      longitude: number;
      elevation?: number;
      time?: Date;
      name?: string;
      description?: string;
    }> = [];

    // 使用TrackMap.tsx的全面方法处理轨迹点
    const gpx = gpxObject as Record<string, unknown>;
    
    // 处理轨迹点 - 多种可能的结构 (复制TrackMap.tsx逻辑)
    const trackSources = [
      gpx.trk,
      gpx.gpx?.trk,
      gpx.tracks,
      gpx.gpx?.tracks
    ].filter(Boolean);

    for (const trackArray of trackSources) {
      if (Array.isArray(trackArray)) {
        trackArray.forEach((track: Record<string, unknown>) => {
          const segmentSources = [
            track.trkseg,
            track.segments,
            track.trackSegments
          ].filter(Boolean);

          for (const segmentArray of segmentSources) {
            if (Array.isArray(segmentArray)) {
              segmentArray.forEach((segment: Record<string, unknown>) => {
                const pointSources = [
                  segment.trkpt,
                  segment.points,
                  segment.trackPoints
                ].filter(Boolean);

                for (const pointArray of pointSources) {
                  if (Array.isArray(pointArray)) {
                    pointArray.forEach((point: Record<string, unknown>) => {
                      const lat = point.$.lat || point.lat || point['@_lat'] || point.latitude;
                      const lon = point.$.lon || point.lon || point['@_lon'] || point.longitude;
                      
                      if (lat && lon) {
                        const trackPoint: {
                          latitude: number;
                          longitude: number;
                          elevation?: number;
                          time?: Date;
                          name?: string;
                          description?: string;
                        } = {
                          latitude: parseFloat(String(lat)),
                          longitude: parseFloat(String(lon)),
                        };

                        // 高程
                        if (point.ele) {
                          trackPoint.elevation = parseFloat(String(point.ele));
                        }

                        // 时间
                        if (point.time) {
                          trackPoint.time = new Date(String(point.time));
                        }

                        // 名称和描述
                        if (point.name) {
                          trackPoint.name = String(point.name);
                        }
                        if (point.desc) {
                          trackPoint.description = String(point.desc);
                        }

                        points.push(trackPoint);
                      }
                    });
                  }
                }
              });
            }
          }
        });
      }
    }

    return points;
  }

  protected parseWaypoints(gpxObject: unknown): Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    time?: Date;
    name?: string;
    description?: string;
  }> {
    const waypoints: Array<{
      latitude: number;
      longitude: number;
      elevation?: number;
      time?: Date;
      name?: string;
      description?: string;
    }> = [];

    const gpx = gpxObject as Record<string, unknown>;
    
    // 处理航点 - 使用TrackMap.tsx的方法
    const waypointSources = [gpx.wpt, gpx.gpx?.wpt, gpx.waypoints].filter(Boolean);
    waypointSources.forEach(wptArray => {
      if (Array.isArray(wptArray)) {
        wptArray.forEach((waypoint: Record<string, unknown>) => {
          const lat = waypoint['@_lat'] || waypoint.$.lat || waypoint.lat || waypoint.latitude;
          const lon = waypoint['@_lon'] || waypoint.$.lon || waypoint.lon || waypoint.longitude;
          
          if (lat && lon) {
            waypoints.push({
              latitude: parseFloat(String(lat)),
              longitude: parseFloat(String(lon)),
              elevation: waypoint.ele ? parseFloat(String(waypoint.ele)) : undefined,
              time: waypoint.time ? new Date(String(waypoint.time)) : undefined,
              name: waypoint.name ? String(waypoint.name) : 'Waypoint',
              description: waypoint.desc || waypoint.description ? String(waypoint.desc || waypoint.description) : ''
            });
          }
        });
      }
    });

    return waypoints;
  }
}

// KML 解析器基类（保留现有逻辑）
abstract class BaseKMLParser implements TrackDataParser {
  canParse(content: string): boolean {
    return content.trim().startsWith('<?xml') && content.includes('<kml');
  }

  abstract parse(content: string): Promise<UnifiedTrackData>;
  abstract getProviderInfo(content: string): { provider: string; confidence: number };

  protected parseKMLPhotos(kmlObject: unknown): Array<{
    url: string;
    name?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    time?: Date;
    thumbnailUrl?: string;
  }> {
    const photos: Array<{
      url: string;
      name?: string;
      description?: string;
      latitude?: number;
      longitude?: number;
      time?: Date;
      thumbnailUrl?: string;
    }> = [];

    const kml = kmlObject as Record<string, unknown>;
    const document = kml.Document as Record<string, unknown>;
    
    if (document && document.Placemark && Array.isArray(document.Placemark)) {
      document.Placemark.forEach((placemark: unknown) => {
        const placemarkObj = placemark as Record<string, unknown>;
        if (placemarkObj.description && placemarkObj.Point) {
          const description = String(placemarkObj.description);
          const imgMatches = description.match(/<img[^>]+src="([^"]+)"/gi);
          
          if (imgMatches) {
            const point = placemarkObj.Point as Record<string, unknown>;
            if (point.coordinates) {
              const coords = String(point.coordinates).split(',');
              const longitude = parseFloat(coords[0]);
              const latitude = parseFloat(coords[1]);

              imgMatches.forEach((imgMatch: string) => {
                const urlMatch = imgMatch.match(/src="([^"]+)"/);
                if (urlMatch) {
                  photos.push({
                    url: urlMatch[1],
                    name: placemarkObj.name ? String(placemarkObj.name) : 'Photo',
                    description: description,
                    latitude,
                    longitude,
                    time: (placemarkObj.TimeStamp as Record<string, unknown>)?.when 
                      ? new Date(String((placemarkObj.TimeStamp as Record<string, unknown>).when)) 
                      : undefined
                  });
                }
              });
            }
          }
        }
      });
    }

    return photos;
  }

  protected parseKMLTracks(kmlObject: unknown): Array<{
    latitude: number;
    longitude: number;
    elevation?: number;
    time?: Date;
    name?: string;
    description?: string;
  }> {
    const points: Array<{
      latitude: number;
      longitude: number;
      elevation?: number;
      time?: Date;
      name?: string;
      description?: string;
    }> = [];

    const kml = kmlObject as Record<string, unknown>;
    const document = kml.Document as Record<string, unknown>;
    
    if (document && document.Placemark && Array.isArray(document.Placemark)) {
      document.Placemark.forEach((placemark: unknown) => {
        const placemarkObj = placemark as Record<string, unknown>;
        const lineString = placemarkObj.LineString as Record<string, unknown>;
        
        if (lineString && lineString.coordinates) {
          const coordinatesStr = String(lineString.coordinates);
          const coordLines = coordinatesStr.trim().split(/[\n\r]+/);
          
          coordLines.forEach((line: string) => {
            const coords = line.trim().split(/[\s,]+/); // 支持空格和逗号分隔
            for (let i = 0; i < coords.length; i += 3) {
              if (i + 1 < coords.length) {
                const longitude = parseFloat(coords[i]);
                const latitude = parseFloat(coords[i + 1]);
                const elevation = i + 2 < coords.length ? parseFloat(coords[i + 2]) : undefined;

                if (!isNaN(longitude) && !isNaN(latitude)) {
                  points.push({
                    latitude,
                    longitude,
                    elevation,
                    name: placemarkObj.name ? String(placemarkObj.name) : undefined
                  });
                }
              }
            }
          });
        }
      });
    }

    return points;
  }
}

// YAMAP GPX 解析器
class YamapGPXParser extends BaseGPXParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('creator="YAMAP') || content.includes('YAMAP')) {
      return { provider: 'yamap', confidence: 1.0 };
    }
    return { provider: 'yamap', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    const gpxParserModule = await import('gpx-parser-builder');
    
    // 动态导入需要访问 default 属性
    const gpxParser = gpxParserModule.default || gpxParserModule;
    
    // 尝试多种解析方式 (参考TrackMap.tsx的成功实现)
    let gpxObject;
    let parseError;

    // 方法1: 尝试直接调用 parseGpx
    try {
      if (gpxParser.parseGpx && typeof gpxParser.parseGpx === 'function') {
        gpxObject = gpxParser.parseGpx(content);
      }
    } catch (err) {
      parseError = err;
    }

    // 方法2: 尝试调用 parse
    if (!gpxObject) {
      try {
        if (gpxParser.parse && typeof gpxParser.parse === 'function') {
          gpxObject = gpxParser.parse(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    // 方法3: 尝试直接调用 gpxParser 作为函数 (TrackMap.tsx 的方法)
    if (!gpxObject) {
      try {
        if (typeof gpxParser === 'function') {
          gpxObject = gpxParser(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    if (!gpxObject) {
      throw new Error(`GPX parser returned null or undefined. Last error: ${(parseError as Error)?.message || 'Unknown error'}`);
    }

    console.log('🔍 YamapGPXParser - GPX Object keys:', Object.keys(gpxObject));
    console.log('🔍 YamapGPXParser - GPX Object structure:', JSON.stringify(gpxObject, null, 2).substring(0, 1000));

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);
    
    console.log('🔍 YamapGPXParser - Parsed track points:', trackPoints.length);
    console.log('🔍 YamapGPXParser - Parsed waypoints:', waypoints.length);

    return {
      name: (gpxObject as Record<string, unknown>).metadata?.name?.[0] || 
            (gpxObject as Record<string, unknown>).trk?.[0]?.name || 'YAMAP Track',
      description: (gpxObject as Record<string, unknown>).metadata?.desc?.[0] || 
                   (gpxObject as Record<string, unknown>).trk?.[0]?.desc,
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'yamap',
        totalDistance: this.calculateDistance(trackPoints),
        totalTime: this.calculateDuration(trackPoints),
        maxElevation: this.getMaxElevation(trackPoints),
        minElevation: this.getMinElevation(trackPoints),
      }
    };
  }

  private calculateDistance(points: Array<{ latitude: number; longitude: number }>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.haversineDistance(points[i-1], points[i]);
    }
    return total;
  }

  private calculateDuration(points: Array<{ time?: Date }>): number {
    if (points.length < 2 || !points[0].time || !points[points.length-1].time) {
      return 0;
    }
    return (points[points.length-1].time!.getTime() - points[0].time!.getTime()) / 1000 / 60;
  }

  private getMaxElevation(points: Array<{ elevation?: number }>): number {
    const elevations = points.filter(p => p.elevation).map(p => p.elevation!);
    return elevations.length > 0 ? Math.max(...elevations) : 0;
  }

  private getMinElevation(points: Array<{ elevation?: number }>): number {
    const elevations = points.filter(p => p.elevation).map(p => p.elevation!);
    return elevations.length > 0 ? Math.min(...elevations) : 0;
  }

  private haversineDistance(point1: { latitude: number; longitude: number }, point2: { latitude: number; longitude: number }): number {
    const R = 6371000; // 地球半径（米）
    const lat1Rad = point1.latitude * Math.PI / 180;
    const lat2Rad = point2.latitude * Math.PI / 180;
    const deltaLatRad = (point2.latitude - point1.latitude) * Math.PI / 180;
    const deltaLonRad = (point2.longitude - point1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }
}

// Garmin GPX 解析器
class GarminGPXParser extends BaseGPXParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('Garmin') || content.includes('garmin')) {
      return { provider: 'garmin', confidence: 1.0 };
    }
    return { provider: 'garmin', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    const gpxParserModule = await import('gpx-parser-builder');
    
    // 动态导入需要访问 default 属性
    const gpxParser = gpxParserModule.default || gpxParserModule;
    
    // 使用相同的多种解析方式 (参考TrackMap.tsx)
    let gpxObject;
    let parseError;

    // 方法1: 尝试直接调用 parseGpx
    try {
      if (gpxParser.parseGpx && typeof gpxParser.parseGpx === 'function') {
        gpxObject = gpxParser.parseGpx(content);
      }
    } catch (err) {
      parseError = err;
    }

    // 方法2: 尝试调用 parse
    if (!gpxObject) {
      try {
        if (gpxParser.parse && typeof gpxParser.parse === 'function') {
          gpxObject = gpxParser.parse(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    // 方法3: 尝试直接调用 gpxParser 作为函数 (TrackMap.tsx 的方法)
    if (!gpxObject) {
      try {
        if (typeof gpxParser === 'function') {
          gpxObject = gpxParser(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    if (!gpxObject) {
      throw new Error(`GPX parser failed. Last error: ${(parseError as Error)?.message || 'Unknown error'}`);
    }

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name: (gpxObject as Record<string, unknown>).metadata?.name?.[0] || 
            (gpxObject as Record<string, unknown>).trk?.[0]?.name || 'Garmin Track',
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'garmin'
      }
    };
  }
}

// 2bulu KML 解析器
class TwobuluKMLParser extends BaseKMLParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('2bulu') || content.includes('二步路')) {
      return { provider: '2bulu', confidence: 1.0 };
    }
    return { provider: '2bulu', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    const { parseString } = await import('xml2js');
    
    return new Promise((resolve, reject) => {
      parseString(content, (err: unknown, result: unknown) => {
        if (err) {
          reject(err);
          return;
        }

        const parsed = result as Record<string, unknown>;
        const kml = parsed.kml;
        const trackPoints = this.parseKMLTracks(kml);
        const photos = this.parseKMLPhotos(kml);

        resolve({
          name: (kml as Record<string, unknown>).Document?.name?.[0] || '2bulu Track',
          description: (kml as Record<string, unknown>).Document?.description?.[0],
          trackPoints,
          photos,
          metadata: {
            source: 'kml',
            provider: '2bulu'
          }
        });
      });
    });
  }
}

// 通用 GPX 解析器
class GenericGPXParser extends BaseGPXParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    return { provider: 'unknown', confidence: 0.1 }; // 低置信度兜底
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    const gpxParserModule = await import('gpx-parser-builder');
    
    // 动态导入需要访问 default 属性
    const gpxParser = gpxParserModule.default || gpxParserModule;
    
    // 使用相同的多种解析方式 (参考TrackMap.tsx)
    let gpxObject;
    let parseError;

    // 方法1: 尝试直接调用 parseGpx
    try {
      if (gpxParser.parseGpx && typeof gpxParser.parseGpx === 'function') {
        gpxObject = gpxParser.parseGpx(content);
      }
    } catch (err) {
      parseError = err;
    }

    // 方法2: 尝试调用 parse
    if (!gpxObject) {
      try {
        if (gpxParser.parse && typeof gpxParser.parse === 'function') {
          gpxObject = gpxParser.parse(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    // 方法3: 尝试直接调用 gpxParser 作为函数 (TrackMap.tsx 的方法)
    if (!gpxObject) {
      try {
        if (typeof gpxParser === 'function') {
          gpxObject = gpxParser(content);
        }
      } catch (err) {
        parseError = err;
      }
    }

    if (!gpxObject) {
      throw new Error(`GPX parser failed. Last error: ${(parseError as Error)?.message || 'Unknown error'}`);
    }

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name: (gpxObject as Record<string, unknown>).metadata?.name?.[0] || 
            (gpxObject as Record<string, unknown>).trk?.[0]?.name || 'Unknown Track',
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'unknown'
      }
    };
  }
}

// 解析器工厂
class TrackDataParserFactory {
  private parsers: TrackDataParser[] = [
    new YamapGPXParser(),
    new GarminGPXParser(),
    new TwobuluKMLParser(),
    new GenericGPXParser(), // 兜底解析器
  ];

  async parseTrackData(content: string): Promise<UnifiedTrackData> {
    // 找到最匹配的解析器
    let bestParser: TrackDataParser | null = null;
    let bestConfidence = 0;

    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const { confidence } = parser.getProviderInfo(content);
        if (confidence > bestConfidence) {
          bestParser = parser;
          bestConfidence = confidence;
        }
      }
    }

    if (!bestParser) {
      // 如果没有找到特定的解析器，使用通用解析器
      bestParser = this.parsers.find(p => p.canParse(content)) || null;
    }

    if (!bestParser) {
      throw new Error('No suitable parser found for this track data format');
    }

    const result = await bestParser.parse(content);
    
    // 如果解析器没有检测到厂商，再次检测
    if (!result.metadata.provider || result.metadata.provider === 'unknown') {
      for (const parser of this.parsers) {
        const { provider, confidence } = parser.getProviderInfo(content);
        if (confidence > 0) {
          result.metadata.provider = provider as 'yamap' | 'garmin' | '2bulu' | 'foooooot' | 'google' | 'unknown';
          break;
        }
      }
    }
    
    return result;
  }
}

export class FootprintsService implements IFootprintsService {
  private parserFactory = new TrackDataParserFactory();

  // ===============================
  // 核心解析功能
  // ===============================

  async parseSingleTrack(filePath: string): Promise<FootprintsData> {
    try {
      const content = await this.fetchFileContent(filePath);
      const unifiedTrack = await this.parserFactory.parseTrackData(content);
      const trackData = this.transformToTrackData(unifiedTrack, filePath);

      return {
        tracks: [trackData],
        locations: [],
        metadata: {
          totalTracks: 1,
          totalLocations: 0,
          processingTime: Date.now(),
          errors: []
        }
      };
    } catch (error) {
      return {
        tracks: [],
        locations: [],
        metadata: {
          totalTracks: 0,
          totalLocations: 0,
          processingTime: Date.now(),
          errors: [{
            filePath,
            error: error instanceof Error ? error.message : String(error)
          }]
        }
      };
    }
  }

  async parseMultipleTracks(filePaths: string[]): Promise<FootprintsData> {
    const startTime = Date.now();
    const tracks: TrackData[] = [];
    const errors: Array<{ filePath: string; error: string }> = [];

    await Promise.all(filePaths.map(async (filePath) => {
      try {
        const content = await this.fetchFileContent(filePath);
        const unifiedTrack = await this.parserFactory.parseTrackData(content);
        const trackData = this.transformToTrackData(unifiedTrack, filePath);
        tracks.push(trackData);
      } catch (error) {
        errors.push({
          filePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }));

    return {
      tracks,
      locations: [],
      metadata: {
        totalTracks: tracks.length,
        totalLocations: 0,
        processingTime: Date.now() - startTime,
        errors
      }
    };
  }

  async aggregateFootprints(config: FootprintsConfig): Promise<FootprintsData> {
    const startTime = Date.now();
    let tracks: TrackData[] = [];
    let locations: LocationData[] = [];
    const errors: Array<{ filePath: string; error: string }> = [];

    // 处理轨迹文件
    if (config.includeTracks && config.attachmentsPath) {
      try {
        const trackFiles = await this.scanTrackFiles(config.attachmentsPath);
        const trackResult = await this.parseMultipleTracks(trackFiles);
        tracks = trackResult.tracks;
        errors.push(...trackResult.metadata.errors);
      } catch (error) {
        errors.push({
          filePath: config.attachmentsPath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 处理用户输入位置
    if (config.userInputs) {
      try {
        const userLocations = await this.processUserInputs(config.userInputs);
        locations.push(...userLocations);
      } catch (error) {
        errors.push({
          filePath: 'userInputs',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 处理照片 EXIF
    if (config.attachmentsPath) {
      try {
        const photoLocations = await this.processPhotoExif(config.attachmentsPath);
        locations.push(...photoLocations);
      } catch (error) {
        errors.push({
          filePath: config.attachmentsPath + '/photos',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      tracks,
      locations,
      metadata: {
        totalTracks: tracks.length,
        totalLocations: locations.length,
        processingTime: Date.now() - startTime,
        errors
      }
    };
  }

  // ===============================
  // 轨迹文件操作
  // ===============================

  async scanTrackFiles(dirPath: string): Promise<string[]> {
    // 模拟实现：在实际项目中需要实现文件系统扫描
    // 这里返回模拟的轨迹文件路径
    return [
      `${dirPath}/track1.gpx`,
      `${dirPath}/track2.kml`,
    ];
  }

  async detectProvider(filePath: string): Promise<{ provider: string; confidence: number }> {
    try {
      const content = await this.fetchFileContent(filePath);
      
      for (const parser of this.parserFactory['parsers']) {
        if (parser.canParse(content)) {
          const providerInfo = parser.getProviderInfo(content);
          if (providerInfo.confidence > 0) {
            return providerInfo;
          }
        }
      }
      
      return { provider: 'unknown', confidence: 0 };
    } catch (error) {
      return { provider: 'unknown', confidence: 0 };
    }
  }

  async validateTrackFile(filePath: string): Promise<boolean> {
    try {
      const content = await this.fetchFileContent(filePath);
      return this.parserFactory['parsers'].some(parser => parser.canParse(content));
    } catch (error) {
      return false;
    }
  }

  // ===============================
  // 地理位置数据处理（暂时返回空实现）
  // ===============================

  async processUserInputs(userInputs: string[]): Promise<LocationData[]> {
    // TODO: 实现用户输入位置处理
    return [];
  }

  async processPhotoExif(photosPath: string): Promise<LocationData[]> {
    // TODO: 实现照片 EXIF 处理
    return [];
  }

  async geocodeLocation(locationName: string): Promise<{
    coordinates: [number, number];
    type: 'country' | 'state' | 'city';
    displayName: string;
  } | null> {
    // TODO: 实现地理编码
    return null;
  }

  // ===============================
  // 数据处理和分析
  // ===============================

  calculateTracksBounds(tracks: TrackData[]): GeoBounds {
    if (!tracks.length) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90, south = 90, east = -180, west = 180;

    tracks.forEach(track => {
      track.waypoints.forEach(point => {
        north = Math.max(north, point.latitude);
        south = Math.min(south, point.latitude);
        east = Math.max(east, point.longitude);
        west = Math.min(west, point.longitude);
      });
    });

    return { north, south, east, west };
  }

  calculateLocationsBounds(locations: LocationData[]): GeoBounds {
    if (!locations.length) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90, south = 90, east = -180, west = 180;

    locations.forEach(location => {
      const [lon, lat] = location.visualization.centerPoint;
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lon);
      west = Math.min(west, lon);
    });

    return { north, south, east, west };
  }

  mergeBounds(bounds1: GeoBounds, bounds2: GeoBounds): GeoBounds {
    return {
      north: Math.max(bounds1.north, bounds2.north),
      south: Math.min(bounds1.south, bounds2.south),
      east: Math.max(bounds1.east, bounds2.east),
      west: Math.min(bounds1.west, bounds2.west)
    };
  }

  getTrackStatistics(track: TrackData): {
    totalDistance: number;
    totalTime: number;
    averageSpeed: number;
    elevationGain: number;
    elevationLoss: number;
    maxElevation: number;
    minElevation: number;
  } {
    // TODO: 实现轨迹统计计算
    return {
      totalDistance: 0,
      totalTime: 0,
      averageSpeed: 0,
      elevationGain: 0,
      elevationLoss: 0,
      maxElevation: 0,
      minElevation: 0
    };
  }

  // ===============================
  // 缓存管理
  // ===============================

  async refreshCache(): Promise<void> {
    // TODO: 实现缓存刷新
  }

  async getCacheStats(): Promise<Record<string, unknown>> {
    // TODO: 实现缓存统计
    return {};
  }

  // ===============================
  // Vault 管理
  // ===============================

  switchVault(vaultId: string): void {
    // TODO: 实现 vault 切换
  }

  getCurrentVault(): { id: string; path: string } {
    // TODO: 实现当前 vault 获取
    return { id: 'default', path: '/vault' };
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  private async fetchFileContent(filePath: string): Promise<string> {
    // 实际实现中需要根据环境选择合适的文件读取方式
    if (typeof window !== 'undefined') {
      // 浏览器环境：使用 fetch
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${filePath}`);
      }
      return response.text();
    } else {
      // Node.js 环境：使用 fs
      const fs = await import('fs');
      return fs.promises.readFile(filePath, 'utf-8');
    }
  }

  private transformToTrackData(unifiedTrack: UnifiedTrackData, filePath: string): TrackData {
    // 转换：UnifiedTrackData → TrackData (新格式)
    const waypoints: TrackPoint[] = unifiedTrack.trackPoints.map(point => ({
      latitude: point.latitude,
      longitude: point.longitude,
      elevation: point.elevation,
      time: point.time,
      name: point.name,
      description: point.description
    }));

    const placemarks: TrackPhoto[] = unifiedTrack.photos.map(photo => ({
      url: photo.url,
      name: photo.name,
      description: photo.description,
      latitude: photo.latitude,
      longitude: photo.longitude,
      time: photo.time,
      thumbnailUrl: photo.thumbnailUrl
    }));

    // 生成唯一 ID
    const id = this.generateTrackId(filePath, unifiedTrack.name);

    // 样式配置
    const style = this.getTrackStyle(unifiedTrack.metadata.provider);

    return {
      id,
      name: unifiedTrack.name,
      waypoints,
      placemarks,
      provider: unifiedTrack.metadata.provider,
      style,
      metadata: {
        source: unifiedTrack.metadata.source,
        totalDistance: unifiedTrack.metadata.totalDistance,
        totalTime: unifiedTrack.metadata.totalTime,
        maxElevation: unifiedTrack.metadata.maxElevation,
        minElevation: unifiedTrack.metadata.minElevation,
        bounds: this.calculateBounds(waypoints)
      }
    };
  }

  private generateTrackId(filePath: string, trackName?: string): string {
    // 基于文件路径和轨迹名称生成唯一 ID
    const base = `${filePath}:${trackName || 'unnamed'}`;
    // 使用简单哈希算法替代 btoa，避免非拉丁字符问题
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  }

  private getTrackStyle(provider?: string): { color: string; weight: number; opacity: number } {
    // 根据厂商返回不同的样式
    const styleMap: Record<string, { color: string; weight: number; opacity: number }> = {
      yamap: { color: '#ff6b35', weight: 3, opacity: 0.8 },
      garmin: { color: '#0066cc', weight: 3, opacity: 0.8 },
      '2bulu': { color: '#00aa55', weight: 3, opacity: 0.8 },
      foooooot: { color: '#ff9500', weight: 3, opacity: 0.8 },
      google: { color: '#ea4335', weight: 3, opacity: 0.8 },
      unknown: { color: '#666666', weight: 2, opacity: 0.6 }
    };

    return styleMap[provider || 'unknown'] || styleMap.unknown;
  }

  private calculateBounds(waypoints: TrackPoint[]): GeoBounds {
    if (!waypoints.length) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90, south = 90, east = -180, west = 180;

    waypoints.forEach(point => {
      north = Math.max(north, point.latitude);
      south = Math.min(south, point.latitude);
      east = Math.max(east, point.longitude);
      west = Math.min(west, point.longitude);
    });

    return { north, south, east, west };
  }
}