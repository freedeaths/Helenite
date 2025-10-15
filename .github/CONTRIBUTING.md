# Contributing to Helenite

[中文版本 / Chinese Version](./CONTRIBUTING_zh.md)

Thank you for your interest in contributing to Helenite! 🎉

## 🚀 Development Environment Setup

```bash
# Clone the repository
git clone https://github.com/your-username/helenite.git
cd helenite

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test                # Unit tests
npm run test:e2e        # End-to-end tests
npm run typecheck       # Type checking
npm run lint            # Code quality check
npm run build          # Build verification
```

## 📋 Code Quality Standards

### ✅ Required Checks for PR Approval
- **Type checking**: `npm run typecheck` must pass
- **Build verification**: `npm run build` must succeed
- **Tests**: All unit tests and E2E tests must pass
- **Code quality**: Must not introduce new ESLint errors

### ⚠️ Code Quality Warnings
- The project currently has 269 ESLint warnings (mainly `any` types)
- These warnings **will not block PR merging**, but new code should avoid introducing more
- We plan to systematically address these `any` types during the API refactoring phase

### 🎯 Coding Standards
- Use TypeScript strict mode
- Avoid `any` types, prefer specific type definitions
- Prefix unused variables with `_` (e.g., `_unused`)
- Follow React Hooks best practices
- Maintain code consistency and readability

## 🧪 Testing Requirements

### Unit Tests
- New features must include unit tests
- Utility functions and service layers need complete coverage
- Use Vitest + React Testing Library

### E2E Tests  
- Critical user flows need E2E coverage
- Use Playwright with multi-browser support
- Current test pass rate: **50/50 (100%)**

### Responsive Testing
UI changes must be tested on:
- 📱 Mobile (< 768px)
- 📟 Tablet (768px - 1024px)  
- 🖥️ Desktop (> 1024px)

## 🔄 Refactoring Roadmap

The project is undergoing **Phase 2: API Interface Layer Refactoring**:

### 🎯 Refactoring Goals
- Unified API interface design
- Support multiple data sources (Obsidian metadata.json / pure file system)
- Complete type definitions, eliminate `any` types
- Improve code quality and maintainability

### 📅 Refactoring Priority
1. **File Tree API** → Graph API → Search API → Tag API
2. During refactoring, we'll systematically resolve current `any` type warnings
3. Welcome to participate in interface design discussions

## 📝 PR Submission Process

1. **Fork the project** and create a feature branch
2. **Develop locally** and ensure all checks pass
3. **Submit PR** using the provided PR template
4. **CI checks** will run automatically to ensure code quality
5. **Code review** and merge after approval

## 🤝 Community Guidelines

- Maintain friendly and professional communication
- Respect different viewpoints and suggestions
- Prioritize user experience and code quality
- Welcome newcomers with patient guidance

## 📚 Project Resources

- **Architecture Documentation**: [CLAUDE.md](../CLAUDE.md)
- **Issue Tracking**: [GitHub Issues](https://github.com/your-username/helenite/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/helenite/discussions)
- **Test Reports**: CI checks in PRs

## 🌐 Multi-language Support

We welcome contributions in multiple languages:
- **English** (Primary)
- **Chinese (Simplified)** - 简体中文
- **Japanese** - 日本語 (Community contributions welcome)

---

Happy Coding! 🚀