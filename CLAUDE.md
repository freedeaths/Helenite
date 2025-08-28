# Perlite React 重构项目开发指南

## 项目概述

将现有的 PHP 版本 Perlite 重构为现代化的 React 应用，提供类 Obsidian 的原生体验，只读不写。

## ✅ 已完成 - Phase 1: 响应式布局系统

- **响应式布局**: 桌面端四列、平板端三列、移动端单列 + 抽屉
- **拖拽调整**: 侧边栏宽度调整，性能优化
- **主题系统**: Obsidian 主题兼容，CSS 变量系统
- **组件架构**: Ribbon + 左侧栏 + 主内容 + 右侧栏 + 状态栏

## 📁 项目结构
```
react_impl/perlite-react/src/
├── apis/                      # 🆕 API 接口层
│   ├── interfaces/            # ✅ 接口定义（已完成）
│   │   ├── IFileTreeAPI.ts   # 文件树操作
│   │   ├── IGraphAPI.ts      # 图谱数据  
│   │   ├── IFileAPI.ts       # 单文件操作
│   │   ├── ISearchAPI.ts     # 搜索功能
│   │   └── ITagAPI.ts        # 标签管理
│   └── implementations/       # 🔄 具体实现（进行中）
│       ├── local/            # 基于 metadata.json
│       └── mock/             # Mock 数据
├── components/
│   ├── Layout/               # ✅ 布局组件（已完成）
│   ├── FileExplorer/         # 文件浏览功能
│   ├── MarkdownViewer/       # ✅ Markdown 渲染（已完成）
│   └── Graph/                # 图谱可视化
├── stores/
│   ├── uiStore.ts           # ✅ UI 状态（已完成）
│   └── vaultStore.ts        # 数据状态
└── services/
    └── markdownProcessor.ts  # ✅ Markdown 处理（已完成）
```

## 🔍 Perlite PHP 实现分析与 API 接口设计

### 核心发现

通过分析 Perlite PHP 版本的实现，发现了以下关键技术细节：

#### 1. 文件树生成 (`helper.php:188-263`)
**实现方式**: 直接文件系统解析，使用 `glob()` 和递归目录遍历
```php
function menu($dir, $folder = '') {
    $files = glob($dir . '/*');           // 获取目录下所有文件
    usort($files, "cmp");                 // 自定义排序(下划线优先)
    
    foreach ($files as $file) {
        if (is_dir($file)) {
            if (isValidFolder($file)) {   // 过滤隐藏文件夹
                // 递归处理子文件夹 + 生成 HTML
                $html .= menu($file, $folder . '/');
            }
        } else if (isMDFile($file)) {     // 只处理 .md 文件
            // 生成文件链接 HTML
        }
    }
}
```

#### 2. 图谱数据生成 (`helper.php:451-632`) 
**实现方式**: 依赖 Obsidian 的 `metadata.json` 文件
```php
function getfullGraph($rootDir) {
    $jsonMetadaFile = $rootDir . '/metadata.json';    // 必须存在
    $jsonData = file_get_contents($jsonMetadaFile);   // 读取 Obsidian 元数据
    $json_obj = json_decode($jsonData, true);
    
    // 从 metadata.json 提取:
    // - 文件节点 (fileName, relativePath)
    // - 标签节点 (tags 数组)
    // - 链接关系 (links 数组)
}
```

#### 3. 数据源优先级
1. **图谱关系**: 100% 依赖 `metadata.json`（Obsidian 生成）
2. **文件树**: 直接文件系统解析，不依赖 Obsidian 配置
3. **搜索**: 混合模式，标签搜索需要 metadata.json，全文搜索直接读文件
4. **TOC**: 从 metadata.json 的 `headings` 字段提取

#### 4. 已有 React 实现状态
**惊喜发现**: React 版本的 Markdown 渲染已经相当完整
- **位置**: `src/components/MarkdownViewer/` + `src/services/markdownProcessor.ts`
- **功能**: 完整的 unified 处理流水线，支持 Obsidian 语法
- **特性**: 内部链接、标签、高亮、数学公式、Mermaid 图表、GPX/KML 地图

### API 接口架构设计

