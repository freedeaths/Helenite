
export function TOC() {
  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Table of Contents
      </div>
      <div className="space-y-2 text-sm">
        <div className="text-[var(--text-muted)]">
          TOC will be automatically generated from markdown headings
        </div>
        
        {/* Mock TOC entries */}
        <div className="space-y-1">
          <div className="text-[var(--text-normal)] hover:text-[var(--interactive-accent)] cursor-pointer">
            # Heading 1
          </div>
          <div className="text-[var(--text-normal)] hover:text-[var(--interactive-accent)] cursor-pointer ml-4">
            ## Heading 2
          </div>
          <div className="text-[var(--text-normal)] hover:text-[var(--interactive-accent)] cursor-pointer ml-8">
            ### Heading 3
          </div>
        </div>
      </div>
    </div>
  );
}