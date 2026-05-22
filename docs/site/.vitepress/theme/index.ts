import type { Router } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import './custom.css';

/**
 * Fire a Plausible "404" event whenever VitePress renders a missing page.
 *
 * Plausible CE's "404 error pages" toggle only enables ingestion — the page
 * itself must emit the event. VitePress signals a missing page via
 * `pageData.notFound = true` on the inertia-style route data; we hook
 * onAfterRouteChange (next tick so pageData has updated) and call the
 * global plausible() shim that config.mts registers.
 */
declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: Record<string, string> },
    ) => void;
  }
}

const fireIfNotFound = (router: Router) => {
  // Defer until the next tick — by then VitePress has updated pageData.
  setTimeout(() => {
    if (typeof window === 'undefined') return;
    const data = (router.route as unknown as { data?: { notFound?: boolean } })
      .data;
    if (data?.notFound) {
      window.plausible?.('404', {
        props: { path: window.location.pathname },
      });
    }
  }, 0);
};

export default {
  ...DefaultTheme,
  enhanceApp({ router }: { router: Router }) {
    if (typeof window === 'undefined') return;
    const prev = router.onAfterRouteChange;
    router.onAfterRouteChange = (to: string) => {
      prev?.(to);
      fireIfNotFound(router);
    };
    fireIfNotFound(router);
  },
};
