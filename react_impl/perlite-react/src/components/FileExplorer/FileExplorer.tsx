import { useEffect, useState, useMemo } from 'react';
import { IconSearch, IconX } from '@tabler/icons-react';
import { TextInput, Box, Text, Center, Stack } from '@mantine/core';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';
import { FileService } from '../../services/fileService';
import { ModernFileTree } from './ModernFileTree';
import type { FileTree } from '../../types/vault';


export function FileExplorer() {
  const { files, activeFile, setActiveFile, setFiles, setLoading, setError } = useVaultStore();
  const { setMainContentView } = useUIStore();
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
    // 设置活动文件并切换到文件视图
    setActiveFile(path);
    setMainContentView('file');
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
      <div style={{ padding: '4px 12px' }}>
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
          <ModernFileTree
            files={filteredFiles}
            onFileSelect={handleFileSelect}
            activeFile={activeFile}
          />
        )}
      </div>
    </div>
  );
}