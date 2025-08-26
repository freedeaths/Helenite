# Perlite React 重构项目开发指南

## 项目概述

基于 PRD 要求，将现有的 PHP 版本 Perlite 重构为现代化的 React 应用，提供类 Obsidian 的原生体验，只读不写。

## 🎉 MVP Phase 1 完成状态 (2025-08-25)

### ✅ 已完成功能

#### 1. 响应式布局系统
- **桌面端 (≥1024px)**: 四列布局 `48px(Ribbon) + 可调节侧边栏 + 主内容 + 可调节侧边栏`
- **平板端 (768-1024px)**: 三列布局 `48px(Ribbon) + 固定侧边栏(300px) + 主内容`
- **移动端 (<768px)**: 单列布局 + 抽屉式侧边栏

#### 2. 拖拽调整功能
- **桌面端侧边栏宽度调整**: 鼠标拖拽调整，范围 200px-600px
- **性能优化**: 缓存 DOM 查询，移除 CSS 过渡动画，实现流畅拖拽体验
- **视觉反馈**: 拖拽手柄悬停高亮，2px 精细宽度设计

#### 3. 移动端交互
- **抽屉式侧边栏**: 左右滑出，正确的弹出方向
- **移动端导航栏**: 底部导航切换左右面板
- **手势友好**: 支持触摸操作和键盘 ESC 关闭

#### 4. 主题和样式系统
- **Obsidian 主题兼容**: 支持 Royal Velvet 等第三方主题
- **CSS 变量系统**: 完整的明暗主题支持
- **自定义滚动条**: 匹配 Obsidian 视觉风格

#### 5. 组件架构
- **左侧 Ribbon**: 48px 垂直导航栏，Home/Files/Search/Graph/Random 功能入口
- **文件浏览器**: 树状结构文件列表，支持展开/折叠
- **搜索面板**: 全文搜索和标签搜索切换
- **右侧面板**: Outline/Graph/Tags 三个功能面板
- **状态栏**: 显示统计信息

### 🔧 技术实现细节

#### 拖拽功能优化
```typescript
// 关键性能优化：缓存 DOM 查询
const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
  // 在拖拽开始时缓存位置，避免每次 mousemove 重复查询
  const rect = sidebarRef.current.getBoundingClientRect();
  sidebarLeftRef.current = direction === 'left' ? rect.left : rect.right;
}, [direction, sidebarRef]);

// 流畅的 resize 计算
const resize = useCallback((mouseMoveEvent: MouseEvent) => {
  if (isResizing) {
    const newWidth = direction === 'left' 
      ? mouseMoveEvent.clientX - sidebarLeftRef.current
      : sidebarLeftRef.current - mouseMoveEvent.clientX;
    onResize(Math.max(minWidth, Math.min(maxWidth, newWidth)));
  }
}, [isResizing, direction, minWidth, maxWidth, onResize]);
```

#### 响应式布局核心
```typescript
const getGridTemplate = () => {
  if (isMobile) return '0px 1fr 0px';
  if (isTablet) return `48px ${leftSidebarOpen ? '300px' : '0px'} 1fr 0px`;
  
  const leftWidth = leftSidebarOpen ? `${leftSidebarWidth}px` : '0px';
  const rightWidth = rightSidebarOpen ? `${rightSidebarWidth}px` : '0px';
  return `48px ${leftWidth} 1fr ${rightWidth}`;
};
```

### 📁 项目结构
```
react_impl/perlite-react/src/
├── components/
│   ├── Layout/                 # 布局组件
│   │   ├── AppLayout.tsx      # 主布局容器，响应式网格
│   │   ├── LeftRibbon.tsx     # 48px 垂直导航栏
│   │   ├── LeftSidebar.tsx    # 左侧边栏容器
│   │   ├── RightSidebar.tsx   # 右侧边栏容器
│   │   ├── MainContent.tsx    # 主内容区域
│   │   ├── ResizeHandle.tsx   # 拖拽调整组件
│   │   ├── MobileDrawer.tsx   # 移动端抽屉
│   │   ├── MobileNavBar.tsx   # 移动端导航
│   │   └── statusBar.tsx      # 状态栏
│   ├── FileExplorer/          # 文件浏览功能
│   ├── MarkdownViewer/        # Markdown 渲染
│   └── Graph/                 # 图谱可视化
├── stores/
│   ├── uiStore.ts            # UI 状态 (响应式、宽度、面板状态)
│   └── vaultStore.ts         # 数据状态 (文件、搜索、元数据)
├── services/
└── types/
```

### 🎯 下一步计划

