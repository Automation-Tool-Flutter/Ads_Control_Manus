/** Only top-level destinations retain the mobile tab bar. */
export function hasMobileTabBar(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return ['/', '/accounts', '/businesses', '/pages', '/settings'].includes(path);
}
