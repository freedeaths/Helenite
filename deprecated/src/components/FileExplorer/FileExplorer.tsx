import { useEffect, useState, useMemo } from 'react';
import { IconSearch, IconX, IconFile, IconHash } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import { VAULT_PATH, getMetadataUrl } from '../../config/vaultConfig';
import { fetchVault } from '../../utils/fetchWithAuth';
import { useUIStore } from '../../stores/uiStore';
import { navigateToFile } from '../../utils/routeUtils';
import { useFileTreeAPI } from '../../hooks/useAPIs';
import { useSearch } from '../../apis/hooks/useSearchAPI';
import { ModernFileTree } from './ModernFileTree';
import type { FileTree } from '../../apis/interfaces/IFileTreeAPI';
import type { SearchResult } from '../../apis/interfaces/ISearchAPI';


export function FileExplorer() {
  const { files, activeFile, setFiles, setMetadata, setLoading, setError } = useVaultStore();
  const fileTreeAPI = useFileTreeAPI();
  const { search } = useSearch();
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

      // 使用真实的 FileTreeAPI 加载文件树
      const fileStructure = await fileTreeAPI.getFileTree();
      setFiles(fileStructure);

      // 同时加载并存储 metadata 到 vaultStore
      const metadataArray = await loadMetadata();
      if (metadataArray) {
        const metadataMap = buildMetadataMap(metadataArray);
        setMetadata(metadataMap);
        console.log('Loaded metadata for tags:', Object.keys(metadataMap).length, 'files');
      }

    } catch (error) {
      console.error('Failed to load files:', error);
      setError(error instanceof Error ? error.message : '加载文件失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载 metadata.json
  const loadMetadata = async () => {
    try {
      const response = await fetchVault(getMetadataUrl());
      if (!response.ok) {
        console.warn('Metadata file not found');
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to load metadata:', error);
      return null;
    }
  };

  // 将 metadata 数组转换为 path -> FileMetadata 的映射
  const buildMetadataMap = (metadataArray: any[]) => {
    const metadataMap: Record<string, any> = {};

    metadataArray.forEach(item => {
      if (item.relativePath) {
        const normalizedPath = `/${item.relativePath}`;
        metadataMap[normalizedPath] = {
          title: item.fileName,
          tags: item.tags || [],
          aliases: item.aliases || [],
          frontmatter: item.frontmatter || {},
          headings: item.headings || [],
          links: item.links || [],
          backlinks: item.backlinks || []
        };
      }
    });

    return metadataMap;
  };

  // 实时搜索（防抖）
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await search(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms 防抖

    return () => clearTimeout(timeoutId);
  }, [searchQuery, search]);

  const handleFileSelect = async (path: string) => {
    // 使用路由导航到文件
    navigateToFile(path);
    console.log('Selected file:', path);

    // 在手机端点击文件后收回抽屉 - 使用正确的 setMobileDropdownOpen
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
    if (isMobile) {
      setMobileDropdownOpen(false);
    }
  };

  const handleSearchResultClick = (filePath: string) => {
    navigateToFile(filePath);

    // 在手机端点击搜索结果后收回抽屉 - 使用正确的 setMobileDropdownOpen
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
    if (isMobile) {
      setMobileDropdownOpen(false);
    }
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

  const isTagSearch = searchQuery.startsWith('#');

  return (
    <div className="h-full flex flex-col">
      <div style={{ padding: '4px 12px' }}>
        {/* 搜索输入框 */}
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

          {/* 清除按钮 */}
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="px-2 h-8 bg-[var(--background-secondary)] border border-[var(--background-modifier-border)] text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors rounded"
              title="Clear search"
            >
              <IconX size={14} />
            </button>
          )}

          {/* 搜索状态指示 */}
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
          /* 搜索模式 */
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
                  key={`${result.filePath}-${index}`}
                  className="mb-4 border border-[var(--background-modifier-border)] rounded-lg overflow-hidden hover:border-[var(--interactive-accent)] transition-colors"
                >
                  {/* File Header */}
                  <div
                    className="p-3 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] cursor-pointer hover:bg-[var(--background-modifier-hover)] transition-colors"
                    onClick={() => handleSearchResultClick(result.filePath)}
                  >
                    <div className="flex items-center gap-2">
                      {isTagSearch ? (
                        <IconHash size={14} className="text-[var(--interactive-accent)]" />
                      ) : (
                        <IconFile size={14} className="text-[var(--text-muted)]" />
                      )}
                      <span className="text-sm font-medium text-[var(--text-normal)]">
                        {result.fileName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">
                        {result.matchCount} match{result.matchCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {result.filePath}
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="max-h-48 overflow-auto">
                    {result.matches.slice(0, 5).map((match, matchIndex) => (
                      <div
                        key={matchIndex}
                        className="p-3 border-b border-[var(--background-modifier-border)] last:border-b-0 hover:bg-[var(--background-modifier-hover)] transition-colors cursor-pointer"
                        onClick={() => handleSearchResultClick(result.filePath)}
                      >
                        <div className="text-xs text-[var(--text-muted)] mb-1">
                          {match.lineNumber && `Line ${match.lineNumber}`}
                        </div>
                        <div
                          className="text-sm text-[var(--text-normal)] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: match.highlighted }}
                        />
                      </div>
                    ))}
                    {result.matches.length > 5 && (
                      <div className="p-2 text-center text-xs text-[var(--text-muted)]">
                        +{result.matches.length - 5} more matches
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
          /* 文件树模式 */
          <div className="p-2">
            {files.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)] p-2">
                Loading files...
              </div>
            ) : (
              <ModernFileTree
                files={filteredFiles}
                onFileSelect={handleFileSelect}
                activeFile={activeFile}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}