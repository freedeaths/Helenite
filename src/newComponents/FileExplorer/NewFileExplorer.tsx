import { useState, useEffect } from 'react';
import { IconFolder, IconFile, IconChevronRight, IconChevronDown } from '@tabler/icons-react';
import { useNewVaultStore } from '../../newStores/newVaultStore';
import { useNewUIStore } from '../../newStores/newUIStore';
import type { FileTree } from '../../services/interfaces/IFileTreeService';

interface FileTreeItemProps {
  node: FileTree;
  level: number;
  onFileSelect: (path: string) => void;
  expandedFolders: Set<string>;
  onToggleExpand: (path: string) => void;
}

function FileTreeItem({ node, level, onFileSelect, expandedFolders, onToggleExpand }: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);

  const isFolder = node.type === 'folder';
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isFolder) {
      onToggleExpand(node.path);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <div
        className="flex items-center px-2 py-1 hover:bg-[var(--background-modifier-hover)] cursor-pointer text-[var(--text-normal)] text-sm"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isFolder && hasChildren && (
          <div className="w-4 h-4 flex items-center justify-center mr-1">
            {isExpanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </div>
        )}
        {!isFolder || !hasChildren ? <div className="w-4 mr-1" /> : null}

        <div className="w-4 h-4 flex items-center justify-center mr-2">
          {isFolder ? (
            <IconFolder size={16} className="text-[var(--text-accent)]" />
          ) : (
            <IconFile size={16} className="text-[var(--text-muted)]" />
          )}
        </div>

        <span className="truncate">{node.name}</span>
      </div>

      {isFolder && isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// localStorage key for storing expanded folders state
const EXPANDED_FOLDERS_KEY = 'helenite-expanded-folders';

// Helper function to get all folder paths from file tree
const getAllFolderPaths = (nodes: FileTree[]): string[] => {
  const paths: string[] = [];
  const traverse = (node: FileTree) => {
    if (node.type === 'folder') {
      paths.push(node.path);
      if (node.children) {
        node.children.forEach(traverse);
      }
    }
  };
  nodes.forEach(traverse);
  return paths;
};

export function NewFileExplorer() {
  const { fileTree, isLoadingFileTree, error, activeFile, navigateToFile } = useNewVaultStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Initialize expanded folders when fileTree loads
  useEffect(() => {
    if (fileTree.length > 0) {
      // Get all folder paths for default expansion
      const allFolderPaths = getAllFolderPaths(fileTree);

      try {
        // Try to load saved state from localStorage
        const savedExpanded = localStorage.getItem(EXPANDED_FOLDERS_KEY);
        if (savedExpanded) {
          const parsedExpanded = JSON.parse(savedExpanded);
          setExpandedFolders(new Set(parsedExpanded));
        } else {
          // If no saved state, default to all expanded
          setExpandedFolders(new Set(allFolderPaths));
        }
      } catch (error) {
        console.warn('Failed to load expanded folders from localStorage:', error);
        // Fall back to default: all expanded
        setExpandedFolders(new Set(allFolderPaths));
      }
    }
  }, [fileTree]);

  // Toggle folder expand/collapse state
  const handleToggleExpand = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(folderPath)) {
        newExpanded.delete(folderPath);
      } else {
        newExpanded.add(folderPath);
      }

      // Save to localStorage
      try {
        localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify([...newExpanded]));
      } catch (error) {
        console.warn('Failed to save expanded folders to localStorage:', error);
      }

      return newExpanded;
    });
  };

  const handleFileSelect = (path: string) => {
    // 复制TOC的移动端处理逻辑 - 点击文件后关闭下拉菜单
    const { isMobile, setMobileDropdownOpen } = useNewUIStore.getState();

    if (isMobile) {
      setMobileDropdownOpen(false);
    }

    // 使用完整的导航逻辑：设置路由 + 加载文档内容
    navigateToFile(path);
  };

  if (isLoadingFileTree) {
    return (
      <div className="p-4 text-center text-[var(--text-muted)]">
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-[var(--text-error)]">
        Error: {error}
      </div>
    );
  }

  if (fileTree.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--text-muted)]">
        No files found
      </div>
    );
  }

  return (
    <div className="p-2">
      <div className="text-xs text-[var(--text-muted)] mb-2 px-2">FILES</div>
      {fileTree.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          level={0}
          onFileSelect={handleFileSelect}
          expandedFolders={expandedFolders}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
}
