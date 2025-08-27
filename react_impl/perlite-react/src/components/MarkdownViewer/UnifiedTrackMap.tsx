import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { trackDataParserFactory, UnifiedTrackData } from '../../services/trackingDataService';

import 'leaflet/dist/leaflet.css';

interface UnifiedTrackMapProps {
  code: string;
  isFile?: boolean;
  className?: string;
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

export function UnifiedTrackMap({ code, isFile = false, className = '' }: UnifiedTrackMapProps) {
  const [trackData, setTrackData] = useState<UnifiedTrackData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAndParseTrackData = async () => {
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
            filePath = filePath.replace('@Publish/', '/src/../../../Publish/');
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

        // 使用统一解析器解析轨迹数据
        console.log('Parsing track data...');
        const parsedTrackData = await trackDataParserFactory.parseTrackData(content);
        
        if (!isMounted) return;

        console.log('Parsed track data:', {
          name: parsedTrackData.name,
          provider: parsedTrackData.metadata.provider,
          source: parsedTrackData.metadata.source,
          trackPoints: parsedTrackData.trackPoints.length,
          photos: parsedTrackData.photos.length,
        });

        setTrackData(parsedTrackData);

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

    loadAndParseTrackData();

    return () => {
      isMounted = false;
    };
  }, [code, isFile]);

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

  if (!trackData || trackData.trackPoints.length === 0) {
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

  // 计算地图边界
  const coordinates = trackData.trackPoints.map(p => [p.latitude, p.longitude] as [number, number]);
  const bounds = coordinates.reduce(
    (acc, [lat, lon]) => ({
      minLat: Math.min(acc.minLat, lat),
      maxLat: Math.max(acc.maxLat, lat),
      minLon: Math.min(acc.minLon, lon),
      maxLon: Math.max(acc.maxLon, lon)
    }),
    {
      minLat: coordinates[0][0],
      maxLat: coordinates[0][0],
      minLon: coordinates[0][1],
      maxLon: coordinates[0][1]
    }
  );

  const center: [number, number] = [
    (bounds.minLat + bounds.maxLat) / 2,
    (bounds.minLon + bounds.maxLon) / 2
  ];

  // 根据厂商选择轨迹颜色
  const getTrackColor = (provider?: string) => {
    switch (provider) {
      case 'yamap': return '#FF6B35';
      case 'garmin': return '#007FFF';
      case '2bulu': return '#4CAF50';
      case 'foooooot': return '#FF9800';
      default: return '#FF0000';
    }
  };

  const trackColor = getTrackColor(trackData.metadata.provider);

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
        {trackData.metadata.provider && (
          <span style={{ marginLeft: '0.5rem', color: trackColor }}>
            [{trackData.metadata.provider.toUpperCase()}]
          </span>
        )}
        {trackData.metadata.totalDistance && (
          <span style={{ marginLeft: '0.5rem' }}>
            {(trackData.metadata.totalDistance / 1000).toFixed(1)}km
          </span>
        )}
        {trackData.photos.length > 0 && (
          <span style={{ marginLeft: '0.5rem' }}>
            📷 {trackData.photos.length}
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
          positions={coordinates}
          color={trackColor}
          weight={3}
          opacity={0.8}
        />

        {/* 起点标记 */}
        {coordinates.length > 0 && (
          <Marker
            position={coordinates[0]}
            icon={createCustomIcon('#4CAF50', 'start')}
          >
            <Popup>
              <div>
                <strong>起点</strong><br />
                <small>
                  {coordinates[0][0].toFixed(6)}, {coordinates[0][1].toFixed(6)}
                </small>
                {trackData.trackPoints[0].time && (
                  <>
                    <br />
                    <small>{trackData.trackPoints[0].time.toLocaleString()}</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* 终点标记 */}
        {coordinates.length > 1 && (
          <Marker
            position={coordinates[coordinates.length - 1]}
            icon={createCustomIcon('#F44336', 'end')}
          >
            <Popup>
              <div>
                <strong>终点</strong><br />
                <small>
                  {coordinates[coordinates.length - 1][0].toFixed(6)}, {coordinates[coordinates.length - 1][1].toFixed(6)}
                </small>
                {trackData.trackPoints[trackData.trackPoints.length - 1].time && (
                  <>
                    <br />
                    <small>{trackData.trackPoints[trackData.trackPoints.length - 1].time.toLocaleString()}</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* 照片标记 */}
        {trackData.photos.map((photo, index: number) => (
          photo.latitude && photo.longitude && (
            <Marker
              key={`photo-${index}`}
              position={[photo.latitude, photo.longitude]}
              icon={createCustomIcon('#9C27B0', 'photo')}
            >
              <Popup maxWidth={300}>
                <div>
                  <strong>{photo.name || 'Photo'}</strong><br />
                  {photo.description && <p style={{ margin: '0.5rem 0', fontSize: '12px' }}>{photo.description}</p>}
                  <img
                    src={photo.url}
                    alt={photo.name || 'Track photo'}
                    style={{
                      maxWidth: '250px',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <br />
                  <small>
                    {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
                  </small>
                  {photo.time && (
                    <>
                      <br />
                      <small>{photo.time.toLocaleString()}</small>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* 特殊航点标记 */}
        {trackData.trackPoints
          .filter(point => point.name && point.name !== 'Waypoint')
          .map((waypoint, index) => (
            <Marker
              key={`waypoint-${index}`}
              position={[waypoint.latitude, waypoint.longitude]}
              icon={createCustomIcon('#FF9800', 'waypoint')}
            >
              <Popup>
                <div>
                  <strong>{waypoint.name}</strong><br />
                  {waypoint.description && <p style={{ margin: '0.5rem 0', fontSize: '12px' }}>{waypoint.description}</p>}
                  <small>
                    {waypoint.latitude.toFixed(6)}, {waypoint.longitude.toFixed(6)}
                  </small>
                  {waypoint.elevation && (
                    <>
                      <br />
                      <small>海拔: {waypoint.elevation.toFixed(0)}m</small>
                    </>
                  )}
                  {waypoint.time && (
                    <>
                      <br />
                      <small>{waypoint.time.toLocaleString()}</small>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}