基于分析结果，设计如下清晰的接口层次结构：

#### 文件系统架构
```
src/
├── apis/                           # 🆕 统一 API 接口层
│   ├── interfaces/                 # API 接口定义
│   │   ├── IVaultAPI.ts           # Vault 操作接口
│   │   ├── IFileAPI.ts            # 文件操作接口
│   │   ├── ISearchAPI.ts          # 搜索操作接口
│   │   └── IGraphAPI.ts           # 图谱操作接口
│   ├── implementations/            # 接口实现
│   │   ├── ObsidianAPI.ts         # 基于 Obsidian metadata.json
│   │   ├── FileSystemAPI.ts       # 基于直接文件系统解析
│   │   ├── MockAPI.ts             # 模拟数据实现
│   │   └── OpenAPI.ts             # 未来 OpenAPI 后端实现
│   └── factory/
│       └── APIFactory.ts          # API 实现工厂
├── components/ (现有结构保持不变)
├── services/
│   └── markdownProcessor.ts       # ✅ 已完整实现
└── stores/ (现有结构保持不变)
```

#### 核心接口定义
```typescript
// src/apis/interfaces/IVaultAPI.ts
export interface IVaultAPI {
  // 基础 Vault 信息
  getVaultInfo(): Promise<VaultInfo>;
  
  // 文件系统
  getFileTree(): Promise<FileTree[]>;
  getFileContent(path: string): Promise<string>;
  getFileMetadata(path: string): Promise<FileMetadata>;
  
  // 图谱数据
  getGraphData(): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }>;
  getLocalGraphData(filePath: string): Promise<{ nodes: GraphNode[], edges: GraphEdge[] }>;
  
  // 搜索功能
  searchFiles(query: string): Promise<SearchResult[]>;
  searchByTag(tag: string): Promise<SearchResult[]>;
  
  // TOC 和标签
  extractTOC(content: string): Promise<TOCItem[]>;
  getAllTags(): Promise<TagData[]>;
}

// src/apis/interfaces/types.ts
export interface VaultInfo {
  name: string;
  path: string;
  hasMetadata: boolean;        // 是否存在 metadata.json
  obsidianConfig?: ObsidianConfig;
}

export interface FileTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTree[];
  metadata?: FileMetadata;
}

export interface FileMetadata {
  title?: string;
  tags?: string[];
  aliases?: string[];
  frontmatter?: Record<string, any>;
  headings?: HeadingData[];
  links?: LinkData[];
  backlinks?: LinkData[];
}
```

#### 实现策略设计
```typescript
// src/apis/implementations/ObsidianAPI.ts - 优先实现
export class ObsidianAPI implements IVaultAPI {
  constructor(private baseUrl: string) {}
  
  async getFileTree(): Promise<FileTree[]> {
    // 1. 优先尝试从 metadata.json 构建文件树
    // 2. 降级到直接 glob() 文件系统解析
    const metadata = await this.getMetadata();
    return metadata ? this.buildTreeFromMetadata(metadata) : this.buildTreeFromFS();
  }
  
  async getGraphData(): Promise<{nodes: GraphNode[], edges: GraphEdge[]}> {
    // 严格依赖 metadata.json，复刻 PHP 逻辑
    const metadata = await this.getMetadata();
    if (!metadata) throw new Error('Graph requires metadata.json');
    return this.buildGraphFromMetadata(metadata);
  }
  
  async searchByTag(tag: string): Promise<SearchResult[]> {
    // 依赖 metadata.json 中的 tags 字段
    const metadata = await this.getMetadata();
    return this.searchMetadataTags(metadata, tag);
  }
  
  private async getMetadata(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/metadata.json`);
      return response.ok ? response.json() : null;
    } catch {
      return null; // 优雅降级
    }
  }
}

// src/apis/implementations/FileSystemAPI.ts - 降级实现
export class FileSystemAPI implements IVaultAPI {
  // 当 metadata.json 不存在时的纯文件系统实现
  // 复刻 PHP menu() 函数逻辑
}

