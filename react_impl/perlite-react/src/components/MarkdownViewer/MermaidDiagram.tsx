import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

let mermaidInitialized = false;

export function MermaidDiagram({ code, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [diagramId] = useState(`mermaid-${Math.random().toString(36).substr(2, 9)}`);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后继续执行
    
    const renderMermaid = async () => {
      if (!containerRef.current || !isMounted) {
        return;
      }

      try {
        if (!isMounted) return;
        setIsLoading(true);
        setError(null);

        // Initialize Mermaid if not already done
        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: 'inherit',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true
            },
            sequence: {
              useMaxWidth: true
            },
            gantt: {
              useMaxWidth: true
            }
          });
          mermaidInitialized = true;
        }

        // Clear previous content
        if (!isMounted || !containerRef.current) return;
        containerRef.current.innerHTML = '';

        // Render the diagram
        const { svg } = await mermaid.render(diagramId, code);
        
        // Check if component is still mounted before updating DOM
        if (!isMounted || !containerRef.current) {
          return;
        }
        
        containerRef.current.innerHTML = svg;
        
        // Apply responsive styling to the SVG and fix dimensions
        const svgElement = containerRef.current.querySelector('svg');
        if (svgElement && isMounted) {
          // Add a small delay to ensure SVG is rendered
          setTimeout(() => {
            if (!isMounted || !svgElement) return;
            
            try {
              const bbox = svgElement.getBBox();
              
              // Set proper viewBox and height attributes
              if (bbox.width > 0 && bbox.height > 0) {
                svgElement.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
                svgElement.setAttribute('height', bbox.height.toString());
              } else {
                // Fallback: use default dimensions for Mermaid diagrams
                svgElement.setAttribute('viewBox', '0 0 400 300');
                svgElement.setAttribute('height', '300');
              }
            } catch (e) {
              console.warn('Could not get SVG bbox:', e);
              // Fallback: set reasonable default dimensions
              svgElement.setAttribute('viewBox', '0 0 400 300');
              svgElement.setAttribute('height', '300');
            }
            
            svgElement.style.maxWidth = '100%';
            svgElement.style.height = 'auto';
            svgElement.style.display = 'block';
            svgElement.style.margin = '0 auto';
          }, 10); // Small delay to ensure DOM is ready
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="
              padding: 1rem;
              border: 1px solid var(--background-modifier-border);
              border-radius: 4px;
              background: var(--background-secondary);
              color: var(--text-muted);
              text-align: center;
            ">
              <p style="margin: 0; font-size: 14px;">
                ⚠️ Mermaid diagram error: ${err instanceof Error ? err.message : 'Unknown error'}
              </p>
              <details style="margin-top: 0.5rem;">
                <summary style="cursor: pointer; font-size: 12px;">Show source</summary>
                <pre style="
                  margin: 0.5rem 0 0 0;
                  padding: 0.5rem;
                  background: var(--background-primary);
                  border-radius: 2px;
                  font-size: 11px;
                  text-align: left;
                  overflow-x: auto;
                ">${code}</pre>
              </details>
            </div>
          `;
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(renderMermaid, 50);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code, diagramId]);

  return (
    <div 
      className={`mermaid-container ${className}`}
      style={{ 
        margin: '1rem 0',
        textAlign: 'center'
      }}
    >
      {isLoading && (
        <div style={{
          padding: '2rem',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          Rendering diagram...
        </div>
      )}
      <div ref={containerRef} />
    </div>
  );
}