// import { useVaultStore } from '../../stores/vaultStore';

export function StatusBar() {
  // const { activeFile, files } = useVaultStore();

  // Mock word count and character count
  const wordCount = 0;
  const charCount = 0;
  const backlinksCount = 0;

  return (
    <div className="h-6 bg-[var(--background-secondary)] border-t border-[var(--background-modifier-border)] flex items-center justify-between px-4 text-xs text-[var(--text-muted)]">
      <div className="flex items-center space-x-4">
        <span>{backlinksCount} backlinks</span>
      </div>
      
      <div className="flex items-center space-x-4">
        <span>{wordCount} words</span>
        <span>{charCount} characters</span>
      </div>
    </div>
  );
}