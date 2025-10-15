/**
 * Obsidian ==highlights== 语法处理插件
 *
 * 处理 ==高亮文本== 语法，转换为带有高亮样式的元素
 */

import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Node as MdastNode } from 'mdast';

export interface ObsidianHighlightsOptions {
  className?: string;
}

const DEFAULT_OPTIONS: ObsidianHighlightsOptions = {
  className: 'cm-highlight',
};

/**
 * Obsidian ==highlights== 插件
 */
export function obsidianHighlightsPlugin(options: ObsidianHighlightsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const value = node.value;
      const highlightRegex = /==([^=]+)==/g;

      if (!highlightRegex.test(value)) return;

      const parts: Array<{ type: 'text' | 'highlight'; value: string }> = [];
      let lastIndex = 0;
      let match;

      highlightRegex.lastIndex = 0; // Reset regex

      while ((match = highlightRegex.exec(value)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, match.index),
          });
        }

        parts.push({
          type: 'highlight',
          value: match[1],
        });

        lastIndex = match.index + match[0].length;
      }

      // 添加剩余文本
      if (lastIndex < value.length) {
        parts.push({
          type: 'text',
          value: value.slice(lastIndex),
        });
      }

      // 替换文本节点
      if (parts.length > 1) {
        const newNodes: MdastNode[] = parts.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', value: part.value };
          } else {
            return {
              type: 'emphasis', // 使用 emphasis 作为基础，通过 CSS 样式实现高亮
              children: [{ type: 'text', value: part.value }],
              data: {
                hProperties: {
                  className: [opts.className || 'highlight'],
                },
              },
            };
          }
        });

        (parent.children as MdastNode[]).splice(index, 1, ...newNodes);
      }
    });
  };
}
