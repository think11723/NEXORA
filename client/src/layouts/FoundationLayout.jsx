import { Link } from 'react-router-dom';
import { APP_NAME, APP_TAGLINE } from '../constants';

/**
 * Foundation shell layout.
 *
 * Intentionally minimal — only used while real navigation and chrome are
 * built in later phases. Keeps the foundation UI honest about what it is.
 */
function FoundationLayout({ children }) {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link to="/" className="app-shell__brand">
          <span className="app-shell__brand-mark">N</span>
          <span className="app-shell__brand-text">
            <strong>{APP_NAME}</strong>
            <small>{APP_TAGLINE}</small>
          </span>
        </Link>
        <nav className="app-shell__nav" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/health-test">Health Test</Link>
        </nav>
      </header>

      <main className="app-shell__main">{children}</main>

      <footer className="app-shell__footer">
        <span>Phase 1 — foundation shell</span>
      </footer>
    </div>
  );
}

export default FoundationLayout;
