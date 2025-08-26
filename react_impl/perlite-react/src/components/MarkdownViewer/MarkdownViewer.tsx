import { useEffect, useState, useRef } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { FileService } from '../../services/fileService';
import { markdownProcessor } from '../../services/markdownProcessor';
import { MermaidDiagram } from './MermaidDiagram';
import { GPXMap } from './GPXMap';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './MarkdownViewer.css';

export function MarkdownViewer() {
  const { activeFile } = useVaultStore();
  const [content, setContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    headings: Array<{ level: number; text: string; id: string }>;
    links: Array<{ href: string; text: string }>;
    tags: string[];
  }>({ headings: [], links: [], tags: [] });
  const [mermaidDiagrams, setMermaidDiagrams] = useState<Array<{ id: string; code: string; placeholder: string }>>([]);
  const [gpxMaps, setGpxMaps] = useState<Array<{ id: string; code: string; placeholder: string }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeFile) {
      const mockContent = getMockContent(activeFile);
      setContent(mockContent);
      setError(null);
      setLoading(true);
      
      // Process markdown content with our comprehensive processor
      markdownProcessor.processWithMetadata(mockContent)
        .then((result) => {
          setRenderedContent(result.html);
          setMetadata(result.metadata);
          setMermaidDiagrams(result.mermaidDiagrams);
          setGpxMaps(result.gpxMaps);
          console.log('Processed markdown metadata:', result.metadata);
          console.log('Found Mermaid diagrams:', result.mermaidDiagrams);
          console.log('Found GPX maps:', result.gpxMaps);
        })
        .catch((err) => {
          console.error('Markdown processing error:', err);
          setError('Markdown 处理失败');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setContent('');
      setRenderedContent('');
      setError(null);
      setMetadata({ headings: [], links: [], tags: [] });
      setMermaidDiagrams([]);
      setGpxMaps([]);
    }
  }, [activeFile]);

  // Mermaid diagrams are now handled directly in the render function

  const getMockContent = (filePath: string) => {
    const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
    
    // 根据文件名生成不同的模拟内容
    if (fileName === 'Welcome') {
      return `# 欢迎来到 Helenite

这里是一个基于 React 的现代化 Obsidian Vault 查看器。

## 主要特性

- 🎨 **现代化界面** - 基于 React 18 + TypeScript 构建
- 📱 **响应式设计** - 完美适配桌面端、平板和移动设备
- ⚡ **高性能** - 使用 Vite 5 构建系统
- 🎯 **专注阅读** - 只读模式，专注内容浏览

## Obsidian 语法支持

### 内部链接
查看 [[Dream-Destinations]] 了解更多旅行计划，或者访问 [[Multi-agent]] 查看技术项目。

### 标签系统
相关标签：#react #markdown #obsidian #typescript

### 高亮显示
这是一个 ==重要的高亮内容== 示例。

### Callouts

> [!info] 信息提示
> 这是一个信息类型的 callout 块。

> [!tip] 使用技巧
> 你可以使用左侧的文件浏览器来导航不同的文档。

> [!warning] 注意事项
> 这是只读模式，无法编辑文件内容。

## 技术栈

- React 18 + TypeScript
- Mantine UI 7 + Tailwind CSS
- Zustand 状态管理
- Unified + Remark Markdown 处理

## 数学公式支持

内联公式：$E = mc^2$

块级公式：
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

---

选择左侧的其他文件来浏览更多内容。`;
    }
    
    if (fileName.includes('Dream-Destinations')) {
      return `# 梦想目的地

## 中国 🇨🇳

### 陆羽古道&南浔古镇

陆羽古道位于湖州吴兴区。从稍康村出发，走环线回到稍康村。全程 9 公里多，爬升 400 米，路比较野。

这里的山全被剔了种上了茶树，一排排墨绿的茶树呈阶梯状分布，挺壮观。

## 日本 🇯🇵

### 和歌山
- **白浜** - 海边温泉胜地
- **熊野古道** - 世界遗产朝圣之路

### 神奈川
- **镰仓** - 古都风情
- **横滨** - 现代港口城市
- **逗子叶山** - 海滨度假

### 长野
- 没有直飞，需要从东京转乘
- 推荐景点：
  - 松本城
  - 諏訪湖（你的名字取景地）
  - 霧ヶ峰高原

## 户外路线

### 陆羽古道徒步路线

\`\`\`gpx
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Example" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>陆羽古道环线</name>
    <desc>湖州吴兴区稍康村出发的经典环线路线</desc>
  </metadata>
  <trk>
    <name>陆羽古道徒步</name>
    <desc>全程9公里，爬升400米</desc>
    <trkseg>
      <trkpt lat="30.8667" lon="120.0867">
        <ele>50</ele>
        <name>稍康村起点</name>
      </trkpt>
      <trkpt lat="30.8700" lon="120.0900">
        <ele>120</ele>
        <name>茶园观景台1</name>
      </trkpt>
      <trkpt lat="30.8750" lon="120.0950">
        <ele>200</ele>
        <name>山脊线</name>
      </trkpt>
      <trkpt lat="30.8800" lon="120.1000">
        <ele>350</ele>
        <name>最高点</name>
      </trkpt>
      <trkpt lat="30.8750" lon="120.1050">
        <ele>280</ele>
        <name>茶园观景台2</name>
      </trkpt>
      <trkpt lat="30.8700" lon="120.1000">
        <ele>150</ele>
        <name>下山路</name>
      </trkpt>
      <trkpt lat="30.8667" lon="120.0867">
        <ele>50</ele>
        <name>回到起点</name>
      </trkpt>
    </trkseg>
  </trk>
  <wpt lat="30.8667" lon="120.0867">
    <ele>50</ele>
    <name>停车场</name>
    <desc>村口停车场，可免费停车</desc>
  </wpt>
  <wpt lat="30.8800" lon="120.1000">
    <ele>350</ele>
    <name>山顶观景台</name>
    <desc>360度全景，可俯瞰整个茶园梯田</desc>
  </wpt>
</gpx>
\`\`\`

> [!tip] 旅行小贴士
> 提前规划交通路线，考虑购买 JR Pass 节省费用。`;
    }
    
    if (fileName.includes('Multi-agent')) {
      return `# Multi-agent Voyager Play Minecraft

## 项目概述

Voyager 是一个基于大语言模型的 Minecraft 游戏智能体，能够：

- 🎮 自主探索 Minecraft 世界
- 🛠️ 学习和制作工具
- 🏗️ 建造复杂结构
- 🤝 与其他智能体协作

## 技术架构

\`\`\`mermaid
graph TB
    A[LLM Agent] --> B[Action Planning]
    B --> C[Skill Library]
    C --> D[Minecraft API]
    D --> E[Game Environment]
    E --> F[Feedback Loop]
    F --> A
\`\`\`

## 核心能力

### 1. 自主学习
- 从失败中学习
- 技能组合和迁移
- 知识积累

### 2. 多智能体协作
- 任务分工
- 资源共享
- 协调机制

## 代码示例

\`\`\`python
class VoyagerAgent:
    def __init__(self):
        self.skill_library = SkillLibrary()
        self.action_planner = ActionPlanner()
    
    def explore(self):
        while True:
            observation = self.get_observation()
            action = self.action_planner.plan(observation)
            result = self.execute(action)
            self.learn_from_result(result)
\`\`\`

> [!warning] 注意事项
> 运行此项目需要 Minecraft 服务器和相应的 API 权限。`;
    }
    
    // 默认内容
    return `# ${fileName}

这是一个示例 Markdown 文件。

## 章节标题

这里是一些示例内容，展示 Markdown 的各种语法：

- **粗体文本**
- *斜体文本*
- \`行内代码\`
- [链接示例](https://example.com)

### 子章节

> 这是一个引用块，可以用来强调重要信息。

\`\`\`javascript
// 代码块示例
function hello() {
    console.log('Hello, Helenite!');
}
\`\`\`

---

文件路径：\`${filePath}\``;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">正在加载...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">错误: {error}</div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">选择一个文件开始阅读</div>
        </div>
      );
    }

    // 渲染处理后的 Markdown 内容，包括 Mermaid 图表和 GPX 地图
    if (renderedContent) {
      // Split HTML at placeholders and insert React components
      const parts = [];
      let currentHTML = renderedContent;
      let partIndex = 0;

      // Create a combined list of all components to insert, sorted by position
      const allComponents: Array<{
        index: number;
        type: 'mermaid' | 'gpx';
        data: { id: string; code: string; placeholder: string };
      }> = [];

      // Add Mermaid diagrams
      mermaidDiagrams.forEach((diagram) => {
        const placeholder = `MERMAID_PLACEHOLDER_${diagram.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'mermaid', data: diagram });
        }
      });

      // Add GPX maps
      gpxMaps.forEach((map) => {
        const placeholder = `GPX_PLACEHOLDER_${map.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'gpx', data: map });
        }
      });

      // Sort by position in the HTML
      allComponents.sort((a, b) => a.index - b.index);

      // Process components in order
      allComponents.forEach((component) => {
        const { type, data } = component;
        const placeholder = type === 'mermaid' 
          ? `MERMAID_PLACEHOLDER_${data.id}` 
          : `GPX_PLACEHOLDER_${data.id}`;
        const placeholderIndex = currentHTML.indexOf(placeholder);
        
        if (placeholderIndex !== -1) {
          // Add HTML before placeholder
          if (placeholderIndex > 0) {
            const htmlBefore = currentHTML.substring(0, placeholderIndex);
            parts.push(
              <div
                key={`html-${partIndex++}`}
                dangerouslySetInnerHTML={{ __html: htmlBefore }}
              />
            );
          }
          
          // Add component
          if (type === 'mermaid') {
            parts.push(
              <MermaidDiagram
                key={data.id}
                code={data.code}
                className="mermaid-diagram"
              />
            );
          } else {
            parts.push(
              <GPXMap
                key={data.id}
                code={data.code}
                className="gpx-map"
              />
            );
          }
          
          // Update currentHTML to remaining part
          currentHTML = currentHTML.substring(placeholderIndex + placeholder.length);
        }
      });

      // Add any remaining HTML
      if (currentHTML.trim()) {
        parts.push(
          <div
            key={`html-${partIndex}`}
            dangerouslySetInnerHTML={{ __html: currentHTML }}
          />
        );
      }

      return (
        <div className="markdown-viewer" ref={contentRef}>
          {parts}
        </div>
      );
    }

    // Fallback for no rendered content
    return (
      <div className="markdown-viewer">
        <pre className="whitespace-pre-wrap font-sans text-[var(--text-normal)] bg-transparent border-none p-0">
          {content}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div style={{ maxWidth: '1200px', padding: '1.5rem' }}>
        {renderContent()}
      </div>
    </div>
  );
}