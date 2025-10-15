# 地图和轨迹系统分析与设计

## 现有 TrackMap 实现分析

### 数据结构

#### TrackData 接口定义
```typescript
interface TrackData {
  id: string;                       // 唯一标识
  name?: string;                    // 轨迹名称
  waypoints: Array<{               // 航点/兴趣点 (主要坐标数据)
    lat: number;
    lon: number;
    name?: string;
    description?: string;
    elevation?: number;             // 海拔信息
    timestamp?: Date;               // 时间戳
  }>;
  placemarks: Array<{              // 照片标记 (替代 photos，与 KML 术语一致)
    lat: number;
    lon: number;
    name?: string;
    photoUrl?: string;
    timestamp?: Date;
  }>;
  provider?: string;               // 数据提供商 (yamap, garmin, 2bulu, foooooot等)
  style: {
    color: string;
    weight: number;
    opacity: number;
  };
}
```

### 数据解析流程

#### GPX 解析结果
- **轨迹点**: `<trk>` → `<trkseg>` → `<trkpt lat="x" lon="y">`
- **航点**: `<wpt lat="x" lon="y">` 
- **时间信息**: `<time>` 标签
- **海拔信息**: `<ele>` 标签
- **输出**: waypoints 数组

#### KML 解析结果  
- **轨迹线**: `<gx:Track>` → `<gx:coord>` 或 `<LineString>` → `<coordinates>`
- **兴趣点**: `<Placemark>` → `<Point>` → `<coordinates>`
- **厂商特定格式**: 支持2bulu、foooooot等特殊格式
- **输出**: 同GPX格式的waypoints数组

## Footprints 数据源分析

### 三个输入源，两种数据类型

**省市数据的两个来源：**

1. **用户输入地点**
   ```typescript
   interface UserInputLocation {
     raw: string;              // 原始输入 "Beijing", "Tokyo", "New York"
     normalized: string;       // 标准化格式 "beijing", "tokyo", "new_york"
     type: 'country' | 'state' | 'city';
     coordinates?: [number, number];  // 地理编码结果
   }
   
   // 输入格式约定:
   // - 使用英文字符 (中国用拼音，日本用罗马字)
   // - 空格替换为下划线: "New York" → "new_york"
   // - 统一小写处理: "Beijing" → "beijing"
   ```

2. **照片 EXIF 地理信息**
   ```typescript
   interface PhotoGeoData {
     filePath: string;       // 照片文件路径
     coordinates: [number, number];
     timestamp?: Date;       // 拍摄时间
     reverseGeocode?: {      // 反地理编码结果
       city?: string;
       state?: string;
       country?: string;
     };
   }
   ```

3. **GPX/KML 轨迹文件** (独立数据源)
   ```typescript
   interface TrackFile {
     filePath: string;       // 轨迹文件路径
     trackData: TrackData;   // 解析后的轨迹数据
     bounds: GeoBounds;      // 轨迹边界范围
   }
   ```

### 两种输出数据类型

1. **省市区域数据 (LocationData[])**
   ```typescript
   interface LocationData {
     id: string;
     type: 'country' | 'state' | 'city';
     name: string;             // 标准化名称
     displayName: string;      // 显示名称 (支持多语言)
     
     // 访问状态 (足迹地图区分渲染)
     visitStatus: 'visited' | 'wantToVisit';  // 去过 | 想去
     
     // 可视化选项 (两种渲染方式)
     visualization: {
       centerPoint: [number, number];    // 中心点坐标（点标记方式）
       bounds?: GeoBounds;               // 区域边界（区域多边形方式）
     };
     
     // 聚合统计
     aggregation: {
       photoCount: number;     // 来自照片的数量
       userInputCount: number; // 来自用户输入的数量
       totalVisits: number;    // 总访问次数
     };
     
     // 数据来源详情
     sources: {
       photos: PhotoGeoData[];
       userInputs: UserInputLocation[];
     };
   }
   ```

2. **轨迹数据 (TrackData[])**
   ```typescript
   // 使用上面定义的 TrackData 接口
   // 每个轨迹文件解析为一个 TrackData 对象
   ```

## 统一地图组件设计

### 核心设计理念

**单个组件，双输入模式**：
- 单个轨迹：`tracks.length = 1, locations.length = 0`
- 足迹地图：`tracks.length >= 0, locations.length >= 0`

### 统一地图组件

