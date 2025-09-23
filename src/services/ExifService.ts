/**
 * ExifService - EXIF 元数据解析服务
 * 
 * 解析图片文件的 EXIF 元数据，包括 GPS 坐标、拍摄参数、设备信息等
 * 支持的格式：JPEG、PNG、TIFF、WebP 等包含 EXIF 信息的图片格式
 */

import exifr from 'exifr';
import { createVaultConfig } from '../config/vaultConfig.js';
import type { VaultPaths } from '../config/vaultConfig.js';
import type { 
  IExifService,
  ExifData,
  GpsCoordinates,
  CameraInfo,
  ShootingParams,
  DateTimeInfo,
  ImageInfo,
  ExifSearchOptions,
  ExifStatistics
} from './interfaces/IExifService.js';
import type { IStorageService } from './interfaces/IStorageService.js';

// ===============================
// 支持的图片格式
// ===============================

const SUPPORTED_IMAGE_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.avif', '.heic', '.heif'
];

// ===============================
// ExifService 实现
// ===============================

export class ExifService implements IExifService {
  private vaultConfig: VaultPaths;
  private storageService: IStorageService;
  private exifCache = new Map<string, ExifData>();

  constructor(
    storageService: IStorageService,
    vaultId?: string
  ) {
    this.vaultConfig = createVaultConfig(vaultId || 'Demo');
    this.storageService = storageService;
  }

  // ===============================
  // 核心 EXIF 解析操作
  // ===============================

  /**
   * 解析单个图片文件的 EXIF 数据
   */
  async parseExif(filePath: string): Promise<ExifData | null> {
    try {
      
      // 检查是否支持 EXIF 解析
      if (!this.isExifSupported(filePath)) {
        console.warn(`⚠️ File format not supported for EXIF: ${filePath}`);
        return this.createEmptyExifData(filePath);
      }

      // 检查缓存
      if (this.exifCache.has(filePath)) {
        return this.exifCache.get(filePath)!;
      }

      // 读取文件内容（二进制）
      const fileContent = await this.storageService.readFile(filePath, { 
        binary: true 
      });

      if (!fileContent) {
        console.warn(`❌ Failed to read file: ${filePath}`);
        return this.createEmptyExifData(filePath);
      }

      // 将文件内容转换为 ArrayBuffer（支持 Buffer 和字符串）
      const arrayBuffer = this.toArrayBuffer(fileContent);

      // 解析 EXIF 数据 - 多种格式尝试
      let rawExif: Record<string, unknown> | null = null;
      
      // 方法1: 直接用 Buffer
      if (Buffer.isBuffer(fileContent)) {
        try {
          rawExif = await exifr.parse(fileContent, {
            gps: true,
            exif: true,
            ifd0: true,
            ifd1: true,
            interop: true,
            makerNote: false,
            userComment: false,
            translateKeys: true,
            translateValues: true,
            reviveValues: true
          });
        } catch (error) {
          console.warn(`Buffer parsing failed, trying ArrayBuffer:`, error);
        }
      }
      
      // 方法2: 用 ArrayBuffer（通常在 HTTP 环境中成功）
      if (!rawExif) {
        try {
          rawExif = await exifr.parse(arrayBuffer, {
            gps: true,
            exif: true,
            ifd0: true,
            ifd1: true,
            interop: true,
            makerNote: false,
            userComment: false,
            translateKeys: true,
            translateValues: true,
            reviveValues: true
          });
        } catch (error) {
          console.warn(`ArrayBuffer parsing failed, trying Uint8Array:`, error);
        }
      }
      
      // 方法3: 用 Uint8Array（最后尝试）
      if (!rawExif) {
        try {
          const uint8Array = new Uint8Array(arrayBuffer);
          rawExif = await exifr.parse(uint8Array, {
            gps: true,
            exif: true,
            ifd0: true,
            ifd1: true,
            interop: true,
            makerNote: false,
            userComment: false,
            translateKeys: true,
            translateValues: true,
            reviveValues: true
          });
        } catch (error) {
          console.warn(`Uint8Array parsing failed:`, error);
        }
      }

      if (!rawExif) {
        return this.createEmptyExifData(filePath);
      }

      // 构建结构化的 EXIF 数据
      const exifData: ExifData = {
        filePath,
        hasExif: true,
        gps: this.extractGpsCoordinates(rawExif),
        camera: this.extractCameraInfo(rawExif),
        shooting: this.extractShootingParams(rawExif),
        dateTime: this.extractDateTimeInfo(rawExif),
        image: this.extractImageInfo(rawExif),
        raw: rawExif,
        parsedAt: new Date()
      };

      // 缓存结果
      this.exifCache.set(filePath, exifData);


      return exifData;
    } catch (error) {
      console.error(`❌ Failed to parse EXIF for ${filePath}:`, error);
      return this.createEmptyExifData(filePath);
    }
  }

