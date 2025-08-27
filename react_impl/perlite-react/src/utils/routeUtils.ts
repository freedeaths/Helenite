/**
 * 路由工具函数 - 处理 Hash 路由和 URL 解析
 */

export interface ParsedRoute {
  type: 'welcome' | 'file';
  filePath?: string;
  anchor?: string;
}

/**
 * 解析 hash 路由
 * 支持格式：
 * - #/welcome
 * - #/path/to/note.md
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
  
  // 所有其他路径都视为文件路径
  if (cleanHash.startsWith('/')) {
    const filePath = cleanHash;
    
    // 检查是否包含锚点
    if (filePath.includes('#')) {
      const [path, anchor] = filePath.split('#');
      return {
        type: 'file',
        filePath: path, // 保持原始路径（已经包含 /）
        anchor
      };
    }
    
    return {
      type: 'file',
      filePath: filePath // 保持原始路径
    };
  }
  
  // 默认返回 welcome
  return { type: 'welcome' };
}

/**
 * 生成 hash 路由
 */
export function generateHashRoute(type: 'welcome' | 'file', filePath?: string, anchor?: string): string {
  if (type === 'welcome') {
    return '#/welcome';
  }
  
  if (type === 'file' && filePath) {
    // 确保路径以 / 开头
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
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
export function navigateToRoute(type: 'welcome' | 'file', filePath?: string, anchor?: string): void {
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
 * 获取当前路由
 */
export function getCurrentRoute(): ParsedRoute {
  return parseHashRoute(window.location.hash);
}