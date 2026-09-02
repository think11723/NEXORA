/**
 * Small form field wrapper. Pairs a label + input + inline error so pages
 * stay free of repetitive markup. Forwards refs to the underlying input.
 */
import { forwardRef, useId } from 'react';

const FormField = forwardRef(function FormField(
  {
    label,
    type = 'text',
    name,
    value,
    onChange,
    autoComplete,
    required = false,
    disabled = false,
    error,
    hint,
    trailingAccessory,
  },
  ref
) {
  const generatedId = useId();
  const inputId = name ? `field-${name}` : generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hint ? `${inputId}-hint` : null, errorId]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="form-field">
      <label htmlFor={inputId} className="form-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      <div
        className={`form-field__control${
          error ? ' form-field__control--error' : ''
        }`}
      >
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          className="form-field__input"
        />
        {trailingAccessory ? (
          <div className="form-field__trailing">{trailingAccessory}</div>
        ) : null}
      </div>
      {hint && !error ? (
        <p id={`${inputId}-hint`} className="form-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
});

export default FormField;
