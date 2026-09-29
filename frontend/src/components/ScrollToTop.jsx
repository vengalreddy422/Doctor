import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component:
 * Automatically resets window scroll to the top on route transitions,
 * while respecting hash links (e.g., #doctor-list) when specified.
 */
const ScrollToTop = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Allow DOM to settle before scrolling to hash target
      setTimeout(() => {
        const targetElement = document.querySelector(hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 50);
    } else {
      // Instant reset to top so the new page always starts cleanly at the top
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant',
      });
    }
  }, [pathname, hash]);

  return null;
};

export default ScrollToTop;
