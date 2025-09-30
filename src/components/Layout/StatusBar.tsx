import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';

/**
 * 新架构状态栏 - 完全复制老版本功能
 * 显示当前文档的 backlinks 数量、单词数和字符数
 */
export function StatusBar() {
  const { activeFile, vaultService } = useVaultStore();
  const { isMobile } = useUIStore();
  const [backlinksCount, setBacklinksCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // 计算当前文件的 backlinks 数量 - 复制老版本逻辑
  useEffect(() => {
    const calculateBacklinks = async () => {
      if (!activeFile || !vaultService) {
        setBacklinksCount(0);
        return;
      }

      try {
        const localGraph = await vaultService.getLocalGraph({
          centerPath: activeFile,
          depth: 2
        });

        // 找到当前文件节点 - 复制老版本逻辑
        const decodedActiveFile = decodeURIComponent(activeFile);
        const normalizedPath = decodedActiveFile.replace('.md', '');
        const fileName = normalizedPath.split('/').pop() || normalizedPath;

        const currentFileNode = localGraph.nodes.find(node => {
          const normalizedDecodedFileName = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
          return node.title === normalizedDecodedFileName ||
                 node.title === normalizedPath ||
                 node.title === fileName ||
                 node.label === fileName;
        });

        if (currentFileNode) {
          // 计算指向当前文件的边数量（被引用数） - 复制老版本逻辑
          const inboundLinks = localGraph.edges.filter(edge =>
            edge.to === currentFileNode.id &&
            // 排除标签连接，只计算文件连接
            localGraph.nodes.find(n => n.id === edge.from)?.type !== 'tag'
          );

          setBacklinksCount(inboundLinks.length);
        } else {
          setBacklinksCount(0);
        }
      } catch {
        // console.error('❌ NewStatusBar: 计算 backlinks 失败:', error);
        setBacklinksCount(0);
      }
    };

    calculateBacklinks();
  }, [activeFile, vaultService]);

  // 计算当前文件的单词数和字符数 - 复制老版本逻辑
  useEffect(() => {
    const calculateWordAndCharCount = async () => {
      if (!activeFile || !vaultService) {
        setWordCount(0);
        setCharCount(0);
        return;
      }

      try {
        // 获取文件原始内容
        const content = await vaultService.getDocumentContent(activeFile);

        // 计算字符数（复刻 PHP strlen() 逻辑）
        const characters = content.length;
        setCharCount(characters);

        // 计算单词数（复刻 PHP str_word_count() 逻辑）
        // 移除 Markdown 语法，只计算实际内容的单词
        const cleanContent = content
          // 移除 frontmatter
          .replace(/^---\s*[\s\S]*?\s*---/, '')
          // 移除代码块
          .replace(/```[\s\S]*?```/g, '')
          // 移除行内代码
          .replace(/`[^`]*`/g, '')
          // 移除链接但保留链接文本: [text](url) -> text
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          // 移除图片: ![alt](url) -> alt
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
          // 移除 Markdown 标记
          .replace(/[#*_~`]/g, '')
          // 移除多余空白
          .replace(/\s+/g, ' ')
          .trim();

        // 统计单词（支持中英文混合）
        if (cleanContent) {
          // 匹配单词：英文单词 + 中文字符
          const words = cleanContent.match(/[\u4e00-\u9fff]|[a-zA-Z]+/g) || [];
          setWordCount(words.length);
        } else {
          setWordCount(0);
        }

      } catch {
        // console.error('❌ NewStatusBar: 计算单词/字符数失败:', error);
        setWordCount(0);
        setCharCount(0);
      }
    };

    calculateWordAndCharCount();
  }, [activeFile, vaultService]);

  // 完全复制老版本布局和样式
  return (
    <div className={`h-6 bg-[var(--background-secondary)] border-t border-[var(--background-modifier-border)] flex items-center justify-between px-4 text-xs text-[var(--text-muted)] ${isMobile ? 'mobile-safe-area-bottom' : ''}`}>
      <div className="flex items-center space-x-4">
        <span>{backlinksCount} backlinks</span>
      </div>

      <div className="flex items-center space-x-4">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
}