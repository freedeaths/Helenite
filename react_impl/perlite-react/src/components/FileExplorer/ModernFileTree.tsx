import { useState, useCallback } from 'react';
import { IconFile, IconFolder, IconFolderOpen, IconChevronRight } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import type { FileTree } from '../../types/vault';

interface FileTreeNodeProps {
  node: FileTree;
  level: number;
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

function FileTreeNode({ node, level, onFileSelect, activeFile }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isActive = activeFile === node.path;

  const handleToggle = useCallback(() => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect(node.path);
    }
  }, [node.type, node.path, isExpanded, onFileSelect]);

  // 计算缩进：每级 16px
  const indentStyle = { paddingLeft: `${level * 16 + 8}px` };

  return (
    <div>
      <button
        onClick={handleToggle}
        className={`
          w-full text-left py-1 text-sm transition-all duration-150 ease-out border-0 bg-transparent
          ${isActive 
            ? 'bg-[var(--interactive-accent)] text-white font-medium' 
            : 'text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
          }
        `}
        style={indentStyle}
      >
        <div className="flex items-center gap-1">
          {node.type === 'folder' && (
            <IconChevronRight
              size={14}
              className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}
            />
          )}
          
          {node.type === 'folder' ? (
            isExpanded ? (
              <IconFolderOpen size={16} className="text-[var(--text-accent)]" />
            ) : (
              <IconFolder size={16} className="text-[var(--text-muted)]" />
            )
          ) : (
            <IconFile size={16} className="text-[var(--text-muted)]" />
          )}
          
          <span className="flex-1 truncate">
            {node.name.replace(/\.md$/, '')}
          </span>
        </div>
      </button>

      {node.type === 'folder' && node.children && isExpanded && (
        <div className="mt-1">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              activeFile={activeFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ModernFileTreeProps {
  files: FileTree[];
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

export function ModernFileTree({ files, onFileSelect, activeFile }: ModernFileTreeProps) {
  return (
    <div className="h-full overflow-auto p-2">
      {files.map((file) => (
        <FileTreeNode
          key={file.path}
          node={file}
          level={0}
          onFileSelect={onFileSelect}
          activeFile={activeFile}
        />
      ))}
    </div>
  );
}