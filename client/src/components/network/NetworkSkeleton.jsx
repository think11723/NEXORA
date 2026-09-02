/**
 * NEXORA — NetworkSkeleton.
 *
 * Shimmering placeholders that match the Network page layout.
 */
function SkeletonRow() {
  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-200" />
        <div className="h-3 w-1/4 rounded bg-slate-200" />
      </div>
    </div>
  );
}

function NetworkSkeleton({ count = 4 }) {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export default NetworkSkeleton;
