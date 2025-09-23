/**
 * 真实的轨迹地图组件
 * 使用 Leaflet 渲染 GPX/KML 轨迹数据
 */

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import { LatLngBounds, LatLngTuple } from 'leaflet';
import gpxParser from 'gpx-parser-builder';
// Note: xml2js doesn't work well in browser, we'll use DOMParser instead
import { useNewVaultStore } from '../../newStores/newVaultStore.js';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrackMapProps {
  trackId: string;
  trackType: 'single-track' | 'multi-track' | 'leaflet' | 'footprints';
  format?: 'gpx' | 'kml';
  source?: 'inline' | 'file';
  trackData?: string;  // 内联数据
  trackFile?: string;  // 文件路径
  config?: any;
}

interface TrackPoint {
  lat: number;
  lng: number;
  elevation?: number;
  time?: Date;
}

interface ParsedTrack {
  name?: string;
  points: TrackPoint[];
  waypoints?: Array<{
    lat: number;
    lng: number;
    name?: string;
  }>;
}

export const TrackMap: React.FC<TrackMapProps> = ({
  trackId,
  trackType,
  format,
  source,
  trackData,
  trackFile,
  config
}) => {
  const [tracks, setTracks] = useState<ParsedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const vaultService = useNewVaultStore(state => state.vaultService);
  const getRawDocumentContent = useNewVaultStore(state => state.getRawDocumentContent);

  // Debug props only in development
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TRACKS) {
    console.log('🗺️ TrackMap props:', { trackId, trackType, format, source });
  }

  useEffect(() => {
    loadTrackData();
  }, [trackId, trackData, trackFile, trackType, format, source]);

  const loadTrackData = async () => {

    // 检查文件访问是否可用（对于需要文件加载的场景）
    if ((trackType === 'leaflet' || source === 'file') && !vaultService && !getRawDocumentContent) {
      setError('File access not available. Cannot load track files.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let parsedTracks: ParsedTrack[] = [];

      // Handle different track types
      if (trackType === 'leaflet') {

        if (!config || !config.gpx) {
          throw new Error('Leaflet configuration missing GPX files');
        }

        const allTracks: ParsedTrack[] = [];
        const gpxFiles = Array.isArray(config.gpx) ? config.gpx : [config.gpx];

        for (const gpxFile of gpxFiles) {
          try {
            // Remove [[ ]] wrapper if present
            const cleanPath = gpxFile.replace(/^\[\[|\]\]$/g, '').trim();
            const filePath = cleanPath.startsWith('Attachments/') ? cleanPath : `Attachments/${cleanPath}`;

            // 使用 VaultService 或临时文件访问
            let gpxContent: string;
            if (vaultService) {
              gpxContent = await vaultService.getRawDocumentContent(filePath);
            } else if (getRawDocumentContent) {
              gpxContent = await getRawDocumentContent(filePath);
            } else {
              continue;
            }
            const parsedTracks = await parseTrackData(gpxContent, 'gpx');
            allTracks.push(...parsedTracks);
          } catch (error) {
            // Silently skip missing files, only log in dev mode with debug flag
            if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TRACKS) {
              console.warn('Error loading GPX file:', gpxFile, error);
            }
          }
        }

        if (allTracks.length === 0) {
          throw new Error('未找到可用的轨迹文件');
        }

        parsedTracks = allTracks;

      } else if (trackType === 'footprints') {

        if (!config || !config.userInputs) {
          throw new Error('Footprints configuration missing userInputs');
        }

        // Create mock waypoints for each user input location
        const mockTrack: ParsedTrack = {
          name: 'Footprints Aggregation',
          points: [],
          waypoints: config.userInputs.map((location: string, index: number) => ({
            lat: 31.23 + index * 0.1, // Mock coordinates for demonstration
            lng: 121.47 + index * 0.1,
            name: location
          }))
        };

        parsedTracks = [mockTrack];

      } else {
        // Handle single-track and multi-track types
        let data: string;
      
      if (source === 'inline' && trackData) {
        // 使用内联数据
        data = trackData;
      } else if (source === 'file' && trackFile) {
        // 加载文件数据
        if (vaultService) {
          data = await vaultService.getRawDocumentContent(trackFile);
        } else if (getRawDocumentContent) {
          data = await getRawDocumentContent(trackFile);
        } else {
          throw new Error('No file access method available');
        }
      } else {
        throw new Error('No track data or file provided');
      }

        // 解析轨迹数据
        parsedTracks = await parseTrackData(data, format);
      }

      // 设置解析后的轨迹数据
      setTracks(parsedTracks);

      // 计算地图边界
      if (parsedTracks.length > 0) {
        const bounds = calculateBounds(parsedTracks);
        // Only set bounds if they are valid (not empty)
        if (bounds.isValid()) {
          setMapBounds(bounds);
        } else {
          // Set a default bounds around Shanghai area
          const defaultBounds = new LatLngBounds([
            [31.0, 120.0], // Southwest
            [32.0, 121.0]  // Northeast
          ]);
          setMapBounds(defaultBounds);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '轨迹数据加载失败');
      // Only log errors in debug mode
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TRACKS) {
        console.error('Track loading error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const parseTrackData = async (data: string, format?: 'gpx' | 'kml'): Promise<ParsedTrack[]> => {
    if (format === 'gpx' || data.includes('<gpx')) {
      return parseGPX(data);
    } else if (format === 'kml' || data.includes('<kml')) {
      return parseKML(data);
    } else {
      throw new Error('Unsupported track format');
    }
  };

  const parseGPX = async (gpxData: string): Promise<ParsedTrack[]> => {
    try {
      const gpx = gpxParser.parse(gpxData);
      
      const tracks: ParsedTrack[] = [];

      // Check multiple possible track structures from gpx-parser-builder
      let tracksData = null;

      if (gpx.tracks && Array.isArray(gpx.tracks)) {
        tracksData = gpx.tracks;
      } else if (gpx.trk && Array.isArray(gpx.trk)) {
        tracksData = gpx.trk;
      } else if (gpx.trk && !Array.isArray(gpx.trk)) {
        tracksData = [gpx.trk];
      } else if (typeof gpx === 'object') {
        // Check for common GPX element names
        const possibleTrackKeys = ['track', 'tracks', 'trk', 'trks', 'route', 'routes', 'rte'];
        for (const key of possibleTrackKeys) {
          if (gpx[key]) {
            tracksData = Array.isArray(gpx[key]) ? gpx[key] : [gpx[key]];
            break;
          }
        }
      }

      if (tracksData && tracksData.length > 0) {
        for (const track of tracksData) {
          const points: TrackPoint[] = [];

          // Handle different segment structures
          let segments = null;
          if (track.segments && Array.isArray(track.segments)) {
            segments = track.segments;
          } else if (track.trkseg && Array.isArray(track.trkseg)) {
            segments = track.trkseg;
          } else if (track.trkseg && !Array.isArray(track.trkseg)) {
            segments = [track.trkseg];
          } else if (track.segment && Array.isArray(track.segment)) {
            segments = track.segment;
          } else if (track.segment && !Array.isArray(track.segment)) {
            segments = [track.segment];
          }

          if (segments) {
            for (const segment of segments) {
              // Handle different point structures
              let segmentPoints = null;
              if (segment.points && Array.isArray(segment.points)) {
                segmentPoints = segment.points;
              } else if (segment.trkpt && Array.isArray(segment.trkpt)) {
                segmentPoints = segment.trkpt;
              } else if (segment.point && Array.isArray(segment.point)) {
                segmentPoints = segment.point;
              }

              if (segmentPoints) {
                for (const point of segmentPoints) {
                  // Handle different point coordinate structures
                  let lat = point.lat || point.latitude || point._lat || point['@_lat'] || point['@lat'] || point.$?.lat;
                  let lng = point.lon || point.lng || point.longitude || point._lon || point['@_lon'] || point['@lon'] || point.$?.lon;

                  // Special handling for Waypoint objects that might have coordinates in different structure
                  if (!lat && !lng && point.constructor?.name === 'Waypoint') {
                    // Check if coordinates are in a nested structure
                    if (point.coordinates) {
                      lat = point.coordinates.lat || point.coordinates.latitude;
                      lng = point.coordinates.lng || point.coordinates.lon || point.coordinates.longitude;
                    }
                    // Check if it's an array-like structure [lng, lat] or [lat, lng]
                    if (!lat && !lng && point.length >= 2) {
                      lat = point[1] || point[0]; // Try both orders
                      lng = point[0] || point[1];
                    }
                  }

                  const ele = point.ele || point.elevation || point._ele;
                  const time = point.time || point._time;
                  
                  if (lat !== undefined && lng !== undefined) {
                    points.push({
                      lat: parseFloat(lat),
                      lng: parseFloat(lng),
                      elevation: ele ? parseFloat(ele) : undefined,
                      time: time ? (typeof time === 'string' ? new Date(time) : time) : undefined
                    });
                  }
                }
              }
            }
          }

          if (points.length > 0) {
            const trackName = track.name || track._name || track['@_name'] || `Track ${tracks.length + 1}`;
            tracks.push({
              name: trackName,
              points
            });
          }
        }
      }

      return tracks;
    } catch (error) {
      return parseGPXManual(gpxData);
    }
  };

  const parseGPXManual = (gpxData: string): Promise<ParsedTrack[]> => {
    return new Promise((resolve, reject) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(gpxData, 'text/xml');

        // Check for XML parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          reject(new Error('XML parsing error: ' + parserError.textContent));
          return;
        }

        const tracks: ParsedTrack[] = [];
        const trackElements = doc.querySelectorAll('trk');

        for (const trackElement of trackElements) {
          const points: TrackPoint[] = [];
          const segments = trackElement.querySelectorAll('trkseg');

          for (const segment of segments) {
            const trackPoints = segment.querySelectorAll('trkpt');

            for (const point of trackPoints) {
              const lat = parseFloat(point.getAttribute('lat') || '0');
              const lng = parseFloat(point.getAttribute('lon') || '0');
              const eleElement = point.querySelector('ele');
              const timeElement = point.querySelector('time');

              if (lat !== 0 && lng !== 0) { // Only add valid coordinates
                points.push({
                  lat,
                  lng,
                  elevation: eleElement ? parseFloat(eleElement.textContent || '0') : undefined,
                  time: timeElement ? new Date(timeElement.textContent || '') : undefined
                });
              }
            }
          }

          if (points.length > 0) {
            const nameElement = trackElement.querySelector('name');
            const trackName = nameElement?.textContent || 'Unnamed Track';
            tracks.push({
              name: trackName,
              points
            });
          }
        }

        resolve(tracks);
      } catch (parseError) {
        reject(parseError);
      }
    });
  };

  const parseKML = (kmlData: string): Promise<ParsedTrack[]> => {
    return new Promise((resolve, reject) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(kmlData, 'text/xml');
        
        // Check for XML parsing errors
        const parserError = doc.querySelector('parsererror');
        if (parserError) {
          reject(new Error('XML parsing error: ' + parserError.textContent));
          return;
        }

        const tracks: ParsedTrack[] = [];
        const documents = doc.querySelectorAll('Document');
        
        for (const document of documents) {
          const points: TrackPoint[] = [];
          const waypoints: Array<{ lat: number; lng: number; name?: string }> = [];
          const placemarks = document.querySelectorAll('Placemark');

          for (const placemark of placemarks) {
            const pointElement = placemark.querySelector('Point coordinates');
            const lineStringElement = placemark.querySelector('LineString coordinates');
            const gxTrackElement = placemark.querySelector('gx\\:Track, Track'); // Handle Google KML Extensions
            const nameElement = placemark.querySelector('name');
            const placemarkName = nameElement?.textContent;

            if (pointElement) {
              // 点标记
              const coordsText = pointElement.textContent?.trim();
              if (coordsText) {
                const coords = coordsText.split(',');
                if (coords.length >= 2) {
                  waypoints.push({
                    lng: parseFloat(coords[0]),
                    lat: parseFloat(coords[1]),
                    name: placemarkName
                  });
                }
              }
            } else if (lineStringElement) {
              // 线条轨迹
              const coordsText = lineStringElement.textContent?.trim();
              if (coordsText) {
                const coordPairs = coordsText.split(/\s+/);

                for (const pair of coordPairs) {
                  const coords = pair.split(',');
                  if (coords.length >= 2) {
                    points.push({
                      lng: parseFloat(coords[0]),
                      lat: parseFloat(coords[1]),
                      elevation: coords[2] ? parseFloat(coords[2]) : undefined
                    });
                  }
                }
              }
            } else if (gxTrackElement) {
              // Google KML Extensions - gx:Track format
              const gxCoordElements = gxTrackElement.querySelectorAll('gx\\:coord, coord');

              for (const coordElement of gxCoordElements) {
                const coordText = coordElement.textContent?.trim();
                if (coordText) {
                  const coords = coordText.split(/\s+/);
                  if (coords.length >= 2) {
                    points.push({
                      lng: parseFloat(coords[0]),
                      lat: parseFloat(coords[1]),
                      elevation: coords[2] ? parseFloat(coords[2]) : undefined
                    });
                  }
                }
              }
            }
          }

          const documentNameElement = document.querySelector('name');
          const documentName = documentNameElement?.textContent || 'KML Track';

          tracks.push({
            name: documentName,
            points: points.length > 0 ? points : waypoints.map(w => ({ lat: w.lat, lng: w.lng })),
            waypoints: waypoints.length > 0 ? waypoints : undefined
          });
        }

        resolve(tracks);
      } catch (parseError) {
        reject(parseError);
      }
    });
  };

  const calculateBounds = (tracks: ParsedTrack[]): LatLngBounds => {
    const bounds = new LatLngBounds([]);
    let hasValidPoints = false;
    
    for (const track of tracks) {
      for (const point of track.points) {
        if (typeof point.lat === 'number' && typeof point.lng === 'number' && 
            !isNaN(point.lat) && !isNaN(point.lng)) {
          bounds.extend([point.lat, point.lng]);
          hasValidPoints = true;
        }
      }
      
      if (track.waypoints) {
        for (const waypoint of track.waypoints) {
          if (typeof waypoint.lat === 'number' && typeof waypoint.lng === 'number' && 
              !isNaN(waypoint.lat) && !isNaN(waypoint.lng)) {
            bounds.extend([waypoint.lat, waypoint.lng]);
            hasValidPoints = true;
          }
        }
      }
    }
    
    // If no valid points found, return an invalid bounds
    if (!hasValidPoints && import.meta.env.DEV && import.meta.env.VITE_DEBUG_TRACKS) {
      console.warn('No valid coordinates found in tracks');
    }
    
    return bounds;
  };

  const generateTrackColors = (index: number): string => {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div style={{ 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>🗺️ 加载轨迹数据中...</div>
          <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
            {trackFile ? `文件: ${trackFile}` : '内联数据'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#fff5f5',
        border: '1px solid #fed7d7',
        borderRadius: '8px',
        color: '#c53030'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>❌ 轨迹加载失败</div>
          <div style={{ fontSize: '0.8em', marginTop: '0.5rem' }}>{error}</div>
        </div>
      </div>
    );
  }

  if (tracks.length === 0 || !mapBounds) {
    return (
      <div style={{ 
        height: '400px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>📍 未找到轨迹数据</div>
          <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
            ID: {trackId}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #dee2e6' }}>
      <MapContainer
        bounds={mapBounds}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {tracks.map((track, trackIndex) => (
          <React.Fragment key={trackIndex}>
            {/* 轨迹线 */}
            {track.points.length > 1 && (
              <Polyline
                positions={track.points.map(p => [p.lat, p.lng] as LatLngTuple)}
                color={generateTrackColors(trackIndex)}
                weight={3}
                opacity={0.8}
              >
                <Popup>
                  <div>
                    <strong>{track.name || `轨迹 ${trackIndex + 1}`}</strong><br/>
                    点数: {track.points.length}<br/>
                    格式: {format?.toUpperCase()}<br/>
                    来源: {source === 'file' ? trackFile : '内联数据'}
                  </div>
                </Popup>
              </Polyline>
            )}
            
            {/* 航点标记 */}
            {track.waypoints?.map((waypoint, wpIndex) => (
              <Marker key={`wp-${trackIndex}-${wpIndex}`} position={[waypoint.lat, waypoint.lng]}>
                <Popup>
                  <div>
                    <strong>{waypoint.name || `航点 ${wpIndex + 1}`}</strong><br/>
                    经纬度: {waypoint.lat.toFixed(6)}, {waypoint.lng.toFixed(6)}
                  </div>
                </Popup>
              </Marker>
            ))}
            
            {/* 起点和终点标记 */}
            {track.points.length > 0 && (
              <>
                <Marker position={[track.points[0].lat, track.points[0].lng]}>
                  <Popup>
                    <div>
                      <strong>🚩 起点</strong><br/>
                      {track.name && `轨迹: ${track.name}`}
                    </div>
                  </Popup>
                </Marker>
                
                {track.points.length > 1 && (
                  <Marker position={[track.points[track.points.length - 1].lat, track.points[track.points.length - 1].lng]}>
                    <Popup>
                      <div>
                        <strong>🏁 终点</strong><br/>
                        {track.name && `轨迹: ${track.name}`}
                      </div>
                    </Popup>
                  </Marker>
                )}
              </>
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
};