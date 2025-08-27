
import { useMemo } from 'react';
import { useVaultStore } from '../../stores/vaultStore';

export function TagsPanel() {
  const { currentDocumentMetadata, metadata } = useVaultStore();

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

  const handleTagClick = (tag: string) => {
    // TODO: Implement tag search functionality
    console.log('Search for tag:', tag);
  };

  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Tags
      </div>
      
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
        <div>
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
                return (
                  <div
                    key={tag}
                    className={`
                      flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors
                      ${isCurrentTag 
                        ? 'bg-[var(--interactive-accent)] text-white hover:bg-[var(--interactive-accent-hover)]' 
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}