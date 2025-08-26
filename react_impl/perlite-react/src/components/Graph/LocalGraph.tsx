
export function LocalGraph() {
  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Local Graph
      </div>
      <div className="text-sm text-[var(--text-muted)]">
        Interactive graph visualization will be implemented here using d3-force
      </div>
      
      {/* Placeholder for graph */}
      <div className="mt-4 h-48 bg-[var(--background-modifier-border)] rounded flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">🕸️</div>
          <div className="text-xs text-[var(--text-muted)]">Graph View</div>
        </div>
      </div>
    </div>
  );
}