```typescript
interface MapComponentProps {
  tracks: TrackData[];        // 轨迹数据数组
  locations: LocationData[];  // 省市位置数据数组
  title?: string;            // 地图标题
  interactions?: {           // 交互配置
    clickable?: boolean;
    zoomable?: boolean;
    clustering?: boolean;
  };
  style?: {
    height?: string;
    aspectRatio?: string;
  };
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  tracks, 
  locations, 
  title,
  interactions,
  style 
}) => {
  // 自动计算地图边界
  const bounds = useMemo(() => 
    calculateBounds([...tracks, ...locations]), 
    [tracks, locations]
  );
  
  // 智能UI控制逻辑
  const isSingleTrack = tracks.length === 1 && locations.length === 0;
  const hasMultipleData = tracks.length > 1 || locations.length > 0;
  
  return (
    <MapContainer bounds={bounds} style={style}>
      <TileLayer />
      
      {/* 轨迹渲染层 */}
      {tracks.map(track => (
        <TrackLayer key={track.id} track={track} />
      ))}
      
      {/* 位置渲染层 - 支持访问状态区分渲染 */}
      {locations.map(location => (
        <LocationLayer 
          key={location.id} 
          location={location} 
          visitStatus={location.visitStatus}
        />
      ))}
      
      {/* 条件渲染：单轨迹动画控制 */}
      {isSingleTrack && (
        <AnimationControl 
          track={tracks[0]} 
          onPlay={(progress) => highlightTrackProgress(progress)}
        />
      )}
      
      {/* 条件渲染：多数据聚类控制 */}
      {hasMultipleData && interactions?.clustering && (
        <ClusteringControl 
          maxDistance={50} 
          minPoints={3}
        />
      )}
      
      {/* 图例和统计 */}
      <MapLegend tracks={tracks} locations={locations} />
      
      {/* 交互控制器 */}
      <MapControls interactions={interactions} />
    </MapContainer>
  );
};
```

### 访问状态区分渲染

足迹地图支持根据访问状态区分渲染样式，提供更丰富的视觉体验：

```typescript
// LocationLayer 组件支持访问状态样式
const LocationLayer: React.FC<{
  location: LocationData;
  visitStatus: 'visited' | 'wantToVisit';
}> = ({ location, visitStatus }) => {
  const style = useMemo(() => {
    switch (visitStatus) {
      case 'visited':
        return {
          color: '#4CAF50',        // 绿色 - 已去过
          fillColor: '#4CAF50',
          fillOpacity: 0.3,
          weight: 2,
          icon: '📍',             // 实心标记
          className: 'visited-location'
        };
      case 'wantToVisit':
        return {
          color: '#FF9800',        // 橙色 - 想去
          fillColor: '#FF9800', 
          fillOpacity: 0.2,
          weight: 1,
          strokeDasharray: '5,5', // 虚线边框
          icon: '📌',             // 虚线标记
          className: 'want-to-visit-location'
        };
    }
  }, [visitStatus]);

  return (
    <Marker 
      position={location.visualization.centerPoint}
      icon={createCustomIcon(style)}
    >
      <Popup>
        <div className={style.className}>
          <h4>{location.displayName}</h4>
          <p>状态: {visitStatus === 'visited' ? '已去过' : '想去'}</p>
          <p>照片: {location.aggregation.photoCount} 张</p>
          <p>访问: {location.aggregation.totalVisits} 次</p>
        </div>
      </Popup>
    </Marker>
  );
};
```

#### 样式设计约定

| 访问状态               | 颜色           | 透明度 | 边框  | 图标  | 含义             |
| ------------------ | ------------ | --- | --- | --- | -------------- |
| `visited` (去过)     | 绿色 `#4CAF50` | 30% | 实线  | 📍  | 有实际访问记录(照片/轨迹) |
| `wantToVisit` (想去) | 橙色 `#FF9800` | 20% | 虚线  | 📌  | 计划访问或心愿清单      |

#### 自动状态检测策略

```typescript
// GeoDataService 中的智能状态判断
const determineVisitStatus = (location: string, sources: LocationSources): 'visited' | 'wantToVisit' => {
  // 优先级1: 用户显式配置
  if (config.visitedLocations?.includes(location)) return 'visited';
  if (config.wantToVisitLocations?.includes(location)) return 'wantToVisit';
  
  // 优先级2: 数据源自动判断
  const hasPhotoEvidence = sources.photos.length > 0;
  const hasTrackEvidence = sources.tracks?.length > 0;
  
  // 有照片或轨迹数据 = 去过
  if (hasPhotoEvidence || hasTrackEvidence) return 'visited';
  
  // 仅用户输入，无实际数据 = 想去
  return 'wantToVisit';
};
```

### 智能化UI逻辑

```typescript
// UI控制策略
const getUIControls = (tracks: TrackData[], locations: LocationData[]) => {
  const trackCount = tracks.length;
  const locationCount = locations.length;
  
  return {
    // 动画播放：仅单个轨迹时显示
    showAnimation: trackCount === 1 && locationCount === 0,
    
    // 聚类控制：多数据时显示
    showClustering: trackCount > 1 || locationCount > 0,
    
    // 时间轴：有时间数据的轨迹时显示
    showTimeline: tracks.some(t => t.waypoints.some(w => w.timestamp)),
    
    // 海拔图：有海拔数据的单轨迹时显示
    showElevation: trackCount === 1 && 
                   tracks[0].waypoints.some(w => w.elevation),
    
    // 统计面板：多数据时显示
    showStatistics: trackCount + locationCount > 1,
    
    // 图例：总是显示（如果有数据）
    showLegend: trackCount > 0 || locationCount > 0
  };
};
```

