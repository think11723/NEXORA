import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  MAX_ABOUT_LENGTH,
  MAX_CURRENT_POSITION_LENGTH,
  MAX_HEADLINE_LENGTH,
  MAX_INDUSTRY_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_URL_LENGTH,
  URL_PATTERN,
} from '../../constants/profileFields';

/**
 * NEXORA — ProfileEditModal.
 *
 * Modal editing experience for the profile. Owns its own draft state so
 * the parent profile object is never mutated directly. Validates the
 * draft locally before calling the backend; the backend is still the
 * authoritative validator.
 *
 * Behavior:
 *   - Escape closes the modal.
 *   - Cancel discards the draft and reverts to the original profile.
 *   - Save is disabled when nothing has changed OR when validation
 *     errors exist OR while a save is in flight.
 *   - Field-level errors are mapped from any 400 envelope the backend
 *     returns.
 */

const EMPTY_DRAFT = {
  headline: '',
  about: '',
  location: '',
  currentPosition: '',
  industry: '',
  profilePhoto: '',
  coverPhoto: '',
};

function profileToDraft(profile) {
  if (!profile || typeof profile !== 'object') return { ...EMPTY_DRAFT };
  return {
    headline: profile.headline ?? '',
    about: profile.about ?? '',
    location: profile.location ?? '',
    currentPosition: profile.currentPosition ?? '',
    industry: profile.industry ?? '',
    profilePhoto: profile.profilePhoto ?? '',
    coverPhoto: profile.coverPhoto ?? '',
  };
}

function validateDraft(draft) {
  const errors = {};

  if (draft.headline && draft.headline.length > MAX_HEADLINE_LENGTH) {
    errors.headline = `Headline must be at most ${MAX_HEADLINE_LENGTH} characters.`;
  }
  if (draft.about && draft.about.length > MAX_ABOUT_LENGTH) {
    errors.about = `About must be at most ${MAX_ABOUT_LENGTH} characters.`;
  }
  if (draft.location && draft.location.length > MAX_LOCATION_LENGTH) {
    errors.location = `Location must be at most ${MAX_LOCATION_LENGTH} characters.`;
  }
  if (
    draft.currentPosition &&
    draft.currentPosition.length > MAX_CURRENT_POSITION_LENGTH
  ) {
    errors.currentPosition = `Current position must be at most ${MAX_CURRENT_POSITION_LENGTH} characters.`;
  }
  if (draft.industry && draft.industry.length > MAX_INDUSTRY_LENGTH) {
    errors.industry = `Industry must be at most ${MAX_INDUSTRY_LENGTH} characters.`;
  }
  if (draft.profilePhoto && draft.profilePhoto.length > MAX_URL_LENGTH) {
    errors.profilePhoto = 'Photo URL is too long.';
  } else if (
    draft.profilePhoto &&
    !URL_PATTERN.test(draft.profilePhoto.trim())
  ) {
    errors.profilePhoto = 'Photo URL must start with http:// or https://';
  }
  if (draft.coverPhoto && draft.coverPhoto.length > MAX_URL_LENGTH) {
    errors.coverPhoto = 'Cover photo URL is too long.';
  } else if (draft.coverPhoto && !URL_PATTERN.test(draft.coverPhoto.trim())) {
    errors.coverPhoto = 'Cover photo URL must start with http:// or https://';
  }

  return errors;
}

function isDirty(original, draft) {
  const keys = Object.keys(EMPTY_DRAFT);
  for (const k of keys) {
    const a = (original?.[k] ?? '').trim();
    const b = (draft[k] ?? '').trim();
    if (a !== b) return true;
  }
  return false;
}

function interpretApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      formError: 'Unable to save your profile. Please try again.',
      fields: {},
    };
  }
  return {
    formError:
      payload.message || 'Unable to save your profile. Please try again.',
    fields:
      payload.errors && typeof payload.errors === 'object'
        ? { ...payload.errors }
        : {},
  };
}

