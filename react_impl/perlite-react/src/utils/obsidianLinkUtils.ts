/**
 * Obsidian 内部链接解析工具
 */

export interface ParsedObsidianLink {
  type: 'file' | 'image' | 'embed';
  filePath: string;
  displayText?: string;
  isRelativePath?: boolean;
}

/**
 * 解析 Obsidian 内部链接
 * 支持格式：
 * - [[filename]] - 简单文件链接
 * - [[folder/filename]] - 带路径的文件链接  
 * - [[filename|display text]] - 带显示文本的链接
 * - ![[image.png]] - 图片嵌入
 * - ![[../../Attachments/image.png]] - 相对路径图片
 * - ![[file.gpx]] - GPX/KML 文件嵌入
 */
export function parseObsidianLink(linkText: string): ParsedObsidianLink | null {
  // 检查是否为嵌入语法 ![[...]]
  const isEmbed = linkText.startsWith('![[') && linkText.endsWith(']]');
  // 检查是否为普通链接 [[...]]
  const isLink = !isEmbed && linkText.startsWith('[[') && linkText.endsWith(']]');
  
  if (!isEmbed && !isLink) {
    return null;
  }
  
  // 提取链接内容
  const content = isEmbed 
    ? linkText.slice(3, -2)  // 移除 ![[]]
    : linkText.slice(2, -2); // 移除 [[]]
  
  // 解析显示文本 filename|display text
  const [filePath, displayText] = content.includes('|') 
    ? content.split('|', 2)
    : [content, undefined];
  
  // 判断文件类型
  const fileExtension = filePath.split('.').pop()?.toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExtension || '');
  const isTrack = ['gpx', 'kml'].includes(fileExtension || '');
  
  // 判断是否为相对路径
  const isRelativePath = filePath.startsWith('../') || filePath.startsWith('./');
  
  let type: 'file' | 'image' | 'embed';
  if (isEmbed) {
    type = isImage ? 'image' : 'embed';
  } else {
    type = 'file';
  }
  
  return {
    type,
    filePath: filePath.trim(),
    displayText: displayText?.trim(),
    isRelativePath
  };
}

/**
 * 解析文件路径，将相对路径转换为绝对路径
 */
export function resolveFilePath(
  linkPath: string, 
  currentFileDir: string, 
  vaultFiles: Array<{ path: string; name: string }>
): string | null {
  // 如果是相对路径，基于当前文件目录解析
  if (linkPath.startsWith('../') || linkPath.startsWith('./')) {
    const resolvedPath = new URL(linkPath, `file://${currentFileDir}/`).pathname;
    return resolvedPath;
  }
  
  // 如果包含完整路径，直接使用
  if (linkPath.includes('/')) {
    const fullPath = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
    return fullPath;
  }
  
  // 如果只是文件名，在 vault 中搜索
  const fileName = linkPath.includes('.') ? linkPath : `${linkPath}.md`;
  
  // 优先精确匹配
  let foundFile = vaultFiles.find(f => f.name === fileName);
  if (foundFile) {
    return foundFile.path;
  }
  
  // 模糊匹配（不区分大小写）
  foundFile = vaultFiles.find(f => 
    f.name.toLowerCase() === fileName.toLowerCase()
  );
  if (foundFile) {
    return foundFile.path;
  }
  
  // 部分匹配
  foundFile = vaultFiles.find(f => 
    f.name.toLowerCase().includes(fileName.toLowerCase().replace('.md', ''))
  );
  if (foundFile) {
    return foundFile.path;
  }
  
  return null;
}

/**
 * 创建文件路径索引，用于快速查找
 */
export function createFileIndex(files: Array<{ path: string; type: string }>) {
  const fileIndex = new Map<string, string>();
  
  files.forEach(file => {
    if (file.type === 'file') {
      const fileName = file.path.split('/').pop() || '';
      const nameWithoutExt = fileName.replace(/\.(md|txt)$/, '');
      
      // 索引完整文件名
      fileIndex.set(fileName.toLowerCase(), file.path);
      // 索引不带扩展名的文件名  
      fileIndex.set(nameWithoutExt.toLowerCase(), file.path);
      // 索引完整路径
      fileIndex.set(file.path.toLowerCase(), file.path);
    }
  });
  
  return fileIndex;
}

/**
 * 快速查找文件路径
 */
export function findFilePath(
  linkPath: string,
  fileIndex: Map<string, string>,
  currentFileDir?: string
): string | null {
  console.log(`🔍 findFilePath: searching for "${linkPath}" in index with ${fileIndex.size} entries`);
  
  // 处理相对路径
  if (currentFileDir && (linkPath.startsWith('../') || linkPath.startsWith('./'))) {
    try {
      const resolvedPath = new URL(linkPath, `file://${currentFileDir}/`).pathname;
      console.log(`🔍 Resolved relative path "${linkPath}" to "${resolvedPath}"`);
      return resolvedPath;
    } catch {
      return null;
    }
  }
  
  // 1. 直接查找
  const directMatch = fileIndex.get(linkPath.toLowerCase());
  if (directMatch) {
    console.log(`✅ Direct match found: "${linkPath}" → "${directMatch}"`);
    return directMatch;
  }
  
  // 2. 添加 .md 扩展名再查找
  const withMdExt = fileIndex.get(`${linkPath.toLowerCase()}.md`);
  if (withMdExt) {
    console.log(`✅ Match with .md extension: "${linkPath}.md" → "${withMdExt}"`);
    return withMdExt;
  }
  
  // 3. 移除扩展名再查找
  const withoutExt = linkPath.replace(/\.(md|txt)$/, '').toLowerCase();
  const withoutExtMatch = fileIndex.get(withoutExt);
  if (withoutExtMatch) {
    console.log(`✅ Match without extension: "${withoutExt}" → "${withoutExtMatch}"`);
    return withoutExtMatch;
  }
  
  // 4. 提取文件名部分进行查找 (处理 Plans/夏之北海道 → 夏之北海道)
  const fileName = linkPath.split('/').pop();
  if (fileName && fileName !== linkPath) {
    const fileNameMatch = fileIndex.get(fileName.toLowerCase());
    if (fileNameMatch) {
      console.log(`✅ Filename match: extracted "${fileName}" from "${linkPath}" → "${fileNameMatch}"`);
      return fileNameMatch;
    }
    
    // 也尝试添加 .md 扩展名
    const fileNameWithMd = fileIndex.get(`${fileName.toLowerCase()}.md`);
    if (fileNameWithMd) {
      console.log(`✅ Filename with .md match: "${fileName}.md" → "${fileNameWithMd}"`);
      return fileNameWithMd;
    }
  }
  
  // 5. 模糊匹配：查找包含链接路径的条目
  for (const [key, value] of fileIndex.entries()) {
    // 检查文件路径是否以链接路径结尾（处理部分路径匹配）
    if (key.endsWith(linkPath.toLowerCase()) || key.endsWith(`${linkPath.toLowerCase()}.md`)) {
      console.log(`✅ Fuzzy match: "${linkPath}" found in "${key}" → "${value}"`);
      return value;
    }
    
    // 检查是否包含链接路径的各个部分
    const linkParts = linkPath.toLowerCase().split('/');
    if (linkParts.length > 1) {
      const lastPart = linkParts[linkParts.length - 1];
      if (key.includes(lastPart) && key.includes(linkParts[0])) {
        console.log(`✅ Multi-part match: "${linkPath}" parts found in "${key}" → "${value}"`);
        return value;
      }
    }
  }
  
  console.log(`❌ No match found for "${linkPath}"`);
  return null;
}