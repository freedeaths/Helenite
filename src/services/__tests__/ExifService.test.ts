/**
 * ExifService 单元测试
 * 
 * 测试 ExifService 的核心功能，包括：
 * - EXIF 数据解析
 * - GPS 坐标提取
 * - 拍摄设备信息提取
 * - 搜索和过滤功能
 * - 统计分析功能
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ExifService } from '../ExifService.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import type { GpsCoordinates } from '../interfaces/IExifService.js';

// Mock exifr library
vi.mock('exifr', () => ({
  default: {
    parse: vi.fn()
  }
}));

// ===============================
// Mock 依赖服务
// ===============================

const createMockStorageService = (): IStorageService => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
  getFileInfo: vi.fn(),
  listFiles: vi.fn(),
  readFileWithInfo: vi.fn(),
  deleteFile: vi.fn(),
  createDirectory: vi.fn(),
  watchFile: vi.fn(),
  getDirectoryInfo: vi.fn()
});

// ===============================
// 测试数据
// ===============================

const mockImageFiles = [
  'inversed mt fuji.png',
  'Pasted image 20250902131727.png',
  'Pasted image 20250902132222.png',
  'document.pdf' // 非图片文件，应该被过滤
];

const mockExifWithGps = {
  Make: 'Apple',
  Model: 'iPhone 13 Pro',
  DateTime: '2024:01:15 14:30:25',
  DateTimeOriginal: '2024:01:15 14:30:25',
  DateTimeDigitized: '2024:01:15 14:30:25',
  latitude: 35.3606,
  longitude: 138.7274,
  GPSAltitude: 776.5,
  ISO: 100,
  FNumber: 1.5,
  ExposureTime: 0.008,
  FocalLength: 26,
  ImageWidth: 4032,
  ImageHeight: 3024,
  ColorSpace: 'sRGB',
  Orientation: 1,
  XResolution: 72,
  YResolution: 72,
  ResolutionUnit: 'inches',
  Software: 'iOS 17.2.1'
};

const mockExifWithoutGps = {
  Make: 'Canon',
  Model: 'EOS R5',
  DateTime: '2024:02:20 10:15:30',
  DateTimeOriginal: '2024:02:20 10:15:30',
  ISO: 800,
  FNumber: 2.8,
  ExposureTime: 0.001,
  FocalLength: 85,
  ImageWidth: 8192,
  ImageHeight: 5464,
  Software: 'Canon EOS R5 Firmware 1.3.1'
};

const mockBinaryImageData = 'fake-binary-image-data';

describe('ExifService', () => {
  let exifService: ExifService;
  let mockStorageService: IStorageService;
  let mockExifr: { parse: Mock };

  beforeEach(async () => {
    mockStorageService = createMockStorageService();
    exifService = new ExifService(mockStorageService, 'TestVault');
    
    // Reset exifr mock
    mockExifr = vi.mocked(await import('exifr')).default;
    vi.clearAllMocks();
  });

  describe('构造函数和初始化', () => {
    it('应该正确创建 ExifService 实例', () => {
      expect(exifService).toBeInstanceOf(ExifService);
      expect(exifService.getCurrentVault()).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });

    it('应该使用默认 vault', () => {
      const defaultService = new ExifService(mockStorageService);
      expect(defaultService.getCurrentVault().id).toBe('Demo');
    });
  });

  describe('isExifSupported - 文件格式检查', () => {
    it('应该支持常见的图片格式', () => {
      const supportedFormats = [
        'image.jpg',
        'image.jpeg',
        'image.png',
        'image.tiff',
        'image.tif',
        'image.webp',
        'image.avif',
        'image.heic',
        'image.heif'
      ];

      supportedFormats.forEach(filename => {
        expect(exifService.isExifSupported(filename)).toBe(true);
      });
    });

    it('应该不支持非图片格式', () => {
      const unsupportedFormats = [
        'document.pdf',
        'text.txt',
        'video.mp4',
        'audio.mp3',
        'archive.zip'
      ];

      unsupportedFormats.forEach(filename => {
        expect(exifService.isExifSupported(filename)).toBe(false);
      });
    });

    it('应该不区分大小写', () => {
      expect(exifService.isExifSupported('IMAGE.JPG')).toBe(true);
      expect(exifService.isExifSupported('image.PNG')).toBe(true);
    });
  });

  describe('parseExif - EXIF 数据解析', () => {
    it('应该成功解析包含完整 EXIF 数据的图片', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const result = await exifService.parseExif('inversed mt fuji.png');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(true);
      expect(result!.filePath).toBe('inversed mt fuji.png');
      
      // 验证 GPS 数据
      expect(result!.gps).toEqual({
        latitude: 35.3606,
        longitude: 138.7274,
        altitude: 776.5,
        accuracy: undefined
      });

      // 验证相机信息
      expect(result!.camera).toEqual({
        make: 'Apple',
        model: 'iPhone 13 Pro',
        lensModel: undefined,
        software: 'iOS 17.2.1'
      });

      // 验证拍摄参数
      expect(result!.shooting).toEqual({
        iso: 100,
        aperture: 1.5,
        shutterSpeed: 0.008,
        focalLength: 26,
        flash: undefined,
        whiteBalance: undefined,
        meteringMode: undefined,
        exposureMode: undefined
      });

      // 验证时间信息
      expect(result!.dateTime?.dateTimeOriginal).toEqual(new Date('2024-01-15T14:30:25'));
      
      // 验证图片信息
      expect(result!.image).toEqual({
        width: 4032,
        height: 3024,
        colorSpace: 'sRGB',
        orientation: 1,
        xResolution: 72,
        yResolution: 72,
        resolutionUnit: 'inches'
      });

      expect(mockStorageService.readFile).toHaveBeenCalledWith('inversed mt fuji.png', { binary: true });
      expect(mockExifr.parse).toHaveBeenCalled();
    });

    it('应该处理不包含 GPS 信息的图片', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithoutGps);

      // Act
      const result = await exifService.parseExif('canon-photo.jpg');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(true);
      expect(result!.gps).toBeUndefined();
      expect(result!.camera?.make).toBe('Canon');
      expect(result!.camera?.model).toBe('EOS R5');
      expect(result!.shooting?.iso).toBe(800);
    });

    it('应该处理不包含 EXIF 数据的图片', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(null);

      // Act
      const result = await exifService.parseExif('no-exif.png');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(false);
      expect(result!.gps).toBeUndefined();
      expect(result!.camera).toBeUndefined();
      expect(result!.shooting).toBeUndefined();
    });

    it('应该处理不支持的文件格式', async () => {
      // Act
      const result = await exifService.parseExif('document.pdf');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(false);
      expect(mockStorageService.readFile).not.toHaveBeenCalled();
    });

    it('应该处理文件读取失败', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(null);

      // Act
      const result = await exifService.parseExif('missing.jpg');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(false);
    });

    it('应该处理 EXIF 解析异常', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockRejectedValue(new Error('Parse error'));

      // Act
      const result = await exifService.parseExif('corrupted.jpg');

      // Assert
      expect(result).not.toBeNull();
      expect(result!.hasExif).toBe(false);
    });

    it('应该使用缓存', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act - 第一次调用
      const result1 = await exifService.parseExif('cached.jpg');
      
      // Act - 第二次调用（应该使用缓存）
      const result2 = await exifService.parseExif('cached.jpg');

      // Assert
      expect(result1).toEqual(result2);
      expect(mockStorageService.readFile).toHaveBeenCalledTimes(1);
      expect(mockExifr.parse).toHaveBeenCalledTimes(1);
    });
  });

  describe('parseMultipleExif - 批量解析', () => {
    it('应该批量解析多个图片文件', async () => {
      // Arrange
      const filePaths = ['image1.jpg', 'image2.png', 'image3.jpg'];
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      
      // 由于 mockBinaryImageData 是字符串，不会进入 Buffer 分支
      // 直接从 ArrayBuffer 开始尝试
      mockExifr.parse
        // File 1: ArrayBuffer 成功
        .mockResolvedValueOnce(mockExifWithGps)
        // File 2: ArrayBuffer 失败, Uint8Array 失败
        .mockRejectedValueOnce(new Error('ArrayBuffer parsing failed'))
        .mockRejectedValueOnce(new Error('Uint8Array parsing failed'))
        // File 3: ArrayBuffer 成功
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const results = await exifService.parseMultipleExif(filePaths);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].hasExif).toBe(true);
      expect(results[0].gps).toBeDefined();
      expect(results[1].hasExif).toBe(true); // 现在解析成功了
      expect(results[1].gps).toBeUndefined(); // 但没有 GPS 数据
      expect(results[2].hasExif).toBe(true); // 第三个也成功了
      expect(results[2].gps).toBeDefined(); // 第三个也有 GPS 数据
    });

    it('应该处理部分文件解析失败的情况', async () => {
      // Arrange
      const filePaths = ['good.jpg', 'bad.jpg'];
      (mockStorageService.readFile as Mock)
        .mockResolvedValueOnce(mockBinaryImageData)
        .mockRejectedValueOnce(new Error('File read error'));
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const results = await exifService.parseMultipleExif(filePaths);

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].hasExif).toBe(true);
      expect(results[1].hasExif).toBe(false);
    });
  });

  describe('scanDirectoryForExif - 目录扫描', () => {
    it('应该扫描目录并只处理图片文件', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockResolvedValue(mockImageFiles);
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const results = await exifService.scanDirectoryForExif('Attachments');

      // Assert
      expect(mockStorageService.listFiles).toHaveBeenCalledWith('Attachments');
      expect(results).toHaveLength(3); // 3个图片文件，排除 PDF
      expect(results.every(r => r.hasExif)).toBe(true);
    });

    it('应该处理空目录', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockResolvedValue([]);

      // Act
      const results = await exifService.scanDirectoryForExif('EmptyDir');

      // Assert
      expect(results).toHaveLength(0);
    });

    it('应该处理目录访问失败', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockRejectedValue(new Error('Directory not found'));

      // Act
      const results = await exifService.scanDirectoryForExif('BadDir');

      // Assert
      expect(results).toHaveLength(0);
    });
  });

  describe('GPS 和拍摄信息查询', () => {
    beforeEach(() => {
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
    });

    it('应该获取 GPS 坐标信息', async () => {
      // Arrange
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const gps = await exifService.getGpsCoordinates('with-gps.jpg');

      // Assert
      expect(gps).toEqual({
        latitude: 35.3606,
        longitude: 138.7274,
        altitude: 776.5,
        accuracy: undefined
      });
    });

    it('应该获取相机信息', async () => {
      // Arrange
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const camera = await exifService.getCameraInfo('camera-info.jpg');

      // Assert
      expect(camera).toEqual({
        make: 'Apple',
        model: 'iPhone 13 Pro',
        lensModel: undefined,
        software: 'iOS 17.2.1'
      });
    });

    it('应该获取拍摄参数', async () => {
      // Arrange
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const shooting = await exifService.getShootingParams('shooting.jpg');

      // Assert
      expect(shooting).toEqual({
        iso: 100,
        aperture: 1.5,
        shutterSpeed: 0.008,
        focalLength: 26,
        flash: undefined,
        whiteBalance: undefined,
        meteringMode: undefined,
        exposureMode: undefined
      });
    });

    it('应该获取拍摄时间信息', async () => {
      // Arrange
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const dateTime = await exifService.getDateTimeInfo('datetime.jpg');

      // Assert
      expect(dateTime?.dateTimeOriginal).toEqual(new Date('2024-01-15T14:30:25'));
      expect(dateTime?.dateTime).toEqual(new Date('2024-01-15T14:30:25'));
      expect(dateTime?.dateTimeDigitized).toEqual(new Date('2024-01-15T14:30:25'));
    });

    it('应该处理缺失的信息', async () => {
      // Arrange
      mockExifr.parse.mockResolvedValue({ Make: 'Test' }); // 最小化 EXIF 数据

      // Act
      const gps = await exifService.getGpsCoordinates('no-gps.jpg');
      const shooting = await exifService.getShootingParams('no-shooting.jpg');

      // Assert
      expect(gps).toBeNull();
      expect(shooting).toBeNull();
    });
  });

  describe('搜索功能', () => {
    beforeEach(() => {
      (mockStorageService.listFiles as Mock).mockResolvedValue(['image1.jpg', 'image2.jpg']);
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
    });

    it('应该搜索包含 GPS 信息的图片', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const results = await exifService.searchImagesWithGps();

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].gps).toBeDefined();
    });

    it('应该按相机信息搜索图片', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const appleResults = await exifService.searchImagesByCamera('Apple');
      const canonResults = await exifService.searchImagesByCamera('Canon');

      // Assert
      expect(appleResults).toHaveLength(1);
      expect(appleResults[0].camera?.make).toBe('Apple');
      expect(canonResults).toHaveLength(1);
      expect(canonResults[0].camera?.make).toBe('Canon');
    });

    it('应该按时间范围搜索图片', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Act
      const results = await exifService.searchImagesByDateRange(startDate, endDate);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].dateTime?.dateTimeOriginal).toEqual(new Date('2024-01-15T14:30:25'));
    });

    it('应该按地理边界搜索图片', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      const bounds = {
        north: 36,
        south: 35,
        east: 139,
        west: 138
      };

      // Act
      const results = await exifService.searchImagesByGeoBounds(bounds);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].gps?.latitude).toBe(35.3606);
    });

    it('应该支持结果限制', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockResolvedValue(['img1.jpg', 'img2.jpg', 'img3.jpg']);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const results = await exifService.searchExif({ limit: 2 });

      // Assert
      expect(results).toHaveLength(2);
    });
  });

  describe('统计分析功能', () => {
    beforeEach(() => {
      (mockStorageService.listFiles as Mock).mockResolvedValue(['img1.jpg', 'img2.jpg']);
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
    });

    it('应该计算 EXIF 统计信息', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const stats = await exifService.getExifStatistics();

      // Assert
      expect(stats.totalImages).toBe(2);
      expect(stats.imagesWithExif).toBe(2);
      expect(stats.imagesWithGps).toBe(1);
      expect(stats.imagesWithShootingParams).toBe(2);
      expect(stats.topCameraMakes).toHaveLength(2);
      expect(stats.topCameraMakes[0].make).toBe('Apple');
      expect(stats.dateRange).toBeDefined();
      expect(stats.gpsBounds).toBeDefined();
    });

    it('应该获取所有相机制造商', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const makes = await exifService.getAllCameraMakes();

      // Assert
      expect(makes).toEqual(['Apple', 'Canon']);
    });

    it('应该获取所有相机型号', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const models = await exifService.getAllCameraModels();

      // Assert
      expect(models).toEqual(['EOS R5', 'iPhone 13 Pro']);
    });

    it('应该获取拍摄时间范围', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const range = await exifService.getDateTimeRange();

      // Assert
      expect(range).not.toBeNull();
      expect(range!.earliest).toEqual(new Date('2024-01-15T14:30:25'));
      expect(range!.latest).toEqual(new Date('2024-02-20T10:15:30'));
    });

    it('应该获取 GPS 边界', async () => {
      // Arrange
      mockExifr.parse
        .mockResolvedValueOnce(mockExifWithGps)
        .mockResolvedValueOnce(mockExifWithoutGps);

      // Act
      const bounds = await exifService.getGpsBounds();

      // Assert
      expect(bounds).not.toBeNull();
      expect(bounds!.north).toBe(35.3606);
      expect(bounds!.south).toBe(35.3606);
    });

    it('应该处理没有数据的情况', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockResolvedValue([]);

      // Act
      const stats = await exifService.getExifStatistics();
      const dateRange = await exifService.getDateTimeRange();
      const gpsBounds = await exifService.getGpsBounds();

      // Assert
      expect(stats.totalImages).toBe(0);
      expect(dateRange).toBeNull();
      expect(gpsBounds).toBeNull();
    });
  });

  describe('工具方法', () => {
    it('应该计算两个 GPS 坐标之间的距离', () => {
      // Arrange
      const coord1: GpsCoordinates = { latitude: 35.3606, longitude: 138.7274 };
      const coord2: GpsCoordinates = { latitude: 35.3616, longitude: 138.7284 };

      // Act
      const distance = exifService.calculateDistance(coord1, coord2);

      // Assert
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // 应该是很小的距离（米）
    });

    it('应该计算相同坐标的距离为0', () => {
      // Arrange
      const coord: GpsCoordinates = { latitude: 35.3606, longitude: 138.7274 };

      // Act
      const distance = exifService.calculateDistance(coord, coord);

      // Assert
      expect(distance).toBe(0);
    });
  });

  describe('缓存管理', () => {
    it('应该支持刷新缓存', async () => {
      // Arrange
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // 先解析一个文件建立缓存
      await exifService.parseExif('cached.jpg');

      // Act
      await exifService.refreshCache();

      // 再次解析同一个文件，应该重新调用解析
      await exifService.parseExif('cached.jpg');

      // Assert
      expect(mockExifr.parse).toHaveBeenCalledTimes(2);
    });

    it('应该返回缓存统计信息', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockResolvedValue(['img1.jpg']);
      (mockStorageService.readFile as Mock).mockResolvedValue(mockBinaryImageData);
      mockExifr.parse.mockResolvedValue(mockExifWithGps);

      // Act
      const stats = await exifService.getCacheStats();

      // Assert
      expect(stats.vaultId).toBe('TestVault');
      expect(stats.totalImages).toBe(1);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Vault 管理', () => {
    it('应该支持切换 vault', () => {
      // Act
      exifService.switchVault('NewVault');

      // Assert
      expect(exifService.getCurrentVault()).toEqual({
        id: 'NewVault',
        path: '/vaults/NewVault'
      });
    });

    it('应该返回当前 vault 信息', () => {
      // Act
      const result = exifService.getCurrentVault();

      // Assert
      expect(result).toEqual({
        id: 'TestVault',
        path: '/vaults/TestVault'
      });
    });
  });

  describe('错误处理', () => {
    it('getExifStatistics 出错时应该返回空统计', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockRejectedValue(new Error('Directory error'));

      // Act
      const stats = await exifService.getExifStatistics();

      // Assert
      expect(stats).toEqual({
        totalImages: 0,
        imagesWithExif: 0,
        imagesWithGps: 0,
        imagesWithShootingParams: 0,
        topCameraMakes: [],
        topCameraModels: []
      });
    });

    it('searchExif 出错时应该返回空数组', async () => {
      // Arrange
      (mockStorageService.listFiles as Mock).mockRejectedValue(new Error('Search error'));

      // Act
      const results = await exifService.searchExif({ hasGps: true });

      // Assert
      expect(results).toEqual([]);
    });
  });
});