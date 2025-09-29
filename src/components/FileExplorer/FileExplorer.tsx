import { useState, useEffect, useMemo } from 'react';
import { IconFolder, IconFile, IconChevronRight, IconChevronDown, IconSearch, IconX, IconHash } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';
import type { FileTree } from '../../services/interfaces/IFileTreeService';
import type { SearchResult } from '../../services/interfaces/ISearchAPI';

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

export function FileExplorer() {
  const {
    fileTree,
    isLoadingFileTree,
    error,
    navigateToFile,
    vaultService
  } = useVaultStore();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
      } catch {
        // console.warn('Failed to load expanded folders from localStorage:', error);
        // Fall back to default: all expanded
        setExpandedFolders(new Set(allFolderPaths));
      }
    }
  }, [fileTree]);

  // Search effect with debouncing
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      if (!vaultService) return;

      setIsSearching(true);
      try {
        const results = await vaultService.search(searchQuery);
        setSearchResults(results);
      } catch {
        // console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, vaultService]);

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
      } catch {
        // console.warn('Failed to save expanded folders to localStorage:', error);
      }

      return newExpanded;
    });
  };

  const handleFileSelect = (path: string) => {
    // 复制TOC的移动端处理逻辑 - 点击文件后关闭下拉菜单
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();

    if (isMobile) {
      setMobileDropdownOpen(false);
    }

    // 使用完整的导航逻辑：设置路由 + 加载文档内容
    navigateToFile(path);
  };

  // Handle search result click
  const handleSearchResultClick = (filePath: string) => {
    navigateToFile(filePath);

    // Close mobile drawer on file selection
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
    if (isMobile) {
      setMobileDropdownOpen(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Filter file tree based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileTree;

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

    return filterTree(fileTree);
  }, [fileTree, searchQuery]);

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

  const isTagSearch = searchQuery.startsWith('#');

  return (
    <div className="h-full flex flex-col">
      <div style={{ padding: '4px 12px' }}>
        {/* Search input box */}
        <div className="flex items-center gap-1">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search files or #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] rounded focus:outline-none focus:border-[var(--interactive-accent)] text-[var(--text-normal)] placeholder-[var(--text-muted)] h-8"
            />
          </div>

          {/* Clear button */}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-2 h-8 bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors rounded"
              title="Clear search"
            >
              <IconX size={14} />
            </button>
          )}

          {/* Search status indicator */}
          <div className="px-2 h-8 flex items-center">
            {isSearching ? (
              <div className="animate-spin w-4 h-4 border-2 border-[var(--interactive-accent)] border-t-transparent rounded-full"></div>
            ) : (
              <IconSearch size={14} className="text-[var(--text-muted)]" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {searchQuery.trim() ? (
          /* Search mode */
          isSearching ? (
            <div className="p-4 text-sm text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-[var(--interactive-accent)] border-t-transparent rounded-full"></div>
                Searching...
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-[var(--text-muted)] mb-2 px-2">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                {isTagSearch ? ' for tag' : ''} "{searchQuery}"
              </div>
              {searchResults.map((result, index) => (
                <div
                  key={`${result.filePath || 'unknown'}-${index}`}
                  className="mb-4 border border-[var(--background-modifier-border)] rounded-lg overflow-hidden hover:border-[var(--interactive-accent)] transition-colors"
                >
                  {/* File Header */}
                  <div
                    className="p-3 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] cursor-pointer hover:bg-[var(--background-modifier-hover)] transition-colors"
                    onClick={() => handleSearchResultClick(result.filePath || '')}
                  >
                    <div className="flex items-center gap-2">
                      {isTagSearch ? (
                        <IconHash size={14} className="text-[var(--interactive-accent)]" />
                      ) : (
                        <IconFile size={14} className="text-[var(--text-muted)]" />
                      )}
                      <span className="text-sm font-medium text-[var(--text-normal)]">
                        {result.fileName || result.filePath?.split('/').pop() || 'Unknown'}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">
                        {result.matchCount || result.matches?.length || 0} match{(result.matchCount || result.matches?.length || 0) !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {result.filePath || 'Unknown path'}
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="max-h-48 overflow-auto">
                    {(result.matches || []).slice(0, 5).map((match, matchIndex) => (
                      <div
                        key={matchIndex}
                        className="p-3 border-b border-[var(--background-modifier-border)] last:border-b-0 hover:bg-[var(--background-modifier-hover)] transition-colors cursor-pointer"
                        onClick={() => handleSearchResultClick(result.filePath || '')}
                      >
                        <div className="text-xs text-[var(--text-muted)] mb-1">
                          {match.lineNumber && `Line ${match.lineNumber}`}
                        </div>
                        <div
                          className="text-sm text-[var(--text-normal)] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: match.highlighted || match.content || '' }}
                        />
                      </div>
                    ))}
                    {(result.matchCount || result.matches?.length || 0) > 5 && (
                      <div className="p-2 text-center text-xs text-[var(--text-muted)]">
                        +{(result.matchCount || result.matches?.length || 0) - 5} more matches
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-[var(--text-muted)]">
              No results found for "{searchQuery}"
            </div>
          )
        ) : (
          /* File tree mode */
          <div className="p-2">
            <div className="text-xs text-[var(--text-muted)] mb-2 px-2">FILES</div>
            {fileTree.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)] p-2">
                Loading files...
              </div>
            ) : (
              filteredFiles.map((node) => (
                <FileTreeItem
                  key={node.path}
                  node={node}
                  level={0}
                  onFileSelect={handleFileSelect}
                  expandedFolders={expandedFolders}
                  onToggleExpand={handleToggleExpand}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
