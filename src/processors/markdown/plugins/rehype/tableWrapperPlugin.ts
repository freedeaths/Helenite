/**
 * Table wrapper rehype 插件
 * 
 * 为表格添加响应式容器包装，确保在小屏幕上可以水平滚动
 */

import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement } from 'hast';

export interface TableWrapperOptions {
  wrapperClassName?: string;
}

const DEFAULT_OPTIONS: TableWrapperOptions = {
  wrapperClassName: 'table-container'
};

/**
 * 表格包装插件
 */
export function tableWrapperPlugin(options: TableWrapperOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return (tree: HastRoot) => {
    visit(tree, 'element', (node: HastElement, index, parent) => {
      if (node.tagName === 'table' && parent && typeof index === 'number') {
        // 创建包装容器
        const wrapper: HastElement = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: [opts.wrapperClassName]
          },
          children: [node]
        };

        // 替换表格为包装后的表格
        parent.children[index] = wrapper;
      }
    });
  };
}