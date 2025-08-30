import type { IFileAPI, TOCItem, LinkData } from '../../interfaces/IFileAPI';
import type { FileMetadata } from '../../interfaces/IFileTreeAPI';

/**
 * Mock 文件 API 实现
 * 用于开发和测试环境，提供模拟的文件内容
 */
export class MockFileAPI implements IFileAPI {
  constructor(private baseUrl: string = '/vault') {}

  /**
   * 获取模拟文件内容
   */
  async getFileContent(path: string): Promise<string> {
    console.log(`🎭 Mock FileAPI: Loading content for ${path}`);
    return this.getMockContent(path);
  }

  /**
   * 获取模拟文件元数据
   */
  async getFileMetadata(path: string): Promise<FileMetadata> {
    const fileName = path.split('/').pop()?.replace('.md', '') || 'Unknown';
    
    return {
      fileName: fileName + '.md',
      relativePath: path,
      tags: ['mock', 'test'],
      frontmatter: { title: fileName },
      aliases: [],
      headings: [
        { heading: '章节标题', level: 2 },
        { heading: '子章节', level: 3 }
      ],
      links: [],
      backlinks: []
    };
  }

  /**
   * 获取附件文件的 URL
   */
  getAttachmentUrl(path: string): string {
    return `${this.baseUrl}/Publish/Attachments/${path}`;
  }

  /**
   * 获取图片文件的 URL
   */
  getImageUrl(path: string): string {
    return this.getAttachmentUrl(path);
  }

  /**
   * 从 Markdown 内容中提取目录结构
   */
  async extractTOC(content: string): Promise<TOCItem[]> {
    const toc: TOCItem[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        const id = this.generateId(title);
        
        toc.push({
          id,
          title,
          level
        });
      }
    }
    
    return toc;
  }

  /**
   * 从 Markdown 内容中提取链接
   */
  async extractLinks(content: string): Promise<LinkData[]> {
    const links: LinkData[] = [];
    
    // 匹配 [[链接]] 格式的内部链接
    const internalLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;
    
    while ((match = internalLinkRegex.exec(content)) !== null) {
      const linkText = match[1];
      links.push({
        link: linkText,
        relativePath: linkText + '.md'
      });
    }
    
    return links;
  }

  /**
   * 从 Markdown 内容中提取标签
   */
  async extractTags(content: string): Promise<string[]> {
    const tags: string[] = [];
    const tagRegex = /#([^\s#]+)/g;
    let match;
    
    while ((match = tagRegex.exec(content)) !== null) {
      const tag = match[1];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return tags;
  }

  /**
   * 检查文件是否存在（Mock 总是返回 true）
   */
  async exists(path: string): Promise<boolean> {
    return true;
  }

  /**
   * 生成模拟内容
   */
  private getMockContent(filePath: string): string {
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

### 陆羽古道徒步路线 (内联 GPX)

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

### YAMAP 徒步路线 (外部 GPX 文件)

\`\`\`gpx:@Publish/Attachments/yamap_2025-04-02_08_48.gpx\`\`\`

## 多厂商轨迹文件测试

### GPX 文件测试

#### foooooot 红叶尚湖
\`\`\`gpx:@Publish/Attachments/红叶尚湖.gpx\`\`\`

#### Garmin 金牛道拦马墙到普安镇  
\`\`\`gpx:@Publish/Attachments/金牛道拦马墙到普安镇.gpx\`\`\`

### KML 文件测试

#### 2bulu 金牛道拦马墙到普安镇
\`\`\`kml:@Publish/Attachments/金牛道拦马墙到普安镇.kml\`\`\`

#### 东西佘山含地铁绿道
\`\`\`kml:@Publish/Attachments/东西佘山含地铁绿道.kml\`\`\`

#### 中西citywalk (复杂KML)
\`\`\`kml:@Publish/Attachments/中西citywalk.kml\`\`\`

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
  }

  /**
   * 生成 ID（用于目录锚点）
   */
  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '') // 保留中文、英文、数字、空格、横线
      .replace(/\s+/g, '-')
      .trim();
  }
}