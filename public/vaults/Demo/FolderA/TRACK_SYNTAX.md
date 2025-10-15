# 轨迹地图语法支持

remark-track 插件支持以下所有轨迹相关的 Markdown 语法，全部转换为统一的地图组件。

## 🗺️ 支持的语法类型

### 1. 内联轨迹数据

#### GPX 内联数据(不再支持)

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

#### KML 内联数据(不再支持)

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

### 2. 文件引用（推荐）

#### Obsidian 嵌入语法

![[Attachments/yamap_2025-04-02_08_48.gpx]]
![[Attachments/东西佘山含地铁绿道.kml]]
![[Attachments/红叶尚湖.gpx]]


#### Obsidian 链接语法

[[Attachments/金牛道拦马墙到普安镇.gpx]]
[[Attachments/中西citywalk.kml]]
[[Attachments/金牛道拦马墙到普安镇.kml]]


> **注意**：无论是 `![[]]` 嵌入还是 `[[]]` 链接，remark-track 都会将 `.gpx` 和 `.kml` 文件转换为地图组件

### 3. Leaflet 配置（特殊处理）

Leaflet 代码块支持灵活的 YAML 配置，其中 `gpx` 字段可以是：

#### 单个 GPX 文件

```leaflet
gpx: [[Attachments/yamap_2025-04-02_08_48.gpx]]
zoom: 12
center: [31.4, 120.7]
```

#### GPX 文件列表

```leaflet
gpx:
  - [[Attachments/红叶尚湖.gpx]]
  - [[Attachments/金牛道拦马墙到普安镇.gpx]]
  - [[Attachments/yamap_2025-04-02_08_48.gpx]]
  - [[Attachments/东西佘山含地铁绿道.kml]]
zoom: 10
showAll: true
```

### 4. 足迹聚合地图(不再支持)

```footprints
userInputs:
  - beijing
  - tokyo
  - new_york
attachmentsPath: "@Attachments"
includeTracks: true
```

## 🔄 插件处理流程

### AST 转换过程

```
原始 Markdown
    ↓
trackMapsPlugin (remark)
    ↓
生成统一的 trackMap AST 节点
    ↓
trackMapRenderer (rehype)
    ↓
转换为 React 组件占位符
    ↓
最终 HTML + 组件配置
```

### 数据结构

插件生成的 `TrackData` 结构：

```typescript
interface TrackData {
  id: string;
  type: 'single-track' | 'multi-track' | 'leaflet' | 'footprints';
  format?: 'gpx' | 'kml' | 'leaflet';
  source: 'inline' | 'file' | 'mixed';

  // 单个轨迹
  content?: string;    // 内联数据
  filePath?: string;   // 文件路径

  // Leaflet 多轨迹
  leafletConfig?: LeafletConfig;
  tracks?: SingleTrack[];

  // 足迹聚合
  config?: FootprintsConfig;
}
```

## 🎨 HTML 输出示例

### 单个轨迹
```html
<div class="track-map-container"
     data-track-type="single"
     data-track-format="gpx"
     data-track-id="track-1"
     data-track-file="hokkaido-trip.gpx">
  <div class="track-map-component"
       data-component="TrackMap"
       data-props='{"trackId":"track-1","format":"gpx",...}'>
    📍 Loading map...
  </div>
</div>
```

### Leaflet 多轨迹
```html
<div class="track-map-container"
     data-track-type="leaflet"
     data-track-format="leaflet"
     data-track-id="leaflet-2"
     data-track-count="3">
  <div class="track-map-component"
       data-component="TrackMap"
       data-props='{"trackId":"leaflet-2","type":"multi-track",...}'>
    📍 Loading map...
  </div>
</div>
```

## 🔧 配置选项

```typescript
const trackOptions: TrackMapsPluginOptions = {
  baseUrl: '/vault',           // 文件基础 URL
  currentFilePath: '/trips/'   // 当前文件路径（用于相对路径解析）
};
```

## 🧪 测试用例

### 基础语法测试

# 测试文档

文件嵌入：
![[Attachments/yamap_2025-04-02_08_48.gpx]]

文件链接：
[[Attachments/东西佘山含地铁绿道.kml]]

Leaflet 单文件：

```leaflet
gpx: [[Attachments/红叶尚湖.gpx]]
```

Leaflet 多文件：

```leaflet
gpx:
  - [[Attachments/金牛道拦马墙到普安镇.gpx]]
  - [[Attachments/中西citywalk.kml]]
```

足迹聚合：

```footprints
userInputs: ["tokyo", "osaka"]
```

### 预期输出

插件应该识别并转换：
- ✅ 1 个内联 GPX 轨迹
- ✅ 1 个 GPX 文件嵌入
- ✅ 1 个 KML 文件链接
- ✅ 1 个 Leaflet 单文件配置
- ✅ 1 个 Leaflet 多文件配置（2个轨迹）
- ✅ 1 个足迹聚合配置

总共生成 6 个 `trackMap` AST 节点。

## 🚀 性能优化

### 文件引用处理
- Leaflet 配置中的文件列表会被展开为独立的 `SingleTrack` 对象
- 支持相对路径和绝对路径解析
- 文件加载延迟到 rehype 阶段，避免阻塞 AST 解析

### 错误处理
- YAML 解析失败时优雅降级
- 无效文件引用时保留原始文本
- 支持部分配置缺失的情况

### 扩展性
- 新的轨迹格式可以通过扩展 `format` 类型支持
- 新的配置语法可以通过新的代码块类型添加
- 插件架构支持自定义处理器注入