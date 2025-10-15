/**
 * External Links Plugin
 * 自动为外部链接添加 target="_blank" 属性
 */

import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement } from 'hast';

/**
 * 判断链接是否为外部链接
 */
function isExternalLink(url: string): boolean {
  // 内部链接模式：
  // 1. Hash路由: #/path/to/file
  // 2. 相对路径: ./file.md, ../file.md, file.md
  // 3. 绝对内部路径: /path/to/file
  // 4. 标签链接: #tag:tagname
  // 5. 锚点链接: #heading-id

  if (!url) return false;

  // Hash路由和锚点链接（内部）
  if (url.startsWith('#')) return false;

  // 相对路径（内部）
  if (url.startsWith('./') || url.startsWith('../')) return false;

  // 协议链接（外部）
  if (url.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:/)) return true;

  // 绝对内部路径（内部）
  if (url.startsWith('/')) return false;

  // 不以协议开头的相对路径（内部）
  return false;
}

/**
 * Rehype 插件：为外部链接添加 target="_blank" 和 rel="noopener noreferrer"
 */
export function externalLinksPlugin() {
  return function transformer(tree: HastRoot) {
    visit(tree, 'element', (node: HastElement) => {
      if (node.tagName === 'a' && node.properties && node.properties.href) {
        const href = String(node.properties.href);

        if (isExternalLink(href)) {
          // 为外部链接添加安全属性
          node.properties.target = '_blank';
          node.properties.rel = 'noopener noreferrer';

          // 添加外部链接的CSS类
          const className = Array.isArray(node.properties.className)
            ? node.properties.className
            : node.properties.className
              ? [String(node.properties.className)]
              : [];

          if (!className.includes('external-link')) {
            className.push('external-link');
          }

          node.properties.className = className;
        }
      }
    });
  };
}
