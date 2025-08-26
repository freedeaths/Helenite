import { useEffect, useState, useMemo } from 'react';
import { IconChevronDown, IconChevronRight, IconFile, IconFolder, IconSearch, IconX } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import { FileService } from '../../services/fileService';
import type { FileTree } from '../../types/vault';

interface FileTreeItemProps {
  file: FileTree;
  level: number;
  onFileSelect: (path: string) => void;
  activeFile: string | null;
}

function FileTreeItem({ file, level, onFileSelect, activeFile }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2); // 默认展开前两级
  const [isHovered, setIsHovered] = useState(false);
  
  const handleClick = () => {
    if (file.type === 'file') {
      onFileSelect(file.path);
    } else {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'ArrowRight' && file.type === 'folder' && !isExpanded) {
      setIsExpanded(true);
    } else if (e.key === 'ArrowLeft' && file.type === 'folder' && isExpanded) {
      setIsExpanded(false);
    }
  };
  
  const isActive = activeFile === file.path;
  const paddingLeft = level * 16;
  
  return (
    <div>
      <div 
        className={`
          flex items-center px-2 py-1 text-sm cursor-pointer rounded transition-all duration-200
          ${isActive 
            ? 'bg-[var(--interactive-accent)] text-white shadow-sm' 
            : isHovered
              ? 'bg-[var(--background-modifier-hover)] text-[var(--text-normal)] transform translate-x-1'
              : 'text-[var(--text-normal)] hover:bg-[var(--background-modifier-border)]'
          }
          focus:outline-none focus:ring-2 focus:ring-[var(--interactive-accent)] focus:ring-opacity-50
        `}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
        role={file.type === 'folder' ? 'treeitem' : 'option'}
        aria-expanded={file.type === 'folder' ? isExpanded : undefined}
        aria-selected={isActive}
      >
        {file.type === 'folder' && (
          <div className={`mr-1 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}>
            <IconChevronDown size={14} />
          </div>
        )}
        
        <div className={`mr-2 transition-colors duration-200 ${
          isActive ? 'text-white' : isHovered ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'
        }`}>
          {file.type === 'folder' ? (
            <IconFolder size={16} className={isExpanded ? 'text-[var(--text-accent)]' : ''} />
          ) : (
            <IconFile size={16} />
          )}
        </div>
        
        <span className={`truncate transition-colors duration-200 ${
          isActive ? 'font-medium' : isHovered ? 'text-[var(--text-normal)]' : ''
        }`}>
          {file.name.replace(/\.md$/, '')}
        </span>
      </div>
      
      {file.type === 'folder' && file.children && (
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="mt-1">
            {file.children.map((child) => (
              <FileTreeItem
                key={child.path}
                file={child}
                level={level + 1}
                onFileSelect={onFileSelect}
                activeFile={activeFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FileExplorer() {
  const { files, activeFile, setActiveFile, setFiles, setLoading, setError } = useVaultStore();
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!initialized) {
      loadFiles();
      setInitialized(true);
    }
  }, [initialized]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const fileStructure = await FileService.loadVaultStructure();
      setFiles(fileStructure);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError(error instanceof Error ? error.message : '加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (path: string) => {
    // 暂时设置活动文件，不加载内容
    setActiveFile(path);
    console.log('Selected file:', path);
  };

  // 过滤文件树
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    
    const filterTree = (items: FileTree[]): FileTree[] => {
      return items.reduce((acc: FileTree[], item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (item.type === 'folder' && item.children) {
          const filteredChildren = filterTree(item.children);
          if (filteredChildren.length > 0 || matchesSearch) {
            acc.push({
              ...item,
              children: filteredChildren
            });
          }
        } else if (item.type === 'file' && matchesSearch) {
          acc.push(item);
        }
        
        return acc;
      }, []);
    };
    
    return filterTree(files);
  }, [files, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-[var(--background-modifier-border)]">
        {/* 搜索输入框 */}
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] rounded focus:outline-none focus:border-[var(--interactive-accent)] text-[var(--text-normal)] placeholder-[var(--text-muted)] h-8"
            />
          </div>
          
          {/* 清除按钮 */}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-2 h-8 bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors rounded"
              title="清除搜索"
            >
              <IconX size={14} />
            </button>
          )}
          
          {/* 搜索按钮 */}
          <button
            type="button"
            className="px-2 h-8 bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors rounded"
            title="搜索"
          >
            <IconSearch size={14} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2">
        {files.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] p-2">
            正在加载文件...
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-sm text-[var(--text-muted)] p-2 text-center">
            <IconSearch size={32} className="mx-auto mb-2 opacity-50" />
            没有找到匹配的文件
            {searchQuery && (
              <div className="mt-1 text-xs">
                搜索: "{searchQuery}"
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredFiles.map((file) => (
              <FileTreeItem
                key={file.path}
                file={file}
                level={0}
                onFileSelect={handleFileSelect}
                activeFile={activeFile}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}