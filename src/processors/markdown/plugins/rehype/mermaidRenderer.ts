/**
 * Mermaid Renderer rehype 插件
 *
 * 将 remark-mermaid 生成的占位符转换为 MermaidDiagram 组件
 */

import { visit } from 'unist-util-visit';
import type { Root as HastRoot, Element as HastElement, Text as HastText } from 'hast';

export interface MermaidRendererOptions {
  // 预留扩展选项
}

/**
 * Mermaid Renderer 插件
 */
export function mermaidRenderer(options: MermaidRendererOptions = {}) {
  return (tree: HastRoot, file: any) => {
    // 获取存储的 mermaid 数据
    const mermaidDiagrams = file.data?.mermaidDiagrams || [];

    if (mermaidDiagrams.length === 0) return;

    // 创建占位符到数据的映射
    const placeholderMap = new Map();
    mermaidDiagrams.forEach((diagram: any) => {
      placeholderMap.set(diagram.placeholder, diagram);
    });

    visit(tree, (node: any, index, parent) => {
      // 查找包含 Mermaid 占位符的文本节点
      if (node.type !== 'text') return;
      if (!parent || index === undefined) return;

      const text = node.value;
      if (!text || typeof text !== 'string') return;

      // 检查是否包含 Mermaid 占位符
      const mermaidPlaceholderPattern = /MERMAID_PLACEHOLDER_mermaid-diagram-\d+/g;
      const matches = text.match(mermaidPlaceholderPattern);

      if (!matches) return;

      // 如果整个文本就是一个占位符
      if (matches.length === 1 && text.trim() === matches[0]) {
        const diagram = placeholderMap.get(matches[0]);
        if (!diagram) return;

        // 创建 MermaidDiagram 组件节点
        const mermaidNode: HastElement = {
          type: 'element',
          tagName: 'MermaidDiagram',
          properties: {
            code: diagram.code,
            id: diagram.id
          },
          children: []
        };

        // console.log('🎨 mermaidRenderer: Creating MermaidDiagram element:', {
        //   id: diagram.id,
        //   codeLength: diagram.code.length
        // });

        // 替换文本节点为 MermaidDiagram 组件
        parent.children[index] = mermaidNode;
      } else {
        // 如果文本中混合了占位符和其他内容，需要分割处理
        const parts: any[] = [];
        let lastIndex = 0;

        matches.forEach(match => {
          const matchIndex = text.indexOf(match, lastIndex);

          // 添加占位符前的文本
          if (matchIndex > lastIndex) {
            parts.push({
              type: 'text',
              value: text.substring(lastIndex, matchIndex)
            });
          }

          // 添加 Mermaid 组件
          const diagram = placeholderMap.get(match);
          if (diagram) {
            parts.push({
              type: 'element',
              tagName: 'MermaidDiagram',
              properties: {
                code: diagram.code,
                id: diagram.id
              },
              children: []
            });
          }

          lastIndex = matchIndex + match.length;
        });

        // 添加剩余的文本
        if (lastIndex < text.length) {
          parts.push({
            type: 'text',
            value: text.substring(lastIndex)
          });
        }

        // 替换原节点
        parent.children.splice(index, 1, ...parts);
      }
    });
  };
}