  /**
   * 批量解析多个图片文件的 EXIF 数据
   */
  async parseMultipleExif(filePaths: string[]): Promise<ExifData[]> {

    const results = await Promise.allSettled(
      filePaths.map(filePath => this.parseExif(filePath))
    );

    const exifDataArray: ExifData[] = [];
    let _successCount = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        exifDataArray.push(result.value);
        if (result.value.hasExif) {
          _successCount++;
        }
      } else {
        // 即使解析失败，也创建一个空的 EXIF 数据
        exifDataArray.push(this.createEmptyExifData(filePaths[i]));
      }
    }

    return exifDataArray;
  }

  /**
   * 扫描指定目录下的所有图片并解析 EXIF
   */
  async scanDirectoryForExif(dirPath: string = 'Attachments'): Promise<ExifData[]> {
    try {

      // 获取目录下的所有文件
      const files = await this.storageService.listFiles(dirPath);
      
      // 过滤出图片文件
      const imageFiles = files.filter(file => this.isExifSupported(file));
      

      if (imageFiles.length === 0) {
        return [];
      }

      // 批量解析 EXIF
      return this.parseMultipleExif(imageFiles);
    } catch (error) {
      console.error(`❌ Failed to scan directory ${dirPath}:`, error);
      return [];
    }
  }

  // ===============================
  // EXIF 数据查询操作
  // ===============================

  /**
   * 获取图片的 GPS 坐标信息
   */
  async getGpsCoordinates(filePath: string): Promise<GpsCoordinates | null> {
    const exifData = await this.parseExif(filePath);
    return exifData?.gps || null;
  }

  /**
   * 获取图片的拍摄设备信息
   */
  async getCameraInfo(filePath: string): Promise<CameraInfo | null> {
    const exifData = await this.parseExif(filePath);
    return exifData?.camera || null;
  }

  /**
   * 获取图片的拍摄参数
   */
  async getShootingParams(filePath: string): Promise<ShootingParams | null> {
    const exifData = await this.parseExif(filePath);
    return exifData?.shooting || null;
  }

  /**
   * 获取图片的拍摄时间信息
   */
  async getDateTimeInfo(filePath: string): Promise<DateTimeInfo | null> {
    const exifData = await this.parseExif(filePath);
    return exifData?.dateTime || null;
  }

  // ===============================
  // EXIF 搜索和过滤操作
  // ===============================

  /**
   * 搜索包含 GPS 信息的图片
   */
  async searchImagesWithGps(options: ExifSearchOptions = {}): Promise<ExifData[]> {
    return this.searchExif({ ...options, hasGps: true });
  }

  /**
   * 根据相机信息搜索图片
   */
  async searchImagesByCamera(
    cameraMake?: string, 
    cameraModel?: string, 
    options: ExifSearchOptions = {}
  ): Promise<ExifData[]> {
    return this.searchExif({
      ...options,
      cameraMake,
      cameraModel
    });
  }

  /**
   * 根据拍摄时间范围搜索图片
   */
  async searchImagesByDateRange(
    startDate: Date, 
    endDate: Date, 
    options: ExifSearchOptions = {}
  ): Promise<ExifData[]> {
    return this.searchExif({
      ...options,
      dateRange: { start: startDate, end: endDate }
    });
  }

  /**
   * 根据地理位置范围搜索图片
   */
  async searchImagesByGeoBounds(
    bounds: ExifSearchOptions['geoBounds'], 
    options: ExifSearchOptions = {}
  ): Promise<ExifData[]> {
    return this.searchExif({
      ...options,
      geoBounds: bounds
    });
  }

  /**
   * 通用 EXIF 搜索
   */
  async searchExif(options: ExifSearchOptions): Promise<ExifData[]> {
    try {

      // 获取所有图片的 EXIF 数据
      const dirPath = options.pathPrefix || 'Attachments';
      const allExifData = await this.scanDirectoryForExif(dirPath);

      // 应用过滤条件
      let filteredResults = allExifData.filter(exifData => {
        // 路径前缀过滤
        if (options.pathPrefix && !exifData.filePath.startsWith(options.pathPrefix)) {
          return false;
        }

        // GPS 过滤
        if (options.hasGps && !exifData.gps) {
          return false;
        }

        // 拍摄参数过滤
        if (options.hasShootingParams && !exifData.shooting) {
          return false;
        }

        // 相机制造商过滤
        if (options.cameraMake && exifData.camera?.make !== options.cameraMake) {
          return false;
        }

        // 相机型号过滤
        if (options.cameraModel && exifData.camera?.model !== options.cameraModel) {
          return false;
        }

        // 时间范围过滤
        if (options.dateRange && exifData.dateTime?.dateTimeOriginal) {
          const shootingDate = exifData.dateTime.dateTimeOriginal;
          if (options.dateRange.start && shootingDate < options.dateRange.start) {
            return false;
          }
          if (options.dateRange.end && shootingDate > options.dateRange.end) {
            return false;
          }
        }

        // 地理边界过滤
        if (options.geoBounds) {
          if (!exifData.gps) {
            return false; // 没有GPS信息的图片不符合地理边界搜索
          }
          const { latitude, longitude } = exifData.gps;
          const { north, south, east, west } = options.geoBounds;
          if (latitude < south || latitude > north || longitude < west || longitude > east) {
            return false;
          }
        }

        return true;
      });

      // 排序
      if (options.sortBy) {
        filteredResults = this.sortExifResults(filteredResults, options.sortBy, options.sortOrder);
      }

      // 限制结果数量
      if (options.limit && options.limit > 0) {
        filteredResults = filteredResults.slice(0, options.limit);
      }

      return filteredResults;
    } catch (error) {
      console.error('❌ Failed to search EXIF data:', error);
      return [];
    }
  }

  // ===============================
  // EXIF 分析操作
  // ===============================

  /**
   * 获取 EXIF 统计信息
   */
  async getExifStatistics(): Promise<ExifStatistics> {
    try {

      const allExifData = await this.scanDirectoryForExif();
      const imagesWithExif = allExifData.filter(data => data.hasExif);
      const imagesWithGps = allExifData.filter(data => data.gps);
      const imagesWithShootingParams = allExifData.filter(data => data.shooting);

      // 统计相机制造商
      const cameraMakeMap = new Map<string, number>();
      const cameraModelMap = new Map<string, number>();
      const shootingDates: Date[] = [];
      const gpsCoordinates: GpsCoordinates[] = [];

      for (const exifData of imagesWithExif) {
        if (exifData.camera?.make) {
          cameraMakeMap.set(
            exifData.camera.make, 
            (cameraMakeMap.get(exifData.camera.make) || 0) + 1
          );
        }

        if (exifData.camera?.model) {
          cameraModelMap.set(
            exifData.camera.model, 
            (cameraModelMap.get(exifData.camera.model) || 0) + 1
          );
        }

        if (exifData.dateTime?.dateTimeOriginal) {
          shootingDates.push(exifData.dateTime.dateTimeOriginal);
        }

        if (exifData.gps) {
          gpsCoordinates.push(exifData.gps);
        }
      }

      // 计算时间范围
      const dateRange = shootingDates.length > 0 ? {
        earliest: new Date(Math.min(...shootingDates.map(d => d.getTime()))),
        latest: new Date(Math.max(...shootingDates.map(d => d.getTime())))
      } : undefined;

      // 计算 GPS 边界
      const gpsBounds = gpsCoordinates.length > 0 ? {
        north: Math.max(...gpsCoordinates.map(coord => coord.latitude)),
        south: Math.min(...gpsCoordinates.map(coord => coord.latitude)),
        east: Math.max(...gpsCoordinates.map(coord => coord.longitude)),
        west: Math.min(...gpsCoordinates.map(coord => coord.longitude))
      } : undefined;

      const statistics: ExifStatistics = {
        totalImages: allExifData.length,
        imagesWithExif: imagesWithExif.length,
        imagesWithGps: imagesWithGps.length,
        imagesWithShootingParams: imagesWithShootingParams.length,
        topCameraMakes: Array.from(cameraMakeMap.entries())
          .map(([make, count]) => ({ make, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        topCameraModels: Array.from(cameraModelMap.entries())
          .map(([model, count]) => ({ model, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10),
        dateRange,
        gpsBounds
      };

      return statistics;
    } catch (error) {
      console.error('❌ Failed to calculate EXIF statistics:', error);
      return {
        totalImages: 0,
        imagesWithExif: 0,
        imagesWithGps: 0,
        imagesWithShootingParams: 0,
        topCameraMakes: [],
        topCameraModels: []
      };
    }
  }

  /**
   * 获取所有唯一的相机制造商
   */
  async getAllCameraMakes(): Promise<string[]> {
    const allExifData = await this.scanDirectoryForExif();
    const makes = new Set<string>();
    
    for (const exifData of allExifData) {
      if (exifData.camera?.make) {
        makes.add(exifData.camera.make);
      }
    }
    
    return Array.from(makes).sort();
  }

  /**
   * 获取所有唯一的相机型号
   */
  async getAllCameraModels(): Promise<string[]> {
    const allExifData = await this.scanDirectoryForExif();
    const models = new Set<string>();
    
    for (const exifData of allExifData) {
      if (exifData.camera?.model) {
        models.add(exifData.camera.model);
      }
    }
    
    return Array.from(models).sort();
  }

  /**
   * 获取拍摄时间范围
   */
  async getDateTimeRange(): Promise<{ earliest: Date; latest: Date } | null> {
    const allExifData = await this.scanDirectoryForExif();
    const dates: Date[] = [];
    
    for (const exifData of allExifData) {
      if (exifData.dateTime?.dateTimeOriginal) {
        dates.push(exifData.dateTime.dateTimeOriginal);
      }
    }
    
    if (dates.length === 0) {
      return null;
    }
    
    return {
      earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
      latest: new Date(Math.max(...dates.map(d => d.getTime())))
    };
  }

  /**
   * 获取 GPS 覆盖边界
   */
  async getGpsBounds(): Promise<ExifStatistics['gpsBounds'] | null> {
    const allExifData = await this.scanDirectoryForExif();
    const coordinates: GpsCoordinates[] = [];
    
    for (const exifData of allExifData) {
      if (exifData.gps) {
        coordinates.push(exifData.gps);
      }
    }
    
    if (coordinates.length === 0) {
      return null;
    }
    
    return {
      north: Math.max(...coordinates.map(coord => coord.latitude)),
      south: Math.min(...coordinates.map(coord => coord.latitude)),
      east: Math.max(...coordinates.map(coord => coord.longitude)),
      west: Math.min(...coordinates.map(coord => coord.longitude))
    };
  }

  // ===============================
  // 工具方法
  // ===============================

  /**
   * 检查文件是否支持 EXIF 解析
   */
  isExifSupported(filePath: string): boolean {
    const extension = this.getFileExtension(filePath).toLowerCase();
    return SUPPORTED_IMAGE_EXTENSIONS.includes(extension);
  }

  /**
   * 计算两个 GPS 坐标之间的距离（米）
   * 使用 Haversine 公式
   */
  calculateDistance(coord1: GpsCoordinates, coord2: GpsCoordinates): number {
    const R = 6371000; // 地球半径（米）
    const lat1Rad = coord1.latitude * Math.PI / 180;
    const lat2Rad = coord2.latitude * Math.PI / 180;
    const deltaLatRad = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const deltaLngRad = (coord2.longitude - coord1.longitude) * Math.PI / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ===============================
  // 缓存管理
  // ===============================

  /**
   * 刷新 EXIF 缓存
   */
  async refreshCache(): Promise<void> {
    this.exifCache.clear();
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<Record<string, unknown>> {
    const stats = await this.getExifStatistics();
    return {
      vaultId: this.vaultConfig.id,
      cacheSize: this.exifCache.size,
      ...stats
    };
  }

  // ===============================
  // Vault 管理
  // ===============================

  /**
   * 切换到不同的 vault
   */
  switchVault(vaultId: string): void {
    this.vaultConfig = createVaultConfig(vaultId);
    this.refreshCache(); // 切换 vault 时清空缓存
  }

  /**
   * 获取当前 vault 信息
   */
  getCurrentVault(): { id: string; path: string } {
    return {
      id: this.vaultConfig.id,
      path: this.vaultConfig.path
    };
  }

  // ===============================
  // 私有辅助方法
  // ===============================

  /**
   * 创建空的 EXIF 数据
   */
  private createEmptyExifData(filePath: string): ExifData {
    return {
      filePath,
      hasExif: false,
      parsedAt: new Date()
    };
  }

  /**
   * 字符串转 ArrayBuffer
   */
  /**
   * 将文件内容转换为 ArrayBuffer（支持 Buffer 和字符串）
   */
  private toArrayBuffer(data: string | Buffer): ArrayBuffer {
    if (Buffer.isBuffer(data)) {
      // 如果是 Buffer，创建一个新的 ArrayBuffer 来避免共享内存问题
      const arrayBuffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(arrayBuffer);
      for (let i = 0; i < data.length; i++) {
        view[i] = data[i];
      }
      return arrayBuffer;
    } else {
      // 如果是字符串，使用原有的转换逻辑
      const buffer = new ArrayBuffer(data.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < data.length; i++) {
        view[i] = data.charCodeAt(i) & 0xff;
      }
      return buffer;
    }
  }

  /**
   * @deprecated Use toArrayBuffer instead
   */
  private stringToArrayBuffer(str: string): ArrayBuffer {
    return this.toArrayBuffer(str);
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot !== -1 ? filePath.substring(lastDot) : '';
  }

  /**
   * 提取 GPS 坐标信息
   */
  private extractGpsCoordinates(rawExif: Record<string, unknown>): GpsCoordinates | undefined {
    if (!rawExif.latitude || !rawExif.longitude) {
      return undefined;
    }

    return {
      latitude: rawExif.latitude,
      longitude: rawExif.longitude,
      altitude: rawExif.GPSAltitude || undefined,
      accuracy: rawExif.GPSHPositioningError || undefined
    };
  }

  /**
   * 提取拍摄设备信息
   */
  private extractCameraInfo(rawExif: Record<string, unknown>): CameraInfo | undefined {
    if (!rawExif.Make && !rawExif.Model) {
      return undefined;
    }

    return {
      make: rawExif.Make || undefined,
      model: rawExif.Model || undefined,
      lensModel: rawExif.LensModel || undefined,
      software: rawExif.Software || undefined
    };
  }

  /**
   * 提取拍摄参数
   */
  private extractShootingParams(rawExif: Record<string, unknown>): ShootingParams | undefined {
    const hasShootingParams = rawExif.ISO || rawExif.FNumber || rawExif.ExposureTime || rawExif.FocalLength;
    
    if (!hasShootingParams) {
      return undefined;
    }

    return {
      iso: rawExif.ISO || undefined,
      aperture: rawExif.FNumber || undefined,
      shutterSpeed: rawExif.ExposureTime || undefined,
      focalLength: rawExif.FocalLength || undefined,
      flash: rawExif.Flash || undefined,
      whiteBalance: rawExif.WhiteBalance || undefined,
      meteringMode: rawExif.MeteringMode || undefined,
      exposureMode: rawExif.ExposureMode || undefined
    };
  }

  /**
   * 提取时间信息
   */
  private extractDateTimeInfo(rawExif: Record<string, unknown>): DateTimeInfo | undefined {
    // exifr 可能已经解析了日期（作为 Date 对象）或返回原始字符串
    const hasDateTime = rawExif.DateTime || rawExif.DateTimeOriginal || rawExif.DateTimeDigitized || 
                       rawExif.ModifyDate || rawExif.CreateDate;
    
    if (!hasDateTime) {
      return undefined;
    }

    return {
      dateTime: this.normalizeDate(rawExif.DateTime || rawExif.ModifyDate),
      dateTimeOriginal: this.normalizeDate(rawExif.DateTimeOriginal || rawExif.CreateDate),
      dateTimeDigitized: this.normalizeDate(rawExif.DateTimeDigitized || rawExif.CreateDate),
      timeZoneOffset: rawExif.OffsetTime || undefined
    };
  }

  /**
   * 标准化日期 - 处理 exifr 已解析的 Date 对象或原始字符串
   */
  private normalizeDate(dateValue: unknown): Date | undefined {
    if (!dateValue) {
      return undefined;
    }

    // 如果已经是 Date 对象，直接返回
    if (dateValue instanceof Date) {
      return dateValue;
    }

    // 如果是字符串，尝试解析
    if (typeof dateValue === 'string') {
      return this.parseExifDate(dateValue);
    }

    return undefined;
  }

  /**
   * 解析 EXIF 日期格式 (YYYY:MM:DD HH:mm:ss) 为 JavaScript Date
   */
  private parseExifDate(exifDateString: string): Date | undefined {
    try {
      // EXIF 日期格式: "2024:01:15 14:30:25"
      // 转换为 ISO 格式: "2024-01-15T14:30:25"
      const isoString = exifDateString.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
      return new Date(isoString);
    } catch {
      return undefined;
    }
  }

  /**
   * 提取图片基本信息
   */
  private extractImageInfo(rawExif: Record<string, unknown>): ImageInfo | undefined {
    const hasImageInfo = rawExif.ImageWidth || rawExif.ImageHeight || rawExif.ColorSpace;
    
    if (!hasImageInfo) {
      return undefined;
    }

    return {
      width: rawExif.ImageWidth || rawExif.ExifImageWidth || undefined,
      height: rawExif.ImageHeight || rawExif.ExifImageHeight || undefined,
      colorSpace: rawExif.ColorSpace || undefined,
      orientation: rawExif.Orientation || undefined,
      xResolution: rawExif.XResolution || undefined,
      yResolution: rawExif.YResolution || undefined,
      resolutionUnit: rawExif.ResolutionUnit || undefined
    };
  }

  /**
   * 对 EXIF 搜索结果进行排序
   */
  private sortExifResults(
    results: ExifData[], 
    sortBy: ExifSearchOptions['sortBy'], 
    sortOrder: ExifSearchOptions['sortOrder'] = 'asc'
  ): ExifData[] {
    return results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'fileName':
          comparison = a.filePath.localeCompare(b.filePath);
          break;
        case 'dateTime': {
          const dateA = a.dateTime?.dateTimeOriginal?.getTime() || 0;
          const dateB = b.dateTime?.dateTimeOriginal?.getTime() || 0;
          comparison = dateA - dateB;
          break;
        }
        case 'gpsDistance': {
          // 这里需要一个参考点，暂时按纬度排序
          const latA = a.gps?.latitude || 0;
          const latB = b.gps?.latitude || 0;
          comparison = latA - latB;
          break;
        }
        default:
          comparison = 0;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }
}

// ===============================
// 全局实例管理
// ===============================

let _globalExifService: ExifService | null = null;

/**
 * 获取全局 EXIF 服务实例
 */
export function getExifService(): ExifService | null {
  return _globalExifService;
}

/**
 * 初始化全局 EXIF 服务
 */
export function initializeExifService(
  storageService: IStorageService,
  vaultId?: string
): ExifService {
  _globalExifService = new ExifService(storageService, vaultId);
  return _globalExifService;
}

/**
 * 销毁全局 EXIF 服务
 */
export function disposeExifService(): void {
  if (_globalExifService) {
    _globalExifService.refreshCache();
  }
  _globalExifService = null;
}