#### Phase 2: 内容渲染和数据层
1. **Markdown 渲染器**
   - unified + remark + rehype 处理流水线
   - Obsidian 语法支持 (`[[links]]`, callouts, tags)
   - 数学公式 (KaTeX) 和代码高亮
   
2. **文件系统集成**  
   - 连接现有 PHP 后端 API
   - 文件内容加载和缓存
   - 搜索功能实现

3. **图谱可视化**
   - d3-force 力导向图
   - 节点链接关系
   - 交互式导航

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
- [ ] 

### 💡 功能想法  
- [ ] 

### 🔧 优化项目
- [ ] 

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

## MVP 开发计划

### Phase 1: 基础架构和布局 (优先级1)

#### 1.1 项目初始化
```bash
# 创建项目
npm create vite@latest perlite-react -- --template react-ts
cd perlite-react

# 安装核心依赖
npm install @mantine/core @mantine/hooks @mantine/notifications
npm install @tabler/icons-react
npm install zustand
npm install react-router-dom
npm install tailwindcss
```

#### 1.2 核心布局结构
基于原 Perlite PHP 版本的 index.php:line 90-838 布局结构分析：

##### 完整布局层次结构
```
<body class="theme-dark obsidian-app" style="--zoom-factor:1; --font-text-size: 15px;">
├── <div class="titlebar">                                          // 标题栏 (可选)
│   └── <div class="titlebar-inner">
│       └── <div class="titlebar-button-container mod-left">
│           └── <div class="titlebar-button mod-logo">              // Logo
└── <div class="app-container">                                     // 主应用容器
    ├── <div class="horizontal-main-container">                     // 水平主容器
    │   └── <div class="workspace is-left-sidedock-open">           // 工作区
    │       ├── <div class="workspace-ribbon side-dock-ribbon mod-left">      // 左功能条
    │       │   ├── Logo + 侧边栏切换按钮
    │       │   ├── 功能按钮组 (图谱、随机、TOC)
    │       │   └── 设置按钮组 (帮助、设置)
    │       ├── <div class="workspace-split mod-horizontal mod-left-split" style="width: 450px;"> // 左侧边栏
    │       │   ├── <div class="workspace-tabs mod-top">            // 标签头部
    │       │   │   └── Files / Search 标签切换
    │       │   └── <div class="workspace-tab-container">           // 标签内容
    │       │       ├── Files 面板 (文件树 + 自定义内容)
    │       │       └── Search 面板 (搜索框 + 结果)
    │       ├── <div class="workspace-split mod-vertical mod-root">  // 主内容区
    │       │   └── <div class="workspace-tabs mod-active mod-top"> // 主内容标签
    │       │       └── <div class="workspace-tab-container">
    │       │           └── <div class="workspace-leaf mod-active">
    │       │               ├── <div class="view-header">           // 视图头部
    │       │               │   ├── 移动端侧边栏按钮
    │       │               │   ├── 标题容器
    │       │               │   └── 操作按钮 (编辑、链接、右侧栏切换)
    │       │               └── <div class="view-content">          // 内容区
    │       │                   ├── <div id="graph_content">       // 图谱视图
    │       │                   └── <div class="markdown-reading-view"> // Markdown视图
    │       │                       └── <div id="mdContent">
    │       ├── <div class="workspace-split mod-horizontal mod-right-split" style="width: 450px;"> // 右侧边栏  
    │       │   └── <div class="workspace-tabs mod-top">
    │       │       └── <div class="workspace-tab-container">
    │       │           └── <div class="workspace-leaf mod-active">
    │       │               ├── 导航按钮 (本地图谱、大纲、标签)
    │       │               └── <div class="view-content">
    │       │                   ├── <div id="outline">             // 大纲/TOC
    │       │                   ├── <div id="tags_container">      // 标签
    │       │                   ├── <div id="localGraph">         // 本地图谱
    │       │                   └── 反向链接计数
    │       └── <div class="workspace-ribbon side-dock-ribbon mod-right is-collapsed"> // 右功能条(折叠)
    └── <div class="status-bar">                                    // 状态栏
        ├── 反向链接计数显示
        └── 字数统计显示
```

##### 关键布局参数
```css
/* 原版 Perlite 布局参数 */
.workspace-split.mod-left-split { width: 450px; }   /* 左侧边栏固定宽度 */
.workspace-split.mod-right-split { width: 450px; }  /* 右侧边栏固定宽度 */
.workspace-split.mod-root { flex: 1; }              /* 主内容区自适应 */

/* 响应式参数 */
body { --font-text-size: 15px; --zoom-factor: 1; }  /* 基础字体和缩放 */

/* 主题类名 */
body.theme-dark.obsidian-app.show-inline-title.show-view-header.is-maximized
```

