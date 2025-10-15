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
  FootprintsData,
} from './interfaces/IFootprintsService';
import type { IStorageService } from './interfaces/IStorageService';

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
      (gpx as Record<string, unknown>).trk,
      (gpx as Record<string, Record<string, unknown>>).gpx?.trk,
      (gpx as Record<string, unknown>).tracks,
      (gpx as Record<string, Record<string, unknown>>).gpx?.tracks,
    ].filter(Boolean);

    for (const trackArray of trackSources) {
      if (Array.isArray(trackArray)) {
        trackArray.forEach((track: Record<string, unknown>) => {
          const segmentSources = [track.trkseg, track.segments, track.trackSegments].filter(
            Boolean
          );

          for (const segmentArray of segmentSources) {
            if (Array.isArray(segmentArray)) {
              segmentArray.forEach((segment: Record<string, unknown>) => {
                const pointSources = [segment.trkpt, segment.points, segment.trackPoints].filter(
                  Boolean
                );

                for (const pointArray of pointSources) {
                  if (Array.isArray(pointArray)) {
                    pointArray.forEach((point: Record<string, unknown>) => {
                      const lat =
                        (point.$ as Record<string, unknown>)?.lat ||
                        point.lat ||
                        point['@_lat'] ||
                        point.latitude;
                      const lon =
                        (point.$ as Record<string, unknown>)?.lon ||
                        point.lon ||
                        point['@_lon'] ||
                        point.longitude;

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
    const waypointSources = [
      (gpx as Record<string, unknown>).wpt,
      (gpx as Record<string, Record<string, unknown>>).gpx?.wpt,
      (gpx as Record<string, unknown>).waypoints,
    ].filter(Boolean);
    waypointSources.forEach((wptArray) => {
      if (Array.isArray(wptArray)) {
        wptArray.forEach((waypoint: Record<string, unknown>) => {
          const lat =
            waypoint['@_lat'] ||
            (waypoint.$ as Record<string, unknown>)?.lat ||
            waypoint.lat ||
            waypoint.latitude;
          const lon =
            waypoint['@_lon'] ||
            (waypoint.$ as Record<string, unknown>)?.lon ||
            waypoint.lon ||
            waypoint.longitude;

          if (lat && lon) {
            waypoints.push({
              latitude: parseFloat(String(lat)),
              longitude: parseFloat(String(lon)),
              elevation: waypoint.ele ? parseFloat(String(waypoint.ele)) : undefined,
              time: waypoint.time ? new Date(String(waypoint.time)) : undefined,
              name: waypoint.name ? String(waypoint.name) : 'Waypoint',
              description:
                waypoint.desc || waypoint.description
                  ? String(waypoint.desc || waypoint.description)
                  : '',
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
    const trimmedContent = content.trim();
    // Some KML files don't have <?xml declaration
    const canParse =
      trimmedContent.startsWith('<kml ') ||
      trimmedContent.startsWith('<kml>') ||
      (trimmedContent.startsWith('<?xml') &&
        (trimmedContent.includes('<kml ') || trimmedContent.includes('<kml>')));
    return canParse;
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
    // Handle xml2js array wrapping
    const documentArr = kml.Document as unknown;
    const document = Array.isArray(documentArr)
      ? (documentArr[0] as Record<string, unknown>)
      : (documentArr as Record<string, unknown>);

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
                      : undefined,
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
    // Handle xml2js array wrapping
    const documentArr = kml.Document as unknown;
    const document = Array.isArray(documentArr)
      ? (documentArr[0] as Record<string, unknown>)
      : (documentArr as Record<string, unknown>);

    if (document && document.Placemark && Array.isArray(document.Placemark)) {
      document.Placemark.forEach((placemark: unknown) => {
        const placemarkObj = placemark as Record<string, unknown>;
        const lineString = placemarkObj.LineString as Record<string, unknown>;

        if (lineString && lineString.coordinates) {
          // Handle xml2js array wrapping for coordinates
          const coordsData = Array.isArray(lineString.coordinates)
            ? lineString.coordinates[0]
            : lineString.coordinates;
          const coordinatesStr = String(coordsData);
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
                    name: placemarkObj.name
                      ? Array.isArray(placemarkObj.name)
                        ? String(placemarkObj.name[0])
                        : String(placemarkObj.name)
                      : undefined,
                  });
                }
              }
            }
          });
        }

        // Also check for gx:Track (Google Earth extension format)
        const gxTrack = placemarkObj['gx:Track'] as unknown;
        if (gxTrack && typeof gxTrack === 'object') {
          const trackObj = gxTrack as Record<string, unknown>;
          const gxCoords = trackObj['gx:coord'] as unknown[];

          if (Array.isArray(gxCoords)) {
            gxCoords.forEach((coord: unknown) => {
              if (typeof coord === 'string') {
                const parts = coord.trim().split(/\s+/);
                if (parts.length >= 2) {
                  const longitude = parseFloat(parts[0]);
                  const latitude = parseFloat(parts[1]);
                  const elevation = parts.length >= 3 ? parseFloat(parts[2]) : undefined;

                  if (!isNaN(longitude) && !isNaN(latitude)) {
                    points.push({
                      latitude,
                      longitude,
                      elevation,
                      name: placemarkObj.name
                        ? Array.isArray(placemarkObj.name)
                          ? String(placemarkObj.name[0])
                          : String(placemarkObj.name)
                        : undefined,
                    });
                  }
                }
              }
            });
          }
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
      throw new Error(
        `GPX parser returned null or undefined. Last error: ${(parseError as Error)?.message || 'Unknown error'}`
      );
    }

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name:
        ((gpxObject as Record<string, Record<string, unknown[]>>).metadata?.name?.[0] as string) ||
        (((gpxObject as Record<string, unknown[]>).trk?.[0] as Record<string, unknown>)
          ?.name as string) ||
        'YAMAP Track',
      description:
        ((gpxObject as Record<string, Record<string, unknown[]>>).metadata?.desc?.[0] as string) ||
        (((gpxObject as Record<string, unknown[]>).trk?.[0] as Record<string, unknown>)
          ?.desc as string),
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'yamap',
        totalDistance: this.calculateDistance(trackPoints),
        totalTime: this.calculateDuration(trackPoints),
        maxElevation: this.getMaxElevation(trackPoints),
        minElevation: this.getMinElevation(trackPoints),
      },
    };
  }

  private calculateDistance(points: Array<{ latitude: number; longitude: number }>): number {
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.haversineDistance(points[i - 1], points[i]);
    }
    return total;
  }

  private calculateDuration(points: Array<{ time?: Date }>): number {
    if (points.length < 2 || !points[0].time || !points[points.length - 1].time) {
      return 0;
    }
    return (points[points.length - 1].time!.getTime() - points[0].time!.getTime()) / 1000 / 60;
  }

  private getMaxElevation(points: Array<{ elevation?: number }>): number {
    const elevations = points.filter((p) => p.elevation).map((p) => p.elevation!);
    return elevations.length > 0 ? Math.max(...elevations) : 0;
  }

  private getMinElevation(points: Array<{ elevation?: number }>): number {
    const elevations = points.filter((p) => p.elevation).map((p) => p.elevation!);
    return elevations.length > 0 ? Math.min(...elevations) : 0;
  }

  private haversineDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 6371000; // 地球半径（米）
    const lat1Rad = (point1.latitude * Math.PI) / 180;
    const lat2Rad = (point2.latitude * Math.PI) / 180;
    const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

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
      throw new Error(
        `GPX parser failed. Last error: ${(parseError as Error)?.message || 'Unknown error'}`
      );
    }

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name:
        ((gpxObject as Record<string, Record<string, unknown[]>>).metadata?.name?.[0] as string) ||
        (((gpxObject as Record<string, unknown[]>).trk?.[0] as Record<string, unknown>)
          ?.name as string) ||
        'Garmin Track',
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'garmin',
      },
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
    try {
      // 使用浏览器原生 DOMParser 或 Node.js 的 xml2js
      let kmlDoc: Document;

      if (typeof DOMParser !== 'undefined') {
        // 浏览器环境
        const parser = new DOMParser();
        kmlDoc = parser.parseFromString(content, 'text/xml');

        // 检查解析错误
        const parseError = kmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error(`XML parsing failed: ${parseError.textContent}`);
        }

        // 转换 DOM 到我们需要的格式
        const documentElement = kmlDoc.querySelector('Document');
        const name = documentElement?.querySelector('name')?.textContent || '2bulu Track';
        const description = documentElement?.querySelector('description')?.textContent || undefined;

        // 解析轨迹点
        const trackPoints: Array<{
          latitude: number;
          longitude: number;
          elevation?: number;
          time?: Date;
          name?: string;
          description?: string;
        }> = [];

        // 处理 LineString
        const placemarks = kmlDoc.querySelectorAll('Placemark');
        placemarks.forEach((placemark) => {
          const lineString = placemark.querySelector('LineString');
          if (lineString) {
            const coordinates = lineString.querySelector('coordinates')?.textContent;
            if (coordinates) {
              const coordLines = coordinates.trim().split(/[\n\r]+/);
              coordLines.forEach((line) => {
                const coords = line.trim().split(/[\s,]+/);
                for (let i = 0; i < coords.length; i += 3) {
                  if (i + 1 < coords.length) {
                    const longitude = parseFloat(coords[i]);
                    const latitude = parseFloat(coords[i + 1]);
                    const elevation = i + 2 < coords.length ? parseFloat(coords[i + 2]) : undefined;

                    if (!isNaN(longitude) && !isNaN(latitude)) {
                      trackPoints.push({
                        latitude,
                        longitude,
                        elevation,
                        name: placemark.querySelector('name')?.textContent || undefined,
                      });
                    }
                  }
                }
              });
            }
          }

          // 处理 gx:Track
          const gxTrack = placemark.querySelector('gx\\:Track, Track');
          if (gxTrack) {
            const gxCoords = gxTrack.querySelectorAll('gx\\:coord, coord');
            gxCoords.forEach((coord) => {
              const text = coord.textContent;
              if (text) {
                const parts = text.trim().split(/\s+/);
                if (parts.length >= 2) {
                  const longitude = parseFloat(parts[0]);
                  const latitude = parseFloat(parts[1]);
                  const elevation = parts.length >= 3 ? parseFloat(parts[2]) : undefined;

                  if (!isNaN(longitude) && !isNaN(latitude)) {
                    trackPoints.push({
                      latitude,
                      longitude,
                      elevation,
                      name: placemark.querySelector('name')?.textContent || undefined,
                    });
                  }
                }
              }
            });
          }
        });

        return {
          name,
          description,
          trackPoints,
          photos: [], // TODO: 解析照片
          metadata: {
            source: 'kml',
            provider: '2bulu',
          },
        };
      } else {
        // Node.js 环境（测试环境）
        const { parseString } = await import('xml2js');

        return new Promise((resolve, reject) => {
          parseString(content, (err: unknown, result: unknown) => {
            if (err) {
              reject(`XML parsing failed: ${err instanceof Error ? err.message : String(err)}`);
              return;
            }

            try {
              const parsed = result as Record<string, unknown>;
              const kml = parsed.kml;
              const trackPoints = this.parseKMLTracks(kml);
              const photos = this.parseKMLPhotos(kml);

              const document = Array.isArray((kml as Record<string, unknown>).Document)
                ? ((kml as Record<string, unknown[]>).Document[0] as Record<string, unknown[]>)
                : ((kml as Record<string, unknown>).Document as Record<string, unknown[]>);

              resolve({
                name: (document?.name?.[0] as string) || '2bulu Track',
                description: (document?.description?.[0] as string) || undefined,
                trackPoints,
                photos,
                metadata: {
                  source: 'kml',
                  provider: '2bulu',
                },
              });
            } catch (parseError) {
              reject(
                `Failed to parse KML structure: ${parseError instanceof Error ? parseError.message : String(parseError)}`
              );
            }
          });
        });
      }
    } catch (error) {
      throw new Error(
        `KML parsing error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// 通用 KML 解析器
class GenericKMLParser extends BaseKMLParser {
  getProviderInfo(): { provider: string; confidence: number } {
    return { provider: 'unknown', confidence: 0.1 }; // 低置信度兜底
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    try {
      // 使用浏览器原生 DOMParser 或 Node.js 的 xml2js
      let kmlDoc: Document;

      if (typeof DOMParser !== 'undefined') {
        // 浏览器环境
        const parser = new DOMParser();
        kmlDoc = parser.parseFromString(content, 'text/xml');

        // 检查解析错误
        const parseError = kmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error(`XML parsing failed: ${parseError.textContent}`);
        }

        // 转换 DOM 到我们需要的格式
        const documentElement = kmlDoc.querySelector('Document');
        const name = documentElement?.querySelector('name')?.textContent || 'KML Track';
        const description = documentElement?.querySelector('description')?.textContent || undefined;

        // 解析轨迹点
        const trackPoints: Array<{
          latitude: number;
          longitude: number;
          elevation?: number;
          time?: Date;
          name?: string;
          description?: string;
        }> = [];

        // 处理 LineString
        const placemarks = kmlDoc.querySelectorAll('Placemark');
        placemarks.forEach((placemark) => {
          const lineString = placemark.querySelector('LineString');
          if (lineString) {
            const coordinates = lineString.querySelector('coordinates')?.textContent;
            if (coordinates) {
              const coordLines = coordinates.trim().split(/[\n\r]+/);
              coordLines.forEach((line) => {
                const coords = line.trim().split(/[\s,]+/);
                for (let i = 0; i < coords.length; i += 3) {
                  if (i + 1 < coords.length) {
                    const longitude = parseFloat(coords[i]);
                    const latitude = parseFloat(coords[i + 1]);
                    const elevation = i + 2 < coords.length ? parseFloat(coords[i + 2]) : undefined;

                    if (!isNaN(longitude) && !isNaN(latitude)) {
                      trackPoints.push({
                        latitude,
                        longitude,
                        elevation,
                        name: placemark.querySelector('name')?.textContent || undefined,
                      });
                    }
                  }
                }
              });
            }
          }

          // 处理 gx:Track
          const gxTrack = placemark.querySelector('gx\\:Track, Track');
          if (gxTrack) {
            const gxCoords = gxTrack.querySelectorAll('gx\\:coord, coord');
            gxCoords.forEach((coord) => {
              const text = coord.textContent;
              if (text) {
                const parts = text.trim().split(/\s+/);
                if (parts.length >= 2) {
                  const longitude = parseFloat(parts[0]);
                  const latitude = parseFloat(parts[1]);
                  const elevation = parts.length >= 3 ? parseFloat(parts[2]) : undefined;

                  if (!isNaN(longitude) && !isNaN(latitude)) {
                    trackPoints.push({
                      latitude,
                      longitude,
                      elevation,
                      name: placemark.querySelector('name')?.textContent || undefined,
                    });
                  }
                }
              }
            });
          }
        });

        return {
          name,
          description,
          trackPoints,
          photos: [], // TODO: 解析照片
          metadata: {
            source: 'kml',
            provider: 'unknown',
          },
        };
      } else {
        // Node.js 环境（测试环境）
        const { parseString } = await import('xml2js');

        return new Promise((resolve, reject) => {
          parseString(content, (err: unknown, result: unknown) => {
            if (err) {
              reject(`XML parsing failed: ${err instanceof Error ? err.message : String(err)}`);
              return;
            }

            try {
              const parsed = result as Record<string, unknown>;
              const kml = parsed.kml;
              const trackPoints = this.parseKMLTracks(kml);
              const photos = this.parseKMLPhotos(kml);

              const document = Array.isArray((kml as Record<string, unknown>).Document)
                ? ((kml as Record<string, unknown[]>).Document[0] as Record<string, unknown[]>)
                : ((kml as Record<string, unknown>).Document as Record<string, unknown[]>);

              resolve({
                name: (document?.name?.[0] as string) || 'KML Track',
                description: (document?.description?.[0] as string) || undefined,
                trackPoints,
                photos,
                metadata: {
                  source: 'kml',
                  provider: 'unknown',
                },
              });
            } catch (parseError) {
              reject(
                `Failed to parse KML structure: ${parseError instanceof Error ? parseError.message : String(parseError)}`
              );
            }
          });
        });
      }
    } catch (error) {
      throw new Error(
        `KML parsing error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// 通用 GPX 解析器
class GenericGPXParser extends BaseGPXParser {
  getProviderInfo(_content: string): { provider: string; confidence: number } {
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
      throw new Error(
        `GPX parser failed. Last error: ${(parseError as Error)?.message || 'Unknown error'}`
      );
    }

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name:
        ((gpxObject as Record<string, Record<string, unknown[]>>).metadata?.name?.[0] as string) ||
        (((gpxObject as Record<string, unknown[]>).trk?.[0] as Record<string, unknown>)
          ?.name as string) ||
        'Unknown Track',
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'unknown',
      },
    };
  }
}

// 解析器工厂
class TrackDataParserFactory {
  private parsers: TrackDataParser[] = [
    new YamapGPXParser(),
    new GarminGPXParser(),
    new TwobuluKMLParser(),
    new GenericGPXParser(), // GPX 兜底解析器
    new GenericKMLParser(), // KML 兜底解析器
  ];

  // 公共方法：检测文件的提供商
  detectProvider(content: string): { provider: string; confidence: number } {
    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const providerInfo = parser.getProviderInfo(content);
        if (providerInfo.confidence > 0) {
          return providerInfo;
        }
      }
    }
    return { provider: 'unknown', confidence: 0 };
  }

  // 公共方法：验证是否是有效的轨迹文件
  canParse(content: string): boolean {
    return this.parsers.some((parser) => parser.canParse(content));
  }

  async parseTrackData(content: string): Promise<UnifiedTrackData> {
    // 确保 content 是字符串
    if (typeof content !== 'string') {
      throw new Error('Content must be a string');
    }

    // 检查是否是 KML 或 GPX 文件
    content.includes('<kml');
    content.includes('<gpx');

    // 找到最匹配的解析器
    let bestParser: TrackDataParser | null = null;
    let bestConfidence = 0;

    for (const parser of this.parsers) {
      if (parser.canParse(content)) {
        const { provider: _provider, confidence } = parser.getProviderInfo(content);
        if (confidence > bestConfidence) {
          bestParser = parser;
          bestConfidence = confidence;
        }
      }
    }

    if (!bestParser) {
      // 如果没有找到特定的解析器，使用通用解析器
      bestParser = this.parsers.find((p) => p.canParse(content)) || null;
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
          result.metadata.provider = provider as
            | 'yamap'
            | 'garmin'
            | '2bulu'
            | 'foooooot'
            | 'google'
            | 'unknown';
          break;
        }
      }
    }

    return result;
  }
}

export class FootprintsService implements IFootprintsService {
  private parserFactory = new TrackDataParserFactory();
  private storageService: IStorageService;
  constructor(storageService: IStorageService) {
    this.storageService = storageService;
  }

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
          errors: [],
        },
      };
    } catch (error) {
      return {
        tracks: [],
        locations: [],
        metadata: {
          totalTracks: 0,
          totalLocations: 0,
          processingTime: Date.now(),
          errors: [
            {
              filePath,
              error: error instanceof Error ? error.message : String(error),
            },
          ],
        },
      };
    }
  }

  async parseInlineTrack(
    content: string,
    format: 'gpx' | 'kml',
    sourceName?: string
  ): Promise<FootprintsData> {
    const startTime = Date.now();
    const virtualPath = `inline:${format}:${sourceName || 'untitled'}`;

    try {
      const unifiedTrack = await this.parserFactory.parseTrackData(content);
      const trackData = this.transformToTrackData(unifiedTrack, virtualPath);

      return {
        tracks: [trackData],
        locations: [],
        metadata: {
          totalTracks: 1,
          totalLocations: 0,
          processingTime: Date.now() - startTime,
          errors: [],
        },
      };
    } catch (error) {
      return {
        tracks: [],
        locations: [],
        metadata: {
          totalTracks: 0,
          totalLocations: 0,
          processingTime: Date.now() - startTime,
          errors: [
            {
              filePath: virtualPath,
              error: error instanceof Error ? error.message : String(error),
            },
          ],
        },
      };
    }
  }

  async parseMultipleTracks(filePaths: string[]): Promise<FootprintsData> {
    const startTime = Date.now();
    const tracks: TrackData[] = [];
    const errors: Array<{ filePath: string; error: string }> = [];

    // 使用 map 收集结果，避免并发修改数组
    const results = await Promise.all(
      filePaths.map(async (filePath) => {
        try {
          const content = await this.fetchFileContent(filePath);
          const unifiedTrack = await this.parserFactory.parseTrackData(content);
          const trackData = this.transformToTrackData(unifiedTrack, filePath);
          return { type: 'success' as const, trackData };
        } catch (error) {
          let errorMessage = 'Unknown error';
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          } else {
            errorMessage = 'Error parsing track file';
          }
          return { type: 'error' as const, filePath, error: errorMessage };
        }
      })
    );

    // 分离成功和失败的结果
    results.forEach((result) => {
      if (result.type === 'success') {
        tracks.push(result.trackData);
      } else {
        errors.push({
          filePath: result.filePath,
          error: result.error,
        });
      }
    });

    return {
      tracks,
      locations: [],
      metadata: {
        totalTracks: tracks.length,
        totalLocations: 0,
        processingTime: Date.now() - startTime,
        errors,
      },
    };
  }

  async aggregateFootprints(config: FootprintsConfig): Promise<FootprintsData> {
    const startTime = Date.now();
    let tracks: TrackData[] = [];
    const locations: LocationData[] = [];
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
          error: error instanceof Error ? error.message : String(error),
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
          error: error instanceof Error ? error.message : String(error),
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
          error: error instanceof Error ? error.message : String(error),
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
        errors,
      },
    };
  }

  // ===============================
  // 轨迹文件操作
  // ===============================

  async scanTrackFiles(dirPath: string): Promise<string[]> {
    // 模拟实现：在实际项目中需要实现文件系统扫描
    // 这里返回模拟的轨迹文件路径
    return [`${dirPath}/track1.gpx`, `${dirPath}/track2.kml`];
  }

  async detectProvider(filePath: string): Promise<{ provider: string; confidence: number }> {
    try {
      const content = await this.fetchFileContent(filePath);
      return this.parserFactory.detectProvider(content);
    } catch {
      return { provider: 'unknown', confidence: 0 };
    }
  }

  async validateTrackFile(filePath: string): Promise<boolean> {
    try {
      const content = await this.fetchFileContent(filePath);
      return this.parserFactory.canParse(content);
    } catch {
      return false;
    }
  }

  // ===============================
  // 地理位置数据处理（暂时返回空实现）
  // ===============================

  async processUserInputs(_userInputs: string[]): Promise<LocationData[]> {
    // TODO: 实现用户输入位置处理
    return [];
  }

  async processPhotoExif(_photosPath: string): Promise<LocationData[]> {
    // TODO: 实现照片 EXIF 处理
    return [];
  }

  async geocodeLocation(_locationName: string): Promise<{
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

    let north = -90,
      south = 90,
      east = -180,
      west = 180;

    tracks.forEach((track) => {
      track.waypoints.forEach((point) => {
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

    let north = -90,
      south = 90,
      east = -180,
      west = 180;

    locations.forEach((location) => {
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
      west: Math.min(bounds1.west, bounds2.west),
    };
  }

  getTrackStatistics(_track: TrackData): {
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
      minElevation: 0,
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

  switchVault(_vaultId: string): void {
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
    // 检查 storageService 是否正确初始化
    if (!this.storageService || typeof this.storageService.readFile !== 'function') {
      throw new Error('StorageService not properly initialized');
    }

    // 使用 StorageService 读取文件，它会处理路径配置
    const content = await this.storageService.readFile(filePath);

    // StorageService 可能返回 string 或 Uint8Array
    if (content instanceof Uint8Array) {
      const decoded = new TextDecoder('utf-8').decode(content);
      return decoded;
    }

    return content as string;
  }

  private transformToTrackData(unifiedTrack: UnifiedTrackData, filePath: string): TrackData {
    // 转换：UnifiedTrackData → TrackData (新格式)
    const waypoints: TrackPoint[] = unifiedTrack.trackPoints.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      elevation: point.elevation,
      time: point.time,
      name: point.name,
      description: point.description,
    }));

    const placemarks: TrackPhoto[] = unifiedTrack.photos.map((photo) => ({
      url: photo.url,
      name: photo.name,
      description: photo.description,
      latitude: photo.latitude,
      longitude: photo.longitude,
      time: photo.time,
      thumbnailUrl: photo.thumbnailUrl,
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
        bounds: this.calculateBounds(waypoints),
      },
    };
  }

  private generateTrackId(filePath: string, trackName?: string): string {
    // 基于文件路径和轨迹名称生成唯一 ID
    const base = `${filePath}:${trackName || 'unnamed'}`;
    // 使用简单哈希算法替代 btoa，避免非拉丁字符问题
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36).substring(0, 16);
  }

  private getTrackStyle(provider?: string): { color: string; weight: number; opacity: number } {
    // 根据厂商返回不同的样式
    const styleMap: Record<string, { color: string; weight: number; opacity: number }> = {
      yamap: { color: '#ff6b35', weight: 3, opacity: 0.8 }, // 橙红色
      garmin: { color: '#0066cc', weight: 3, opacity: 0.8 }, // 蓝色
      '2bulu': { color: '#e74c3c', weight: 3, opacity: 0.8 }, // 红色（替换原来的绿色）
      foooooot: { color: '#ff9500', weight: 3, opacity: 0.8 }, // 橙色
      google: { color: '#9b59b6', weight: 3, opacity: 0.8 }, // 紫色（替换原来的红色，避免与2bulu重复）
      unknown: { color: '#3498db', weight: 3, opacity: 0.8 }, // 亮蓝色（替换原来的灰色）
    };

    return styleMap[provider || 'unknown'] || styleMap.unknown;
  }

  private calculateBounds(waypoints: TrackPoint[]): GeoBounds {
    if (!waypoints.length) {
      return { north: 0, south: 0, east: 0, west: 0 };
    }

    let north = -90,
      south = 90,
      east = -180,
      west = 180;

    waypoints.forEach((point) => {
      north = Math.max(north, point.latitude);
      south = Math.min(south, point.latitude);
      east = Math.max(east, point.longitude);
      west = Math.min(west, point.longitude);
    });

    return { north, south, east, west };
  }
}
