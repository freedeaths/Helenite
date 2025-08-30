import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import gpxParser from 'gpx-parser-builder';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

interface UnifiedTrackMapProps {
  code: string;
  isFile?: boolean;
  className?: string;
}

interface TrackData {
  name?: string;
  coordinates: [number, number][];
  waypoints: Array<{
    lat: number;
    lon: number;
    name?: string;
    description?: string;
  }>;
  provider?: string;
  photos?: Array<{
    url: string;
    name?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 创建不同类型的标记图标
const createCustomIcon = (color: string, type: 'start' | 'end' | 'waypoint' | 'photo') => {
  const iconHtml = `
    <div style="
      background-color: ${color}; 
      width: 20px; 
      height: 20px; 
      border-radius: 50%; 
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      color: white;
      font-weight: bold;
    ">
      ${type === 'start' ? 'S' : type === 'end' ? 'E' : type === 'photo' ? '📷' : '●'}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: `custom-marker-${type}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// 多厂商格式检测与兼容映射 (层次化结构)
const VENDOR_PATTERNS = {
  // YAMAP - 日本户外应用
  yamap: {
    detect: (content: string) => 
      content.includes('creator="YAMAP') || 
      content.includes('YAMAP') || 
      content.includes('yamap.com'),
    formats: {
      gpx: ['trk > trkseg > trkpt']
    },
    candidateKeywords: ['YAMAP', 'yamap.com', 'creator="YAMAP']
  },
  
  // Garmin - GPS设备厂商
  garmin: {
    detect: (content: string) => 
      content.includes('Garmin') || 
      content.includes('garmin') ||
      content.includes('GPSBabel'),
    formats: {
      gpx: ['trk > trkseg > trkpt']
    },
    candidateKeywords: ['Garmin', 'garmin', 'GPSBabel']
  },
  
  // 2bulu (两步路) - 中国户外应用
  '2bulu': {
    detect: (content: string) => 
      content.includes('2bulu') || 
      content.includes('二步路') ||
      content.includes('TbuluKmlVersion'),
    formats: {
      kml: ['gx:Track > gx:coord', 'LineString > coordinates'], 
      gpx: ['trk > trkseg > trkpt']
    },
    candidateKeywords: ['2bulu', '二步路', 'TbuluKmlVersion', 'TwoStepsFromHell']
  },
  
  // foooooot - 户外运动应用  
  foooooot: {
    detect: (content: string) => 
      content.includes('foooooot') ||
      content.includes('foooooot.com'),
    formats: {
      kml: ['LineString > coordinates', 'Placemark LineString > coordinates'],
      gpx: ['trk > trkseg > trkpt']
    },
    candidateKeywords: ['foooooot', 'foooooot.com', 'six-foot.lvye.cn']
  },
  
  // Example/示例数据
  example: {
    detect: (content: string) => 
      content.includes('creator="Example"') || 
      content.includes('陆羽古道') || 
      content.includes('示例'),
    formats: {
      gpx: ['trk > trkseg > trkpt']
    },
    candidateKeywords: ['creator="Example"', '陆羽古道', '示例']
  }
};

// 检测提供商 (改进版 - 支持候选关键词匹配)
const detectProvider = (content: string): string => {
  const detectionResults: Array<{vendor: string, score: number, keywords: string[]}> = [];
  
  for (const [vendor, config] of Object.entries(VENDOR_PATTERNS)) {
    // 主要检测逻辑
    if (config.detect(content)) {
      // 计算匹配度分数 - 基于候选关键词匹配数量
      let score = 1; // 基础分数
      const matchedKeywords: string[] = [];
      
      config.candidateKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          score += 1;
          matchedKeywords.push(keyword);
        }
      });
      
      detectionResults.push({
        vendor,
        score,
        keywords: matchedKeywords
      });
    }
  }
  
  // 如果有多个匹配，选择得分最高的
  if (detectionResults.length > 0) {
    detectionResults.sort((a, b) => b.score - a.score);
    const bestMatch = detectionResults[0];
    console.log(`Provider detection: ${bestMatch.vendor} (score: ${bestMatch.score}, keywords: [${bestMatch.keywords.join(', ')}])`);
    return bestMatch.vendor;
  }
  
  return 'unknown';
};

