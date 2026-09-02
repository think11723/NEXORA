import FeedPageContent from '../components/feed/FeedPageContent.jsx';

/**
 * NEXORA — Feed page.
 *
 * Thin wrapper so the route declaration can stay in AppRouter while the
 * actual body lives in a focused component under components/feed/.
 */
function FeedPage() {
  return <FeedPageContent />;
}

export default FeedPage;
