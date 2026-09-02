import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { store } from './store/store.js';
import './styles/global.css';

/**
 * Provider order:
 *   ReduxProvider
 *     → BrowserRouter (Redux is router-agnostic; keeping the store outside
 *       the router lets future non-router code use the same store)
 *       → AuthProvider (needs to be inside the router so route-aware
 *         components in route guards can use hooks like `useLocation`)
 *         → App
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>
);