### 数据处理流程

```typescript
// GeoDataService 统一数据聚合
class GeoDataService {
  // 聚合足迹数据的统一接口
  async aggregateMapData(config: FootprintsConfig): Promise<{
    tracks: TrackData[];
    locations: LocationData[];
  }> {
    const results = await Promise.all([
      this.processTrackFiles(config.attachmentsPath),
      this.processLocationData(config.locationConfig)
    ]);
    
    return {
      tracks: results[0],      // 从GPX/KML文件解析
      locations: results[1]    // 从用户输入+照片EXIF聚合
    };
  }
  
  // 处理轨迹文件
  private async processTrackFiles(attachmentsPath: string): Promise<TrackData[]> {
    const trackFiles = await this.scanTrackFiles(attachmentsPath);
    return Promise.all(trackFiles.map(file => this.parseTrackFile(file)));
  }
  
  // 处理位置数据
  private async processLocationData(config: LocationConfig): Promise<LocationData[]> {
    // 聚合用户输入和照片EXIF数据
    const [userLocations, photoLocations] = await Promise.all([
      this.processUserInputs(config.userInputs),
      this.processPhotoExif(config.photosPath)
    ]);
    
    // 按城市聚合数据
    return this.aggregateByLocation([...userLocations, ...photoLocations]);
  }
}
```

## 使用示例

### 单个轨迹地图
```typescript
// remark插件处理：![[track.gpx]]
const SingleTrackExample = () => {
  const tracks = [singleTrackData];  // 长度为1
  const locations = [];              // 长度为0
  
  return (
    <MapComponent 
      tracks={tracks} 
      locations={locations}
      title="我的徒步路线"
      interactions={{ clickable: true, zoomable: true }}
    />
  );
};
// 自动显示：动画控制、海拔图、轨迹统计
```

### 足迹地图
```typescript
// remark插件处理：```footprints ... ```
const FootprintsExample = () => {
  const tracks = [track1, track2, track3];     // 多个轨迹
  const locations = [beijing, tokyo, newYork]; // 多个城市
  
  return (
    <MapComponent 
      tracks={tracks} 
      locations={locations}
      title="我的足迹地图"
      interactions={{ 
        clickable: true, 
        zoomable: true, 
        clustering: true 
      }}
    />
  );
};
// 自动显示：聚类控制、统计面板、图例
```

## 配置接口

### FootprintsConfig (Markdown语法配置)
```typescript
interface FootprintsConfig {
  // 用户输入的城市列表
  userInputs: string[];          // ["beijing", "tokyo", "new_york"]
  
  // 访问状态配置 (去过/想去)
  visitedLocations?: string[];   // ["beijing", "shanghai"] - 已去过的地点
  wantToVisitLocations?: string[]; // ["tokyo", "paris"] - 想去的地点
  
  // 附件路径（扫描照片和轨迹文件）
  attachmentsPath: string;       // "@Attachments"
  
  // 包含轨迹文件
  includeTracks: boolean;        // true
  
  // 可视化配置
  visualization: {
    locationType: 'centerPoint' | 'bounds';  // 省市渲染方式
    clustering?: {
      enabled: boolean;
      maxDistance: number;       // km
      minPoints: number;
    };
  };
  
  // 时间过滤（可选）
  timeFilter?: {
    start: Date;
    end: Date;
  };
}
```

### Markdown语法示例

```markdown
# 单个轨迹（自动使用轨迹模式）
![[track.gpx]]

# 足迹地图（自动使用足迹模式）
```footprints
# 所有城市列表
userInputs:
  - beijing
  - shanghai
  - tokyo  
  - paris
  - new_york

# 访问状态分类
visitedLocations:     # 去过的地点 (绿色实线标记)
  - beijing
  - shanghai

wantToVisitLocations: # 想去的地点 (橙色虚线标记)
  - tokyo
  - paris
  - new_york

attachmentsPath: "@Attachments"
includeTracks: true

visualization:
  locationType: centerPoint
  clustering:
    enabled: true
    maxDistance: 50
    minPoints: 3

timeFilter:
  start: "2024-01-01"
  end: "2024-12-31"
```
```

## 实施优势

### 1. 架构统一性
- 单个组件处理所有地图场景
- 减少代码重复和维护成本
- 统一的数据流和渲染逻辑

### 2. 智能化体验
- 根据数据自动调整UI控件
- 用户无需手动选择模式
- 功能按需显示，界面简洁

### 3. 扩展性强
- 新增数据类型只需扩展输入数组
- 组件内部逻辑自适应
- 插件化的控件系统

### 4. 性能优化
- 统一的边界计算和优化
- 智能聚类和LOD策略
- 按需加载和渲染

---

**设计原则总结**:

1. **数据驱动**: 组件行为完全由输入数据决定
2. **自适应UI**: 根据数据类型和数量智能显示控件
3. **统一接口**: 两个输入数组 + 一个组件 = 所有地图场景
4. **向后兼容**: 单个轨迹是足迹的特例，无破坏性变更