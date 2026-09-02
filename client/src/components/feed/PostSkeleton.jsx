/**
 * NEXORA — PostSkeleton.
 *
 * Shimmering placeholders matching PostCard's layout, used during
 * initial feed loading and load-more.
 */
function PostSkeleton() {
  return (
    <div
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      role="status"
      aria-busy="true"
    >
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 flex-shrink-0 animate-pulse rounded-full bg-slate-200" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="mt-3 h-3 w-1/4 animate-pulse rounded bg-slate-200" />
    </div>
  );
}

export default PostSkeleton;
