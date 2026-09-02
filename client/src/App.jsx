import AppRouter from './routes/AppRouter.jsx';

/**
 * Composition root only.
 *
 * Keeping App.jsx minimal means future concerns (providers, error boundaries,
 * global context) can be layered here without competing with routing logic.
 */
function App() {
  return <AppRouter />;
}

export default App;
