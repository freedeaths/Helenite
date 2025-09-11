---
aliases:
  - helenite
  - design
tags:
  - helenite
uuid: 215e245b-8b86-43b8-9728-472b60e47711
---

# Helenite 服务架构概览
> 明确存在的服务有:
> - [x] 0 StorageService: filepath: str --> {filetype, raw cotent}
> - [x] 0 CacheService:
> - [x] 1 MetadataService: metadata.json raw content --> metaData
> - [x] 1 ExifService: raw binary(png, jpg/jpeg, web) --> ExifData (geolocation)
> - [] 2 SearchService: all raw contents & metaData --> searchResults
> - [x] 2 GraphService: metaData --> localGraph & globalGraph
> - [x] 2 TagService: tags.json raw content & metaData --> globalTags & localTags
> - [x] 2 FileTreeService: metaData --> fileTree
> - [] 2 FootprintsService: config.json raw content & .gpx/.kml raw content & ExifData (geolocation)--> FootPrints 
> - [] 2 FrontMatterService: metaData --> uuid (for comments)
> - [] 3 VaultService: organize 0-2 level services
> - [] 4 MarkdownRenderer{raw content}
>   - remark-frontmatter (去除 front matter 的渲染， metadata 里有相关信息) 
>   - remark-obsidian 有现成的 npm install @heavycircle/remark-obsidian，This plugin is best used with [remark-gfm](https://www.npmjs.com/package/remark-gfm), [rehype-raw](https://www.npmjs.com/package/rehype-raw), and [remark-wiki-link-plus](https://www.npmjs.com/package/remark-wiki-link-plus).
>   - remarkPlugins: mdast node --> new mdast node 识别 gpx/kml 内嵌
>   - rehypePlugins: hast node --> React component
> - [] 4 FootprintsRenderer{FootPrints}
> - [] 4 GraphRenderer{globalGraph/localGraph}
> - [] 4 FileTreeRenderer{fileTree}
> - [] 4 TagsRenderer
>  问题：
>  - AttachmentService 需要吗？
>  - Config 算是一个服务吗？
>  - 

## 服务分层架构（基于数字分层）

```
4️⃣ UI/Render Layer    - React 组件渲染层
   ↓
3️⃣ Coordination      - 业务协调层 (VaultService)
   ↓  
2️⃣ Domain Services   - 领域服务层
   ↓
1️⃣ Basic Services    - 基础服务层
   ↓
0️⃣ Infrastructure    - 基础设施层

⚡ 特殊架构: MarkdownRenderer (unified) 直接穿透到 MarkdownProcessor
+ VaultConfig: 配置管理器（非服务）
```

## 3️⃣ 协调层 (Coordination Layer)

### VaultService
**职责**: 统一业务接口协调器  
**提供**: 核心业务接口，跨服务协调  
**依赖**: 2层领域服务  
**接口示例**:
```typescript
// 基础数据获取
getFileTree(): Promise<FileTree[]>                   // 通过 FileTreeService
searchDocuments(query: string): Promise<SearchResult[]>  // 通过 SearchService
getGlobalGraph(): Promise<GraphData>                 // 通过 GraphService
getVaultInfo(): Promise<VaultInfo>                   // 通过 MetadataService
getFootprints(config: FootprintsConfig): Promise<UnifiedMapData>  // 通过 FootprintsService
getTags(): Promise<TagData[]>                        // 通过 TagService

// 注意: Markdown 渲染不经过 VaultService，直接穿透
```

## 2️⃣ 领域服务层 (Domain Services)

### SearchService
**职责**: 搜索和查询服务聚合器  
**提供**: 全文搜索、标签搜索、断链检测  
**依赖**: MetadataService(1层), StorageService(0层)  
**策略**: 智能搜索 (内容搜索 + 元数据搜索)

### GraphService  
**职责**: 知识图谱管理  
**提供**: 全局图谱、局部图谱、文档关系分析  
**依赖**: MetadataService(1层)  
**要求**: 严格依赖 metadata.json (复刻 PHP 版本逻辑)

### TagService
**职责**: 标签系统管理  
**提供**: 标签管理、标签统计、标签过滤  
**依赖**: MetadataService(1层)  
**数据源**: `/vaults/{vaultId}/.obsidian/plugins/metadata-extractor/tags.json`

### FileTreeService
**职责**: 文档树结构管理  
**提供**: 文件树构建、文件统计、目录导航  
**依赖**: MetadataService(1层)  
**降级策略**: metadata.json 不可用时回退到文件系统扫描

### FootprintsService
**职责**: 地图足迹数据聚合  
**提供**: GPX/KML解析、EXIF地理信息提取、足迹地图数据生成  
**依赖**: StorageService(0层)  
**特性**: 支持多种轨迹格式、图片地理信息、省市数据聚合

### FrontMatterService
**职责**: Frontmatter 数据提取  
**提供**: UUID 提取 (用于评论系统)、frontmatter 解析  
**依赖**: MetadataService(1层)  
**用途**: 为评论系统提供唯一标识

## 1️⃣ 基础服务层 (Basic Services)

### MetadataService
**职责**: Obsidian 元数据管理  
**提供**: metadata.json 访问、MD5 变更检测  
**依赖**: StorageService(0层), CacheService(0层)  
**数据源**: `/vaults/{vaultId}/.obsidian/plugins/metadata-extractor/metadata.json`

### ExifService
**职责**: 图片 EXIF 地理信息提取  
**提供**: GPS 坐标解析、时间戳提取、反地理编码  
**依赖**: StorageService(0层)  
**特性**: 支持 JPG、TIFF、RAW 格式的地理信息提取

## 0️⃣ 基础设施层 (Infrastructure Layer)

### StorageService 
**职责**: 存储抽象层  
**提供**: 文件读取、存在性检查、路径解析、MIME 检测  
**特性**: 支持本地文件、CDN、远程存储  
**依赖**: 无 (纯基础设施)
**注意**: 包含原 AttachmentService 的功能

### CacheService
**职责**: 统一缓存管理  
**提供**: LRU 缓存、MD5 变更检测、内存管理  
**特性**: 多种缓存类型 (content, computed, metadata)  
**依赖**: 无 (纯基础设施)

## 📁 配置管理器 (非服务)

### VaultConfig
**职责**: 配置管理器  
**提供**: 多 Vault 配置、路径解析、环境变量  
**特性**: 支持 `/vaults/{vaultId}` 多 Vault 架构  
**依赖**: 无 (静态配置)


## 📊 服务统计

### 按分层统计
| 层级 | 服务数量 | 主要职责 |
|------|----------|----------|
| 4️⃣ UI/渲染层 | 5 | React 组件渲染 |
| 3️⃣ 协调层 | 1 | 业务协调 (VaultService) |
| 2️⃣ 领域服务层 | 6 | 核心业务逻辑 |
| 1️⃣ 基础服务层 | 2 | 基础业务服务 |
| 0️⃣ 基础设施层 | 2 | 技术支撑 |
| 📁 配置管理器 | 1 | 静态配置 (非服务) |
| **总计** | **11个服务 + 1个配置管理器** | **简洁高效** |

### 服务依赖层级 (单向依赖)
| 层级 | 服务列表 | 依赖关系 |
|------|----------|----------|
| **4️⃣** UI/渲染层 | `MarkdownRenderer`⚡, `FileTreeRenderer`, `GraphRenderer`, `FootprintsRenderer`, `TagsRenderer` | 部分依赖协调器，部分直接穿透 |
| **3️⃣** 协调层 | `VaultService` | 依赖2层服务 |
| **2️⃣** 领域服务层 | `SearchService`, `GraphService`, `TagService`, `FileTreeService`, `FootprintsService`, `FrontMatterService` | 依赖0-1层 |
| **1️⃣** 基础服务层 | `MetadataService`, `ExifService` | 仅依赖0层 |
| **0️⃣** 基础设施层 | `StorageService`, `CacheService` | 无依赖 |
| **📁** 配置管理器 | `VaultConfig` | 静态配置 |

### 单向依赖原则
```
4️⃣ UI渲染层:
   ├─→ MarkdownRenderer ⚡ 直接穿透 ──→ remark-frontmatter + @heavycircle/remark-obsidian
   ├─→ FileTreeRenderer ──→ VaultService ──→ FileTreeService
   ├─→ GraphRenderer ──→ VaultService ──→ GraphService
   ├─→ FootprintsRenderer ──→ VaultService ──→ FootprintsService
   └─→ TagsRenderer ──→ VaultService ──→ TagService

3️⃣ VaultService ──→ 协调2层服务:
   ├─→ SearchService, GraphService, TagService, FileTreeService
   ├─→ FootprintsService, FrontMatterService
   └─→ MetadataService (1层)

2️⃣ 领域服务层:
   ├─→ SearchService ──→ MetadataService(1层) + StorageService(0层)
   ├─→ GraphService ──→ MetadataService(1层)
   ├─→ TagService ──→ MetadataService(1层)
   ├─→ FileTreeService ──→ MetadataService(1层)
   ├─→ FootprintsService ──→ StorageService(0层) + ExifService(1层)
   └─→ FrontMatterService ──→ MetadataService(1层)

1️⃣ 基础服务层:
   ├─→ MetadataService ──→ StorageService(0层) + CacheService(0层)
   └─→ ExifService ──→ StorageService(0层)

0️⃣ 基础设施层 ──→ 无依赖
📁 VaultConfig ──→ 静态配置
```

### 🎯 核心功能映射
- **Markdown 文档处理**: MarkdownRenderer ⚡ 直接穿透 → remark-frontmatter + @heavycircle/remark-obsidian
- **地图足迹**: FootprintsRenderer → VaultService → FootprintsService
- **知识图谱**: GraphRenderer → VaultService → GraphService  
- **搜索功能**: SearchComponent → VaultService → SearchService
- **文件树**: FileTreeRenderer → VaultService → FileTreeService
- **标签管理**: TagsRenderer → VaultService → TagService

## 4️⃣ UI/渲染层 (UI/Render Layer)

### MarkdownRenderer ⚡
**职责**: Markdown 文档渲染 (直接穿透架构)  
**提供**: remark-frontmatter + @heavycircle/remark-obsidian 处理  
**依赖**: 直接使用 unified 插件，不经过服务层  
**特性**: frontmatter 自动隐藏，Obsidian 语法支持

### FileTreeRenderer
**职责**: 文件树UI渲染  
**提供**: 目录结构展示、文件导航、交互响应  
**依赖**: FileTreeService (通过 VaultService)  
**特性**: 支持懒加载、虚拟滚动、搜索过滤

### GraphRenderer
**职责**: 知识图谱可视化渲染  
**提供**: D3.js 图谱展示、节点交互、缩放平移  
**依赖**: GraphService (通过 VaultService)  
**特性**: 力导向布局、实时更新、性能优化

### FootprintsRenderer
**职责**: 地图足迹渲染  
**提供**: Leaflet 地图、轨迹展示、地理信息可视化  
**依赖**: FootprintsService (通过 VaultService)  
**特性**: GPX/KML 支持、EXIF 地理信息、省市聚合

### TagsRenderer
**职责**: 标签系统UI渲染  
**提供**: 标签云、标签过滤、标签统计  
**依赖**: TagService (通过 VaultService)  
**特性**: 交互式标签管理、搜索集成

## 🔄 服务生命周期

### 初始化顺序
```typescript
// 按依赖层级顺序初始化 (0层→4层)

// 📁 配置管理器 + 0️⃣层: 基础设施 (并行启动)
1. VaultConfig.load() + StorageService.setup() + CacheService.initialize()

// 1️⃣层: 基础服务 (依赖0层)
2. MetadataService.initialize() + ExifService.initialize()

// 2️⃣层: 领域服务 (依赖0-1层)
3. SearchService.setup() + GraphService.initialize() + TagService.initialize() + 
   FileTreeService.initialize() + FootprintsService.setup() + FrontMatterService.initialize()

// 3️⃣层: 协调器 (依赖2层服务)
4. VaultService.coordinate()

// 4️⃣层: UI/渲染层 (部分依赖协调器，部分直接穿透)
5. UI组件初始化:
   - MarkdownRenderer ⚡ 直接使用 remark-frontmatter + @heavycircle/remark-obsidian
   - FileTreeRenderer, GraphRenderer, FootprintsRenderer, TagsRenderer 通过 VaultService
```

### 销毁顺序
```typescript
// 按依赖关系逆序销毁，确保无资源泄漏
4️⃣ UI组件 → 3️⃣ VaultService → 2️⃣ 领域服务层 → 1️⃣ 基础服务层 → 0️⃣ 基础设施层
```

## 🚀 性能考虑

### 服务启动优化
- **并行初始化**: 无依赖的服务可以并行启动
- **延迟加载**: GraphService 和 SearchService 可以按需初始化
- **缓存预热**: 关键元数据可以在启动时预加载

### 运行时优化
- **服务复用**: 单例模式，避免重复实例化
- **智能缓存**: 跨服务共享缓存实例
- **批量操作**: 相关操作合并为批量请求

## 📚 相关文档

### 当前可用
- [[map-and-tracks-analysis]] - 地图和轨迹系统分析与设计
- [[markdown-and-plugins]] - Markdown 渲染和插件系统

### 计划中的文档 
- [[服务依赖关系详解]] - 详细依赖图和数据流 *(待完善)*
- [[DDD 领域边界分析]] - 领域驱动设计分析 *(待完善)*
- [[服务架构设计]] - 具体接口和实现设计 *(待完善)*
- [[地理数据抽象]] - 统一地图组件共享设计 *(待完善)*
- [[Markdown 插件架构]] - 插件化设计 *(待完善)*
- [[块级插件系统]] - 渲染流程设计 *(待完善)*

## 🔍 快速查找

### 我需要... → 使用哪个服务
- **渲染 Markdown 文档** → `remark-frontmatter` + `@heavycircle/remark-obsidian` (直接)
- **获取文档元数据** → `MetadataService.getFileMetadata()`
- **获取文件列表** → `FileTreeService.getFileTree()`  
- **搜索内容** → `SearchService.searchDocuments()`
- **查看知识图谱** → `GraphService.getGlobalGraph()`
- **管理标签** → `TagService.getTags()`
- **处理地图轨迹** → `FootprintsService.parseGPXFile()`
- **提取照片地理信息** → `ExifService.extractGeoData()`
- **提取 frontmatter UUID** → `FrontMatterService.extractUUID()`
- **统一业务操作** → `VaultService.*` (推荐)

### 服务状态检查
```typescript
// 检查服务健康状态
const health = await vaultService.healthCheck();
console.log('可用功能:', health.availableFeatures);
console.log('服务状态:', health.serviceStatus);
```

---

## 💡 架构决策总结

### ✅ 采纳的设计决策
1. **AttachmentService 合并到 StorageService** - 避免过度抽象，职责合并更合理
2. **VaultConfig 作为配置管理器** - 静态配置不需要服务化，简化架构
3. **数字分层系统 (0-4层)** - 清晰的依赖关系，数字越小越基础
4. **MarkdownRenderer 直接穿透** - 使用 remark-frontmatter 等专业插件，不经过服务层
5. **11个服务 + 1个配置管理器** - 精简高效，避免过度工程化

### 🎯 关键架构原则
- **单向依赖**: 高层依赖低层，低层不依赖高层
- **分层清晰**: 每层职责明确，接口稳定
- **职责单一**: 每个服务专注一个领域
- **可测试性优先**: 依赖注入，便于单元测试
- **简洁实用**: 避免为了架构而架构，实用至上