/**
 * 通用缓存代理工厂
 * 
 * 提供零侵入式的服务缓存增强，支持灵活的缓存配置
 */

import { ICacheService } from '../interfaces/ICacheService.js';

export interface CacheMethodConfig {
  /** 生存时间(毫秒) */
  ttl: number;
  /** 缓存条件判断函数 */
  condition?: (...args: any[]) => boolean;
  /** 自定义缓存键生成函数 */
  keyGenerator?: (...args: any[]) => string;
}

export type CacheConfig<T> = {
  [K in keyof T]?: CacheMethodConfig;
};

/**
 * 创建带缓存的服务代理
 * @param service 原始服务实例
 * @param cache 缓存服务
 * @param namespace 缓存命名空间
 * @param config 缓存配置
 * @returns 带缓存功能的服务代理
 */
export function createCachedService<T extends object>(
  service: T,
  cache: ICacheService,
  namespace: string,
  config: CacheConfig<T>
): T {
  const namespacedCache = cache.namespace(namespace);
  
  return new Proxy(service, {
    get(target, prop: string | symbol) {
      const originalMethod = (target as any)[prop];
      
      // 只代理配置了缓存的方法
      if (typeof originalMethod === 'function' && config[prop as keyof T]) {
        return createCachedMethod(
          originalMethod,
          namespacedCache,
          prop as string,
          config[prop as keyof T]!,
          target
        );
      }
      
      return originalMethod;
    }
  });
}

/**
 * 创建单个方法的缓存代理
 */
function createCachedMethod(
  originalMethod: Function,
  cache: ICacheService,
  methodName: string,
  config: CacheMethodConfig,
  context: any
): Function {
  return async function(...args: any[]) {
    // 检查缓存条件
    if (config.condition && !config.condition(...args)) {
      return originalMethod.apply(context, args);
    }
    
    // 生成缓存键
    const cacheKey = config.keyGenerator
      ? config.keyGenerator(...args)
      : generateDefaultCacheKey(methodName, args);
    
    // 使用getOrSet获取或计算值
    return cache.getOrSet(cacheKey, () => 
      originalMethod.apply(context, args),
      config.ttl
    );
  };
}

/**
 * 默认的缓存键生成算法
 */
function generateDefaultCacheKey(methodName: string, args: any[]): string {
  const argsHash = args.length > 0 ? JSON.stringify(args) : 'no-args';
  return `${methodName}:${argsHash}`;
}

/**
 * 缓存配置构建器 - 提供流畅的API
 */
export class CacheConfigBuilder<T> {
  private config: CacheConfig<T> = {};

  method<K extends keyof T>(methodName: K): MethodConfigBuilder<T, K> {
    return new MethodConfigBuilder<T, K>(this, methodName);
  }

  build(): CacheConfig<T> {
    return { ...this.config };
  }

  internal_setMethodConfig<K extends keyof T>(methodName: K, config: CacheMethodConfig): void {
    this.config[methodName] = config;
  }
}

/**
 * 方法配置构建器
 */
export class MethodConfigBuilder<T, K extends keyof T> {
  constructor(
    private parent: CacheConfigBuilder<T>,
    private methodName: K
  ) {}

  ttl(milliseconds: number): this {
    this.ensureConfig().ttl = milliseconds;
    return this;
  }

  condition(predicate: (...args: any[]) => boolean): this {
    this.ensureConfig().condition = predicate;
    return this;
  }

  keyGenerator(generator: (...args: any[]) => string): this {
    this.ensureConfig().keyGenerator = generator;
    return this;
  }

  and(): CacheConfigBuilder<T> {
    return this.parent;
  }

  build(): CacheConfig<T> {
    return this.parent.build();
  }

  private ensureConfig(): CacheMethodConfig {
    if (!this.parent['config'][this.methodName]) {
      this.parent.internal_setMethodConfig(this.methodName, { ttl: 60000 });
    }
    return this.parent['config'][this.methodName]!;
  }
}

/**
 * 创建缓存配置构建器
 */
export function cacheConfig<T>(): CacheConfigBuilder<T> {
  return new CacheConfigBuilder<T>();
}

/**
 * 预定义的常用缓存配置
 */
export const CachePresets = {
  /** 短期缓存 - 1分钟 */
  SHORT: { ttl: 60000 },
  
  /** 中期缓存 - 5分钟 */
  MEDIUM: { ttl: 300000 },
  
  /** 长期缓存 - 30分钟 */
  LONG: { ttl: 1800000 },
  
  /** 文件内容缓存 - 10分钟，排除临时文件 */
  FILE_CONTENT: {
    ttl: 600000,
    condition: (path: string) => !path.includes('.tmp') && !path.includes('temp')
  },
  
  /** 文件信息缓存 - 5分钟，自定义键生成 */
  FILE_INFO: {
    ttl: 300000,
    keyGenerator: (path: string) => `info:${path.replace(/[/\\]/g, '_')}`
  },
  
  /** 搜索结果缓存 - 2分钟，只缓存非空查询 */
  SEARCH: {
    ttl: 120000,
    condition: (query: string) => query.trim().length > 0
  }
} as const;

/**
 * 缓存统计和监控辅助类
 */
export class CacheMonitor {
  private methodStats = new Map<string, { calls: number; hits: number; misses: number }>();

  recordCall(methodName: string, isHit: boolean): void {
    const stats = this.methodStats.get(methodName) || { calls: 0, hits: 0, misses: 0 };
    stats.calls++;
    if (isHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    this.methodStats.set(methodName, stats);
  }

  getStats(methodName?: string) {
    if (methodName) {
      return this.methodStats.get(methodName) || { calls: 0, hits: 0, misses: 0 };
    }
    return Object.fromEntries(this.methodStats.entries());
  }

  getHitRate(methodName: string): number {
    const stats = this.methodStats.get(methodName);
    return stats && stats.calls > 0 ? stats.hits / stats.calls : 0;
  }

  reset(): void {
    this.methodStats.clear();
  }
}

/**
 * 缓存调试辅助类
 */
export class CacheDebugger {
  constructor(private enabled = false) {}

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  log(namespace: string, method: string, key: string, action: 'hit' | 'miss' | 'set'): void {
    if (this.enabled) {
      const timestamp = new Date().toISOString();
      console.log(`[Cache ${action.toUpperCase()}] ${timestamp} - ${namespace}.${method} - ${key}`);
    }
  }
}