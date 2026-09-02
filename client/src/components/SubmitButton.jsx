/**
 * Submit button with a busy state. Prevents double-submission while the
 * parent action is in flight. Pure presentation — the parent owns the
 * `isSubmitting` flag and the label text shown while busy.
 */
function SubmitButton({
  children,
  busyLabel = 'Please wait…',
  isSubmitting = false,
  disabled = false,
  type = 'submit',
  className = '',
  ...rest
}) {
  const isDisabled = disabled || isSubmitting;
  const classNames = [
    'btn',
    'btn--primary',
    'btn--block',
    isSubmitting ? 'btn--busy' : null,
    className || null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={classNames}
      aria-busy={isSubmitting ? 'true' : undefined}
      {...rest}
    >
      {isSubmitting ? (
        <>
          <span className="btn__spinner" aria-hidden="true" />
          <span>{busyLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default SubmitButton;
