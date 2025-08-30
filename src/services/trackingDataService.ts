/**
 * Unified Tracking Data Service
 * 
 * 统一的轨迹数据服务，支持 GPX、KML 等多种格式
 * 支持不同厂商的数据格式：Yamap, Garmin, 2bulu, foooooot 等
 */

// 统一数据结构
export interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  time?: Date;
  name?: string;
  description?: string;
}

export interface TrackPhoto {
  url: string;
  name?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  time?: Date;
  thumbnailUrl?: string;
}

export interface UnifiedTrackData {
  name: string;
  description?: string;
  trackPoints: TrackPoint[];
  photos: TrackPhoto[];
  metadata: {
    source: 'gpx' | 'kml';
    provider?: 'yamap' | 'garmin' | '2bulu' | 'foooooot' | 'google' | 'unknown';
    totalDistance?: number;
    totalTime?: number;
    maxElevation?: number;
    minElevation?: number;
  };
}

// 解析器接口
export interface TrackDataParser {
  canParse(content: string): boolean;
  parse(content: string): Promise<UnifiedTrackData>;
  getProviderInfo(content: string): { provider: string; confidence: number };
}

// GPX 解析器基类
export abstract class BaseGPXParser implements TrackDataParser {
  canParse(content: string): boolean {
    return content.trim().startsWith('<?xml') && content.includes('<gpx');
  }

  abstract parse(content: string): Promise<UnifiedTrackData>;
  abstract getProviderInfo(content: string): { provider: string; confidence: number };

  protected parseGPXContent(gpxObject: any): TrackPoint[] {
    const points: TrackPoint[] = [];

    // 处理轨迹点
    if (gpxObject.trk && gpxObject.trk.length > 0) {
      gpxObject.trk.forEach((track: any) => {
        if (track.trkseg) {
          track.trkseg.forEach((segment: any) => {
            if (segment.trkpt) {
              segment.trkpt.forEach((point: any) => {
                const lat = point.$.lat || point.lat || point['@_lat'];
                const lon = point.$.lon || point.lon || point['@_lon'];
                if (lat && lon) {
                  const trackPoint: TrackPoint = {
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lon),
                  };

                  // 高程
                  if (point.ele) {
                    trackPoint.elevation = parseFloat(point.ele);
                  }

                  // 时间
                  if (point.time) {
                    trackPoint.time = new Date(point.time);
                  }

                  // 名称和描述
                  if (point.name) {
                    trackPoint.name = point.name;
                  }
                  if (point.desc) {
                    trackPoint.description = point.desc;
                  }

                  points.push(trackPoint);
                }
              });
            }
          });
        }
      });
    }

    return points;
  }

  protected parseWaypoints(gpxObject: any): TrackPoint[] {
    const waypoints: TrackPoint[] = [];

    if (gpxObject.wpt) {
      gpxObject.wpt.forEach((waypoint: any) => {
        const lat = waypoint['@_lat'] || waypoint.$.lat || waypoint.lat;
        const lon = waypoint['@_lon'] || waypoint.$.lon || waypoint.lon;
        if (lat && lon) {
          waypoints.push({
            latitude: parseFloat(lat),
            longitude: parseFloat(lon),
            elevation: waypoint.ele ? parseFloat(waypoint.ele) : undefined,
            time: waypoint.time ? new Date(waypoint.time) : undefined,
            name: waypoint.name || 'Waypoint',
            description: waypoint.desc || ''
          });
        }
      });
    }

    return waypoints;
  }
}

// KML 解析器基类
export abstract class BaseKMLParser implements TrackDataParser {
  canParse(content: string): boolean {
    return content.trim().startsWith('<?xml') && content.includes('<kml');
  }

  abstract parse(content: string): Promise<UnifiedTrackData>;
  abstract getProviderInfo(content: string): { provider: string; confidence: number };

  protected parseKMLPhotos(kmlObject: any): TrackPhoto[] {
    const photos: TrackPhoto[] = [];

    // 解析 Placemark 中的照片
    if (kmlObject.Document && kmlObject.Document.Placemark) {
      kmlObject.Document.Placemark.forEach((placemark: any) => {
        if (placemark.description && placemark.Point) {
          // 尝试从描述中解析照片 URL
          const description = placemark.description;
          const imgMatches = description.match(/<img[^>]+src="([^"]+)"/gi);
          
          if (imgMatches && placemark.Point.coordinates) {
            const coords = placemark.Point.coordinates.split(',');
            const longitude = parseFloat(coords[0]);
            const latitude = parseFloat(coords[1]);

            imgMatches.forEach((imgMatch: string) => {
              const urlMatch = imgMatch.match(/src="([^"]+)"/);
              if (urlMatch) {
                photos.push({
                  url: urlMatch[1],
                  name: placemark.name || 'Photo',
                  description: description,
                  latitude,
                  longitude,
                  time: placemark.TimeStamp?.when ? new Date(placemark.TimeStamp.when) : undefined
                });
              }
            });
          }
        }
      });
    }

    return photos;
  }

  protected parseKMLTracks(kmlObject: any): TrackPoint[] {
    const points: TrackPoint[] = [];

    // 解析 LineString 轨迹
    if (kmlObject.Document && kmlObject.Document.Placemark) {
      kmlObject.Document.Placemark.forEach((placemark: any) => {
        if (placemark.LineString && placemark.LineString.coordinates) {
          const coordinatesStr = placemark.LineString.coordinates;
          const coordLines = coordinatesStr.trim().split(/[\n\r]+/);
          
          coordLines.forEach((line: string) => {
            const coords = line.trim().split(',');
            if (coords.length >= 2) {
              const longitude = parseFloat(coords[0]);
              const latitude = parseFloat(coords[1]);
              const elevation = coords.length >= 3 ? parseFloat(coords[2]) : undefined;

              if (!isNaN(longitude) && !isNaN(latitude)) {
                points.push({
                  latitude,
                  longitude,
                  elevation,
                  name: placemark.name
                });
              }
            }
          });
        }
      });
    }

    return points;
  }
}

