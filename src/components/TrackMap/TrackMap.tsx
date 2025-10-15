/**
 * 轨迹地图组件
 * 使用 Leaflet 渲染 GPX/KML 轨迹数据
 * 所有轨迹数据通过 FootprintsService 统一处理
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds, type LatLngTuple } from 'leaflet';
import type {
  IFootprintsService,
  FootprintsData,
} from '../../services/interfaces/IFootprintsService.js';
import { useVaultService } from '../../hooks/useVaultService.js';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default markers
import L from 'leaflet';
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface TrackMapProps {
  trackId: string;
  trackType: 'single-track' | 'multi-track' | 'leaflet';
  filePathsJson?: string; // JSON 字符串格式的文件路径数组
  filePaths?: string[]; // 直接传递的数组（用于测试）
  config?: Record<string, unknown>; // Leaflet 特定配置
}

// 组件用于在地图加载后重新适应边界（主要用于全屏切换）
const RefitBounds: React.FC<{ bounds: LatLngBounds; trigger: boolean }> = ({ bounds, trigger }) => {
  const map = useMap();

  useEffect(() => {
    if (map && bounds && bounds.isValid()) {
      // 给一点延迟让地图容器大小改变生效
      setTimeout(() => {
        map.invalidateSize(); // 重新计算地图大小
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
        });
      }, 100);
    }
  }, [map, bounds, trigger]); // 当 trigger (全屏状态) 改变时触发

  return null;
};

// 地图控件组件 - 内嵌在主组件中
const MapControls: React.FC<{
  bounds: LatLngBounds;
  onFullscreen: () => void;
  isMobile: boolean;
}> = ({ bounds, onFullscreen, isMobile }) => {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleReset = () => {
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
    });
  };

  // 按钮样式 - 响应式
  const buttonSize = isMobile ? 24 : 28;
  const fontSize = isMobile ? '14px' : '16px';
  const containerPadding = isMobile ? '4px' : '6px';

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: isMobile ? '6px' : '8px',
        padding: containerPadding,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(224, 224, 224, 0.5)',
      }}
    >
      <button
        onClick={handleZoomIn}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          border: 'none',
          borderRadius: isMobile ? '4px' : '6px',
          background: '#ffffff',
          color: '#333',
          cursor: 'pointer',
          fontSize,
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="放大"
      >
        +
      </button>

      <div
        style={{
          width: '1px',
          height: isMobile ? '16px' : '20px',
          backgroundColor: 'rgba(224, 224, 224, 0.5)',
          margin: isMobile ? '0 3px' : '0 4px',
        }}
      />

      <button
        onClick={handleZoomOut}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          border: 'none',
          borderRadius: isMobile ? '4px' : '6px',
          background: '#ffffff',
          color: '#333',
          cursor: 'pointer',
          fontSize,
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="缩小"
      >
        −
      </button>

      <div
        style={{
          width: '1px',
          height: isMobile ? '16px' : '20px',
          backgroundColor: 'rgba(224, 224, 224, 0.5)',
          margin: isMobile ? '0 3px' : '0 4px',
        }}
      />

      <button
        onClick={handleReset}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          border: 'none',
          borderRadius: isMobile ? '4px' : '6px',
          background: '#ffffff',
          color: '#333',
          cursor: 'pointer',
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="重置视图"
      >
        ⟲
      </button>

      <div
        style={{
          width: '1px',
          height: isMobile ? '16px' : '20px',
          backgroundColor: 'rgba(224, 224, 224, 0.5)',
          margin: isMobile ? '0 3px' : '0 4px',
        }}
      />

      <button
        onClick={onFullscreen}
        style={{
          width: `${buttonSize}px`,
          height: `${buttonSize}px`,
          border: 'none',
          borderRadius: isMobile ? '4px' : '6px',
          background: '#ffffff',
          color: '#333',
          cursor: 'pointer',
          fontSize: isMobile ? '12px' : '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
        }}
        title="全屏"
      >
        ⛶
      </button>
    </div>
  );
};

export const TrackMap: React.FC<TrackMapProps> = ({
  trackId,
  filePathsJson,
  filePaths: filePathsProp,
}) => {
  const [footprintsData, setFootprintsData] = useState<FootprintsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapBounds, setMapBounds] = useState<LatLngBounds | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // 解析文件路径
  const filePaths = React.useMemo(() => {
    if (filePathsJson) {
      try {
        const parsed = JSON.parse(filePathsJson);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // console.error('Failed to parse filePathsJson:', error);
        return [];
      }
    }
    return filePathsProp || [];
  }, [filePathsJson, filePathsProp]);

  // 调试日志
  // console.log('[TrackMap Debug] Component rendered with:', { trackId, trackType, filePaths });

  // 获取 Vault API
  const { getAPI } = useVaultService();

  // 创建 FootprintsService 实例
  const [footprintsService, setFootprintsService] = useState<IFootprintsService | null>(null);

  useEffect(() => {
    const initService = async () => {
      try {
        const api = await getAPI();
        // 使用 vault API 中的 footprints service
        setFootprintsService(api.services.footprints as unknown as IFootprintsService);
      } catch {
        // console.error('Failed to initialize FootprintsService:', error);
      }
    };
    initService();
  }, [getAPI]);

  const loadTrackData = useCallback(async () => {
    if (!footprintsService) {
      // console.log('FootprintsService not initialized yet');
      return;
    }

    if (!filePaths || filePaths.length === 0) {
      setError('没有提供轨迹文件');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 使用 FootprintsService 加载多个轨迹文件
      const result = await footprintsService.parseMultipleTracks(filePaths);

      // 检查是否有错误
      if (result.metadata.errors.length > 0) {
        // 如果有部分文件加载失败，记录错误但继续处理成功的文件
        result.metadata.errors.forEach((_error) => {
          // console.warn(`Failed to load ${_error.filePath}: ${_error.error}`);
        });
      }

      // 如果没有成功加载任何轨迹
      if (result.tracks.length === 0) {
        throw new Error('未找到可用的轨迹文件');
      }

      setFootprintsData(result);

      // 计算地图边界
      const bounds = footprintsService.calculateTracksBounds(result.tracks);
      // console.log('Calculated bounds:', bounds);

      const leafletBounds = new LatLngBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ]);

      // console.log('Leaflet bounds valid?', leafletBounds.isValid());
      // console.log('Leaflet bounds:', leafletBounds.toBBoxString());

      if (leafletBounds.isValid()) {
        setMapBounds(leafletBounds);
      } else {
        // 设置默认边界
        const defaultBounds = new LatLngBounds([
          [31.0, 120.0], // Southwest
          [32.0, 121.0], // Northeast
        ]);
        setMapBounds(defaultBounds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '轨迹数据加载失败');
      if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_TRACKS) {
        // console.error('Track loading error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [footprintsService, filePaths]);

  useEffect(() => {
    if (footprintsService) {
      loadTrackData();
    }
  }, [trackId, filePaths, footprintsService, loadTrackData]);

  const getMapTitle = (): string => {
    if (!footprintsData || footprintsData.tracks.length === 0) return '轨迹地图';

    if (footprintsData.tracks.length === 1) {
      const track = footprintsData.tracks[0];
      const provider = track.provider ? ` [${track.provider.toUpperCase()}]` : '';
      return `${track.name || '轨迹地图'}${provider}`;
    }

    // 多个轨迹时，显示所有供应商
    const providers = [...new Set(footprintsData.tracks.map((t) => t.provider).filter(Boolean))];
    const providerText =
      providers.length > 0 ? ` [${providers.map((p) => p!.toUpperCase()).join(', ')}]` : '';

    return `${footprintsData.tracks.length} 条轨迹${providerText}`;
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // 添加 ESC 键退出全屏
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey);
      // 阻止页面滚动
      document.body.style.overflow = 'hidden';
    } else {
      // 恢复页面滚动
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // 响应式监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          margin: '1.5rem auto',
          maxWidth: '90%',
        }}
      >
        <div
          style={{
            height: '440px', // 400px + 40px 标题栏
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div>🗺️ 加载轨迹数据中...</div>
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
              {filePaths.length === 1 ? `文件: ${filePaths[0]}` : `${filePaths.length} 个文件`}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          margin: '1.5rem auto',
          maxWidth: '90%',
        }}
      >
        <div
          style={{
            height: '440px', // 400px + 40px 标题栏
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff5f5',
            border: '1px solid #fed7d7',
            borderRadius: '8px',
            color: '#c53030',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div>❌ 轨迹加载失败</div>
            <div style={{ fontSize: '0.8em', marginTop: '0.5rem' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!footprintsData || footprintsData.tracks.length === 0 || !mapBounds) {
    return (
      <div
        style={{
          margin: '1.5rem auto',
          maxWidth: '90%',
        }}
      >
        <div
          style={{
            height: '440px', // 400px + 40px 标题栏
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div>📍 未找到轨迹数据</div>
            <div style={{ fontSize: '0.8em', color: '#666', marginTop: '0.5rem' }}>
              ID: {trackId}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 根据视口宽度决定最大宽度
  const getMaxWidth = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      return '80%'; // 桌面端使用 80%
    }
    return '90%'; // 移动端使用 90%
  };

  return (
    <div
      style={{
        ...(isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: 'white',
              margin: 0,
              maxWidth: '100%',
              width: '100%',
              height: '100vh',
              padding: 0,
            }
          : {
              margin: '1.5rem auto',
              maxWidth: getMaxWidth(), // 不占满整个宽度，留出滚动区域
            }),
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          borderRadius: isFullscreen ? 0 : '8px',
          overflow: 'hidden',
          border: '1px solid #dee2e6',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          height: isFullscreen ? '100%' : 'auto',
          display: isFullscreen ? 'flex' : 'block',
          flexDirection: isFullscreen ? 'column' : undefined,
        }}
      >
        {/* 标题栏 */}
        <div
          style={{
            height: isMobile ? '36px' : '40px',
            backgroundColor: '#f8f9fa',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            alignItems: 'center',
            padding: `0 ${isMobile ? '8px' : '12px'}`,
            fontSize: isMobile ? '13px' : '14px',
            fontWeight: 500,
            color: '#333',
          }}
        >
          <span>{getMapTitle()}</span>
          <span
            style={{
              marginLeft: '8px',
              fontSize: isMobile ? '11px' : '12px',
              color: '#666',
              fontWeight: 'normal',
            }}
          >
            ({footprintsData.tracks.reduce((sum, track) => sum + track.waypoints.length, 0)}{' '}
            个轨迹点)
          </span>
        </div>

        {/* 地图容器 */}
        <div
          style={{
            height: isFullscreen ? `calc(100% - ${isMobile ? '36px' : '40px'})` : '400px',
            position: 'relative',
            flex: isFullscreen ? 1 : undefined,
          }}
        >
          <MapContainer
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            zoomControl={false} // 禁用默认的缩放控件
            bounds={mapBounds}
            boundsOptions={{
              padding: [50, 50],
              maxZoom: 16,
            }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* 全屏切换时重新适应边界 */}
            <RefitBounds bounds={mapBounds} trigger={isFullscreen} />

            {/* 添加自定义控制按钮 */}
            <MapControls bounds={mapBounds} onFullscreen={handleFullscreen} isMobile={isMobile} />

            {footprintsData.tracks.map((track, trackIndex) => (
              <React.Fragment key={track.id}>
                {/* 轨迹线 */}
                {track.waypoints.length > 1 && (
                  <Polyline
                    positions={track.waypoints.map((p) => [p.latitude, p.longitude] as LatLngTuple)}
                    color={track.style.color}
                    weight={track.style.weight}
                    opacity={track.style.opacity}
                  >
                    <Popup>
                      <div>
                        <strong>{track.name || `轨迹 ${trackIndex + 1}`}</strong>
                        <br />
                        点数: {track.waypoints.length}
                        <br />
                        {track.metadata?.totalDistance &&
                          `距离: ${(track.metadata.totalDistance / 1000).toFixed(2)} km`}
                        <br />
                        {track.provider && `提供商: ${track.provider}`}
                      </div>
                    </Popup>
                  </Polyline>
                )}

                {/* 照片标记 */}
                {track.placemarks?.map((placemark, pmIndex) => (
                  <Marker
                    key={`pm-${track.id}-${pmIndex}`}
                    position={[placemark.latitude!, placemark.longitude!]}
                  >
                    <Popup>
                      <div>
                        <strong>{placemark.name || `照片 ${pmIndex + 1}`}</strong>
                        <br />
                        {placemark.thumbnailUrl && (
                          <img
                            src={placemark.thumbnailUrl}
                            alt={placemark.name}
                            style={{ maxWidth: '200px' }}
                          />
                        )}
                        {placemark.description && <p>{placemark.description}</p>}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* 起点和终点标记 */}
                {track.waypoints.length > 0 && (
                  <>
                    <Marker position={[track.waypoints[0].latitude, track.waypoints[0].longitude]}>
                      <Popup>
                        <div>
                          <strong>🚩 起点</strong>
                          <br />
                          {track.name && `轨迹: ${track.name}`}
                        </div>
                      </Popup>
                    </Marker>

                    {track.waypoints.length > 1 && (
                      <Marker
                        position={[
                          track.waypoints[track.waypoints.length - 1].latitude,
                          track.waypoints[track.waypoints.length - 1].longitude,
                        ]}
                      >
                        <Popup>
                          <div>
                            <strong>🏁 终点</strong>
                            <br />
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
      </div>
    </div>
  );
};
