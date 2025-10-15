/**
 * ExifService 接口定义
 *
 * 用于解析图片文件的 EXIF 元数据，包括：
 * - 地理位置信息（GPS）
 * - 拍摄设备信息
 * - 拍摄参数
 * - 时间信息
 */

// ===============================
// EXIF 数据结构
// ===============================

/**
 * GPS 坐标信息
 */
export interface GpsCoordinates {
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 海拔高度（米） */
  altitude?: number;
  /** GPS 精度（米） */
  accuracy?: number;
}

/**
 * 拍摄设备信息
 */
export interface CameraInfo {
  /** 相机制造商 */
  make?: string;
  /** 相机型号 */
  model?: string;
  /** 镜头型号 */
  lensModel?: string;
  /** 软件版本 */
  software?: string;
}

/**
 * 拍摄参数
 */
export interface ShootingParams {
  /** ISO 感光度 */
  iso?: number;
  /** 光圈值 */
  aperture?: number;
  /** 快门速度（秒） */
  shutterSpeed?: number;
  /** 焦距（毫米） */
  focalLength?: number;
  /** 闪光灯模式 */
  flash?: string;
  /** 白平衡 */
  whiteBalance?: string;
  /** 测光模式 */
  meteringMode?: string;
  /** 曝光模式 */
  exposureMode?: string;
}

/**
 * 时间信息
 */
export interface DateTimeInfo {
  /** 拍摄时间 */
  dateTime?: Date;
  /** 原始拍摄时间 */
  dateTimeOriginal?: Date;
  /** 数字化时间 */
  dateTimeDigitized?: Date;
  /** 时区偏移 */
  timeZoneOffset?: string;
}

/**
 * 图片基本信息
 */
export interface ImageInfo {
  /** 图片宽度 */
  width?: number;
  /** 图片高度 */
  height?: number;
  /** 色彩空间 */
  colorSpace?: string;
  /** 方向 */
  orientation?: number;
  /** DPI 水平分辨率 */
  xResolution?: number;
  /** DPI 垂直分辨率 */
  yResolution?: number;
  /** 分辨率单位 */
  resolutionUnit?: string;
}

/**
 * 完整的 EXIF 数据
 */
export interface ExifData {
  /** 文件路径 */
  filePath: string;
  /** 是否包含 EXIF 数据 */
  hasExif: boolean;
  /** GPS 坐标信息 */
  gps?: GpsCoordinates;
  /** 拍摄设备信息 */
  camera?: CameraInfo;
  /** 拍摄参数 */
  shooting?: ShootingParams;
  /** 时间信息 */
  dateTime?: DateTimeInfo;
  /** 图片基本信息 */
  image?: ImageInfo;
  /** 原始 EXIF 数据（JSON 格式） */
  raw?: Record<string, unknown>;
  /** 解析时间戳 */
  parsedAt: Date;
}

/**
 * EXIF 搜索选项
 */
export interface ExifSearchOptions {
  /** 文件路径前缀过滤 */
  pathPrefix?: string;
  /** 是否只返回有 GPS 信息的图片 */
  hasGps?: boolean;
  /** 是否只返回有拍摄参数的图片 */
  hasShootingParams?: boolean;
  /** 相机制造商过滤 */
  cameraMake?: string;
  /** 相机型号过滤 */
  cameraModel?: string;
  /** 拍摄时间范围过滤 */
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  /** 地理位置范围过滤（矩形边界） */
  geoBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** 最大返回结果数 */
  limit?: number;
  /** 排序方式 */
  sortBy?: 'fileName' | 'dateTime' | 'gpsDistance';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * EXIF 统计信息
 */
export interface ExifStatistics {
  /** 总图片数 */
  totalImages: number;
  /** 有 EXIF 数据的图片数 */
  imagesWithExif: number;
  /** 有 GPS 信息的图片数 */
  imagesWithGps: number;
  /** 有拍摄参数的图片数 */
  imagesWithShootingParams: number;
  /** 最常用的相机制造商 */
  topCameraMakes: Array<{
    make: string;
    count: number;
  }>;
  /** 最常用的相机型号 */
  topCameraModels: Array<{
    model: string;
    count: number;
  }>;
  /** 拍摄时间范围 */
  dateRange?: {
    earliest?: Date;
    latest?: Date;
  };
  /** GPS 覆盖范围 */
  gpsBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

// ===============================
// IExifService 接口
// ===============================

/**
 * ExifService 接口
 * 提供完整的图片 EXIF 元数据解析和查询功能
 */
export interface IExifService {
  // ===============================
  // 核心 EXIF 解析操作
  // ===============================

  /**
   * 解析单个图片文件的 EXIF 数据
   * @param filePath 图片文件路径
   * @returns EXIF 数据，如果解析失败返回 null
   */
  parseExif(filePath: string): Promise<ExifData | null>;

