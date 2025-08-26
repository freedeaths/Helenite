import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { FileService } from '../../services/fileService';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './MarkdownViewer.css';

export function MarkdownViewer() {
  const { activeFile } = useVaultStore();
  const [content, setContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Markdown processor configuration
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm) 
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeHighlight)
    .use(rehypeStringify);

  useEffect(() => {
    if (activeFile) {
      const mockContent = getMockContent(activeFile);
      setContent(mockContent);
      setError(null);
      
      // Process markdown content
      processor.process(mockContent)
        .then((result) => {
          setRenderedContent(String(result));
        })
        .catch((err) => {
          console.error('Markdown processing error:', err);
          setError('Markdown 处理失败');
        });
    } else {
      setContent('');
      setRenderedContent('');
      setError(null);
    }
  }, [activeFile, processor]);

  const getMockContent = (filePath: string) => {
    const fileName = filePath.split('/').pop()?.replace('.md', '') || 'Unknown';
    
    // 根据文件名生成不同的模拟内容
    if (fileName === 'Welcome') {
      return `# 欢迎来到 Perlite

这里是一个基于 React 的现代化 Obsidian Vault 查看器。

## 主要特性

- 🎨 **现代化界面** - 基于 React 18 + TypeScript 构建
- 📱 **响应式设计** - 完美适配桌面端、平板和移动设备
- ⚡ **高性能** - 使用 Vite 5 构建系统
- 🎯 **专注阅读** - 只读模式，专注内容浏览

## 技术栈

- React 18 + TypeScript
- Mantine UI 7 + Tailwind CSS
- Zustand 状态管理
- Unified + Remark Markdown 处理

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
    console.log('Hello, Perlite!');
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

    // 渲染处理后的 Markdown 内容
    return (
      <div className="markdown-viewer prose prose-slate dark:prose-invert max-w-none">
        {renderedContent ? (
          <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-[var(--text-normal)] bg-transparent border-none p-0">
            {content}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-8">
        {renderContent()}
      </div>
    </div>
  );
}