// 根据厂商选择轨迹颜色
const getTrackColor = (provider?: string) => {
  switch (provider) {
    case 'yamap': return '#FF6B35';
    case 'garmin': return '#007FFF';
    case '2bulu': return '#4CAF50';
    case 'foooooot': return '#FF9800';
    case 'example': return '#9C27B0'; // 紫色用于示例数据
    default: return '#FF0000';
  }
};

export function UnifiedTrackMapSimple({ code, isFile = false, className = '' }: UnifiedTrackMapProps) {
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const parseTrackData = async () => {
      try {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);

        // 获取轨迹数据内容
        let content = code;

        if (isFile) {
          // 处理文件路径
          let filePath = code;
          if (filePath.startsWith('@Publish/')) {
            // 使用 Vite 开发服务器的 fs.allow 配置访问上级目录
            // 将 @Publish/Attachments/file.gpx 转换为 /@fs/绝对路径
            const absolutePath = '/Users/sunyishen/Personal/repos/Perlite/Publish/' + 
              filePath.replace('@Publish/', '');
            filePath = '/@fs' + absolutePath;
          }

          console.log('Loading track file from:', filePath);

          try {
            const response = await fetch(filePath);
            if (!response.ok) {
              throw new Error(`Failed to load track file: ${response.statusText}`);
            }
            content = await response.text();
            console.log('Loaded file content, size:', content.length);
          } catch (fetchError) {
            throw new Error(`Could not load track file from ${filePath}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
          }
        }

        if (!isMounted) return;

        // 检测提供商
        const provider = detectProvider(content);
        console.log('Detected provider:', provider);

        // 解析轨迹数据
        let parsedData: TrackData;

        // 更准确的格式检测
        const isKML = content.includes('<kml') || content.includes('xmlns="http://www.opengis.net/kml');
        const isGPX = content.includes('<gpx') || content.includes('xmlns="http://www.topografix.com/GPX');
        
        if (isKML && !isGPX) {
          // KML 解析 (简化版本)
          console.log('Detected KML format, attempting to parse...');
          parsedData = await parseKMLData(content, provider);
        } else if (isGPX && !isKML) {
          // GPX 解析 (增强版本) 
          parsedData = await parseGPXData(content, provider);
        } else {
          // 优先尝试 GPX，如果失败再尝试 KML
          try {
            parsedData = await parseGPXData(content, provider);
          } catch (gpxError) {
            console.log('GPX parsing failed, trying KML...', gpxError);
            parsedData = await parseKMLData(content, provider);
          }
        }

        if (!isMounted) return;

        console.log('Parsed track data:', {
          name: parsedData.name,
          provider: parsedData.provider,
          trackPoints: parsedData.coordinates.length,
          photos: parsedData.photos?.length || 0,
        });

        setTrackData(parsedData);

      } catch (err) {
        console.error('Track parsing error:', err);
        if (!isMounted) return;

        setError(err instanceof Error ? err.message : 'Failed to parse track data');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    parseTrackData();

    return () => {
      isMounted = false;
    };
  }, [code, isFile]);

  // GPX 解析函数 (增强版本)
  const parseGPXData = async (content: string, provider: string): Promise<TrackData> => {
    try {
      // 尝试多种解析方式
      let gpx;
      let parseError;
      
      // 方法1: 尝试直接调用 parseGpx
      try {
        if (gpxParser.parseGpx && typeof gpxParser.parseGpx === 'function') {
          gpx = gpxParser.parseGpx(content);
        }
      } catch (err) {
        parseError = err;
      }
      
      // 方法2: 尝试调用 parse
      if (!gpx) {
        try {
          if (gpxParser.parse && typeof gpxParser.parse === 'function') {
            gpx = gpxParser.parse(content);
          }
        } catch (err) {
          parseError = err;
        }
      }
      
      // 方法3: 尝试直接调用 default
      if (!gpx) {
        try {
          if (typeof gpxParser === 'function') {
            gpx = gpxParser(content);
          }
        } catch (err) {
          parseError = err;
        }
      }
      
      // 方法4: 尝试 default.parseGpx
      if (!gpx) {
        try {
          if (gpxParser.default && typeof gpxParser.default.parseGpx === 'function') {
            gpx = gpxParser.default.parseGpx(content);
          }
        } catch (err) {
          parseError = err;
        }
      }
      
      // 方法5: 尝试 default 作为函数
      if (!gpx) {
        try {
          if (gpxParser.default && typeof gpxParser.default === 'function') {
            gpx = gpxParser.default(content);
          }
        } catch (err) {
          parseError = err;
        }
      }
      
      if (!gpx) {
        throw new Error(`GPX parser returned null or undefined. Last error: ${parseError?.message || 'Unknown error'}`);
      }

      const coordinates: [number, number][] = [];
      const waypoints: Array<{ lat: number; lon: number; name?: string; description?: string }> = [];

      // 处理轨迹点 - 多种可能的结构
      const trackSources = [
        gpx.trk,
        gpx.gpx?.trk,
        gpx.tracks,
        gpx.gpx?.tracks
      ].filter(Boolean);

      for (const trackArray of trackSources) {
        if (Array.isArray(trackArray)) {
          trackArray.forEach((track: any) => {
            const segmentSources = [
              track.trkseg,
              track.segments,
              track.trackSegments
            ].filter(Boolean);

            for (const segmentArray of segmentSources) {
              if (Array.isArray(segmentArray)) {
                segmentArray.forEach((segment: any) => {
                  const pointSources = [
                    segment.trkpt,
                    segment.points,
                    segment.trackPoints
                  ].filter(Boolean);

                  for (const pointArray of pointSources) {
                    if (Array.isArray(pointArray)) {
                      pointArray.forEach((point: any) => {
                        const lat = point.$.lat || point.lat || point['@_lat'] || point.latitude;
                        const lon = point.$.lon || point.lon || point['@_lon'] || point.longitude;
                        if (lat && lon) {
                          coordinates.push([parseFloat(lat), parseFloat(lon)]);
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

      // 处理航点
      const waypointSources = [gpx.wpt, gpx.gpx?.wpt, gpx.waypoints].filter(Boolean);
      waypointSources.forEach(wptArray => {
        if (Array.isArray(wptArray)) {
          wptArray.forEach((waypoint: any) => {
            const lat = waypoint['@_lat'] || waypoint.$.lat || waypoint.lat || waypoint.latitude;
            const lon = waypoint['@_lon'] || waypoint.$.lon || waypoint.lon || waypoint.longitude;
            if (lat && lon) {
              waypoints.push({
                lat: parseFloat(lat),
                lon: parseFloat(lon),
                name: waypoint.name || 'Waypoint',
                description: waypoint.desc || waypoint.description || ''
              });
            }
          });
        }
      });

      if (coordinates.length === 0) {
        throw new Error('No valid track points found in GPX data');
      }

      return {
        name: gpx.metadata?.name?.[0] || gpx.trk?.[0]?.name || `${provider.toUpperCase()} Track`,
        coordinates,
        waypoints,
        provider,
        photos: [] // GPX 通常没有照片
      };

    } catch (err) {
      console.error('GPX parsing error:', err);
      throw err;
    }
  };

  // 多厂商KML解析函数 - 系统化格式支持
  const parseKMLData = async (content: string, provider: string): Promise<TrackData> => {
    try {
      console.log('Parsing KML content, length:', content.length, 'Provider:', provider);
      
      const coordinates: [number, number][] = [];
      const waypoints: Array<{ lat: number; lon: number; name?: string; description?: string }> = [];
      
      // 提取轨迹名称
      let trackName = `${provider.toUpperCase()} Track`;
      const nameMatches = content.match(/<name[^>]*>([^<]*)<\/name>/gi);
      if (nameMatches && nameMatches.length > 0) {
        for (const match of nameMatches) {
          const nameContent = match.match(/<name[^>]*>([^<]*)<\/name>/i);
          if (nameContent && nameContent[1].trim()) {
            trackName = nameContent[1].trim();
            break;
          }
        }
      }
      
      // 基于供应商的智能解析策略选择
      const getParseStrategiesForProvider = (provider: string) => {
        const strategies = [];
        
        if (provider === '2bulu') {
          // 2bulu 优先使用 gx:Track 格式，后备使用标准 LineString
          strategies.push(
            {
              name: '2bulu_gx_track',
              pattern: /<gx:Track[^>]*>([\s\S]*?)<\/gx:Track>/gi,
              parser: (match: string) => {
                const coords = match.match(/<gx:coord[^>]*>([^<]*)<\/gx:coord>/gi);
                if (coords) {
                  coords.forEach(coord => {
                    const coordMatch = coord.match(/<gx:coord[^>]*>([^<]*)<\/gx:coord>/i);
                    if (coordMatch) {
                      const parts = coordMatch[1].trim().split(/\s+/);
                      if (parts.length >= 2) {
                        const longitude = parseFloat(parts[0]);
                        const latitude = parseFloat(parts[1]);
                        if (!isNaN(longitude) && !isNaN(latitude) && 
                            Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                          coordinates.push([latitude, longitude]);
                        }
                      }
                    }
                  });
                }
              }
            },
            {
              name: '2bulu_standard_linestring',
              pattern: /<LineString[^>]*>[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/gi,
              parser: (match: string) => {
                const coordMatch = match.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
                if (coordMatch) {
                  const coordText = coordMatch[1].trim();
                  const coordLines = coordText.split(/[\n\r\s,]+/).filter(line => line.trim());
                  
                  for (let i = 0; i < coordLines.length - 1; i += 2) {
                    const longitude = parseFloat(coordLines[i]);
                    const latitude = parseFloat(coordLines[i + 1]);
                    if (!isNaN(longitude) && !isNaN(latitude) && 
                        Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                      coordinates.push([latitude, longitude]);
                    }
                  }
                }
              }
            }
          );
        } else if (provider === 'foooooot') {
          // foooooot 专用解析策略
          strategies.push(
            {
              name: 'foooooot_placemark_linestring', 
              pattern: /<Placemark[^>]*>[\s\S]*?<LineString[^>]*>[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>[\s\S]*?<\/Placemark>/gi,
              parser: (match: string) => {
                const coordMatch = match.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
                if (coordMatch) {
                  const coordText = coordMatch[1].trim();
                  // foooooot 特殊格式：空格分隔的坐标对
                  const coordPairs = coordText.split(/\s+/).filter(pair => pair.trim());
                  
                  coordPairs.forEach(pair => {
                    const coords = pair.split(',');
                    if (coords.length >= 2) {
                      const longitude = parseFloat(coords[0]);
                      const latitude = parseFloat(coords[1]);
                      if (!isNaN(longitude) && !isNaN(latitude) && 
                          Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                        coordinates.push([latitude, longitude]);
                      }
                    }
                  });
                }
              }
            },
            {
              name: 'foooooot_standard_linestring',
              pattern: /<LineString[^>]*>[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/gi,
              parser: (match: string) => {
                const coordMatch = match.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
                if (coordMatch) {
                  const coordText = coordMatch[1].trim();
                  const coordLines = coordText.split(/[\n\r\s,]+/).filter(line => line.trim());
                  
                  for (let i = 0; i < coordLines.length - 1; i += 2) {
                    const longitude = parseFloat(coordLines[i]);
                    const latitude = parseFloat(coordLines[i + 1]);
                    if (!isNaN(longitude) && !isNaN(latitude) && 
                        Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                      coordinates.push([latitude, longitude]);
                    }
                  }
                }
              }
            }
          );
        } else {
          // 通用策略 - 为其他供应商或未知格式
          strategies.push(
            {
              name: 'generic_gx_track',
              pattern: /<gx:Track[^>]*>([\s\S]*?)<\/gx:Track>/gi,
              parser: (match: string) => {
                const coords = match.match(/<gx:coord[^>]*>([^<]*)<\/gx:coord>/gi);
                if (coords) {
                  coords.forEach(coord => {
                    const coordMatch = coord.match(/<gx:coord[^>]*>([^<]*)<\/gx:coord>/i);
                    if (coordMatch) {
                      const parts = coordMatch[1].trim().split(/\s+/);
                      if (parts.length >= 2) {
                        const longitude = parseFloat(parts[0]);
                        const latitude = parseFloat(parts[1]);
                        if (!isNaN(longitude) && !isNaN(latitude) && 
                            Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                          coordinates.push([latitude, longitude]);
                        }
                      }
                    }
                  });
                }
              }
            },
            {
              name: 'generic_standard_linestring',
              pattern: /<LineString[^>]*>[\s\S]*?<coordinates[^>]*>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/gi,
              parser: (match: string) => {
                const coordMatch = match.match(/<coordinates[^>]*>([\s\S]*?)<\/coordinates>/i);
                if (coordMatch) {
                  const coordText = coordMatch[1].trim();
                  const coordLines = coordText.split(/[\n\r\s,]+/).filter(line => line.trim());
                  
                  for (let i = 0; i < coordLines.length - 1; i += 2) {
                    const longitude = parseFloat(coordLines[i]);
                    const latitude = parseFloat(coordLines[i + 1]);
                    if (!isNaN(longitude) && !isNaN(latitude) && 
                        Math.abs(longitude) <= 180 && Math.abs(latitude) <= 90) {
                      coordinates.push([latitude, longitude]);
                    }
                  }
                }
              }
            }
          );
        }
        
        return strategies;
      };
      
      const parseStrategies = getParseStrategiesForProvider(provider);
      
      // 按策略顺序尝试解析轨迹坐标
      for (const strategy of parseStrategies) {
        const matches = content.match(strategy.pattern);
        if (matches) {
          console.log(`Using strategy: ${strategy.name}, found ${matches.length} matches`);
          matches.forEach(strategy.parser);
          if (coordinates.length > 0) {
            console.log(`Successfully parsed ${coordinates.length} coordinates with ${strategy.name}`);
            break;
          }
        }
      }
      
      // 查找Point坐标 (航点)
      const pointMatches = content.match(/<Placemark[^>]*>[\s\S]*?<Point[^>]*>[\s\S]*?<coordinates[^>]*>([^<]*)<\/coordinates>[\s\S]*?<\/Point>[\s\S]*?<\/Placemark>/gi);
      
      if (pointMatches) {
        pointMatches.forEach(pointMatch => {
          const coordMatch = pointMatch.match(/<coordinates[^>]*>([^<]*)<\/coordinates>/i);
          const nameMatch = pointMatch.match(/<name[^>]*>([^<]*)<\/name>/i);
          const descMatch = pointMatch.match(/<description[^>]*>([\s\S]*?)<\/description>/i);
          
          if (coordMatch) {
            const coords = coordMatch[1].trim().split(/[,\s]+/);
            if (coords.length >= 2) {
              const longitude = parseFloat(coords[0]);
              const latitude = parseFloat(coords[1]);
              
              if (!isNaN(longitude) && !isNaN(latitude)) {
                waypoints.push({
                  lat: latitude,
                  lon: longitude,
                  name: nameMatch ? nameMatch[1] : 'Waypoint',
                  description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').trim() : ''
                });
              }
            }
          }
        });
      }
      
      // 如果没有找到轨迹点，但有航点，仍然可以显示
      if (coordinates.length === 0 && waypoints.length === 0) {
        // 作为最后的尝试，查找任何包含坐标的文本，但要更严格的验证
        const allCoordMatches = content.match(/([+-]?\d+\.\d+),([+-]?\d+\.\d+)/g);
        if (allCoordMatches && allCoordMatches.length > 2) {
          console.log('Found coordinate pairs as fallback:', allCoordMatches.length);
          
          // 验证坐标是否在合理范围内（中国地区）
          const validCoords: [number, number][] = [];
          allCoordMatches.slice(0, Math.min(1000, allCoordMatches.length)).forEach(coordStr => {
            const coords = coordStr.split(',');
            const longitude = parseFloat(coords[0]);
            const latitude = parseFloat(coords[1]);
            
            // 更严格的坐标验证：确保在地球范围内，且看起来像真实坐标
            if (!isNaN(longitude) && !isNaN(latitude) && 
                longitude >= -180 && longitude <= 180 && 
                latitude >= -90 && latitude <= 90 &&
                // 排除明显错误的坐标（太小的数字可能是其他数据）
                Math.abs(longitude) > 0.01 && Math.abs(latitude) > 0.01) {
              validCoords.push([latitude, longitude]);
            }
          });
          
          // 只有找到足够多的有效坐标才使用
          if (validCoords.length > 10) {
            coordinates.push(...validCoords);
            console.log(`Using ${validCoords.length} valid coordinates from fallback`);
          }
        }
      }
      
      if (coordinates.length === 0 && waypoints.length === 0) {
        throw new Error('No valid track points or waypoints found in KML data');
      }
      
      console.log(`Parsed KML: ${coordinates.length} track points, ${waypoints.length} waypoints`);
      
      return {
        name: trackName,
        coordinates,
        waypoints,
        provider,
        photos: [] // KML 照片支持待实现
      };
      
    } catch (err) {
      console.error('KML parsing error:', err);
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className={`track-container ${className}`} style={{
        margin: '1rem 0',
        padding: '2rem',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px'
      }}>
        Loading track data...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`track-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            ⚠️ Track parsing error: {error}
          </p>
          <details style={{ marginTop: '0.5rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '12px' }}>Show source</summary>
            <pre style={{
              margin: '0.5rem 0 0 0',
              padding: '0.5rem',
              background: 'var(--background-primary)',
              borderRadius: '2px',
              fontSize: '11px',
              textAlign: 'left',
              overflowX: 'auto'
            }}>{code}</pre>
          </details>
        </div>
      </div>
    );
  }

  if (!trackData || (trackData.coordinates.length === 0 && trackData.waypoints.length === 0)) {
    return (
      <div className={`track-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            No track data found in file
          </p>
        </div>
      </div>
    );
  }

  // 计算地图边界 - 包含轨迹点和航点
  const allPoints = [
    ...trackData.coordinates,
    ...trackData.waypoints.map(w => [w.lat, w.lon] as [number, number])
  ];
  
  if (allPoints.length === 0) {
    return (
      <div className={`track-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            No valid coordinates found for map display
          </p>
        </div>
      </div>
    );
  }
  
  const bounds = allPoints.reduce(
    (acc, [lat, lon]) => ({
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat),
      minLon: Math.min(acc.minLon, lon),
      maxLon: Math.max(acc.maxLon, lon)
    }),
    {
      minLat: allPoints[0][0],
      maxLat: allPoints[0][0],
      minLon: allPoints[0][1],
      maxLon: allPoints[0][1]
    }
  );

  const center: [number, number] = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLon + bounds.maxLon) / 2
  ];

  // 验证边界是否有效
  if (isNaN(center[0]) || isNaN(center[1]) || 
      Math.abs(bounds.maxLat - bounds.minLat) === 0 && Math.abs(bounds.maxLon - bounds.minLon) === 0) {
    return (
      <div className={`track-container ${className}`} style={{ margin: '1rem 0' }}>
        <div style={{
          padding: '1rem',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px',
          background: 'var(--background-secondary)',
          color: 'var(--text-muted)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Invalid coordinates - unable to display map
          </p>
        </div>
      </div>
    );
  }

  const trackColor = getTrackColor(trackData.provider);

  return (
    <div className={`track-container ${className}`} style={{
      margin: '1rem 0',
      height: '400px',
      border: '1px solid var(--background-modifier-border)',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      {/* 显示轨迹信息 */}
      <div style={{
        padding: '0.5rem',
        backgroundColor: 'var(--background-secondary)',
        borderBottom: '1px solid var(--background-modifier-border)',
        fontSize: '12px',
        color: 'var(--text-muted)'
      }}>
        <strong>{trackData.name}</strong>
        {trackData.provider && (
          <span style={{ marginLeft: '0.5rem', color: trackColor }}>
            [{trackData.provider.toUpperCase()}]
          </span>
        )}
        {trackData.coordinates.length > 0 && (
          <span style={{ marginLeft: '0.5rem' }}>
            {trackData.coordinates.length} points
          </span>
        )}
      </div>

      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 'calc(100% - 40px)', width: '100%' }}
        bounds={[[bounds.minLat, bounds.minLon], [bounds.maxLat, bounds.maxLon]]}
        boundsOptions={{ padding: [20, 20] }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 渲染轨迹线 */}
        <Polyline
          positions={trackData.coordinates}
          color={trackColor}
          weight={3}
          opacity={0.8}
        />

        {/* 起点标记 */}
        {trackData.coordinates.length > 0 && (
          <Marker
            position={trackData.coordinates[0]}
            icon={createCustomIcon('#4CAF50', 'start')}
          >
            <Popup>
              <div>
                <strong>起点</strong><br />
                <small>
                  {trackData.coordinates[0][0].toFixed(6)}, {trackData.coordinates[0][1].toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 终点标记 */}
        {trackData.coordinates.length > 1 && (
          <Marker
            position={trackData.coordinates[trackData.coordinates.length - 1]}
            icon={createCustomIcon('#F44336', 'end')}
          >
            <Popup>
              <div>
                <strong>终点</strong><br />
                <small>
                  {trackData.coordinates[trackData.coordinates.length - 1][0].toFixed(6)}, {trackData.coordinates[trackData.coordinates.length - 1][1].toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 航点标记 */}
        {trackData.waypoints.map((waypoint, index) => (
          <Marker
            key={`waypoint-${index}`}
            position={[waypoint.lat, waypoint.lon]}
            icon={createCustomIcon('#FF9800', 'waypoint')}
          >
            <Popup>
              <div>
                <strong>{waypoint.name}</strong><br />
                {waypoint.description && <p style={{ margin: '0.5rem 0', fontSize: '12px' }}>{waypoint.description}</p>}
                <small>
                  {waypoint.lat.toFixed(6)}, {waypoint.lon.toFixed(6)}
                </small>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}