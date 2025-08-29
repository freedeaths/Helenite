import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useGraphAPI, useFileAPI } from '../../hooks/useAPIs';
import { useUIStore } from '../../stores/uiStore';

export function StatusBar() {
  const { activeFile } = useVaultStore();
  const { isMobile } = useUIStore();
  const graphAPI = useGraphAPI();
  const fileAPI = useFileAPI();
  const [backlinksCount, setBacklinksCount] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // 计算当前文件的 backlinks 数量
  useEffect(() => {
    const calculateBacklinks = async () => {
      if (!activeFile) {
        setBacklinksCount(0);
        return;
      }

      try {
        const localGraph = await graphAPI.getLocalGraph(activeFile);
        
        // 找到当前文件节点
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
          // 计算指向当前文件的边数量（被引用数）
          const inboundLinks = localGraph.edges.filter(edge => 
            edge.to === currentFileNode.id && 
            // 排除标签连接，只计算文件连接
            localGraph.nodes.find(n => n.id === edge.from)?.group !== 'tag'
          );
          
          setBacklinksCount(inboundLinks.length);
        } else {
          setBacklinksCount(0);
        }
      } catch (error) {
        console.error('Failed to calculate backlinks:', error);
        setBacklinksCount(0);
      }
    };

    calculateBacklinks();
  }, [activeFile, graphAPI]);

  // 计算当前文件的单词数和字符数
  useEffect(() => {
    const calculateWordAndCharCount = async () => {
      if (!activeFile) {
        setWordCount(0);
        setCharCount(0);
        return;
      }

      try {
        // 获取文件原始内容
        const decodedPath = decodeURIComponent(activeFile);
        const content = await fileAPI.getFileContent(decodedPath);
        
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
        
      } catch (error) {
        console.error('Failed to calculate word/char count:', error);
        setWordCount(0);
        setCharCount(0);
      }
    };

    calculateWordAndCharCount();
  }, [activeFile, fileAPI]);

  // 有 bug，在浏览器模拟移动端正常显示状态栏，但在手机真机上不显示
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