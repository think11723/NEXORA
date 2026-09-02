/**
 * NEXORA — NetworkTabs.
 *
 * Lightweight tabs for the Network page. Each tab exposes the count of
 * items in that bucket so the user can see what's pending without
 * switching. The selected tab is controlled by the parent so URL deep-
 * linking can be added later.
 */
function NetworkTabs({ tabs, activeTabId, onSelect }) {
  return (
    <div
      role="tablist"
      aria-label="Network sections"
      className="flex flex-wrap gap-2 border-b border-slate-200"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`network-panel-${tab.id}`}
            onClick={() => onSelect(tab.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-accent focus-visible:ring-offset-2 ${
              isActive
                ? 'border-nexora-accent text-nexora-accent'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? (
              <span
                className={`ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-xs ${
                  isActive
                    ? 'bg-nexora-accent/10 text-nexora-accent'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default NetworkTabs;
