export const MENU_NAVIGATION_START = 'meta-menu-navigation-start';

/** Show the opaque cover before the native menu closes, even before React paints. */
export function beginMenuNavigation(href: string) {
  const destination = new URL(href, window.location.href);
  if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
  document.documentElement.dataset.menuNavigation = 'true';
  window.dispatchEvent(new CustomEvent(MENU_NAVIGATION_START, {
    detail: { from: window.location.pathname, source: window.location.pathname + window.location.search + window.location.hash, href: destination.pathname + destination.search + destination.hash },
  }));
}
