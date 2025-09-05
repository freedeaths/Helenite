# 为 Helenite 项目贡献代码

[English Version / 英文版本](./CONTRIBUTING.md)

感谢您对 Helenite 项目的贡献！🎉

## 🚀 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/your-username/helenite.git
cd helenite

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test                # 单元测试
npm run test:e2e        # E2E 测试
npm run typecheck       # 类型检查
npm run lint            # 代码质量检查
npm run build          # 构建验证
```

## 📋 代码质量标准

### ✅ PR 必须通过的检查
- **类型检查**: `npm run typecheck` 必须通过
- **构建验证**: `npm run build` 必须成功
- **测试**: 所有单元测试和 E2E 测试必须通过
- **代码质量**: 不能引入新的 ESLint 错误

### ⚠️ 代码质量警告
- 项目当前有 269 个 ESLint 警告（主要是 `any` 类型）
- 这些警告**不会阻止 PR 合并**，但新代码应该避免引入更多
- 我们计划在 API 重构阶段系统性解决这些 `any` 类型

### 🎯 编码规范
- 使用 TypeScript 严格模式
- 避免使用 `any` 类型，优先使用具体类型定义
- 未使用的变量以 `_` 开头 (如 `_unused`)
- 遵循 React Hooks 最佳实践
- 保持代码一致性和可读性

## 🧪 测试要求

### 单元测试
- 新功能必须包含单元测试
- 工具函数和服务层需要完整覆盖
- 使用 Vitest + React Testing Library

### E2E 测试  
- 关键用户流程需要 E2E 覆盖
- 使用 Playwright，支持多浏览器
- 当前测试通过率：**50/50 (100%)**

### 响应式测试
UI 变更需要在以下设备上测试：
- 📱 移动端 (< 768px)
- 📟 平板端 (768px - 1024px)  
- 🖥️ 桌面端 (> 1024px)

## 🔄 重构规划

项目正在进行 **Phase 2: API 接口层重构**：

### 🎯 重构目标
- 统一 API 接口设计
- 支持多种数据源（Obsidian metadata.json / 纯文件系统）
- 完善类型定义，消除 `any` 类型
- 提升代码质量和可维护性

### 📅 重构优先级
1. **文件树 API** → 图谱 API → 搜索 API → 标签 API
2. 重构时会系统性解决当前的 `any` 类型警告
3. 欢迎参与接口设计讨论

## 📝 提交 PR 流程

1. **Fork 项目** 并创建功能分支
2. **本地开发** 并确保所有检查通过
3. **提交 PR** 使用提供的 PR 模板
4. **CI 检查** 会自动运行，确保代码质量
5. **代码审查** 通过后即可合并

## 🤝 社区准则

- 保持友善和专业的沟通
- 尊重不同的观点和建议
- 优先考虑用户体验和代码质量
- 欢迎新手贡献者，提供耐心指导

## 📚 项目资源

- **架构文档**: [CLAUDE.md](../CLAUDE.md)
- **问题跟踪**: [GitHub Issues](https://github.com/your-username/helenite/issues)
- **讨论交流**: [GitHub Discussions](https://github.com/your-username/helenite/discussions)
- **测试报告**: PR 中的 CI 检查

## 🌐 多语言支持

我们欢迎多种语言的贡献：
- **英文** (主要)
- **简体中文**
- **日语** - 日本語 (欢迎社区贡献)

---

编程愉快! 🚀