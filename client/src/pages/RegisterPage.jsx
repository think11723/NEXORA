import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import FormField from '../components/FormField';
import SubmitButton from '../components/SubmitButton';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, APP_TAGLINE } from '../constants';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function validate(values) {
  const errors = {};
  if (!values.firstName || !values.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }
  if (!values.lastName || !values.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }
  if (!values.email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < MIN_PASSWORD) {
    errors.password = `Password must be at least ${MIN_PASSWORD} characters.`;
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

function interpretApiError(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      formError: 'Unable to create your account. Please try again.',
      fields: {},
    };
  }
  const fields = {};
  if (payload.errors && typeof payload.errors === 'object') {
    for (const [k, v] of Object.entries(payload.errors)) {
      if (typeof v === 'string') fields[k] = v;
    }
  }
  return {
    formError:
      payload.message || 'Unable to create your account. Please try again.',
    fields,
  };
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [values, setValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field) {
    return (event) => {
      const next = { ...values, [field]: event.target.value };
      setValues(next);
      if (errors[field]) {
        const cleared = { ...errors };
        delete cleared[field];
        setErrors(cleared);
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
      await register({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });
      navigate('/', { replace: true });
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
      <section className="auth-card" aria-labelledby="register-title">
        <header className="auth-card__brand">
          <span className="auth-card__brand-mark" aria-hidden="true">
            N
          </span>
          <div className="auth-card__brand-text">
            <strong>{APP_NAME}</strong>
            <small>{APP_TAGLINE}</small>
          </div>
        </header>

        <h1 id="register-title" className="auth-card__title">
          Create your account
        </h1>
        <p className="auth-card__subtitle">
          Join NEXORA to start building your professional presence.
        </p>

        {formError ? (
          <div className="auth-form__error" role="alert">
            {formError}
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-row">
            <FormField
              label="First name"
              name="firstName"
              type="text"
              value={values.firstName}
              onChange={update('firstName')}
              autoComplete="given-name"
              required
              disabled={isSubmitting}
              error={errors.firstName}
            />
            <FormField
              label="Last name"
              name="lastName"
              type="text"
              value={values.lastName}
              onChange={update('lastName')}
              autoComplete="family-name"
              required
              disabled={isSubmitting}
              error={errors.lastName}
            />
          </div>

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
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            error={errors.password}
            hint={`At least ${MIN_PASSWORD} characters.`}
          />

          <FormField
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={update('confirmPassword')}
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            error={errors.confirmPassword}
          />

          <SubmitButton
            isSubmitting={isSubmitting}
            busyLabel="Creating account…"
          >
            Create account
          </SubmitButton>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-card__link">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
