import { useCallback, useEffect, useState } from 'react';

/**
 * Hash routing, deliberately not a router.
 *
 * The app has no URL state today and react-router is declared but never
 * imported. A hash keeps modules linkable and makes back/forward work without
 * taking on a routing dependency mid-phase — if the app later needs nested
 * routes and loaders, `react-router-dom` is already in `package.json` and this
 * hook is the only thing to replace.
 */
export function useHashRoute(fallback: string): [string, (key: string) => void] {
  const read = useCallback((): string => {
    // Guarded because the same tree is rendered in Node for verification, where
    // `window` does not exist. The fallback is the correct answer either way.
    if (typeof window === 'undefined') return fallback;
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    return raw === '' ? fallback : raw;
  }, [fallback]);

  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onHashChange = () => setRoute(read());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [read]);

  const navigate = useCallback((key: string) => {
    // Assigning the hash pushes a history entry, so the browser's back button
    // returns to the previous module rather than leaving the app.
    if (window.location.hash !== `#/${key}`) window.location.hash = `#/${key}`;
    setRoute(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return [route, navigate];
}
