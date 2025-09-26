import { useMemo, useState, useEffect } from 'react';
import { IconFile, IconX } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { useNewVaultStore } from '../../newStores/newVaultStore.js';
import { useNewUIStore } from '../../newStores/newUIStore.js';

/**
 * 新架构标签面板 - 完全复制老版本功能
 * 显示全局标签，支持点击展开文件列表，支持文件导航
 */
export function NewTagsPanel() {
  const { currentDocument, navigateToFile, vaultService } = useNewVaultStore();

  // 状态管理 - 复制老版本
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [tagFiles, setTagFiles] = useState<Array<{ fileName: string; filePath: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allTags, setAllTags] = useState<Array<{ tag: string; count: number }>>([]);

  // 从当前文档获取标签
  const currentTags = currentDocument?.metadata?.tags || [];

  // 初始化时获取所有标签
  useEffect(() => {
    if (vaultService) {
      loadAllTags();
    }
  }, [vaultService]);

  const loadAllTags = async () => {
    if (!vaultService) return;

    try {
      const tags = await vaultService.getAllTags();
      // console.log('📊 NewTagsPanel: 加载所有标签:', tags);
      // console.log('📊 NewTagsPanel: 第一个标签详细信息:', tags[0]);

      // 转换为带计数的格式
      const tagCounts = tags.map(tagData => {
        let tagName = tagData.tag || tagData.name || tagData.toString();
        // 移除开头的 # 符号，因为显示时会再加上
        if (tagName.startsWith('#')) {
          tagName = tagName.substring(1);
        }
        return {
          tag: tagName,
          count: tagData.count || 1
        };
      }).sort((a, b) => b.count - a.count); // 按频率排序

      // console.log('📊 NewTagsPanel: 转换后的标签:', tagCounts);
      // console.log('📊 NewTagsPanel: 第一个转换后标签详细:', tagCounts[0]);
      setAllTags(tagCounts);
    } catch (error) {
      console.error('❌ NewTagsPanel: 加载标签失败:', error);
    }
  };

  // 处理标签点击 - 展开/收起文件列表（复制老版本逻辑）
  const handleTagClick = async (tag: string) => {
    if (expandedTag === tag) {
      // 如果点击的是已展开的标签，则收起
      setExpandedTag(null);
      setTagFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      if (!vaultService) {
        throw new Error('VaultService not available');
      }

      // 获取包含该标签的文件列表
      const filePaths = await vaultService.getFilesByTag(tag);
      // console.log(`📊 NewTagsPanel: 标签 "${tag}" 的文件:`, filePaths);

      // 转换为文件信息数组
      const fileList = filePaths.map(filePath => {
        // 从路径中提取文件名（不含扩展名）
        const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') || filePath;
        return {
          fileName,
          filePath
        };
      }).sort((a, b) => a.fileName.localeCompare(b.fileName)); // 按文件名排序

      setExpandedTag(tag);
      setTagFiles(fileList);
    } catch (error) {
      console.error('❌ NewTagsPanel: 加载标签文件失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件名点击 - 导航但保持 Tags 状态（复制老版本逻辑）
  const handleFileClick = (filePath: string) => {
    // 复制TOC的移动端处理逻辑 - 点击文件后关闭下拉菜单
    const { isMobile, setMobileDropdownOpen } = useNewUIStore.getState();

    if (isMobile) {
      setMobileDropdownOpen(false);
    }

    navigateToFile(filePath);
    // 注意：不清除 expandedTag 和 tagFiles，保持展开状态
  };

  // 关闭文件列表
  const handleCloseFileList = () => {
    setExpandedTag(null);
    setTagFiles([]);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-[var(--text-normal)]">
            Tags
          </div>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        <div className="space-y-4">
          {/* Current Document Tags */}
          {currentTags.length > 0 && (
            <div>
              <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
                Current Document
              </div>
              <div className="flex flex-wrap gap-2">
                {currentTags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-[var(--interactive-accent)] text-white rounded text-xs cursor-pointer hover:bg-[var(--interactive-accent-hover)] transition-colors"
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Vault Tags - 完全复制老版本设计 */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
              All Tags ({allTags.length})
            </div>

            {allTags.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">
                No tags found in vault
              </div>
            ) : (
              <div className="space-y-1">
                {allTags.map(({ tag, count }) => {
                  const isCurrentTag = currentTags.includes(tag);
                  const isExpanded = expandedTag === tag;

                  return (
                    <div key={tag}>
                      {/* 标签项 - 复制老版本完整样式 */}
                      <div
                        className={`
                          flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors
                          ${isCurrentTag
                            ? 'bg-[var(--interactive-accent)] text-white hover:bg-[var(--interactive-accent-hover)]'
                            : isExpanded
                            ? 'bg-[var(--background-modifier-hover)] text-[var(--text-normal)]'
                            : 'bg-[var(--background-modifier-border)] text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
                          }
                        `}
                        onClick={() => handleTagClick(tag)}
                      >
                        <span className="text-sm">#{tag}</span>
                        <span className="text-xs opacity-70">
                          {count}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 展开的文件列表 */}
          {expandedTag && (
            <div className="border-t border-[var(--background-modifier-border)]" style={{ marginTop: '2rem', paddingTop: '1.5rem' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-[var(--text-muted)]">
                  Files with #{expandedTag} ({tagFiles.length})
                </div>
                <ActionIcon
                  variant="subtle"
                  onClick={handleCloseFileList}
                  size={16}
                  title="Close file list"
                >
                  <IconX size={12} />
                </ActionIcon>
              </div>

              {isLoading ? (
                <div className="text-sm text-[var(--text-muted)] flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-[var(--interactive-accent)] border-t-transparent rounded-full"></div>
                  Loading files...
                </div>
              ) : tagFiles.length === 0 ? (
                <div className="text-sm text-[var(--text-muted)]">
                  No files found with this tag
                </div>
              ) : (
                <div className="space-y-1 max-h-64 overflow-auto">
                  {tagFiles.map(({ fileName, filePath }) => (
                    <div
                      key={filePath}
                      className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-[var(--background-modifier-hover)] transition-colors"
                      onClick={() => handleFileClick(filePath)}
                      title={filePath}
                    >
                      <IconFile size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                      <span className="text-sm text-[var(--text-normal)] truncate">
                        {fileName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}