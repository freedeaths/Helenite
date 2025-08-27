import { useEffect, useState, useRef } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { markdownProcessor } from '../../services/markdownProcessor';
import { useFileAPI } from '../../hooks/useAPIs';
import { MermaidDiagram } from './MermaidDiagram';
import { UnifiedTrackMapSimple } from './UnifiedTrackMapSimple';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';
import './MarkdownViewer.css';

export function MarkdownViewer() {
  const { activeFile, setCurrentDocumentMetadata } = useVaultStore();
  const fileAPI = useFileAPI();
  const [content, setContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mermaidDiagrams, setMermaidDiagrams] = useState<Array<{ id: string; code: string; placeholder: string }>>([]);
  const [trackMaps, setTrackMaps] = useState<Array<{ id: string; code: string; placeholder: string; isFile?: boolean }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeFile) {
      setError(null);
      setLoading(true);
      
      // Load real file content using FileAPI
      fileAPI.getFileContent(activeFile)
        .then((realContent) => {
          setContent(realContent);
          console.log(`📄 Loaded real content for ${activeFile}: ${realContent.length} chars`);
          
          // Process markdown content with our comprehensive processor
          return markdownProcessor.processWithMetadata(realContent);
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
  }, [activeFile, fileAPI]);


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
              <UnifiedTrackMapSimple
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
          {parts}
        </div>
      );
    }

    // Fallback for no rendered content
    return (
      <div className="markdown-viewer">
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