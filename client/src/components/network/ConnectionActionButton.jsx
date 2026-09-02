/**
 * NEXORA — ConnectionActionButton.
 *
 * Small wrapper that ensures connection mutations present as
 * accessible, properly-disabled buttons with the correct busy state.
 * The `connection` slice keeps a single `loading.mutation` flag so
 * only one connection action runs at a time across the page.
 */
function ConnectionActionButton({
  type = 'button',
  onClick,
  disabled = false,
  isBusy = false,
  variant = 'secondary',
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || isBusy;

  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variants = {
    primary:
      'bg-nexora-accent text-white hover:bg-nexora-accent-hover disabled:bg-slate-300',
    secondary:
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
  };

  const variantClass = variants[variant] || variants.secondary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isBusy ? 'true' : undefined}
      className={`${base} ${variantClass} ${className}`.trim()}
      {...rest}
    >
      {isBusy ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span>Working…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default ConnectionActionButton;
