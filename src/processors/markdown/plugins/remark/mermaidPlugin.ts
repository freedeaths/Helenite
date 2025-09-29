/**
 * Mermaid 图表插件
 *
 * 提取 ```mermaid 代码块，转换为占位符，供后续 React 组件渲染
 */

import type { Root, Code } from 'mdast';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

export interface MermaidData {
  id: string;
  code: string;
  placeholder: string;
}

/**
 * Remark 插件：处理 Mermaid 代码块
 */
export function mermaidPlugin() {
  return function transformer(tree: Root, file: VFile) {
    const mermaidDiagrams: MermaidData[] = [];
    let diagramId = 0;

    visit(tree, 'code', (node: Code, index, parent) => {
      // 只处理 mermaid 语言的代码块
      if (node.lang !== 'mermaid') return;
      if (!parent || index === undefined) return;

      // 生成唯一 ID 和占位符
      const id = `mermaid-diagram-${diagramId++}`;
      const placeholder = `MERMAID_PLACEHOLDER_${id}`;

      // 存储 Mermaid 数据
      const mermaidData: MermaidData = {
        id,
        code: node.value.trim(),
        placeholder
      };
      mermaidDiagrams.push(mermaidData);

      // 将代码块替换为占位符文本节点
      const placeholderNode = {
        type: 'text' as const,
        value: placeholder
      };

      parent.children[index] = placeholderNode;
    });

    // 将 Mermaid 数据附加到文件数据中，供后续使用
    if (!file.data) file.data = {};
    file.data.mermaidDiagrams = mermaidDiagrams;
  };
}

/**
 * 从处理后的 HTML 中提取 Mermaid 占位符并替换为组件占位符
 */
export function extractMermaidFromHTML(html: string, mermaidDiagrams: MermaidData[] = []) {
  const processedHtml = html;
  const foundDiagrams: MermaidData[] = [];

  // 查找 HTML 中的 Mermaid 占位符
  mermaidDiagrams.forEach((diagram) => {
    const placeholder = `MERMAID_PLACEHOLDER_${diagram.id}`;
    if (processedHtml.includes(placeholder)) {
      foundDiagrams.push(diagram);
    }
  });

  return {
    html: processedHtml,
    mermaidDiagrams: foundDiagrams
  };
}