// src/apis/factory/APIFactory.ts - 智能选择
export class APIFactory {
  static async createAPI(baseUrl: string): Promise<IVaultAPI> {
    // 检测可用的数据源，智能选择最佳实现
    const hasMetadata = await this.checkMetadata(baseUrl);
    
    if (hasMetadata) {
      console.log('✅ 检测到 metadata.json，使用 Obsidian 增强模式');
      return new ObsidianAPI(baseUrl);
    } else {
      console.log('⚠️  未发现 metadata.json，使用文件系统解析模式');
      return new FileSystemAPI(baseUrl);
    }
  }
}
```

#### 组件集成示例
```typescript
// src/stores/vaultStore.ts - 更新后的 Store
interface VaultState {
  api: IVaultAPI | null;
  // ... 现有状态保持不变
  
  // Actions
  initializeAPI: (baseUrl: string) => Promise<void>;
  // ... 其他 actions 使用 this.api 调用接口
}

export const useVaultStore = create<VaultState>((set, get) => ({
  api: null,
  
  initializeAPI: async (baseUrl: string) => {
    const api = await APIFactory.createAPI(baseUrl);
    set({ api });
    
    // 自动加载基础数据
    const files = await api.getFileTree();
    const vaultInfo = await api.getVaultInfo();
    set({ files, vaultInfo });
  },
  
  loadGraphData: async () => {
    const { api } = get();
    if (!api) return;
    
    try {
      const { nodes, edges } = await api.getGraphData();
      set({ graphNodes: nodes, graphEdges: edges });
    } catch (error) {
      console.warn('图谱功能需要 metadata.json 支持');
    }
  }
}));
```

### 实施优先级

#### Phase 2A: 核心 API 接口实现 (🔥 高优先级)
- [ ] 创建 API 接口定义 (`src/apis/interfaces/`)
- [ ] 实现 ObsidianAPI 类（基于现有 `public/vault/Publish/metadata.json`）
- [ ] 实现 FileSystemAPI 类（复刻 PHP `menu()` 函数逻辑）
- [ ] 创建 APIFactory 智能选择机制
- [ ] 更新 vaultStore 使用新的 API 层

#### Phase 2B: 组件连接 (🔥 高优先级)  
- [ ] 更新 FileTree 组件使用新 API
- [ ] 实现 Search 组件的标签搜索功能
- [ ] 连接 Graph 组件到 ObsidianAPI
- [ ] 验证 TOC 提取功能

### 🎯 当前进度 - Phase 2: API 接口层实现

**实施策略**: 按功能领域逐个实现，每个 API 可独立开发和测试

**优先级**: 文件树 → 图谱 → 搜索 → 标签 → 单文件操作

### 🐛 已解决的关键问题

1. **拖拽手柄定位错误**: 修复了 Tailwind CSS `top-0 bottom-0` 被错误解析的问题
2. **移动端抽屉方向错误**: 解决了 CSS 类冲突，使用内联样式确保正确定位  
3. **拖拽性能滞后**: 通过缓存 DOM 查询和移除 CSS 过渡动画大幅提升流畅度
4. **Obsidian 主题兼容**: 确保第三方主题 CSS 不干扰拖拽功能
5. **响应式断点处理**: 正确的 `isMobile`/`isTablet` 状态管理

### 🚀 性能优化成果
- **拖拽流畅度**: 达到原生应用级别的响应速度
- **内存使用**: 高效的事件监听器管理，避免内存泄漏
- **渲染性能**: 合理的 React re-render 控制，减少不必要更新

---

## 🤖 AI 协作规则

### Critical Thinking 原则
1. **保持独立思考**：不要盲目迎合用户，但也不要自说自话
2. **有分歧时先讨论**：如果对用户需求有不同理解或更好的建议，先提出来讨论，达成一致后再实施
3. **承认错误**：如果理解偏差或实现错误，要主动承认并寻求澄清
4. **确认需求**：对于复杂的架构改动，先确认用户的具体意图和预期效果

### 禁止行为
- ❌ 在没有讨论的情况下按自己的理解随意更改用户明确的要求
- ❌ 为了显得"聪明"而过度工程化
- ❌ 不理解用户意图就开始编码
- ❌ **声称任务完成时没有提供客观证据**：必须提供浏览器截图、控制台无错误、或明确的功能演示
- ❌ **错误的 git add 操作**：只能 add `react_impl/perlite-react/` 和 `CLAUDE.md`，绝对不要 `git add .`

### 推荐流程
1. 理解需求 → 2. 提出疑问/建议 → 3. 讨论达成一致 → 4. 实施 → 5. 验证结果

---

## 🎨 设计原则与最佳实践

### CSS 单位选择策略

#### 核心原则
1. **优先使用 `rem`** - 用于尺寸、间距、字体大小
   - **原因**: 可访问性优先，尊重用户浏览器字体设置
   - **场景**: `padding`, `margin`, `width`, `height`, `font-size`

2. **微小尺寸使用 `px`** - 用于边框、阴影等固定视觉元素
   - **原因**: 视觉稳定性，避免过度缩放破坏设计
   - **场景**: `border-width`, `box-shadow`, `outline`

3. **62.5% 技巧简化计算**
   ```css  
   html { font-size: 62.5%; } /* 10px = 1rem */
   body { font-size: 1.6rem; } /* 16px */
   ```

4. **特定比例使用 `em`** - 用于与当前字体相关的缩放
   - **场景**: 按钮内边距、文字相关模块

### 响应式布局设计原则

#### 五大核心原则
1. **内容优先，布局其次**
   - 中间栏宽度由阅读体验决定，不是剩余空间
   - 最佳阅读宽度：700-1200px（45-75个字符/行）

2. **移动优先的思维**
   - 从最小屏幕开始设计，逐步增强到大屏幕
   - 优先考虑最重要的内容（主内容区）

3. **保持稳定的核心阅读区**
   - **侧边栏固定宽度**：左栏250-400px，右栏250-350px
   - **间距稳定**：使用固定的`gap`或`padding`（如1.6rem）
   - **比例不变**：避免断点间剧烈的宽度变化

4. **优雅的降级与渐进增强**
   - HTML结构按重要性排序：主内容 → 左侧栏 → 右侧栏
   - 技术选择：优先 CSS Flex，必要时使用 Grid

5. **一致的交互模式**
   - 移动端抽屉式侧边栏
   - 平板端简化布局（隐藏右侧栏）
   - 桌面端完整三栏布局

#### 推荐断点策略
```typescript
BREAKPOINTS = {
  mobile: '<768px',    // 单栏 + 抽屉
  tablet: '768-1024px', // 双栏（左侧栏 + 主内容）
  desktop: '≥1024px'   // 三栏完整布局
}

