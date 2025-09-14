# Markdown Processors 架构

基于 unified 生态系统的 Markdown 处理器，专门为 Helenite 设计，支持完整的 Obsidian 语法和轨迹地图功能。

## 🏗️ 架构设计

```
src/processors/markdown/
├── MarkdownProcessor.ts       # 主处理器类
├── plugins/                   # unified 插件集合
│   ├── remark/               # remark 插件（MDAST 处理）
│   │   ├── trackMapsPlugin.ts        # 轨迹地图处理 🗺️
│   │   ├── footprintsPlugin.ts       # 足迹聚合地图 🌍
│   │   ├── obsidianTagsPlugin.ts     # #标签 处理
│   │   ├── obsidianHighlightsPlugin.ts   # ==高亮== 处理
│   │   └── obsidianCalloutsPlugin.ts     # > [!note] 处理
│   ├── rehype/               # rehype 插件（HAST 处理）
│   │   ├── trackMapRenderer.ts       # 地图组件渲染 🎨
│   │   └── tableWrapperPlugin.ts     # 表格响应式包装
│   └── index.ts              # 插件统一入口
└── README.md                 # 本文档
```

## 🗺️ 轨迹地图功能（核心特性）

### 1. 单个轨迹地图

支持内联 GPX/KML 数据和文件引用两种方式：

#### 内联轨迹数据
```markdown
# 内联 GPX 轨迹
```gpx
<?xml version="1.0"?>
<gpx version="1.1" creator="Helenite">
  <trk><name>我的轨迹</name>
    <trkseg>
      <trkpt lat="39.906" lon="116.397"><ele>50</ele></trkpt>
      <trkpt lat="39.907" lon="116.398"><ele>52</ele></trkpt>
    </trkseg>
  </trk>
</gpx>
```

# 内联 KML 轨迹
```kml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>我的位置</name>
      <Point><coordinates>116.397,39.906,0</coordinates></Point>
    </Placemark>
  </Document>
</kml>
```
```

#### 文件引用（推荐）
```markdown
# Obsidian 风格的文件嵌入
![[track.gpx]]
![[route.kml]]
![[Attachments/hiking-route.gpx]]
```

### 2. 足迹聚合地图（高级功能）

聚合多种数据源生成综合地图：

```markdown
```footprints
# 用户输入的城市列表
userInputs:
  - beijing
  - tokyo  
  - new_york
  - paris

# 附件路径扫描
attachmentsPath: "@Attachments"
includeTracks: true
includePhotos: true

# 可视化配置
locationType: centerPoint  # centerPoint | bounds
clustering:
  enabled: true
  maxDistance: 50  # km
  minPoints: 3

# 时间过滤（可选）
timeFilter:
  start: "2024-01-01"
  end: "2024-12-31"

# 地图样式
style:
  showTracks: true
  showPhotos: true
  trackColor: "#3b82f6"
  visitedColor: "#10b981"
  plannedColor: "#f59e0b"
```
```

## 🔌 插件详解

### remark 插件（MDAST 处理阶段）

#### trackMapsPlugin
- **功能**：解析轨迹相关语法，转换为自定义 AST 节点
- **处理**：
  - `\`\`\`gpx` 和 `\`\`\`kml` 代码块
  - `![[track.gpx]]` 文件嵌入语法
  - 生成 `trackMap` 类型的 AST 节点

#### footprintsPlugin  
- **功能**：处理足迹聚合配置
- **处理**：
  - `\`\`\`footprints` 配置块
  - YAML 配置解析
  - 数据量预估（用于性能优化）
  - 生成 `footprintsMap` 类型的 AST 节点

### rehype 插件（HAST 处理阶段）

#### trackMapRenderer
- **功能**：将自定义 AST 节点转换为 React 组件占位符
- **处理**：
  - 轨迹数据预处理
  - 组件属性生成
  - 与 VaultService 集成获取文件内容

## 🔄 数据流架构

