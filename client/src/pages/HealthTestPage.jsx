import { useEffect, useState } from 'react';
import { fetchHealth } from '../services/healthService';

/**
 * Health test page.
 *
 * Calls the backend's /health endpoint through the shared API client so
 * the wiring can be verified without any business feature being live.
 */
function HealthTestPage() {
  const [status, setStatus] = useState('idle');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setStatus('loading');
      try {
        const data = await fetchHealth();
        if (!cancelled) {
          setPayload(data);
          setStatus('ok');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setStatus('error');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="page page--health">
      <h1 className="page__title">API Health Check</h1>
      <p className="page__subtitle">
        Live response from <code>GET /api/v1/health</code>
      </p>

      <div className="card">
        <h2 className="card__title">Status: {status}</h2>

        {status === 'loading' && <p className="card__body">Calling backend…</p>}

        {status === 'ok' && payload && (
          <pre className="card__code" data-testid="health-payload">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}

        {status === 'error' && (
          <div className="card__error">
            <p>
              The backend is unreachable. Make sure the API server is running.
            </p>
            <pre className="card__code">{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default HealthTestPage;