CONSTRAINTS = {
  totalMaxWidth: 1600,
  leftSidebar: { min: 250, preferred: 320, max: 400 },
  mainContent: { min: 700, preferred: 900, max: 1200 },
  rightSidebar: { min: 250, preferred: 280, max: 350 }
}
```

---

## 📋 TODO & Bug 跟踪

> **使用说明**: 这个区域用于记录发现的问题、新想法和待实现功能。
> 用标记 `[ ]` 表示待办，`[x]` 表示已完成，`[!]` 表示紧急。

### 🐛 已知问题
- [ ] 外部 GPX/KML 文件路径解析问题 - `@Publish/Attachments/` 路径无法正确加载文件
- [ ] 非标准 Obsidian 文件链接语法 - 应该用 `![[file.gpx]]` 而不是 ```gpx:file```
- [ ] **内容超出窗口边界问题** - 长链接和宽表格未受宽度限制，破坏布局
  - 长链接不会自动折行
  - 宽表格超出容器边界，没有横向滚动
  - 表格字号与正文相同，未优化
  - 内容可能影响 TOC 定位准确性
  - 1. 所有内容都不应该超出窗口,包括长 Link 和宽表格等
  - 2. 长 link 折行
  - 3. 宽表在容器宽度内可以左右滑,表的列对齐,列宽适应单元格内容,表字号比正文小一号
  - 4. 不能破坏 TOC 的定位
  - 5. 这一轮的修复思路是对的,你要把浏览器宽度, @react_impl/perlite-react/src/components/Layout/MainContent.tsx 宽度， @react_impl/perlite-react/src/components/MarkdownViewer/MarkdownViewer.tsx 宽度, markdown 各插件的宽度在合理的地方处理它们
- [ ] **TOC定位不准的问题**
  - 我回退以后，在 9eb9cb637e66bb429c01d6627ef4365e67d8d7b0 这个 commit 发现了定位不准的问题，所以它不是新引入的问题，而是之前没有测试到的 Bug，具体的 http://localhost:5173/#/Trips/Plans/春岚樱语——北九州初体验.md 你在移动端反复多跳几个标题就会发现了，特别是下面的一些标题

### 💡 功能想法  
- [ ] 锚点 & 路由
- [ ] CDN 友好
- [ ] SEO 友好
- [ ] 实现标准 Obsidian 文件链接语法解析（![[file.gpx]] 替代 ```gpx:file```）
- [ ] 根据文件扩展名自动选择渲染组件（.gpx/.kml → 地图组件）

### 🔧 优化项目
- [ ] Markdown 处理器 Obsidian 兼容性优化
- [ ] 文件路径解析逻辑统一化
- [ ] **搜索性能优化**：考虑替换手工正则表达式为专业搜索库
  - 当前实现：手工正则 `/^.*${pattern}.*$/gmi` + 文件遍历
  - 性能问题：每次搜索加载所有文件内容，大文件集合下性能一般
  - 可选方案：
    - **Fuse.js** (9KB) - 模糊搜索，支持权重和排序
    - **Lunr.js** (25KB) - 全文搜索引擎，支持倒排索引
    - **FlexSearch** (12KB) - 高性能内存搜索
    - **MiniSearch** (15KB) - 轻量级搜索，内存友好

### 📋 Phase 2A: 核心 API 接口实现 ✅ 已完成
- [x] 创建 API 接口定义目录结构 (`src/apis/interfaces/`)
- [x] 实现 `IFileTreeAPI.ts` 文件树接口定义（替代原 IVaultAPI）
- [x] 实现 `IGraphAPI.ts` 图谱接口定义
- [x] 实现 `IFileAPI.ts` 文件内容接口定义
- [x] 实现 `LocalFileTreeAPI.ts` 类（基于 metadata.json，复刻 PHP menu() 逻辑）
- [x] 实现 `LocalGraphAPI.ts` 类（复刻 PHP getfullGraph() 逻辑）
- [x] 实现 `LocalFileAPI.ts` 类（单文件内容加载）
- [x] 实现 `MockFileTreeAPI.ts` 和 `MockFileAPI.ts` 测试用实现
- [x] 创建简化 API 配置切换机制（去除 APIFactory，直接配置）
- [x] 实现 `useFileTreeAPI`、`useGraphAPI`、`useFileAPI` Hooks
- [x] 验证 metadata.json 文件访问和解析功能
- [x] 实现文件树构建逻辑（PHP 风格排序：下划线优先）
- [x] 实现图谱数据生成（16个节点，11条边，验证成功）
- [x] 实现文件内容加载和 Markdown 处理

### 📋 Phase 2B: 组件连接和集成 ✅ 已完成
- [x] 更新 `FileTree` 组件使用新 API 接口
- [x] 连接 `Graph` 组件到 LocalGraphAPI 数据源
- [x] 集成 `MarkdownViewer` 和新的 FileAPI 层
- [x] 验证所有功能在现有 `public/vault/Publish/` 测试数据下的工作状态
- [x] 创建综合测试用 Welcome.md（包含所有 markdown 特性）
- [x] 实现 Mock API 分离，移除组件中的内联 mock 内容

### 📋 Phase 2C: 搜索和标签 API ✅ 已完成
- [x] 实现 `ISearchAPI.ts` 接口定义
- [x] 实现 `ITagAPI.ts` 接口定义 
- [x] 实现 `LocalSearchAPI.ts`（基于 metadata.json 全文搜索）
- [x] 实现 `LocalTagAPI.ts`（基于 metadata.json tags 字段）
- [x] 更新 `FileExplorer` 组件集成搜索功能（在 Files tab 内）
- [x] 复刻 PHP 版本搜索逻辑：正则表达式匹配、高亮显示、标签搜索
- [x] 验证搜索功能：文本搜索 + 标签搜索（#标签）均工作正常 

### ⚙️ 可调参数位置
- **响应式防抖延迟**: `/src/components/Layout/AppLayout.tsx:50` - 当前50ms，可调节范围20-100ms
- **侧边栏宽度约束**: `/src/stores/uiStore.ts:66,71` - 当前200-600px范围
- **CSS 过渡动画时长**: `/src/index.css:103` - 当前300ms

### ✅ 已完成
- [x] 桌面端四列响应式布局实现
- [x] 拖拽调整侧边栏宽度功能
- [x] 移动端抽屉式交互
- [x] 性能优化：缓存DOM查询，移除CSS过渡
- [x] Grid 布局系统优化为 Flex 布局架构
- [x] 响应式断点防抖优化 (50ms 延迟，更响应)
- [x] CSS 过渡动画性能优化 (GPU 硬件加速)
- [x] 添加专用 CSS 类简化组件复杂度
- [x] 正文内容最大宽度约束 (桌面 max-w-4xl = 896px，移动端全宽)
- [x] 修复移动端切平板时左栏宽度变化异常
- [x] 统一侧边栏宽度单位 (rem → px) 避免响应式切换跳跃
- [x] 添加设备类型切换时的宽度同步逻辑
- [x] 修复正文最大宽度约束 - 移除 max-w-none 覆盖，使用 flex + max-w-4xl
- [x] 移除顶部 Perlite header 标题栏
- [x] 添加三栏之间的间距 (gap-4 = 1rem) 并移除边框

---

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI 组件库**: Mantine UI 7
- **样式**: Tailwind CSS (用于覆写和自定义样式)
- **状态管理**: Zustand
- **路由**: React Router 6
- **Markdown 处理**: unified + remark + rehype 生态
- **图谱可视化**: d3-force
- **数学公式**: KaTeX
- **代码高亮**: highlight.js
- **图表**: Mermaid

## 技术栈

- **前端**: React 18 + TypeScript + Vite 5
- **UI**: Mantine UI 7 + Tailwind CSS  
- **状态**: Zustand + React Router 6
- **Markdown**: unified + remark + rehype 生态
- **图谱**: d3-force + Mermaid
- **数学**: KaTeX + highlight.js

## 开发规范

### 代码风格
- 使用 TypeScript 严格模式  
- 组件使用函数式组件 + Hooks
- 状态管理优先使用 Zustand
- 样式使用 Tailwind CSS + Mantine 组件
- 导入顺序：React -> 第三方库-> 内部模块

### 文件命名
- 组件文件：PascalCase (如 `FileTree.tsx`)
- 工具函数：camelCase (如 `pathUtils.ts`)
- 类型定义：camelCase (如 `vault.ts`)
- 常量：UPPER_SNAKE_CASE

### 类型定义
```typescript
// src/types/vault.ts
export interface FileTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTree[];
  metadata?: FileMetadata;
}

