import React, { useMemo } from 'react';
import { useNewUIStore } from '../../newStores/newUIStore.js';
import { useNewVaultStore } from '../../newStores/newVaultStore.js';
import { NewContentViewer } from '../ContentViewer/NewContentViewer.js';
import { NewGlobalGraph } from '../Graph/NewGlobalGraph.js';
import { NewViewHeader } from './NewViewHeader.js';

/**
 * 新架构主内容区组件 - 基于 VaultService 的数据访问
 * 复制老版本功能，支持内容查看和全局图谱切换
 */
export function NewMainContent() {
  const { mainContentView } = useNewUIStore();
  const { activeFile } = useNewVaultStore();

  // Memoize the ContentViewer at the top level to prevent unnecessary re-renders
  // Must be called unconditionally to follow React hooks rules
  const memoizedContentViewer = useMemo(() => {
    if (!activeFile) return null;
    return <NewContentViewer filePath={activeFile} />;
  }, [activeFile]);

  // console.log('NewMainContent: render', {
  //   mainContentView,
  //   activeFile,
  //   hasActiveFile: !!activeFile
  // });

  return (
    <div className="h-full flex flex-col bg-[var(--background-primary)]">
      {/* Header - sticky positioning within the main content area */}
      <div className="sticky top-0 z-[100] bg-[var(--background-secondary)]">
        <NewViewHeader />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mainContentView === 'globalGraph' ? (
          <NewGlobalGraph />
        ) : (
          <>
            {activeFile ? (
              memoizedContentViewer
            ) : (
              <div className="flex items-center justify-center h-full min-h-96">
                <div className="text-center text-[var(--text-muted)] max-w-2xl mx-auto px-6">
                  <h2 className="text-2xl font-bold mb-4">Welcome to Helenite</h2>
                  <p>Select a file from the sidebar to get started</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}