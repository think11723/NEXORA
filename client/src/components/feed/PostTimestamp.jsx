/**
 * NEXORA — PostTimestamp.
 *
 * Formats a backend-supplied ISO timestamp as a human-readable relative
 * time (e.g. "just now", "3m ago", "Yesterday", "Mar 14"). Uses native
 * Date APIs only — no third-party library.
 *
 * The backend sends ISO 8601 timestamps. We do not assume timezone
 * beyond the browser's local timezone; relative differences are
 * timezone-safe.
 */

function formatRelative(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const now = Date.now();
  const diffMs = now - then.getTime();
  if (diffMs < 0) return 'just now';

  const sec = Math.floor(diffMs / 1000);
  if (sec < 30) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d ago`;

  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      then.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  });
}

function PostTimestamp({ iso, edited }) {
  const relative = formatRelative(iso);
  if (!relative) return null;
  return (
    <time dateTime={iso} title={iso} className="text-xs text-slate-500">
      {relative}
      {edited ? <span className="ml-1 italic">(edited)</span> : null}
    </time>
  );
}

export default PostTimestamp;
