/**
 * NEXORA — PostContent.
 *
 * Renders post content as plain text. NEVER uses dangerouslySetInnerHTML
 * or interprets arbitrary HTML — user content is plain text on the
 * backend and must never become executable markup in the browser.
 *
 * Line breaks are preserved via `white-space: pre-wrap` so authors can
 * write multi-line posts that render naturally.
 */

function PostContent({ content }) {
  if (typeof content !== 'string' || content.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">
        (this post has no content)
      </p>
    );
  }
  return (
    <p className="whitespace-pre-wrap break-words text-[0.95rem] leading-relaxed text-slate-800">
      {content}
    </p>
  );
}

export default PostContent;
