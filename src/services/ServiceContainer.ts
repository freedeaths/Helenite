/**
 * Service Container - 服务容器和依赖注入管理
 * 
 * 职责：
 * 1. 管理所有服务的生命周期
 * 2. 处理服务间的依赖注入
 * 3. 提供服务的单例管理
 * 4. 支持服务的懒加载和初始化
 */

import type { 
  IVaultService,
  IDocumentService, 
  IFileService,
  ISearchService,
  ITagService,
  ICacheService,
  IRenderingService,
  VaultConfig 
} from './interfaces';

/**
 * 服务标识符
 */
export const ServiceIdentifiers = {
  VaultService: 'VaultService',
  DocumentService: 'DocumentService',
  FileService: 'FileService',
  SearchService: 'SearchService',
  TagService: 'TagService',
  CacheService: 'CacheService',
  RenderingService: 'RenderingService',
} as const;

type ServiceId = keyof typeof ServiceIdentifiers;

/**
 * 服务工厂函数类型
 */
type ServiceFactory<T = any> = (container: ServiceContainer) => Promise<T>;

/**
 * 服务注册信息
 */
interface ServiceRegistration {
  factory: ServiceFactory;
  singleton: boolean;
  dependencies: ServiceId[];
  instance?: any;
  initialized?: boolean;
}

/**
 * 服务容器主类
 */
export class ServiceContainer {
  private services = new Map<ServiceId, ServiceRegistration>();
  private initializing = new Set<ServiceId>();
  private vaultConfig?: VaultConfig;

  /**
   * 注册服务
   */
  register<T>(
    identifier: ServiceId,
    factory: ServiceFactory<T>,
    options: {
      singleton?: boolean;
      dependencies?: ServiceId[];
    } = {}
  ): void {
    this.services.set(identifier, {
      factory,
      singleton: options.singleton ?? true,
      dependencies: options.dependencies ?? [],
    });
  }

  /**
   * 获取服务实例
   */
  async get<T>(identifier: ServiceId): Promise<T> {
    const registration = this.services.get(identifier);
    if (!registration) {
      throw new Error(`Service not registered: ${identifier}`);
    }

    // 检查是否为单例且已初始化
    if (registration.singleton && registration.instance) {
      return registration.instance;
    }

    // 防止循环依赖
    if (this.initializing.has(identifier)) {
      throw new Error(`Circular dependency detected for service: ${identifier}`);
    }

    this.initializing.add(identifier);

    try {
      // 先初始化依赖
      await this.initializeDependencies(registration.dependencies);

      // 创建服务实例
      const instance = await registration.factory(this);
      
      if (registration.singleton) {
        registration.instance = instance;
        registration.initialized = true;
      }

      return instance;
    } finally {
      this.initializing.delete(identifier);
    }
  }

  /**
   * 初始化依赖服务
   */
  private async initializeDependencies(dependencies: ServiceId[]): Promise<void> {
    for (const dep of dependencies) {
      await this.get(dep);
    }
  }

  /**
   * 初始化所有服务
   */
  async initialize(config: VaultConfig): Promise<void> {
    this.vaultConfig = config;

    // 按依赖顺序初始化服务
    const initOrder: ServiceId[] = [
      'CacheService',    // 无依赖
      'FileService',     // 无依赖
      'RenderingService', // 无依赖
      'DocumentService', // 依赖 FileService, RenderingService
      'TagService',      // 依赖 DocumentService, CacheService
      'SearchService',   // 依赖 DocumentService, TagService, CacheService
      'VaultService',    // 依赖所有其他服务
    ];

    for (const serviceId of initOrder) {
      if (this.services.has(serviceId)) {
        await this.get(serviceId);
        console.log(`✅ Initialized ${serviceId}`);
      }
    }

    console.log('🎉 All services initialized successfully');
  }

  /**
   * 获取 Vault 配置
   */
  getVaultConfig(): VaultConfig {
    if (!this.vaultConfig) {
      throw new Error('Vault config not set. Call initialize() first.');
    }
    return this.vaultConfig;
  }

  /**
   * 清理所有服务
   */
  async dispose(): Promise<void> {
    // 反向顺序清理服务
    const services = Array.from(this.services.entries()).reverse();

    for (const [serviceId, registration] of services) {
      if (registration.instance && typeof registration.instance.dispose === 'function') {
        try {
          await registration.instance.dispose();
          console.log(`🧹 Disposed ${serviceId}`);
        } catch (error) {
          console.warn(`Failed to dispose ${serviceId}:`, error);
        }
      }
    }

    this.services.clear();
    this.initializing.clear();
    this.vaultConfig = undefined;
  }

  /**
   * 获取服务状态
   */
  getServiceStatus(): Record<ServiceId, {
    registered: boolean;
    initialized: boolean;
    hasDependencies: boolean;
  }> {
    const status: any = {};

    for (const [serviceId, registration] of this.services) {
      status[serviceId] = {
        registered: true,
        initialized: registration.initialized ?? false,
        hasDependencies: registration.dependencies.length > 0,
      };
    }

    return status;
  }

  /**
   * 重新初始化特定服务
   */
  async reinitialize(identifier: ServiceId): Promise<void> {
    const registration = this.services.get(identifier);
    if (!registration) {
      throw new Error(`Service not registered: ${identifier}`);
    }

    // 清理现有实例
    if (registration.instance && typeof registration.instance.dispose === 'function') {
      await registration.instance.dispose();
    }

    registration.instance = undefined;
    registration.initialized = false;

    // 重新初始化
    await this.get(identifier);
    console.log(`🔄 Reinitialized ${identifier}`);
  }

  /**
   * 获取服务依赖图
   */
  getDependencyGraph(): Record<ServiceId, ServiceId[]> {
    const graph: any = {};

    for (const [serviceId, registration] of this.services) {
      graph[serviceId] = registration.dependencies;
    }

    return graph;
  }
}

/**
 * 全局服务容器单例
 */
export const serviceContainer = new ServiceContainer();