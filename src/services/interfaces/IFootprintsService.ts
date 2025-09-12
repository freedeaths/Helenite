/**
 * FootprintsService 接口定义
 * 
 * 统一的足迹数据管理服务，支持：
 * - GPX/KML 轨迹文件解析（多厂商支持）
 * - 地理位置数据聚合（用户输入 + 照片 EXIF）
 * - 统一的地图数据输出接口
 */

// ===============================
// 核心数据结构（基于新设计）
// ===============================

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

export interface TrackData {
  id: string;                       // 唯一标识
  name?: string;                    // 轨迹名称
  waypoints: TrackPoint[];          // 航点/兴趣点（主要坐标数据）
  placemarks: TrackPhoto[];         // 照片标记（替代 photos，与 KML 术语一致）
  provider?: 'yamap' | 'garmin' | '2bulu' | 'foooooot' | 'google' | 'unknown'; // 数据提供商
  style: {
    color: string;
    weight: number;
    opacity: number;
  };
  metadata?: {
    source: 'gpx' | 'kml';
    totalDistance?: number;      // 米
    totalTime?: number;          // 分钟
    maxElevation?: number;
    minElevation?: number;
    bounds?: GeoBounds;
  };
}

export interface LocationData {
  id: string;
  type: 'country' | 'state' | 'city';
  name: string;                     // 标准化名称
  displayName: string;              // 显示名称（支持多语言）
  
  // 访问状态（足迹地图区分渲染）
  visitStatus: 'visited' | 'wantToVisit';  // 去过 | 想去
  
  // 可视化选项（两种渲染方式）
  visualization: {
    centerPoint: [number, number];    // 中心点坐标（点标记方式）
    bounds?: GeoBounds;               // 区域边界（区域多边形方式）
  };
  
  // 聚合统计
  aggregation: {
    photoCount: number;               // 来自照片的数量
    userInputCount: number;           // 来自用户输入的数量
    totalVisits: number;              // 总访问次数
  };
  
  // 数据来源详情
  sources: {
    photos: Array<{
      filePath: string;
      coordinates: [number, number];
      timestamp?: Date;
    }>;
    userInputs: Array<{
      raw: string;                    // 原始输入
      normalized: string;             // 标准化格式
      coordinates?: [number, number]; // 地理编码结果
    }>;
  };
}

export interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// ===============================
// 配置接口
// ===============================

export interface FootprintsConfig {
  // 用户输入的城市列表
  userInputs?: string[];              // ["beijing", "tokyo", "new_york"]
  
  // 访问状态配置（去过/想去）
  visitedLocations?: string[];        // ["beijing", "shanghai"] - 已去过的地点
  wantToVisitLocations?: string[];    // ["tokyo", "paris"] - 想去的地点
  
  // 附件路径（扫描照片和轨迹文件）
  attachmentsPath?: string;           // "@Attachments"
  
  // 包含轨迹文件
  includeTracks?: boolean;            // true
  
  // 可视化配置
  visualization?: {
    locationType?: 'centerPoint' | 'bounds';  // 省市渲染方式
    clustering?: {
      enabled: boolean;
      maxDistance: number;            // km
      minPoints: number;
    };
  };
  
  // 时间过滤（可选）
  timeFilter?: {
    start: Date;
    end: Date;
  };
}

export interface FootprintsData {
  tracks: TrackData[];
  locations: LocationData[];
  metadata: {
    totalTracks: number;
    totalLocations: number;
    processingTime: number;         // ms
    errors: Array<{
      filePath: string;
      error: string;
    }>;
  };
}

// ===============================
// IFootprintsService 接口
// ===============================

export interface IFootprintsService {
  // ===============================
  // 核心解析功能
  // ===============================

  /**
   * 解析单个轨迹文件
   * @param filePath 轨迹文件路径（GPX/KML）
   * @returns 包含单个轨迹的结果，locations 为空数组
   */
  parseSingleTrack(filePath: string): Promise<FootprintsData>;

  /**
   * 解析多个轨迹文件
   * @param filePaths 轨迹文件路径数组
   * @returns 包含多个轨迹的结果，locations 为空数组
   */
  parseMultipleTracks(filePaths: string[]): Promise<FootprintsData>;

  /**
   * 根据配置聚合足迹数据
   * @param config 足迹配置
   * @returns 完整的足迹数据（轨迹 + 位置）
   */
  aggregateFootprints(config: FootprintsConfig): Promise<FootprintsData>;

  // ===============================
  // 轨迹文件操作
  // ===============================

  /**
   * 扫描目录中的轨迹文件
   * @param dirPath 目录路径
   * @returns 轨迹文件路径数组
   */
  scanTrackFiles(dirPath: string): Promise<string[]>;

  /**
   * 检测文件的厂商信息
   * @param filePath 文件路径
   * @returns 厂商信息和置信度
   */
  detectProvider(filePath: string): Promise<{
    provider: string;
    confidence: number;
  }>;

  /**
   * 验证轨迹文件格式
   * @param filePath 文件路径
   * @returns 是否为有效的轨迹文件
   */
  validateTrackFile(filePath: string): Promise<boolean>;

  // ===============================
  // 地理位置数据处理
  // ===============================

  /**
   * 处理用户输入的位置数据
   * @param userInputs 用户输入的地名数组
   * @returns 位置数据数组
   */
  processUserInputs(userInputs: string[]): Promise<LocationData[]>;

  /**
   * 扫描照片 EXIF 地理信息
   * @param photosPath 照片目录路径
   * @returns 位置数据数组
   */
  processPhotoExif(photosPath: string): Promise<LocationData[]>;

  /**
   * 地理编码（地名 → 坐标）
   * @param locationName 地名
   * @returns 坐标信息
   */
  geocodeLocation(locationName: string): Promise<{
    coordinates: [number, number];
    type: 'country' | 'state' | 'city';
    displayName: string;
  } | null>;

  // ===============================
  // 数据处理和分析
  // ===============================

  /**
   * 计算轨迹边界
   * @param tracks 轨迹数据数组
   * @returns 地理边界
   */
  calculateTracksBounds(tracks: TrackData[]): GeoBounds;

  /**
   * 计算位置边界
   * @param locations 位置数据数组
   * @returns 地理边界
   */
  calculateLocationsBounds(locations: LocationData[]): GeoBounds;

  /**
   * 合并边界
   * @param bounds1 边界1
   * @param bounds2 边界2
   * @returns 合并后的边界
   */
  mergeBounds(bounds1: GeoBounds, bounds2: GeoBounds): GeoBounds;

  /**
   * 获取轨迹统计信息
   * @param track 轨迹数据
   * @returns 统计信息
   */
  getTrackStatistics(track: TrackData): {
    totalDistance: number;        // 米
    totalTime: number;            // 分钟
    averageSpeed: number;         // km/h
    elevationGain: number;        // 米
    elevationLoss: number;        // 米
    maxElevation: number;
    minElevation: number;
  };

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<Record<string, unknown>>;

  // ===============================
  // Vault 管理
  // ===============================

  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void;

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string };
}