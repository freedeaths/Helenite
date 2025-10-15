/**
 * Markdown 处理器测试组件
 * 用于在不影响现有应用的情况下测试新的处理器
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  MarkdownProcessor,
  type ProcessedMarkdown,
} from '../../processors/markdown/MarkdownProcessor.js';
import type { IVaultService } from '../../services/interfaces/IVaultService.js';
import { TestTrackMap } from './TestTrackMap.js';
import { TrackMap } from '../TrackMap/TrackMap.js';
import { MermaidDiagram } from '../MermaidDiagram.js';
import { useVaultService } from '../../hooks/useVaultService.js';

interface MarkdownProcessorTestProps {
  vaultService?: IVaultService;
}

const SAMPLE_MARKDOWN = `# 🚀 新版 Markdown 处理器完整测试

## 📊 Mermaid 图表支持

\`\`\`mermaid
graph TD
    A[开始] --> B{是否有轨迹数据?}
    B -->|是| C[解析 GPX/KML]
    B -->|否| D[生成默认地图]
    C --> E[渲染地图]
    D --> E
    E --> F[完成]
\`\`\`

\`\`\`mermaid
sequenceDiagram
    participant User as 用户
    participant Processor as 处理器
    participant Map as 地图组件

    User->>Processor: 输入 Markdown
    Processor->>Processor: 解析语法
    Processor->>Map: 传递轨迹数据
    Map->>User: 显示地图
\`\`\`

## 🔗 Obsidian 内部链接支持

这里有一个内部文件链接：[[Abilities]]

另一个子文件夹链接：[[FolderA/SubFolder/Abilities]]

图片嵌入：![[Attachments/example.jpg]]

## 🏷️ Obsidian 标签和样式

这里有一些标签：#markdown #processor #obsidian #test

==高亮文本== 和 **粗体文本** 以及 *斜体文本*

> [!info] 信息提醒
> 这是一个信息类型的 callout

> [!warning] ⚠️ 警告
> 这是一个警告类型的 callout

## 📈 数学公式支持

行内数学：$E = mc^2$

块级数学：
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## 🗺️ 轨迹地图测试

### 1. 内联 GPX 数据（上海红叶尚湖）
\`\`\`gpx
<?xml version="1.0"?>
<gpx version="1.1" creator="Helenite-Demo">
  <trk><name>红叶尚湖测试轨迹</name>
    <trkseg>
      <trkpt lat="31.3989" lon="120.7453"><ele>10</ele><time>2024-11-01T08:00:00Z</time></trkpt>
      <trkpt lat="31.3995" lon="120.7458"><ele>12</ele><time>2024-11-01T08:05:00Z</time></trkpt>
      <trkpt lat="31.4001" lon="120.7463"><ele>15</ele><time>2024-11-01T08:10:00Z</time></trkpt>
    </trkseg>
  </trk>
</gpx>
\`\`\`

## 2. 内联 KML 数据（苏州路线）
\`\`\`kml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>苏州古城路线</name>
    <Placemark>
      <name>拙政园</name>
      <Point><coordinates>120.6265,31.3232,0</coordinates></Point>
    </Placemark>
    <Placemark>
      <name>留园</name>
      <Point><coordinates>120.6158,31.3156,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>
\`\`\`

## 3. 真实文件引用（Demo Vault）
🚴‍♂️ 金牛道骑行路线：![[Attachments/金牛道拦马墙到普安镇.gpx]]

🍂 红叶尚湖徒步：![[Attachments/红叶尚湖.gpx]]

🌸 上海绿道路线：[[Attachments/东西佘山含地铁绿道.kml]]

🗻 YAMAP 登山路线：[[Attachments/yamap_2025-04-02_08_48.gpx]]

## 4. Leaflet 单文件配置
\`\`\`leaflet
gpx: "[[Attachments/yamap_2025-04-02_08_48.gpx]]"
zoom: 12
center: [31.4, 120.7]
title: "YAMAP 登山路线"
\`\`\`

## 5. Leaflet 多文件组合
\`\`\`leaflet
gpx:
  - "[[Attachments/金牛道拦马墙到普安镇.gpx]]"
  - "[[Attachments/红叶尚湖.gpx]]"
  - "[[Attachments/yamap_2025-04-02_08_48.gpx]]"
zoom: 9
showAll: true
title: "华东地区户外路线合集"
clustering:
  enabled: true
  maxDistance: 20
\`\`\`

## 6. 足迹聚合地图
\`\`\`footprints
userInputs:
  - shanghai
  - suzhou
  - hangzhou
  - nanjing
attachmentsPath: "@Attachments"
includeTracks: true
includePhotos: false
locationType: centerPoint
clustering:
  enabled: true
  maxDistance: 50
  minPoints: 2
\`\`\`

## 7. 混合内容测试
这里有一个简单的轨迹：[[Attachments/东西佘山含地铁绿道.kml]]，还有 **粗体文本** 和 ==高亮内容== 以及 #上海 #徒步 标签。

另一个内联链接测试：![[Attachments/yamap_2025-04-02_08_48.gpx]]

> [!tip] 💡 提示
> 以上所有轨迹文件都来自 Demo Vault 的真实数据，应该能够正常渲染地图。

> [!warning] ⚠️ 注意
> 如果地图没有显示，可能是轨迹文件加载失败或组件渲染问题。
`;

export const MarkdownProcessorTest: React.FC<MarkdownProcessorTestProps> = ({ vaultService }) => {
  const { getAPI } = useVaultService();
  const [markdown, setMarkdown] = useState(SAMPLE_MARKDOWN);
  const [processedResult, setProcessedResult] = useState<ProcessedMarkdown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showRealMaps, setShowRealMaps] = useState(false);

  // 创建真实的文件加载服务
  const createRealVaultService = () => {
    const getRawDocumentContent = async (path: string) => {
      try {
        // console.log('📁 Loading file:', path);
        // 确保路径正确，处理 Attachments/ 前缀
        let normalizedPath = path;
        if (!path.startsWith('/') && !path.startsWith('Attachments/')) {
          normalizedPath = `Attachments/${path}`;
        }

        // 使用新的 VaultAPI 来获取文件内容
        const api = await getAPI();
        const content = await api.getDocumentContent(normalizedPath);
        // console.log('✅ Loaded file:', path, 'Length:', content.length);
        return content;
      } catch (error) {
        // console.warn('❌ Failed to load file:', path, error);
        // 返回示例内容作为降级
        if (path.endsWith('.gpx')) {
          return `<?xml version="1.0"?>
<gpx version="1.1" creator="Helenite-Demo">
  <trk>
    <name>示例轨迹 - ${path}</name>
    <trkseg>
      <trkpt lat="31.40" lon="120.75"><ele>10</ele></trkpt>
      <trkpt lat="31.405" lon="120.755"><ele>12</ele></trkpt>
      <trkpt lat="31.410" lon="120.760"><ele>15</ele></trkpt>
      <trkpt lat="31.415" lon="120.765"><ele>18</ele></trkpt>
      <trkpt lat="31.420" lon="120.770"><ele>20</ele></trkpt>
      <trkpt lat="31.425" lon="120.775"><ele>25</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;
        }
        if (path.endsWith('.kml')) {
          return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>示例路线 - ${path}</name>
    <Placemark>
      <name>示例路径</name>
      <LineString>
        <coordinates>
          120.75,31.40,10
          120.755,31.405,12
          120.760,31.410,15
          120.765,31.415,18
          120.770,31.420,20
          120.775,31.425,25
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
        }
        throw error;
      }
    };

    return {
      getRawDocumentContent,
      getDocumentContent: async (path: string) => {
        return getRawDocumentContent(path);
      },
    };
  };

  const processMarkdown = useCallback(async () => {
    if (!markdown.trim()) return;

    setProcessing(true);
    setError(null);

    try {
      // 使用真实的文件加载服务
      const realVaultService = createRealVaultService();

      const processor = new MarkdownProcessor(vaultService || (realVaultService as IVaultService), {
        enableTracks: true,
        enableObsidianLinks: true,
        enableObsidianTags: true,
        enableHighlights: true,
        enableCallouts: true,
        enableMath: true,
        enableCodeHighlight: true,
        enableMermaid: true,
      });

      const result = await processor.processContent(markdown);
      // console.log('🗺️ Processing result:', result);

      // Debug trackMaps data in detail
      if (result.trackMaps && result.trackMaps.length > 0) {
        result.trackMaps.forEach((_track, _index) => {
          // console.log(`🔍 TrackMap ${index}:`, {
          //   trackId: track.trackId,
          //   trackType: track.trackType,
          //   format: track.format,
          //   source: track.source,
          //   hasTrackData: !!track.trackData,
          //   hasTrackFile: !!track.trackFile,
          //   allProps: Object.keys(track)
          // });
        });
      }
      setProcessedResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
      // console.error('❌ Markdown processing error:', err);
    } finally {
      setProcessing(false);
    }
  }, [vaultService, markdown, getAPI]);

  useEffect(() => {
    processMarkdown();
  }, [processMarkdown]);

  return (
    <div
      className="markdown-processor-test"
      style={{
        display: 'flex',
        height: '100vh',
        gap: '1rem',
        padding: '1rem',
        width: '100%',
        maxWidth: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* 输入区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h3>Markdown 输入</h3>
          <button
            onClick={processMarkdown}
            disabled={processing}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: processing ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: processing ? 'not-allowed' : 'pointer',
            }}
          >
            {processing ? '处理中...' : '重新处理'}
          </button>
        </div>

        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          style={{
            flex: 1,
            fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
            fontSize: '14px',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            resize: 'none',
          }}
        />
      </div>

      {/* 输出区域 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0, // Important for flex children to shrink properly
          overflow: 'hidden',
          height: '100%',
        }}
      >
        <h3 style={{ flexShrink: 0, margin: '0 0 1rem 0' }}>处理结果</h3>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: '#ffebee',
              color: '#c62828',
              borderRadius: '4px',
              marginBottom: '1rem',
            }}
          >
            <strong>错误：</strong> {error}
          </div>
        )}

        {processedResult && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              overflow: 'auto',
              minHeight: 0,
            }}
          >
            {/* React 组件预览 */}
            <div>
              <h4>React 组件输出</h4>
              <div
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  maxHeight: '300px',
                  overflow: 'auto',
                  maxWidth: '100%',
                }}
                className="devtools-html-output"
              >
                {processedResult.content}
              </div>
            </div>

            {/* Mermaid 图表渲染 */}
            {processedResult.mermaidDiagrams && processedResult.mermaidDiagrams.length > 0 && (
              <div>
                <h4>Mermaid 图表渲染 ({processedResult.mermaidDiagrams.length} 个)</h4>
                <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '2rem' }}>
                  {processedResult.mermaidDiagrams.map(
                    (diagram: { code: string }, index: number) => (
                      <div
                        key={`mermaid-${index}`}
                        style={{
                          marginBottom: '1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          padding: '1rem',
                          overflow: 'auto',
                          maxWidth: '100%',
                        }}
                      >
                        <div
                          style={{
                            marginBottom: '0.5rem',
                            fontSize: '0.9rem',
                            color: '#666',
                            fontWeight: 'bold',
                          }}
                        >
                          📊 Mermaid 图表 {index + 1}
                        </div>
                        <div style={{ overflow: 'auto', maxWidth: '100%' }}>
                          <MermaidDiagram code={diagram.code} className="mermaid-diagram" />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* 轨迹地图渲染 */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h4>轨迹地图渲染 ({processedResult.trackMaps?.length || 0} 个)</h4>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={showRealMaps}
                    onChange={(e) => setShowRealMaps(e.target.checked)}
                  />
                  显示真实地图
                </label>
              </div>

              {processedResult.trackMaps && processedResult.trackMaps.length > 0 ? (
                <div style={{ maxHeight: '800px', overflow: 'auto' }}>
                  {processedResult.trackMaps.map((trackData, index: number) =>
                    showRealMaps ? (
                      <div key={`real-track-${index}`} style={{ marginBottom: '2rem' }}>
                        <div
                          style={{
                            marginBottom: '0.5rem',
                            fontSize: '0.9rem',
                            color: '#666',
                            fontWeight: 'bold',
                          }}
                        >
                          🗺️ {trackData.id} ({trackData.fileType || 'unknown'}) -{' '}
                          {trackData.isFile ? 'file' : 'inline'}
                        </div>
                        <TrackMap
                          trackId={trackData.id}
                          trackType={trackData.fileType === 'kml' ? 'single-track' : 'single-track'}
                          config={{}}
                        />
                      </div>
                    ) : (
                      <TestTrackMap
                        key={`test-track-${index}`}
                        trackId={trackData.id}
                        trackType={trackData.fileType === 'kml' ? 'single-track' : 'single-track'}
                        format={trackData.fileType === 'kml' ? 'kml' : 'gpx'}
                        trackData={trackData.code}
                        trackFile={trackData.isFile ? trackData.code : undefined}
                        tracks={[]}
                        config={{}}
                        {...trackData}
                      />
                    )
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#666',
                    border: '2px dashed #ddd',
                    borderRadius: '8px',
                  }}
                >
                  🗺️ 没有检测到轨迹地图语法
                </div>
              )}
            </div>

            {/* 轨迹地图数据（调试用） */}
            <details style={{ marginTop: '1rem' }}>
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '0.5rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                🔍 查看原始轨迹数据 (调试用)
              </summary>
              <pre
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  marginTop: '0.5rem',
                  maxWidth: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(
                  {
                    trackMaps: processedResult.trackMaps || [],
                    mermaidDiagrams: processedResult.mermaidDiagrams || [],
                  },
                  null,
                  2
                )}
              </pre>
            </details>

            {/* 元数据 */}
            <div>
              <h4>文档元数据</h4>
              <pre
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  padding: '1rem',
                  backgroundColor: '#f9f9f9',
                  fontSize: '12px',
                  maxHeight: '150px',
                  overflow: 'auto',
                  maxWidth: '100%',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {JSON.stringify(
                  {
                    headings: processedResult.metadata?.headings || [],
                    links: processedResult.metadata?.links || [],
                    tags: processedResult.metadata?.tags || [],
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