const ProfileField = forwardRef(function ProfileField(
  { label, name, value, onChange, maxLength, error, hint, placeholder },
  ref
) {
  const inputId = `modal-field-${name}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');
  const len = typeof value === 'string' ? value.length : 0;

  return (
    <div className="form-field">
      <label htmlFor={inputId} className="form-field__label">
        {label}
        {maxLength ? (
          <span className="form-field__counter" aria-live="polite">
            {' '}
            ({len}/{maxLength})
          </span>
        ) : null}
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
          type="text"
          value={value ?? ''}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          className="form-field__input"
          autoComplete="off"
        />
      </div>
      {hint && !error ? (
        <p id={hintId} className="form-field__hint">
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

function ProfileTextArea({
  label,
  name,
  value,
  onChange,
  maxLength,
  error,
  hint,
  placeholder,
  rows = 4,
}) {
  const inputId = `modal-field-${name}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ');
  const len = typeof value === 'string' ? value.length : 0;

  return (
    <div className="form-field">
      <label htmlFor={inputId} className="form-field__label">
        {label}
        {maxLength ? (
          <span className="form-field__counter" aria-live="polite">
            {' '}
            ({len}/{maxLength})
          </span>
        ) : null}
      </label>
      <div
        className={`form-field__control${
          error ? ' form-field__control--error' : ''
        }`}
      >
        <textarea
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
          rows={rows}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy || undefined}
          className="form-field__input form-field__input--textarea"
          autoComplete="off"
        />
      </div>
      {hint && !error ? (
        <p id={hintId} className="form-field__hint">
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
}

function ProfileEditModal({ open, profile, onClose, onSave }) {
  const titleId = useId();
  const firstFieldRef = useRef(null);
  const previousActiveRef = useRef(null);

  const original = useMemo(() => profileToDraft(profile), [profile]);
  const [draft, setDraft] = useState(() => ({ ...original }));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Reset draft when the modal opens with a fresh profile snapshot.
  useEffect(() => {
    if (open) {
      setDraft({ ...original });
      setErrors({});
      setFormError(null);
      setIsSaving(false);
    }
  }, [open, original]);

  // Focus management + Escape-to-close.
  useEffect(() => {
    if (!open) return undefined;
    previousActiveRef.current = document.activeElement;

    const id = window.setTimeout(() => {
      firstFieldRef.current?.focus();
    }, 0);

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    }
    window.addEventListener('keydown', handleKey);

    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', handleKey);
      const prev = previousActiveRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function update(field) {
    return (event) => {
      const value = event.target.value;
      setDraft((d) => ({ ...d, [field]: value }));
      if (errors[field]) {
        setErrors((e) => {
          const next = { ...e };
          delete next[field];
          return next;
        });
      }
      if (formError) setFormError(null);
    };
  }

  function handleClose() {
    if (isSaving) return;
    onClose();
  }

  async function handleSave(event) {
    event.preventDefault();
    const validation = validateDraft(draft);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSaving(true);
    try {
      await onSave({
        headline: draft.headline.trim(),
        about: draft.about.trim(),
        location: draft.location.trim(),
        currentPosition: draft.currentPosition.trim(),
        industry: draft.industry.trim(),
        profilePhoto:
          draft.profilePhoto.trim() === '' ? null : draft.profilePhoto.trim(),
        coverPhoto:
          draft.coverPhoto.trim() === '' ? null : draft.coverPhoto.trim(),
      });
    } catch (err) {
      const interpreted = interpretApiError(err);
      setFormError(interpreted.formError);
      if (Object.keys(interpreted.fields).length > 0) {
        setErrors(interpreted.fields);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const dirty = isDirty(original, draft);
  const localErrors = validateDraft(draft);
  const hasBlockingLocalError = Object.keys(localErrors).length > 0;
  const canSave = dirty && !hasBlockingLocalError && !isSaving;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        // Click on backdrop (not on the modal body) closes the modal.
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="modal">
        <header className="modal__header">
          <h2 id={titleId} className="modal__title">
            Edit profile
          </h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Close edit dialog"
            onClick={handleClose}
            disabled={isSaving}
          >
            ×
          </button>
        </header>

        {formError ? (
          <div className="auth-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <form className="modal__form" onSubmit={handleSave} noValidate>
          <ProfileField
            ref={firstFieldRef}
            label="Headline"
            name="headline"
            value={draft.headline}
            onChange={update('headline')}
            maxLength={MAX_HEADLINE_LENGTH}
            error={errors.headline}
            placeholder="Senior Software Engineer at NEXORA"
          />

          <ProfileTextArea
            label="About"
            name="about"
            value={draft.about}
            onChange={update('about')}
            maxLength={MAX_ABOUT_LENGTH}
            error={errors.about}
            placeholder="A short summary about your professional background, interests, and goals."
            rows={5}
          />

          <ProfileField
            label="Location"
            name="location"
            value={draft.location}
            onChange={update('location')}
            maxLength={MAX_LOCATION_LENGTH}
            error={errors.location}
            placeholder="City, Country"
          />

          <ProfileField
            label="Current position"
            name="currentPosition"
            value={draft.currentPosition}
            onChange={update('currentPosition')}
            maxLength={MAX_CURRENT_POSITION_LENGTH}
            error={errors.currentPosition}
            placeholder="Software Engineer"
          />

          <ProfileField
            label="Industry"
            name="industry"
            value={draft.industry}
            onChange={update('industry')}
            maxLength={MAX_INDUSTRY_LENGTH}
            error={errors.industry}
            placeholder="Software"
          />

          <ProfileField
            label="Profile photo URL"
            name="profilePhoto"
            value={draft.profilePhoto}
            onChange={update('profilePhoto')}
            maxLength={MAX_URL_LENGTH}
            error={errors.profilePhoto}
            placeholder="https://example.com/me.jpg"
            hint="An http(s) URL. Uploads arrive in a later phase."
          />

          <ProfileField
            label="Cover photo URL"
            name="coverPhoto"
            value={draft.coverPhoto}
            onChange={update('coverPhoto')}
            maxLength={MAX_URL_LENGTH}
            error={errors.coverPhoto}
            placeholder="https://example.com/cover.jpg"
            hint="An http(s) URL. Uploads arrive in a later phase."
          />

          <footer className="modal__footer">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={!canSave}
              aria-busy={isSaving ? 'true' : undefined}
            >
              {isSaving ? (
                <>
                  <span className="btn__spinner" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </footer>

          {!dirty && (
            <p className="modal__hint" aria-live="polite">
              No changes to save.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export default ProfileEditModal;