```
Raw Markdown
    ↓
remarkParse (Markdown → MDAST)
    ↓
trackMapsPlugin (处理轨迹语法)
footprintsPlugin (处理足迹配置) 
    ↓
Enhanced MDAST (包含 trackMap/footprintsMap 节点)
    ↓
remarkRehype (MDAST → HAST)
    ↓
trackMapRenderer (转换为组件占位符)
    ↓
Enhanced HAST (包含地图组件配置)
    ↓
rehypeStringify (HAST → HTML)
    ↓
HTML with Map Components
```

## 💻 使用示例

### 基础使用

```typescript
import { MarkdownProcessor } from './processors/markdown/MarkdownProcessor.js';
import { VaultService } from '../services/VaultService.js';

// 创建处理器实例
const vaultService = new VaultService(/* 依赖注入 */);
const processor = new MarkdownProcessor(vaultService, {
  enableTracks: true,        // 启用轨迹功能
  enableMath: true,
  enableCodeHighlight: true
});

// 处理单个文件
const result = await processor.processFile('/Trips/北海道之旅.md');
console.log(result.html);           // 渲染后的 HTML
console.log(result.trackMaps);      // 提取的轨迹地图数据
console.log(result.metadata);      // 文档元数据

// 处理原始内容
const content = `
# 我的旅行

![[hokkaido-trip.gpx]]

这是一次难忘的北海道之旅。

\`\`\`footprints
userInputs:
  - sapporo
  - hakodate
attachmentsPath: "@Attachments"
includeTracks: true
\`\`\`
`;

const processed = await processor.processContent(content);
```

### 与 React 组件集成

```typescript
// 在 MarkdownViewer 组件中
import { MarkdownProcessor } from '../processors/markdown/MarkdownProcessor.js';

const MarkdownViewer = ({ filePath, vaultService }) => {
  const [processedContent, setProcessedContent] = useState(null);
  
  useEffect(() => {
    const processor = new MarkdownProcessor(vaultService);
    
    processor.processFile(filePath).then(result => {
      setProcessedContent(result);
    });
  }, [filePath]);

  return (
    <div className="markdown-content">
      {/* 渲染 HTML */}
      <div dangerouslySetInnerHTML={{ __html: processedContent?.html }} />
      
      {/* 处理地图组件占位符 */}
      {processedContent?.trackMaps?.map(track => (
        <TrackMapComponent 
          key={track.id} 
          {...track} 
          vaultService={vaultService}
        />
      ))}
    </div>
  );
};
```

## 🚀 性能优化

### 1. 数据量预估
足迹插件会预估数据量，用于：
- 选择合适的渲染策略
- 启用/禁用聚类功能
- 优化初始加载性能

### 2. 懒加载机制
- 轨迹文件按需加载
- 大型足迹地图延迟渲染
- 组件级别的 Suspense 支持

### 3. 缓存策略
- 通过 VaultService 享受统一缓存
- AST 级别缓存（避免重复解析）
- 处理结果缓存

## 🔧 配置选项

```typescript
interface MarkdownProcessingOptions {
  enableObsidianLinks?: boolean;   // Obsidian 链接
  enableObsidianTags?: boolean;    // #标签
  enableHighlights?: boolean;      // ==高亮==
  enableCallouts?: boolean;        // > [!note]
  enableMath?: boolean;            // KaTeX 数学公式
  enableCodeHighlight?: boolean;   // 代码高亮
  enableMermaid?: boolean;         // Mermaid 图表
  enableTracks?: boolean;          // 🗺️ 轨迹地图功能
}
```

## 🧪 测试策略

### 单元测试
```bash
# 测试插件功能
npm test src/processors/markdown/plugins/

# 测试处理器集成
npm test src/processors/markdown/MarkdownProcessor.test.ts
```

### 集成测试
使用真实的 GPX/KML 文件测试完整处理流程。

## 🔮 扩展方向

1. **更多轨迹格式**：支持 TCX、FIT 等格式
2. **实时轨迹**：支持 GPS 实时数据
3. **轨迹分析**：海拔、速度、距离统计
4. **地图样式**：多种地图底图切换
5. **离线支持**：本地地图瓦片缓存