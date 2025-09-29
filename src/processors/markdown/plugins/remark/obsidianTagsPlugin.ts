/**
 * Obsidian #tags 语法处理插件
 * 
 * 处理 #标签 语法，转换为带有样式的链接
 * 支持嵌套标签如 #编程/JavaScript
 */

import { visit } from 'unist-util-visit';
import type { Root as MdastRoot, Node as MdastNode } from 'mdast';

export interface ObsidianTagsOptions {
  tagUrlPrefix?: string;
  tagClassName?: string;
}

const DEFAULT_OPTIONS: ObsidianTagsOptions = {
  tagUrlPrefix: '#tag:',
  tagClassName: 'tag'
};

/**
 * Obsidian #tags 插件
 */
export function obsidianTagsPlugin(options: ObsidianTagsOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (tree: MdastRoot) => {
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const value = node.value;
      const tagRegex = /(^|[\s：:,，])(#[\w\-/\u4e00-\u9fff]+)/g;

      if (!tagRegex.test(value)) return;

      const parts: Array<{ type: 'text' | 'tag'; value: string }> = [];
      let lastIndex = 0;
      let match;

      tagRegex.lastIndex = 0; // Reset regex

      while ((match = tagRegex.exec(value)) !== null) {
        const fullMatch = match[0];
        const prefix = match[1];
        const tag = match[2];

        // 添加匹配前的文本（包括前缀）
        if (match.index > lastIndex) {
          parts.push({
            type: 'text',
            value: value.slice(lastIndex, match.index) + prefix
          });
        } else if (prefix) {
          parts.push({
            type: 'text',
            value: prefix
          });
        }

        parts.push({
          type: 'tag',
          value: tag
        });

        lastIndex = match.index + fullMatch.length;
      }

      // 添加剩余文本
      if (lastIndex < value.length) {
        parts.push({
          type: 'text',
          value: value.slice(lastIndex)
        });
      }

      // 替换文本节点
      if (parts.length > 1) {
        const newNodes: MdastNode[] = parts.map(part => {
          if (part.type === 'text') {
            return { type: 'text', value: part.value };
          } else {
            // Keep as text node but mark it with data for rehype processing
            return {
              type: 'text',
              value: part.value,
              data: {
                hName: 'span',
                hProperties: {
                  className: [opts.tagClassName],
                  'data-tag': part.value.slice(1)
                }
              }
            };
          }
        });

        (parent.children as MdastNode[]).splice(index, 1, ...newNodes);
      }
    });
  };
}