// 具体的厂商解析器
export class YamapGPXParser extends BaseGPXParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('creator="YAMAP')) {
      return { provider: 'yamap', confidence: 1.0 };
    }
    return { provider: 'yamap', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    const gpxParser = await import('gpx-parser-builder');
    const parseMethod = gpxParser.default.parseGpx || gpxParser.default.parse || gpxParser.default;
    const gpxObject = parseMethod(content);

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name: gpxObject.metadata?.name?.[0] || gpxObject.trk?.[0]?.name || 'YAMAP Track',
      description: gpxObject.metadata?.desc?.[0] || gpxObject.trk?.[0]?.desc,
      trackPoints: [...trackPoints, ...waypoints],
      photos: [], // YAMAP GPX 通常没有照片
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

  private calculateDistance(points: TrackPoint[]): number {
    // 简单的距离计算（Haversine 公式）
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += this.haversineDistance(points[i-1], points[i]);
    }
    return total;
  }

  private calculateDuration(points: TrackPoint[]): number {
    if (points.length < 2 || !points[0].time || !points[points.length-1].time) {
      return 0;
    }
    return (points[points.length-1].time!.getTime() - points[0].time!.getTime()) / 1000 / 60; // 分钟
  }

  private getMaxElevation(points: TrackPoint[]): number {
    return Math.max(...points.filter(p => p.elevation).map(p => p.elevation!));
  }

  private getMinElevation(points: TrackPoint[]): number {
    return Math.min(...points.filter(p => p.elevation).map(p => p.elevation!));
  }

  private haversineDistance(point1: TrackPoint, point2: TrackPoint): number {
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

export class GarminGPXParser extends BaseGPXParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('Garmin') || content.includes('garmin')) {
      return { provider: 'garmin', confidence: 1.0 };
    }
    return { provider: 'garmin', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    // Garmin 特定的解析逻辑
    const gpxParser = await import('gpx-parser-builder');
    const parseMethod = gpxParser.default.parseGpx || gpxParser.default.parse || gpxParser.default;
    const gpxObject = parseMethod(content);

    const trackPoints = this.parseGPXContent(gpxObject);
    const waypoints = this.parseWaypoints(gpxObject);

    return {
      name: gpxObject.metadata?.name?.[0] || gpxObject.trk?.[0]?.name || 'Garmin Track',
      trackPoints: [...trackPoints, ...waypoints],
      photos: [],
      metadata: {
        source: 'gpx',
        provider: 'garmin'
      }
    };
  }
}

export class TwobuluKMLParser extends BaseKMLParser {
  getProviderInfo(content: string): { provider: string; confidence: number } {
    if (content.includes('2bulu') || content.includes('二步路')) {
      return { provider: '2bulu', confidence: 1.0 };
    }
    return { provider: '2bulu', confidence: 0.0 };
  }

  async parse(content: string): Promise<UnifiedTrackData> {
    // 2bulu KML 特定的解析逻辑
    const { parseString } = await import('xml2js');
    
    return new Promise((resolve, reject) => {
      parseString(content, (err: any, result: any) => {
        if (err) {
          reject(err);
          return;
        }

        const kml = result.kml;
        const trackPoints = this.parseKMLTracks(kml);
        const photos = this.parseKMLPhotos(kml);

        resolve({
          name: kml.Document?.name?.[0] || '2bulu Track',
          description: kml.Document?.description?.[0],
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

// 解析器工厂
export class TrackDataParserFactory {
  private parsers: TrackDataParser[] = [
    new YamapGPXParser(),
    new GarminGPXParser(),
    new TwobuluKMLParser(),
    // 可以继续添加更多解析器
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
      bestParser = this.parsers.find(p => p.canParse(content));
    }

    if (!bestParser) {
      throw new Error('No suitable parser found for this track data format');
    }

    return bestParser.parse(content);
  }
}

// 默认工厂实例
export const trackDataParserFactory = new TrackDataParserFactory();