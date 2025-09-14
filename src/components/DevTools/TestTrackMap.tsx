/**
 * 测试用轨迹地图组件
 * 用于在测试页面显示轨迹数据处理结果
 */

import React, { useEffect, useState } from 'react';
import { fetchVault } from '../../utils/fetchWithAuth.js';

interface TestTrackMapProps {
  trackId: string;
  trackType: 'single-track' | 'multi-track' | 'leaflet' | 'footprints';
  format?: 'gpx' | 'kml' | 'leaflet';
  source?: 'inline' | 'file' | 'mixed';
  trackData?: string;
  trackFile?: string;
  tracks?: Array<{
    id: string;
    format: string;
    filePath: string;
  }>;
  config?: any;
  [key: string]: any;
}

export const TestTrackMap: React.FC<TestTrackMapProps> = ({
  trackId,
  trackType,
  format,
  source,
  trackData,
  trackFile,
  tracks,
  config,
  ...otherProps
}) => {
  const [expanded, setExpanded] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 尝试加载文件内容用于预览
  const loadFileContent = async (filePath: string) => {
    if (!filePath || loading) return;

    setLoading(true);
    try {
      // 确保路径正确，filePath 可能已经包含 Attachments/ 前缀
      const normalizedPath = filePath.startsWith('Attachments/') ? filePath : `Attachments/${filePath}`;
      const fullPath = `/vaults/Demo/${normalizedPath}`;
      console.log('🔍 TestTrackMap: Loading file from:', fullPath);
      const response = await fetchVault(fullPath);
      
      if (response.ok) {
        const content = await response.text();
        setFileContent(content.slice(0, 500) + (content.length > 500 ? '...' : ''));
      } else {
        setFileContent('文件加载失败');
      }
    } catch (error) {
      setFileContent(`加载错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = () => {
    switch (trackType) {
      case 'single-track': return '🚶‍♂️';
      case 'multi-track': return '🚴‍♂️';
      case 'leaflet': return '🗺️';
      case 'footprints': return '🌍';
      default: return '📍';
    }
  };

  const getFormatBadge = () => {
    if (!format) return null;
    const colors = {
      gpx: 'bg-green-100 text-green-700',
      kml: 'bg-blue-100 text-blue-700',
      leaflet: 'bg-purple-100 text-purple-700'
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[format as keyof typeof colors]}`}>
        {format.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 my-4 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon()}</span>
          <div>
            <h4 className="font-medium text-gray-800">
              轨迹地图组件 #{trackId}
            </h4>
            <p className="text-sm text-gray-600">
              类型: {trackType} | 来源: {source}
            </p>
          </div>
          {getFormatBadge()}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {expanded ? '收起' : '展开'}
        </button>
      </div>

      {/* 基础信息 */}
      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
        {trackFile && (
          <div>
            <strong>文件路径:</strong> 
            <code className="ml-1 px-1 py-0.5 bg-gray-200 rounded text-xs">
              {trackFile}
            </code>
            <button
              onClick={() => loadFileContent(trackFile)}
              className="ml-2 text-blue-500 hover:text-blue-700 text-xs"
              disabled={loading}
            >
              {loading ? '加载中...' : '预览'}
            </button>
          </div>
        )}
        
        {tracks && tracks.length > 0 && (
          <div>
            <strong>包含轨迹:</strong> {tracks.length} 个
            <ul className="mt-1 text-xs">
              {tracks.slice(0, 3).map((track, idx) => (
                <li key={idx} className="text-gray-600">
                  • {track.filePath} ({track.format})
                </li>
              ))}
              {tracks.length > 3 && (
                <li className="text-gray-400">... 还有 {tracks.length - 3} 个</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* 详细信息 */}
      {expanded && (
        <div className="border-t pt-3 mt-3">
          {/* 内联数据预览 */}
          {trackData && (
            <div className="mb-3">
              <h5 className="font-medium text-gray-700 mb-1">内联轨迹数据:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                {trackData.slice(0, 300)}
                {trackData.length > 300 && '\n...'}
              </pre>
            </div>
          )}

          {/* 文件内容预览 */}
          {fileContent && (
            <div className="mb-3">
              <h5 className="font-medium text-gray-700 mb-1">文件内容预览:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                {fileContent}
              </pre>
            </div>
          )}

          {/* 配置信息 */}
          {config && (
            <div className="mb-3">
              <h5 className="font-medium text-gray-700 mb-1">配置信息:</h5>
              <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
                {JSON.stringify(config, null, 2)}
              </pre>
            </div>
          )}

          {/* 原始 props */}
          <div>
            <h5 className="font-medium text-gray-700 mb-1">所有属性:</h5>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-h-32">
              {JSON.stringify({
                trackId,
                trackType,
                format,
                source,
                trackFile,
                tracks: tracks?.length,
                ...otherProps
              }, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* 模拟地图区域 */}
      <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-4 text-center">
        <div className="text-blue-600 mb-2">📍 这里将显示真实地图</div>
        <div className="text-sm text-blue-500">
          {trackType === 'footprints' && '足迹聚合地图'}
          {trackType === 'leaflet' && 'Leaflet 配置地图'}
          {trackType === 'multi-track' && '多轨迹叠加地图'}
          {trackType === 'single-track' && '单轨迹地图'}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          组件 ID: {trackId}
        </div>
      </div>
    </div>
  );
};