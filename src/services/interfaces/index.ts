/**
 * 统一的服务接口导出
 *
 * 提供所有服务接口的统一导入入口
 */

// 核心服务接口
// export type { IVaultService } from './IVaultService';
// export type { IDocumentService } from './IDocumentService';
// export type { IFileService } from './IFileService';

// 专业领域服务接口
// export type { ISearchService } from './ISearchService';
// export type { ITagService } from './ITagService';
// export type { IRenderingService } from './IRenderingService';

// 基础设施服务接口
// export type { ICacheService } from './ICacheService';
export type { IStorageService } from './IStorageService';

// 服务容器和依赖注入
// export { ServiceContainer, serviceContainer, ServiceIdentifiers } from '../ServiceContainer';

// 类型定义
export * from '../types';