
export function TagsPanel() {
  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Tags
      </div>
      <div className="space-y-2">
        <div className="text-[var(--text-muted)] text-sm">
          Tags from the current document and vault will appear here
        </div>
        
        {/* Mock tags */}
        <div className="space-y-1">
          <div className="inline-block px-2 py-1 bg-[var(--background-modifier-border)] rounded text-xs text-[var(--text-normal)] cursor-pointer hover:bg-[var(--interactive-accent)] hover:text-white">
            #travel
          </div>
          <div className="inline-block px-2 py-1 bg-[var(--background-modifier-border)] rounded text-xs text-[var(--text-normal)] cursor-pointer hover:bg-[var(--interactive-accent)] hover:text-white ml-2">
            #japan
          </div>
        </div>
      </div>
    </div>
  );
}