export interface FileMetadata {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string;
  modified?: string;
  links?: string[];
  backlinks?: string[];
}

export interface SearchResult {
  file: string;
  matches: Array<{
    line: number;
    content: string;
    highlighted: string;
  }>;
}
```

## 静态资源架构设计

### Vault 文件访问策略
React 版本采用纯静态文件访问，无需后端 API，遵循 Perlite PHP 版本的设计理念：

```typescript
// 环境配置
interface VaultConfig {
  VAULT_BASE_URL: string;    // '/vault' | 'https://cdn.example.com/vault'
  VAULT_PATH?: string;       // 构建时使用的本地路径
}
```

### 部署方案

#### 开发环境
```bash
# 已实现：直接复制到 public 目录
# react_impl/perlite-react/public/Publish/ (支持 OneDrive 同步)
# 无需 Vite 中间件，直接通过 /Publish 访问
```

#### 生产环境 - Caddy + Docker 映射 (推荐)
```dockerfile
# Dockerfile (React 应用)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM caddy:alpine
COPY --from=builder /app/dist /usr/share/caddy
COPY Caddyfile /etc/caddy/Caddyfile

# Caddyfile
yourdomain.com {
    # React 应用静态资源
    root * /usr/share/caddy
    
    # Vault 文件直接服务 (支持 OneDrive 实时同步)
    handle_path /Publish/* {
        root * /vault
        file_server {
            precompressed gzip br
        }
    }
    
    # CDN 友好的缓存头
    @markdown path *.md
    header @markdown {
        Cache-Control "public, max-age=3600, s-maxage=86400"
        Content-Type "text/plain; charset=utf-8"
    }
    
    @obsidian path /.obsidian/*
    header @obsidian Cache-Control "public, max-age=86400"
    
    try_files {path} /index.html
}

# docker-compose.yml
services:
  perlite-react:
    build: .
    volumes:
      # OneDrive 实时同步支持
      - /host/onedrive/obsidian/vault:/vault:ro
    ports:
      - "80:80"
      - "443:443"
```

#### CDN 友好架构
```
[OneDrive] → [Server/Caddy] → [CDN Edge] → [User]
    ↓             ↓              ↓
  实时同步     直接文件服务    智能缓存+压缩
```

**Caddy 优势:**
- ✅ Markdown 原始格式，前端动态渲染  
- ✅ 自动 Gzip/Brotli 压缩
- ✅ 智能缓存策略（.md 1小时，.obsidian 1天）
- ✅ OneDrive 实时同步，无需重启
- ✅ CDN 边缘缓存，全球加速
- ✅ 自动 HTTPS + 简化配置

#### 备选方案 - Nginx + Docker
```dockerfile
# 如果偏好 Nginx
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# docker-compose.yml
services:
  perlite-react:
    volumes:
      - /host/obsidian/vault:/usr/share/nginx/html/Publish:ro
```

### 文件访问模式
```typescript
// 静态文件直接访问，类似 Perlite PHP 版本
class VaultFileService {
  private baseUrl = __VAULT_BASE_URL__;
  
  async getFileContent(path: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}${path}`);
    return response.text();
  }
  
  async getMetadata(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/metadata.json`);
    return response.json();
  }
}
```

## 开发命令

```bash
# 开发服务器
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 格式化代码
npm run format

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 调试工具

### Playwright MCP
项目已集成 Playwright MCP，可用于前端调试和自动化测试：

- 使用 `mcp__playwright__browser_navigate` 导航到页面
- 使用 `mcp__playwright__browser_snapshot` 获取页面快照
- 使用 `mcp__playwright__browser_click` 模拟用户交互
- 使用 `mcp__playwright__browser_take_screenshot` 截图调试

这些工具特别适用于：
- 调试响应式布局问题
- 验证用户交互流程
- 自动化UI测试
- 页面性能分析

#### ⚠️ Playwright MCP 已知限制
**当前在 Claude Code 中存在响应大小限制问题**：
- 长页面经常超出 token 限制
- 错误信息：`Large MCP response (~241.8k tokens), this can fill up context`
- **解决方案**：
  - 将长页面分段测试，避免一次性加载完整页面
  - 对于复杂页面，使用具体元素定位而非全页面快照

## 测试策略

### 单元测试
- 使用 Vitest + React Testing Library
- 重点测试工具函数和服务层
- 组件测试专注于用户交互

### 集成测试
- 测试完整的用户流程
- 文件导航 -> 搜索 -> 内容查看

### E2E 测试
- 使用 Playwright
- 测试关键路径和响应式布局

## 部署配置

### Docker 配置
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

### PWA 配置
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'Perlite',
        short_name: 'Perlite',
        description: 'Modern Obsidian Vault Viewer',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

## 性能优化要点

1. **代码分割**: 路由级别的懒加载
2. **虚拟滚动**: 大型文件列表和搜索结果
3. **缓存策略**: Service Worker + IndexedDB
4. **图片优化**: WebP 格式 + 懒加载
5. **Bundle 优化**: Tree-shaking + 压缩

## 增强功能设计

### 滚动条标题指示器
在 MainContent 的滚动条上显示 Markdown 标题锚点的可视化指示器。

#### 功能需求
- 在垂直滚动条槽（track）内部显示对应 Markdown 标题的小点标记
- 点击小点可快速跳转到对应标题位置
- 根据当前阅读位置高亮显示当前所在的标题区域
- 支持多级标题 (H1-H6) 的不同点的大小区分
- 移动端和桌面端都需要支持此功能

#### 实现方案选项

##### 方案一：纯 CSS 伪元素 + 绝对定位
```css
/* 在滚动条槽内添加标题点 */
.markdown-content::-webkit-scrollbar-track {
  position: relative;
}

.markdown-content::after {
  content: '';
  position: absolute;
  right: 6px; /* 滚动条槽内部 */
  top: 0;
  width: 4px;
  height: 100%;
  pointer-events: none;
}

/* 通过 JavaScript 动态插入点标记 */
.heading-dot {
  position: absolute;
  right: 4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text-accent);
  cursor: pointer;
  pointer-events: all;
}
```

##### 方案二：react-custom-scrollbars-2
```bash
npm install react-custom-scrollbars-2
```
- 完全自定义滚动条，可以在滚动条轨道内嵌入任意元素
- 提供 `renderTrackVertical` 属性来自定义滚动条轨道
- 可在轨道内精确放置标题锚点小点

##### 方案三：Overlay 定位法
```typescript
// 使用绝对定位组件覆盖在滚动条上
const ScrollIndicator = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  
  useEffect(() => {
    // 计算每个标题在滚动条中的相对位置
    const calculateDotPositions = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const containerHeight = container.scrollHeight;
      const viewportHeight = container.clientHeight;
      const scrollbarHeight = viewportHeight;
      
      headings.forEach(heading => {
        const element = document.getElementById(heading.id);
        if (element) {
          const elementTop = element.offsetTop;
          const relativePosition = (elementTop / containerHeight) * scrollbarHeight;
          // 动态设置点的位置
        }
      });
    };
  }, [headings]);
};
```

#### 推荐方案
**阶段性实现**：
1. **MVP 阶段**：方案三 (Overlay 定位法) - 兼容性好，实现简单
2. **增强阶段**：方案二 (react-custom-scrollbars-2) - 真正嵌入滚动条内部，体验最佳
3. **备选方案**：方案一 (纯 CSS) - 仅支持 WebKit 浏览器，但最轻量

#### 样式设计
```css
/* 滚动条锚点指示器容器 */
.scroll-indicator-overlay {
  position: absolute;
  right: 2px; /* 覆盖在滚动条槽内部 */
  top: 0;
  width: 12px; /* 滚动条宽度内 */
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* 标题锚点小点 */
.heading-dot {
  position: absolute;
  border-radius: 50%;
  background: var(--text-accent);
  cursor: pointer;
  pointer-events: all;
  transition: all 0.2s ease;
  opacity: 0.7;
}

/* 当前激活的标题锚点 */
.heading-dot.active {
  background: var(--interactive-accent);
  opacity: 1;
  transform: scale(1.2);
}

/* 不同级别标题的点大小 */
.heading-dot.h1 { 
  width: 6px; 
  height: 6px; 
  right: 3px;
}
.heading-dot.h2 { 
  width: 4px; 
  height: 4px; 
  right: 4px;
}
.heading-dot.h3 { 
  width: 3px; 
  height: 3px; 
  right: 4.5px;
}
.heading-dot.h4,
.heading-dot.h5,
.heading-dot.h6 { 
  width: 2px; 
  height: 2px; 
  right: 5px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .scroll-indicator-overlay {
    right: 1px;
    width: 10px;
  }
  
  .heading-dot.h1 { width: 5px; height: 5px; }
  .heading-dot.h2 { width: 4px; height: 4px; }
  .heading-dot.h3 { width: 3px; height: 3px; }
}
```

## 下一步行动

1. **立即开始**: 创建项目基础架构和布局组件
2. **第一周目标**: 完成 AppLayout + LeftSidebar + MainContent 基础结构
3. **测试数据**: 使用 `/Publish` 目录作为测试 Vault
4. **渐进增强**: 先实现静态布局，再添加交互功能

---

**注意**: 这是 MVP 版本的开发指南，重点是快速搭建可工作的原型。后续可以根据实际需求和反馈进行功能扩展和性能优化。