import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField';
import SubmitButton from '../components/SubmitButton';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, APP_TAGLINE } from '../constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(values) {
  const errors = {};
  if (!values.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  }
  return errors;
}

/**
 * Translate an API rejection payload into a page-level error and a map of
 * field-level errors. Backend envelope: `{ success, message, errors?, data? }`.
 */
function interpretApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return { formError: 'Unable to sign in. Please try again.', fields: {} };
  }
  const fields = {};
  if (payload.errors && typeof payload.errors === 'object') {
    for (const [k, v] of Object.entries(payload.errors)) {
      if (typeof v === 'string') fields[k] = v;
    }
  }
  let formError = payload.message;
  if (!formError) {
    formError = 'Unable to sign in. Please try again.';
  }
  return { formError, fields };
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field) {
    return (event) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      if (errors[field]) {
        const nextErrors = { ...errors };
        delete nextErrors[field];
        setErrors(nextErrors);
      }
      if (formError) setFormError(null);
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validation = validate(values);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setErrors({});
    setFormError(null);
    setIsSubmitting(true);
    try {
      await login({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const interpreted = interpretApiError(err);
      setFormError(interpreted.formError);
      if (Object.keys(interpreted.fields).length > 0) {
        setErrors(interpreted.fields);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title">
        <header className="auth-card__brand">
          <span className="auth-card__brand-mark" aria-hidden="true">
            N
          </span>
          <div className="auth-card__brand-text">
            <strong>{APP_NAME}</strong>
            <small>{APP_TAGLINE}</small>
          </div>
        </header>

        <h1 id="login-title" className="auth-card__title">
          Welcome back
        </h1>
        <p className="auth-card__subtitle">Sign in to continue to NEXORA.</p>

        {formError ? (
          <div className="auth-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <FormField
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={update('email')}
            autoComplete="email"
            required
            disabled={isSubmitting}
            error={errors.email}
          />
          <FormField
            label="Password"
            name="password"
            type="password"
            value={values.password}
            onChange={update('password')}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            error={errors.password}
          />

          <SubmitButton isSubmitting={isSubmitting} busyLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <p className="auth-card__footer">
          New to NEXORA?{' '}
          <Link to="/register" className="auth-card__link">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
