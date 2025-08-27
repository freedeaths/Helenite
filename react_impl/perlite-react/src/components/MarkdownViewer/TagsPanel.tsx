
import { useMemo, useState } from 'react';
import { IconFile } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import { useTags } from '../../apis/hooks/useTagAPI';
import { navigateToFile } from '../../utils/routeUtils';

export function TagsPanel() {
  const { currentDocumentMetadata, metadata } = useVaultStore();
  const { getFilesByTag } = useTags();
  
  // 状态管理
  const [expandedTag, setExpandedTag] = useState<string | null>(null);
  const [tagFiles, setTagFiles] = useState<Array<{ fileName: string; filePath: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get tags from current document
  const currentTags = currentDocumentMetadata?.tags || [];

  // Get all tags from vault with file counts
  const allVaultTags = useMemo(() => {
    const tagCounts = new Map<string, number>();
    
    Object.values(metadata).forEach(fileMeta => {
      if (fileMeta.tags) {
        fileMeta.tags.forEach(tag => {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
      }
    });

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count); // Sort by frequency
  }, [metadata]);

  // 处理标签点击 - 展开/收起文件列表
  const handleTagClick = async (tag: string) => {
    if (expandedTag === tag) {
      // 如果点击的是已展开的标签，则收起
      setExpandedTag(null);
      setTagFiles([]);
      return;
    }

    setIsLoading(true);
    try {
      // 获取包含该标签的文件列表
      const filePaths = await getFilesByTag(tag);
      
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
      console.error('Failed to load files for tag:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件名点击 - 导航但保持 Tags 状态
  const handleFileClick = (filePath: string) => {
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

          {/* All Vault Tags */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="text-xs font-medium text-[var(--text-muted)] mb-2">
              All Tags ({allVaultTags.length})
            </div>
            
            {allVaultTags.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">
                No tags found in vault
              </div>
            ) : (
              <div className="space-y-1">
                {allVaultTags.map(({ tag, count }) => {
                  const isCurrentTag = currentTags.includes(tag);
                  const isExpanded = expandedTag === tag;
                  
                  return (
                    <div key={tag}>
                      {/* 标签项 */}
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