##### React 组件映射
```tsx
// src/components/Layout/AppLayout.tsx
export function AppLayout() {
  return (
    <div className="app-container">
      <div className="horizontal-main-container">
        <div className="workspace is-left-sidedock-open">
          {/* 左功能条 */}
          <LeftRibbon />
          
          {/* 左侧边栏 - 450px 固定宽度 */}
          <LeftSidebar style={{ width: '450px' }} />
          
          {/* 主内容区域 - 自适应宽度 */}
          <MainContent />
          
          {/* 右侧边栏 - 450px 固定宽度 */}
          <RightSidebar style={{ width: '450px' }} />
          
        </div>
      </div>
      
      {/* 状态栏 */}
      <StatusBar />
    </div>
  );
}
```

#### 1.3 响应式布局断点
基于原版 Perlite 的布局参数，采用以下响应式策略：

```css
/* 桌面端 (1024px+) - 抄原版参数 */
.workspace.desktop {
  display: flex;
}
.workspace-split.mod-left-split { width: 450px; display: block; }
.workspace-split.mod-right-split { width: 450px; display: block; }
.workspace-split.mod-root { flex: 1; }

/* 平板端 (768px~1024px) - 隐藏右侧栏，左侧栏缩窄 */
.workspace.tablet {
  display: flex;
}
.workspace-split.mod-left-split { width: 300px; display: block; }
.workspace-split.mod-right-split { width: 0px; display: none; }
.workspace-split.mod-root { flex: 1; }

/* 手机端 (<768px) - 只显示主内容区 */
.workspace.mobile {
  display: flex;
}
.workspace-split.mod-left-split { width: 0px; display: none; }
.workspace-split.mod-right-split { width: 0px; display: none; }
.workspace-split.mod-root { flex: 1; }

/* 移动端侧边栏切换 */
.mobile-display { display: none; }
@media (max-width: 768px) {
  .mobile-display { display: flex; }
}
```

#### 1.4 组件结构规划
基于原版 Perlite 布局分析，更新组件结构：

```
src/
├── components/
│   ├── Layout/
│   │   ├── AppLayout.tsx          # 主布局容器 (app-container)
│   │   ├── TitleBar.tsx           # 标题栏 (可选)
│   │   ├── LeftRibbon.tsx         # 左功能条 (workspace-ribbon mod-left)
│   │   ├── LeftSidebar.tsx        # 左侧边栏 (workspace-split mod-left-split)
│   │   ├── MainContent.tsx        # 主内容区 (workspace-split mod-root)
│   │   ├── RightSidebar.tsx       # 右侧边栏 (workspace-split mod-right-split)
│   │   └── StatusBar.tsx          # 状态栏 (status-bar)
│   ├── Tabs/
│   │   ├── TabContainer.tsx       # 标签容器 (workspace-tabs)
│   │   ├── TabHeader.tsx          # 标签头部 (workspace-tab-header)
│   │   └── TabContent.tsx         # 标签内容 (workspace-tab-container)
│   ├── FileExplorer/
│   │   ├── FileTree.tsx           # 文件树 (nav-files-container)
│   │   ├── FileTreeItem.tsx       # 文件树项 (tree-item nav-file)
│   │   └── SearchPanel.tsx        # 搜索面板 (search-input-container)
│   ├── ViewHeader/
│   │   ├── ViewHeader.tsx         # 视图头部 (view-header)
│   │   ├── MobileToggle.tsx       # 移动端切换 (mobile-display)
│   │   └── ViewActions.tsx        # 视图操作 (view-actions)
│   ├── MarkdownViewer/
│   │   ├── MarkdownRenderer.tsx   # Markdown 渲染器 (markdown-reading-view)
│   │   ├── TOC.tsx               # 目录组件 (outline)
│   │   └── BacklinkPanel.tsx     # 反向链接面板 (tree-item-flair)
│   └── Graph/
│       ├── GraphView.tsx         # 全局图谱视图 (graph_content)
│       └── LocalGraph.tsx        # 局部图谱 (localGraph)
├── stores/
│   ├── vaultStore.ts             # Vault 状态管理
│   ├── uiStore.ts                # UI 状态管理 (侧边栏切换、响应式)
│   └── settingsStore.ts          # 设置状态管理 (主题、字体大小)
├── services/
│   ├── fileService.ts            # 文件服务
│   ├── searchService.ts          # 搜索服务
│   └── markdownService.ts        # Markdown 解析服务
├── types/
│   ├── vault.ts                  # Vault 类型定义
│   ├── file.ts                   # 文件类型定义
│   ├── ui.ts                     # UI 状态类型定义
│   └── graph.ts                  # 图谱类型定义
└── utils/
    ├── pathUtils.ts              # 路径工具
    ├── linkUtils.ts              # 链接工具
    └── responsiveUtils.ts        # 响应式工具
```

