import { useEffect, useState, useRef } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';
import { markdownProcessor } from '../../services/markdownProcessor';
import { useFileAPI } from '../../hooks/useAPIs';
import { MermaidDiagram } from './MermaidDiagram';
import { TrackMap } from './TrackMap';

import 'katex/dist/katex.min.css';
import './MarkdownViewer.css';

export function MarkdownViewer() {
  const { activeFile, setCurrentDocumentMetadata } = useVaultStore();
  const { theme } = useUIStore();
  const fileAPI = useFileAPI();
  const [content, setContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mermaidDiagrams, setMermaidDiagrams] = useState<Array<{ id: string; code: string; placeholder: string }>>([]);
  const [trackMaps, setTrackMaps] = useState<Array<{ id: string; code: string; placeholder: string; isFile?: boolean }>>([]);
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
  }, [theme]);

  useEffect(() => {
    if (activeFile) {
      setError(null);
      setLoading(true);
      
      // Decode URL-encoded file path before loading
      const decodedPath = decodeURIComponent(activeFile);
      console.log('Loading file:', { original: activeFile, decoded: decodedPath });
      
      // Load real file content using FileAPI
      fileAPI.getFileContent(decodedPath)
        .then((realContent) => {
          setContent(realContent);
          console.log(`📄 Loaded real content for ${activeFile}: ${realContent.length} chars`);
          
          // Process markdown content with our comprehensive processor
          // Simplified version without file index dependency
          return markdownProcessor.processWithMetadata(
            realContent,
            decodedPath // current file path for relative link resolution
          );
        })
        .then((result) => {
          setRenderedContent(result.html);
          setCurrentDocumentMetadata(result.metadata); // Store in global state for TOC
          setMermaidDiagrams(result.mermaidDiagrams);
          setTrackMaps(result.trackMaps);
          console.log('Processed markdown metadata:', result.metadata);
          console.log('Found Mermaid diagrams:', result.mermaidDiagrams);
          console.log('Found track maps:', result.trackMaps);
        })
        .catch((err) => {
          console.error('File loading or markdown processing error:', err);
          setError(`无法加载文件: ${activeFile}`);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setContent('');
      setRenderedContent('');
      setError(null);
      setCurrentDocumentMetadata(null); // Clear metadata when no file
      setMermaidDiagrams([]);
      setTrackMaps([]);
    }
  }, [activeFile, fileAPI, setCurrentDocumentMetadata]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">正在加载...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">错误: {error}</div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">选择一个文件开始阅读</div>
        </div>
      );
    }

    // 渲染处理后的 Markdown 内容，包括 Mermaid 图表和 GPX 地图
    if (renderedContent) {
      // Split HTML at placeholders and insert React components
      const parts = [];
      let currentHTML = renderedContent;
      let partIndex = 0;

      // Create a combined list of all components to insert, sorted by position
      const allComponents: Array<{
        index: number;
        type: 'mermaid' | 'track';
        data: { id: string; code: string; placeholder: string; isFile?: boolean };
      }> = [];

      // Add Mermaid diagrams
      mermaidDiagrams.forEach((diagram) => {
        const placeholder = `MERMAID_PLACEHOLDER_${diagram.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'mermaid', data: diagram });
        }
      });

      // Add track maps  
      trackMaps.forEach((map) => {
        const placeholder = `TRACK_PLACEHOLDER_${map.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'track', data: map });
        }
      });

      // Sort by position in the HTML
      allComponents.sort((a, b) => a.index - b.index);

      // Process components in order
      allComponents.forEach((component) => {
        const { type, data } = component;
        const placeholder = type === 'mermaid' 
          ? `MERMAID_PLACEHOLDER_${data.id}` 
          : `TRACK_PLACEHOLDER_${data.id}`;
        const placeholderIndex = currentHTML.indexOf(placeholder);
        
        if (placeholderIndex !== -1) {
          // Add HTML before placeholder
          if (placeholderIndex > 0) {
            const htmlBefore = currentHTML.substring(0, placeholderIndex);
            parts.push(
              <div
                key={`html-${partIndex++}`}
                dangerouslySetInnerHTML={{ __html: htmlBefore }}
              />
            );
          }
          
          // Add component
          if (type === 'mermaid') {
            parts.push(
              <MermaidDiagram
                key={data.id}
                code={data.code}
                className="mermaid-diagram"
              />
            );
          } else {
            parts.push(
              <TrackMap
                key={data.id}
                code={data.code}
                isFile={data.isFile}
                className="track-map"
              />
            );
          }
          
          // Update currentHTML to remaining part
          currentHTML = currentHTML.substring(placeholderIndex + placeholder.length);
        }
      });

      // Add any remaining HTML
      if (currentHTML.trim()) {
        parts.push(
          <div
            key={`html-${partIndex}`}
            dangerouslySetInnerHTML={{ __html: currentHTML }}
          />
        );
      }

      return (
        <div className="markdown-viewer" ref={contentRef}>
          {/* File name as document title */}
          {activeFile && (
            <h1 className="text-2xl font-bold mb-6 text-[var(--text-normal)] border-b border-[var(--background-modifier-border)] pb-4">
              {decodeURIComponent(activeFile).split('/').pop()?.replace('.md', '') || 'Document'}
            </h1>
          )}
          {parts}
        </div>
      );
    }

    // Fallback for no rendered content
    return (
      <div className="markdown-viewer">
        {/* File name as document title */}
        {activeFile && (
          <h1 className="text-2xl font-bold mb-6 text-[var(--text-normal)] border-b border-[var(--background-modifier-border)] pb-4">
            {decodeURIComponent(activeFile).split('/').pop()?.replace('.md', '') || 'Document'}
          </h1>
        )}
        <pre className="whitespace-pre-wrap font-sans text-[var(--text-normal)] bg-transparent border-none p-0">
          {content}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div style={{ maxWidth: '1200px', padding: '1.5rem' }}>
        {renderContent()}
      </div>
    </div>
  );
}