# 📚 Helenite 技术文档

欢迎来到 Helenite 的技术文档！这些文档现在作为 Demo vault 的一部分，可以直接通过 Helenite 查看，体现了"文档即演示"的理念。

## 🏗️ 核心架构

### [[core/services-architecture|服务架构概览]]
完整的服务分层架构设计，包含 18 个服务的职责划分、依赖关系和初始化流程。

**核心特性:**
- 🎭 VaultService 协调层统一业务接口
- ⚡ MarkdownProcessor 直接穿透服务层（unified 最佳实践）
- 🔧 基础设施层零依赖设计
- 📊 单向依赖原则，5 层清晰分工

### [[core/map-and-tracks-analysis|地图和轨迹系统]]
统一地图组件设计，支持单个轨迹和足迹地图的双模式渲染。

**核心特性:**
- 🗺️ 单个组件 + 双输入数组（tracks[] + locations[]）
- 📍 访问状态区分（去过 vs 想去）
- 🎯 智能UI适配（数据驱动的控件显示）
- 🌍 多数据源聚合（用户输入 + 照片EXIF + 轨迹文件）

### [[core/markdown-and-plugins|Markdown 渲染和插件系统]]
基于 unified 生态系统的完整 AST 处理流水线设计。

**核心特性:**
- ⚡ unified 标准最佳实践（remarkParse → remarkRehype → rehypeReact）
- 🔗 Obsidian 语法完整支持（wiki链接、标签、高亮等）
- 🗺️ TrackMap & Footprints 地图插件
- 📊 数学公式和 Mermaid 图表支持

## 🎯 设计原则

1. **单向依赖**: 高层依赖低层，绝不反向
2. **职责明确**: 每个服务有清晰的边界
3. **可测试性**: 依赖注入，便于单元测试
4. **扩展性**: 插件化设计，易于功能扩展

## 🚀 快速导航

- **理解服务架构** → [[core/services-architecture#🔍-快速查找|服务快速查找]]
- **实现地图功能** → [[core/map-and-tracks-analysis#使用示例|地图组件使用示例]]
- **开发 Markdown 插件** → [[core/markdown-and-plugins#remark-插件-mdast-处理|remark 插件开发]]

---

**💡 提示**: 这些文档通过 Helenite 查看时，所有的 wiki 链接都是可以点击的！这体现了 Helenite 作为知识管理系统的强大能力。