### Phase 2: 状态管理和数据层 (优先级2)

#### 2.1 Zustand Store 设计
```typescript
// src/stores/vaultStore.ts
interface VaultState {
  // 文件系统状态
  files: FileTree[];
  activeFile: string | null;
  metadata: Record<string, FileMetadata>;
  
  // 搜索状态
  searchQuery: string;
  searchResults: SearchResult[];
  
  // 图谱数据
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  
  // Actions
  setActiveFile: (path: string) => void;
  loadVault: () => Promise<void>;
  searchFiles: (query: string) => Promise<void>;
  loadGraphData: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  // ... 实现
}));
```

#### 2.2 文件服务实现
```typescript
// src/services/fileService.ts
export class FileService {
  static async loadVaultStructure(): Promise<FileTree[]> {
    // 调用后端 API 获取文件结构
    const response = await fetch('/api/vault/structure');
    return response.json();
  }
  
  static async getFileContent(path: string): Promise<string> {
    // 获取文件内容
    const response = await fetch(`/api/files/${encodeURIComponent(path)}`);
    return response.text();
  }
  
  static async getMetadata(): Promise<Record<string, FileMetadata>> {
    // 获取 metadata.json
    const response = await fetch('/api/vault/metadata');
    return response.json();
  }
}
```

### Phase 3: Markdown 渲染系统 (优先级3)

#### 3.1 Markdown 处理流水线
```typescript
// src/services/markdownService.ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';

export class MarkdownService {
  private processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(this.obsidianLinks)      // 自定义插件：处理 [[]] 链接
    .use(this.obsidianCallouts)   // 自定义插件：处理 Callouts
    .use(this.obsidianTags)       // 自定义插件：处理标签
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeHighlight);
    
  async processMarkdown(content: string): Promise<string> {
    const result = await this.processor.process(content);
    return String(result);
  }
  
  // 自定义插件实现...
}
```

#### 3.2 Obsidian 语法支持插件
```typescript
// src/services/plugins/obsidianLinks.ts
export function obsidianLinks() {
  return (tree: any) => {
    visit(tree, 'text', (node, index, parent) => {
      const value = node.value;
      const linkRegex = /\[\[([^\]]+)\]\]/g;
      
      // 处理 [[链接]] 语法
      if (linkRegex.test(value)) {
        // 替换为内部链接节点
      }
    });
  };
}

// src/services/plugins/obsidianCallouts.ts
export function obsidianCallouts() {
  return (tree: any) => {
    visit(tree, 'blockquote', (node) => {
      // 检查是否为 Callout 语法：> [!type] title
      // 转换为 Callout 组件
    });
  };
}
```

### Phase 4: 文件导航和搜索 (优先级4)

#### 4.1 文件树组件
```tsx
// src/components/FileExplorer/FileTree.tsx
export function FileTree({ files }: { files: FileTree[] }) {
  const { activeFile, setActiveFile } = useVaultStore();
  
  return (
    <Tree>
      {files.map(file => (
        <FileTreeItem 
          key={file.path}
          file={file}
          isActive={activeFile === file.path}
          onSelect={setActiveFile}
        />
      ))}
    </Tree>
  );
}
```

#### 4.2 搜索功能实现
```typescript
// src/services/searchService.ts
export class SearchService {
  static async search(query: string): Promise<SearchResult[]> {
    // 实现全文搜索逻辑
    if (query.startsWith('#')) {
      return this.searchByTag(query.slice(1));
    }
    
    return this.fullTextSearch(query);
  }
  
  private static async searchByTag(tag: string): Promise<SearchResult[]> {
    // 标签搜索实现
  }
  
  private static async fullTextSearch(query: string): Promise<SearchResult[]> {
    // 全文搜索实现
  }
}
```

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
# 方案1: 符号链接 (仅开发用)
ln -sf ../../../Publish public/vault

# 方案2: Vite 代理配置
# vite.config.ts 中配置静态文件服务
```

#### 生产环境 - Docker 映射
```dockerfile
# Dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# docker-compose.yml
services:
  perlite-react:
    volumes:
      - /host/obsidian/vault:/usr/share/nginx/html/vault:ro
    environment:
      - VAULT_BASE_URL=/vault
```

#### CDN 部署
```javascript
// 构建时集成 Vault
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'vault-integration',
      writeBundle() {
        if (process.env.VAULT_PATH) {
          copySync(process.env.VAULT_PATH, 'dist/vault');
        }
      }
    }
  ],
  define: {
    __VAULT_BASE_URL__: JSON.stringify(
      process.env.VAULT_BASE_URL || '/vault'
    )
  }
});
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