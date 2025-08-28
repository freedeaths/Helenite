/**
 * 路由工具函数 - 处理 Hash 路由和 URL 解析
 */

export interface ParsedRoute {
  type: 'welcome' | 'file' | 'global-graph';
  filePath?: string;
  anchor?: string;
}

/**
 * 解析 hash 路由
 * 支持格式：
 * - #/welcome
 * - #/global-graph
 * - #/path/to/note (自动添加 .md)
 * - #/path/to/note.md (兼容带扩展名，内部处理)
 * - #/path/to/note#heading-id
 * - #/path/to/note.md#heading-id
 */
export function parseHashRoute(hash: string): ParsedRoute {
  // 移除开头的 #
  const cleanHash = hash.replace(/^#/, '');
  
  if (!cleanHash || cleanHash === '/') {
    return { type: 'welcome' };
  }
  
  if (cleanHash === '/welcome') {
    return { type: 'welcome' };
  }
  
  if (cleanHash === '/global-graph') {
    return { type: 'global-graph' };
  }
  
  // 所有其他路径都视为文件路径
  if (cleanHash.startsWith('/')) {
    let filePath = cleanHash;
    let anchor: string | undefined;
    
    // 检查是否包含锚点
    if (filePath.includes('#')) {
      [filePath, anchor] = filePath.split('#');
    }
    
    // 如果 URL 包含 .md 扩展名，则重定向到不带扩展名的版本
    if (filePath.endsWith('.md')) {
      const newPath = filePath.replace(/\.md$/, '');
      const newHash = anchor ? `#${newPath}#${anchor}` : `#${newPath}`;
      // 静默替换 URL，不触发页面刷新
      window.history.replaceState(null, '', newHash);
    }
    
    // 自动添加 .md 扩展名（如果没有扩展名）
    const normalizedPath = normalizeFilePath(filePath);
    
    return {
      type: 'file',
      filePath: normalizedPath,
      anchor
    };
  }
  
  // 默认返回 welcome
  return { type: 'welcome' };
}

/**
 * 规范化文件路径，确保有正确的 .md 扩展名
 */
function normalizeFilePath(filePath: string): string {
  // 如果已经有扩展名，保持原样
  if (filePath.includes('.') && filePath.match(/\.[a-zA-Z0-9]+$/)) {
    return filePath;
  }
  
  // 如果没有扩展名，添加 .md
  return `${filePath}.md`;
}

/**
 * 生成 hash 路由（URL 中不包含 .md 扩展名）
 */
export function generateHashRoute(type: 'welcome' | 'file' | 'global-graph', filePath?: string, anchor?: string): string {
  if (type === 'welcome') {
    return '#/welcome';
  }
  
  if (type === 'global-graph') {
    return '#/global-graph';
  }
  
  if (type === 'file' && filePath) {
    // 确保路径以 / 开头
    let cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    
    // 移除 .md 扩展名（用于 URL 显示）
    cleanPath = cleanPath.replace(/\.md$/, '');
    
    const baseRoute = `#${cleanPath}`;
    
    if (anchor) {
      return `${baseRoute}#${anchor}`;
    }
    
    return baseRoute;
  }
  
  return '#/welcome';
}

/**
 * 导航到指定路由
 */
export function navigateToRoute(type: 'welcome' | 'file' | 'global-graph', filePath?: string, anchor?: string): void {
  const hash = generateHashRoute(type, filePath, anchor);
  window.location.hash = hash;
}

/**
 * 导航到文件
 */
export function navigateToFile(filePath: string, anchor?: string): void {
  navigateToRoute('file', filePath, anchor);
}

/**
 * 导航到欢迎页
 */
export function navigateToWelcome(): void {
  navigateToRoute('welcome');
}

/**
 * 导航到全局图谱
 */
export function navigateToGlobalGraph(): void {
  navigateToRoute('global-graph');
}

/**
 * 获取当前路由
 */
export function getCurrentRoute(): ParsedRoute {
  return parseHashRoute(window.location.hash);
}