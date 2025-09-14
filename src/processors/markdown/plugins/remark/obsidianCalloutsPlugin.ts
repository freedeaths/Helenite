/**
 * Obsidian callouts 语法处理插件
 * 
 * 处理 > [!note] 标题 callout 语法
 * 支持各种类型：note, warning, info, tip, error, etc.
 */

import { visit } from 'unist-util-visit';
import type { Root as MdastRoot } from 'mdast';

export interface ObsidianCalloutsOptions {
  classPrefix?: string;
}

const DEFAULT_OPTIONS: ObsidianCalloutsOptions = {
  classPrefix: 'callout'
};

/**
 * Obsidian callouts 插件
 */
export function obsidianCalloutsPlugin(options: ObsidianCalloutsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (tree: MdastRoot) => {
    visit(tree, 'blockquote', (node) => {
      const firstChild = node.children[0];
      if (!firstChild || firstChild.type !== 'paragraph') return;

      const firstText = firstChild.children[0];
      if (!firstText || firstText.type !== 'text') return;

      // 检查 callout 语法: [!type] title
      const fullText = firstText.value;
      const calloutRegex = /^\[!([^\]]+)\]\s*(.*?)$/s;
      const match = fullText.match(calloutRegex);

      if (!match) return;

      const calloutType = match[1].toLowerCase();
      const calloutTitle = match[2].split('\n')[0].trim() || 
        calloutType.charAt(0).toUpperCase() + calloutType.slice(1);

      // 提取标题行后的内容
      const titleLine = `[!${match[1]}] ${calloutTitle}`;
      const contentText = fullText.replace(titleLine, '').trim();

      // 转换 blockquote 为自定义元素
      (node as any).type = 'element';
      node.data = {
        hName: 'div',
        hProperties: {
          className: [`${opts.classPrefix}`, `${opts.classPrefix}-${calloutType}`],
          'data-callout': calloutType
        }
      };

      // 创建 callout 结构
      const titleElement = {
        type: 'element' as any,
        data: {
          hName: 'div',
          hProperties: {
            className: [`${opts.classPrefix}-title`]
          }
        },
        children: [{ type: 'text', value: calloutTitle }]
      };

      // 创建内容容器
      const contentChildren = [];

      // 添加剩余内容
      if (contentText) {
        contentChildren.push({
          type: 'paragraph' as any,
          children: [{ type: 'text', value: contentText }]
        });
      }

      // 添加其他子元素（如列表等）
      for (let i = 1; i < node.children.length; i++) {
        contentChildren.push(node.children[i]);
      }

      const contentElement = {
        type: 'element' as any,
        data: {
          hName: 'div',
          hProperties: {
            className: [`${opts.classPrefix}-content`]
          }
        },
        children: contentChildren
      };

      node.children = [titleElement, contentElement];
    });
  };
}