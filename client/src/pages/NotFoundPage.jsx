import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="page page--not-found">
      <h1 className="page__title">404</h1>
      <p className="page__subtitle">That route does not exist yet.</p>
      <Link to="/" className="page__link">
        ← Back to home
      </Link>
    </section>
  );
}

export default NotFoundPage;
