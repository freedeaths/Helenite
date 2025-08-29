import { useState, useCallback, useEffect } from 'react';
import { IconFile, IconFolder, IconFolderOpen, IconChevronRight } from '@tabler/icons-react';
import { useFileTreeAPI } from '../../hooks/useAPIs';
import { useUIStore } from '../../stores/uiStore';
import type { FileTree } from '../../apis/interfaces';

interface FileTreeNodeProps {
  node: FileTree;
  level: number;
  onFileSelect: (path: string) => Promise<void>;
  activeFile: string | null;
}

function FileTreeNode({ node, level, onFileSelect, activeFile }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isActive = activeFile === node.path;

  const handleToggle = useCallback(async () => {
    if (node.type === 'folder') {
      setIsExpanded(!isExpanded);
    } else {
      console.log('ModernFileTree handleToggle - clicking file:', node.path);
      await onFileSelect(node.path);
      
      // 在手机端点击文件后收回抽屉 - 使用正确的 setMobileDropdownOpen
      const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
      if (isMobile) {
        setMobileDropdownOpen(false);
      }
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
            ? 'bg-[var(--background-modifier-active)] text-[var(--text-on-accent)] font-medium' 
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
  activeFile?: string | null;
  onFileSelect?: (path: string) => Promise<void>;
}

export function ModernFileTree({ files: propFiles, activeFile, onFileSelect }: ModernFileTreeProps) {
  const fileTreeAPI = useFileTreeAPI();
  const [files, setFiles] = useState<FileTree[]>(propFiles || []);
  const [loading, setLoading] = useState(!propFiles);
  const [error, setError] = useState<string | null>(null);

  // 加载文件树数据（如果没有通过props传入）
  useEffect(() => {
    if (propFiles) {
      setFiles(propFiles);
      setLoading(false);
      return;
    }

    const loadFileTree = async () => {
      try {
        setLoading(true);
        setError(null);
        const treeData = await fileTreeAPI.getFileTree();
        setFiles(treeData);
      } catch (err) {
        console.error('Failed to load file tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to load file tree');
      } finally {
        setLoading(false);
      }
    };

    loadFileTree();
  }, [fileTreeAPI, propFiles]);

  // 默认文件选择处理器
  const handleFileSelect = useCallback(async (path: string) => {
    try {
      await fileTreeAPI.selectFile(path);
      if (onFileSelect) {
        await onFileSelect(path);
      }
    } catch (err) {
      console.error('Failed to select file:', err);
    }
  }, [fileTreeAPI, onFileSelect]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-[var(--text-muted)] text-sm">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-red-500 text-sm text-center">
          <div className="font-medium">Failed to load files</div>
          <div className="mt-1 text-xs">{error}</div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-[var(--text-muted)] text-sm">No files found</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-2">
      {files.map((file) => (
        <FileTreeNode
          key={file.path}
          node={file}
          level={0}
          onFileSelect={handleFileSelect}
          activeFile={activeFile || null}
        />
      ))}
    </div>
  );
}