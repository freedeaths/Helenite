import React, { useState } from 'react';
import { useVaultService } from '../../hooks/useVaultService.js';

/**
 * 新架构搜索面板组件 - 基于 VaultService 的数据访问
 * 支持全文搜索和标签搜索
 */
export function SearchPanel() {
  const { vaultService } = useVaultService();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'content' | 'tags'>('content');

  const handleSearch = async () => {
    if (!vaultService || !searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // TODO: 实现真实的搜索功能
      // console.log('NewSearchPanel: 执行搜索', { query: searchQuery, type: searchType });

      // 模拟搜索结果
      setSearchResults([
        {
          file: 'Welcome.md',
          matches: [
            { line: 1, content: `This contains ${searchQuery}`, highlighted: `This contains <mark>${searchQuery}</mark>` }
          ]
        }
      ]);
    } catch {
      // console.error('NewSearchPanel: 搜索失败', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* 搜索类型切换 */}
      <div className="flex rounded border border-[var(--background-modifier-border)]">
        <button
          onClick={() => setSearchType('content')}
          className={`flex-1 px-2 py-1 text-xs rounded-l ${
            searchType === 'content'
              ? 'bg-[var(--interactive-accent)] text-white'
              : 'bg-[var(--background-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)]'
          }`}
        >
          📄 内容
        </button>
        <button
          onClick={() => setSearchType('tags')}
          className={`flex-1 px-2 py-1 text-xs rounded-r ${
            searchType === 'tags'
              ? 'bg-[var(--interactive-accent)] text-white'
              : 'bg-[var(--background-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)]'
          }`}
        >
          🏷️ 标签
        </button>
      </div>

      {/* 搜索输入框 */}
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder={searchType === 'content' ? '搜索文档内容...' : '搜索标签...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 text-sm bg-[var(--background-primary)] border border-[var(--background-modifier-border)] rounded focus:outline-none focus:border-[var(--interactive-accent)] text-[var(--text-normal)]"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="px-3 py-2 text-sm bg-[var(--interactive-accent)] text-white rounded hover:bg-[var(--interactive-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? '🔍' : '搜索'}
        </button>
      </div>

      {/* 搜索结果 */}
      <div className="flex-1 overflow-auto">
        {searchResults.length > 0 ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-[var(--text-normal)]">
              搜索结果 ({searchResults.length})
            </div>
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="p-2 bg-[var(--background-modifier-hover)] rounded hover:bg-[var(--background-modifier-border)] cursor-pointer"
              >
                <div className="text-sm font-medium text-[var(--text-normal)] mb-1">
                  📄 {result.file}
                </div>
                {result.matches.map((match: Record<string, unknown>, matchIndex: number) => (
                  <div key={matchIndex} className="text-xs text-[var(--text-muted)]">
                    <span className="mr-2">第 {match.line} 行:</span>
                    <span dangerouslySetInnerHTML={{ __html: match.highlighted }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : searchQuery && !isSearching ? (
          <div className="text-sm text-[var(--text-muted)] italic">
            未找到匹配结果
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)] italic">
            输入关键词开始搜索
          </div>
        )}
      </div>

      {/* 调试信息 */}
      <div className="mt-auto pt-2 border-t border-[var(--background-modifier-border)] text-xs text-[var(--text-muted)]">
        <div>NewSearchPanel: ✅</div>
        <div>VaultService: {vaultService ? '✅' : '⏳'}</div>
        <div>搜索类型: {searchType}</div>
        <div>查询: {searchQuery || '空'}</div>
      </div>
    </div>
  );
}