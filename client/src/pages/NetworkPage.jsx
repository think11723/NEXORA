import NetworkPageContent from '../components/network/NetworkPageContent.jsx';

/**
 * NEXORA — Network page.
 *
 * Thin wrapper so the route declaration can stay in AppRouter while the
 * actual body lives in a focused component under components/network/.
 */
function NetworkPage() {
  return <NetworkPageContent />;
}

export default NetworkPage;
