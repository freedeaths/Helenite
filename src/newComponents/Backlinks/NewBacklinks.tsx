import React, { useEffect, useState } from 'react';
import { useNewVaultStore } from '../../newStores/newVaultStore.js';

interface BacklinkItem {
  fileName: string;
  link: string;
  relativePath: string;
  context?: string;
}

/**
 * 新架构反链组件 - 基于 VaultService 的数据访问
 * 显示指向当前文档的反向链接
 */
export function NewBacklinks() {
  const { currentDocument, activeFile } = useNewVaultStore();
  const [backlinks, setBacklinks] = useState<BacklinkItem[]>([]);

  useEffect(() => {
    if (currentDocument?.backlinks) {
      setBacklinks(currentDocument.backlinks);
    } else {
      setBacklinks([]);
    }
  }, [currentDocument]);

  const handleBacklinkClick = (backlink: BacklinkItem) => {
    // console.log('NewBacklinks: 反链点击', backlink);

    // TODO: 导航到源文档
    if (backlink.relativePath) {
      // console.log('导航到文档:', backlink.relativePath);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-medium text-[var(--text-normal)] mb-3">
        🔗 反向链接
      </div>

      {backlinks.length > 0 ? (
        <div className="flex-1 overflow-auto space-y-2">
          {backlinks.map((backlink, index) => (
            <div
              key={index}
              onClick={() => handleBacklinkClick(backlink)}
              className="p-3 bg-[var(--background-modifier-hover)] hover:bg-[var(--background-modifier-border)] rounded-lg cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-[var(--text-normal)] truncate">
                  📄 {backlink.fileName}
                </div>
                <div className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                  链接
                </div>
              </div>

              {backlink.link && (
                <div className="text-xs text-[var(--text-muted)] mb-1">
                  链接文本: "{backlink.link}"
                </div>
              )}

              {backlink.relativePath && (
                <div className="text-xs text-[var(--text-faint)] truncate">
                  路径: {backlink.relativePath}
                </div>
              )}

              {backlink.context && (
                <div className="text-xs text-[var(--text-muted)] mt-2 p-2 bg-[var(--background-primary)] rounded border-l-2 border-[var(--interactive-accent)]">
                  "{backlink.context}"
                </div>
              )}
            </div>
          ))}
        </div>
      ) : activeFile ? (
        <div className="text-sm text-[var(--text-muted)] italic">
          当前文档无反向链接
        </div>
      ) : (
        <div className="text-sm text-[var(--text-muted)] italic">
          选择一个文档查看反向链接
        </div>
      )}

      {/* 统计信息 */}
      <div className="mt-4 p-2 bg-[var(--background-modifier-hover)] rounded text-xs text-[var(--text-muted)]">
        <div className="flex justify-between items-center">
          <span>反链统计</span>
          <span>{backlinks.length} 个</span>
        </div>
        {backlinks.length > 0 && (
          <div className="mt-1 text-[var(--text-faint)]">
            来自 {new Set(backlinks.map(b => b.fileName)).size} 个不同文档
          </div>
        )}
      </div>

      {/* 调试信息 */}
      <div className="mt-auto pt-2 border-t border-[var(--background-modifier-border)] text-xs text-[var(--text-muted)]">
        <div>NewBacklinks: ✅</div>
        <div>当前文档: {activeFile ? '有' : '无'}</div>
        <div>反链数量: {backlinks.length}</div>
        <div>元数据: {currentDocument ? '✅' : '⏳'}</div>
      </div>
    </div>
  );
}