  /**
   * 批量解析多个图片文件的 EXIF 数据
   * @param filePaths 图片文件路径数组
   * @returns EXIF 数据数组
   */
  parseMultipleExif(filePaths: string[]): Promise<ExifData[]>;

  /**
   * 扫描指定目录下的所有图片并解析 EXIF
   * @param dirPath 目录路径，默认为 Attachments 目录
   * @returns EXIF 数据数组
   */
  scanDirectoryForExif(dirPath?: string): Promise<ExifData[]>;

  // ===============================
  // EXIF 数据查询操作
  // ===============================

  /**
   * 获取图片的 GPS 坐标信息
   * @param filePath 图片文件路径
   * @returns GPS 坐标，如果不存在返回 null
   */
  getGpsCoordinates(filePath: string): Promise<GpsCoordinates | null>;

  /**
   * 获取图片的拍摄设备信息
   * @param filePath 图片文件路径
   * @returns 拍摄设备信息，如果不存在返回 null
   */
  getCameraInfo(filePath: string): Promise<CameraInfo | null>;

  /**
   * 获取图片的拍摄参数
   * @param filePath 图片文件路径
   * @returns 拍摄参数，如果不存在返回 null
   */
  getShootingParams(filePath: string): Promise<ShootingParams | null>;

  /**
   * 获取图片的拍摄时间信息
   * @param filePath 图片文件路径
   * @returns 时间信息，如果不存在返回 null
   */
  getDateTimeInfo(filePath: string): Promise<DateTimeInfo | null>;

  // ===============================
  // EXIF 搜索和过滤操作
  // ===============================

  /**
   * 搜索包含 GPS 信息的图片
   * @param options 搜索选项
   * @returns 包含 GPS 信息的 EXIF 数据数组
   */
  searchImagesWithGps(options?: ExifSearchOptions): Promise<ExifData[]>;

  /**
   * 根据相机信息搜索图片
   * @param cameraMake 相机制造商，可选
   * @param cameraModel 相机型号，可选
   * @param options 其他搜索选项
   * @returns 匹配的 EXIF 数据数组
   */
  searchImagesByCamera(
    cameraMake?: string,
    cameraModel?: string,
    options?: ExifSearchOptions
  ): Promise<ExifData[]>;

  /**
   * 根据拍摄时间范围搜索图片
   * @param startDate 开始时间
   * @param endDate 结束时间
   * @param options 其他搜索选项
   * @returns 匹配的 EXIF 数据数组
   */
  searchImagesByDateRange(
    startDate: Date,
    endDate: Date,
    options?: ExifSearchOptions
  ): Promise<ExifData[]>;

  /**
   * 根据地理位置范围搜索图片
   * @param bounds 地理边界
   * @param options 其他搜索选项
   * @returns 匹配的 EXIF 数据数组
   */
  searchImagesByGeoBounds(
    bounds: ExifSearchOptions['geoBounds'],
    options?: ExifSearchOptions
  ): Promise<ExifData[]>;

  /**
   * 通用 EXIF 搜索
   * @param options 搜索选项
   * @returns 匹配的 EXIF 数据数组
   */
  searchExif(options: ExifSearchOptions): Promise<ExifData[]>;

  // ===============================
  // EXIF 分析操作
  // ===============================

  /**
   * 获取 EXIF 统计信息
   * @returns 统计信息
   */
  getExifStatistics(): Promise<ExifStatistics>;

  /**
   * 获取所有唯一的相机制造商
   * @returns 相机制造商列表
   */
  getAllCameraMakes(): Promise<string[]>;

  /**
   * 获取所有唯一的相机型号
   * @returns 相机型号列表
   */
  getAllCameraModels(): Promise<string[]>;

  /**
   * 获取拍摄时间范围
   * @returns 时间范围，如果没有时间信息返回 null
   */
  getDateTimeRange(): Promise<{ earliest: Date; latest: Date } | null>;

  /**
   * 获取 GPS 覆盖边界
   * @returns GPS 边界，如果没有 GPS 信息返回 null
   */
  getGpsBounds(): Promise<ExifStatistics['gpsBounds'] | null>;

  // ===============================
  // 工具方法
  // ===============================

  /**
   * 检查文件是否支持 EXIF 解析
   * @param filePath 文件路径
   * @returns 是否支持
   */
  isExifSupported(filePath: string): boolean;

  /**
   * 计算两个 GPS 坐标之间的距离（米）
   * @param coord1 坐标1
   * @param coord2 坐标2
   * @returns 距离（米）
   */
  calculateDistance(coord1: GpsCoordinates, coord2: GpsCoordinates): number;

  /**
   * 将 GPS 坐标转换为可读的地址描述（如果有逆地理编码服务）
   * @param coordinates GPS 坐标
   * @returns 地址描述，如果转换失败返回 null
   */
  coordinatesToAddress?(coordinates: GpsCoordinates): Promise<string | null>;

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新 EXIF 缓存
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
   * @param vaultId vault ID
   */
  switchVault(vaultId: string): void;

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string };
}
