/**
 * Front Matter 解析工具
 * 用于提取 Markdown 文件中的 YAML front matter 数据
 */

export interface FrontMatterData {
  [key: string]: unknown;
}

export interface ParsedContent {
  frontMatter: FrontMatterData;
  content: string;
}

/**
 * 解析 Markdown 文件中的 front matter
 * @param rawContent 原始 Markdown 内容
 * @returns 解析后的 front matter 数据和正文内容
 */
export function parseFrontMatter(rawContent: string): ParsedContent {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
  const match = rawContent.match(frontMatterRegex);

  if (!match) {
    return {
      frontMatter: {},
      content: rawContent
    };
  }

  const [, yamlContent, markdownContent] = match;

  try {
    // 简单的 YAML 解析（支持基本格式）
    const frontMatter = parseSimpleYaml(yamlContent);

    return {
      frontMatter,
      content: markdownContent
    };
  } catch {
    // console.warn('Front Matter 解析失败:', error);
    return {
      frontMatter: {},
      content: rawContent
    };
  }
}

/**
 * 简单的 YAML 解析器（支持基本的键值对和数组）
 */
function parseSimpleYaml(yamlContent: string): FrontMatterData {
  const result: FrontMatterData = {};
  const lines = yamlContent.split('\n');

  let currentKey: string | null = null;
  let currentArray: unknown[] = [];
  let isInArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 检查是否是数组项
    if (trimmed.startsWith('- ')) {
      if (isInArray && currentKey) {
        const value = trimmed.substring(2).trim();
        currentArray.push(parseValue(value));
      }
      continue;
    }

    // 检查是否是键值对
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      // 如果之前在处理数组，先保存数组
      if (isInArray && currentKey) {
        result[currentKey] = currentArray;
        currentArray = [];
        isInArray = false;
      }

      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value === '') {
        // 可能是数组的开始
        currentKey = key;
        isInArray = true;
        currentArray = [];
      } else {
        // 直接的键值对
        result[key] = parseValue(value);
      }
    }
  }

  // 处理最后的数组
  if (isInArray && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * 解析 YAML 值的类型
 */
function parseValue(value: string): unknown {
  // 移除引号
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // 布尔值
  if (value === 'true') return true;
  if (value === 'false') return false;

  // 数字
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d+\.\d+$/.test(value)) return parseFloat(value);

  // null/undefined
  if (value === 'null' || value === '~') return null;

  // 字符串
  return value;
}