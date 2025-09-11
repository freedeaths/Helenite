/**
 * CacheManager 使用示例
 * 
 * 展示如何使用 CacheManager 为 MetadataService 和 StorageService 创建透明缓存
 */

import { CacheManager } from '../CacheManager.js';
import { StorageService } from '../infra/StorageService.js';
import { MetadataService } from '../MetadataService.js';
import type { StorageConfig } from '../types/StorageTypes.js';
import type { IStorageService } from '../interfaces/IStorageService.js';
import type { IMetadataService } from '../interfaces/IMetadataService.js';

/**
 * 应用服务管理器 - 使用 CacheManager 统一管理所有服务的缓存
 */
export class ApplicationServices {
  private cacheManager: CacheManager;
  private cachedStorageService?: IStorageService;
  private cachedMetadataService?: IMetadataService;

  constructor() {
    this.cacheManager = new CacheManager({
      maxSize: 2000,
      defaultTTL: 600000 // 10分钟
    });
  }

  /**
   * 创建带缓存的 StorageService
   */
  async createStorageService(config: StorageConfig) {
    if (this.cachedStorageService) {
      return this.cachedStorageService;
    }

    // 1. 创建原始服务
    const rawStorageService = new StorageService(config);
    await rawStorageService.initialize();

    // 2. 通过 CacheManager 创建缓存代理（零侵入）
    this.cachedStorageService = this.cacheManager.createCachedStorageService(rawStorageService);
    
    console.log('✅ StorageService with transparent caching created');
    return this.cachedStorageService;
  }

  /**
   * 创建带缓存的 MetadataService
   */
  async createMetadataService(vaultId?: string) {
    if (this.cachedMetadataService) {
      return this.cachedMetadataService;
    }

    // 1. 创建原始服务
    const rawMetadataService = new MetadataService(vaultId);

    // 2. 通过 CacheManager 创建缓存代理（零侵入）
    this.cachedMetadataService = this.cacheManager.createCachedMetadataService(rawMetadataService);
    
    console.log('✅ MetadataService with transparent caching created');
    return this.cachedMetadataService;
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats() {
    return this.cacheManager.getStatistics();
  }

  /**
   * 清理所有缓存
   */
  async clearAllCaches() {
    await this.cacheManager.clearCache();
    console.log('🧹 All caches cleared');
  }

  /**
   * 销毁资源
   */
  async dispose() {
    this.cacheManager.dispose();
    console.log('🗑️ ApplicationServices disposed');
  }
}

/**
 * 使用示例 1：基础使用
 */
export async function basicUsage() {
  console.log('🚀 Basic CacheManager Usage Example');
  
  const appServices = new ApplicationServices();
  
  // 创建带缓存的服务
  const storageService = await appServices.createStorageService({
    basePath: '/vaults/Demo'
  });
  
  const metadataService = await appServices.createMetadataService('Demo');
  
  // 使用服务 - 完全透明的缓存
  console.time('First metadata call');
  const metadata1 = await metadataService.getMetadata();
  console.timeEnd('First metadata call');
  
  console.time('Second metadata call (cached)');
  const metadata2 = await metadataService.getMetadata();
  console.timeEnd('Second metadata call (cached)');
  
  console.log(`✅ Both calls returned ${metadata1?.length === metadata2?.length ? 'identical' : 'different'} results`);
  
  // 查看缓存统计
  const stats = await appServices.getCacheStats();
  console.log('📊 Cache stats:', stats);
  
  await appServices.dispose();
}

/**
 * 使用示例 2：多服务透明缓存
 */
export async function multiServiceCaching() {
  console.log('🔄 Multi-Service Transparent Caching Example');
  
  const appServices = new ApplicationServices();
  
  const storageService = await appServices.createStorageService({
    basePath: '/vaults/Demo'
  });
  
  const metadataService = await appServices.createMetadataService('Demo');
  
  // 并发调用 - 都会自动享受缓存
  const [metadata, fileContent, tags] = await Promise.all([
    metadataService.getMetadata(),
    storageService.readFile('Welcome.md').catch(() => 'File not found'),
    metadataService.getAllTags()
  ]);
  
  console.log(`📄 Loaded ${metadata?.length || 0} files`);
  console.log(`📝 File content: ${typeof fileContent === 'string' ? fileContent.slice(0, 50) + '...' : 'Binary'}`);
  console.log(`🏷️ Found ${tags.length} tags`);
  
  // 再次调用 - 全部来自缓存
  console.time('Cached calls');
  const [cachedMetadata, cachedContent, cachedTags] = await Promise.all([
    metadataService.getMetadata(),
    storageService.readFile('Welcome.md').catch(() => 'File not found'),
    metadataService.getAllTags()
  ]);
  console.timeEnd('Cached calls');
  
  const stats = await appServices.getCacheStats();
  console.log(`📊 Cache hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
  
  await appServices.dispose();
}

/**
 * 使用示例 3：服务间依赖的透明缓存
 */
export async function serviceComposition() {
  console.log('🔗 Service Composition with Transparent Caching');
  
  const appServices = new ApplicationServices();
  
  // 上层服务使用缓存版本的 MetadataService
  const metadataService = await appServices.createMetadataService('Demo');
  
  // 模拟一个 GraphService 依赖 MetadataService
  class GraphService {
    constructor(private metadataService: IMetadataService) {}
    
    async buildGraph() {
      // 这里调用的 metadataService 自动享受缓存，完全透明
      const metadata = await this.metadataService.getMetadata();
      const tags = await this.metadataService.getAllTags();
      
      return {
        nodes: metadata?.length || 0,
        tags: tags.length,
        edges: metadata?.reduce((sum: number, file: unknown) => {
          const fileObj = file as { links?: unknown[] };
          return sum + (fileObj.links?.length || 0);
        }, 0) || 0
      };
    }
  }
  
  const graphService = new GraphService(metadataService);
  
  console.time('Graph building (with caching)');
  const graph = await graphService.buildGraph();
  console.timeEnd('Graph building (with caching)');
  
  console.log('📊 Graph:', graph);
  
  // GraphService 完全不知道 MetadataService 使用了缓存
  const stats = await appServices.getCacheStats();
  console.log(`🎯 Transparent caching: ${stats.cachedServicesCount} services, ${stats.totalEntries} cached entries`);
  
  await appServices.dispose();
}

/**
 * 完整演示
 */
export async function fullDemo() {
  console.log('🎯 Full CacheManager Demo');
  
  try {
    await basicUsage();
    console.log('---');
    
    await multiServiceCaching();
    console.log('---');
    
    await serviceComposition();
    
    console.log('✅ All demos completed successfully');
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

// 导出主要函数
export { fullDemo as demo };