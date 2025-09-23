/**
 * 新架构内容查看器组件
 * 基于 VaultService 的文档内容显示，集成真实的 markdownProcessor
 */
import React, { useEffect, useState, useRef } from 'react';
import { useNewVaultStore } from '../../newStores/newVaultStore.js';
import { useNewUIStore } from '../../newStores/newUIStore.js';
import './NewContentViewer.css';
import 'katex/dist/katex.min.css';

interface NewContentViewerProps {
  filePath: string | null;
}

export const NewContentViewer = React.memo(function NewContentViewer({ filePath }: NewContentViewerProps) {
  const { vaultService, setCurrentDocument } = useNewVaultStore();
  const { theme } = useNewUIStore();
  const [reactContent, setReactContent] = useState<React.ReactElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [documentTitle, setDocumentTitle] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Dynamic highlight.js theme loading
  useEffect(() => {
    // Remove existing highlight.js theme
    const existingTheme = document.getElementById('highlight-theme');
    if (existingTheme) {
      existingTheme.remove();
    }

    // Load appropriate theme based on current theme
    const themeUrl = theme === 'dark'
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';

    const link = document.createElement('link');
    link.id = 'highlight-theme';
    link.rel = 'stylesheet';
    link.href = themeUrl;
    document.head.appendChild(link);

    return () => {
      // Clean up on unmount
      const themeToRemove = document.getElementById('highlight-theme');
      if (themeToRemove) {
        themeToRemove.remove();
      }
    };
  }, [theme]);

  useEffect(() => {
    // Skip if the content is already loaded for this file
    if (!filePath || !vaultService) {
      setReactContent(null);
      setFileTags([]);
      setDocumentTitle('');
      setLoading(false);
      setError(null);
      return;
    }

    const loadContent = async () => {
      setLoading(true);
      setError(null);

      try {
        // 通过 VaultService 获取文档内容并处理
        const documentContent = await vaultService.getDocumentContent(filePath);

        // 创建 MarkdownProcessor 实例
        const { MarkdownProcessor } = await import('../../processors/markdown/MarkdownProcessor.js');
        const processor = new MarkdownProcessor(vaultService);

        const processed = await processor.processContent(documentContent, filePath);

        console.log('Processed content type:', typeof processed.content);
        console.log('Is React element?', React.isValidElement(processed.content));

        setReactContent(processed.content);

        // 使用 VaultService 获取准确的文档信息（包括标签）
        const documentInfo = await vaultService.getDocumentInfo(filePath);

        // 设置标签和标题
        setFileTags(documentInfo.tags || []);
        setDocumentTitle(documentInfo.title || filePath.split('/').pop()?.replace('.md', '') || 'Untitled');

        // 更新 store 中的 currentDocument
        setCurrentDocument({
          path: filePath,
          content: documentContent,
          metadata: {
            ...processed.metadata,
            tags: documentInfo.tags || [],
            title: documentInfo.title
          }
        });

      } catch (err) {
        console.error('NewContentViewer: 加载失败', err);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [filePath, vaultService]);

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--background-primary)]">
        <div className="text-center text-[var(--text-muted)] max-w-md mx-auto px-6">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-xl font-semibold mb-4 text-[var(--text-normal)]">选择一个文件开始浏览</h2>
          <p className="text-sm leading-6">
            🚀 全新重写的 NewContentViewer 组件
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[var(--background-primary)]">

      {/* Content - 复制老版本的结构和样式 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--text-muted)]">正在加载...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">错误: {error}</div>
          </div>
        ) : reactContent ? (
          <div style={{ maxWidth: '1200px', padding: '1.5rem' }}>
            {/* 文档标题 - 复制老版本样式 */}
            {documentTitle && (
              <h1 className="text-3xl font-bold mb-4 text-[var(--text-normal)] leading-tight border-b border-[var(--background-modifier-border)] pb-4">
                {documentTitle}
              </h1>
            )}

            {/* 文档标签 - 完全复制老版本样式和行为 */}
            {fileTags.length > 0 && (
              <div className="frontmatter-tags mb-6">
                <span className="tags-label text-sm text-[var(--text-muted)] mr-2">Tags:</span>
                {fileTags.map((tag, index) => (
                  <span
                    key={index}
                    className="tag frontmatter-tag inline-block px-2 py-1 mr-2 mb-1 text-xs bg-[var(--background-secondary)] text-[var(--text-accent)] rounded-md border border-[var(--background-modifier-border)] hover:bg-[var(--interactive-hover)] cursor-pointer transition-colors"
                    data-tag={tag.replace('#', '')}
                    onClick={() => {
                      console.log('NewContentViewer: Tag clicked:', tag);
                      // TODO: Implement tag search/filter - 与老版本保持一致
                    }}
                  >
                    {tag.startsWith('#') ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            )}

            <div
              ref={contentRef}
              className="markdown-viewer"
              data-testid="markdown-content"
            >
              {reactContent}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-[var(--text-muted)]">选择一个文件开始阅读</div>
          </div>
        )}
      </div>

    </div>
  );
});