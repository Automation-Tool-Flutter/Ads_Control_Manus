interface MessageBridge { postMessage(message: string): void | Promise<unknown> }
type AppWebViewWindow = Window & {
  logout?: MessageBridge | (() => void | Promise<unknown>);
  flutter_inappwebview?: { callHandler(name: string, ...args: unknown[]): Promise<unknown> };
  webkit?: { messageHandlers?: { logout?: MessageBridge } };
  ReactNativeWebView?: MessageBridge;
};

/** Matches the native handler's args[0]: an absolute HTTP(S) URL string. */
export async function openWebViewExternalBrowser(href: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const host = window as AppWebViewWindow;
  if (typeof host.flutter_inappwebview?.callHandler !== 'function') return false;
  try {
    const url = new URL(href, window.location.href);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    await host.flutter_inappwebview.callHandler('openExternalBrowser', url.href);
    return true;
  } catch {
    console.warn('[WebView] Could not open external browser.');
    return false;
  }
}

/** Delegate anchor clicks so links in newly rendered cards also use the native bridge. */
export function handleWebViewExternalLinkClick(event: MouseEvent, onFailure: () => void): boolean {
  if (typeof window === 'undefined' || event.defaultPrevented || event.button !== 0 ||
    event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
  const host = window as AppWebViewWindow;
  if (typeof host.flutter_inappwebview?.callHandler !== 'function') return false;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!link || link.hasAttribute('download')) return false;
  let url: URL;
  try { url = new URL(link.getAttribute('href')!, window.location.href); }
  catch { return false; }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
    url.origin === window.location.origin) return false;
  event.preventDefault();
  void openWebViewExternalBrowser(url.href).then(opened => { if (!opened) onFailure(); });
  return true;
}

/** Notify the native host after an explicit, successful logout. */
export async function notifyWebViewLogout(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const host = window as AppWebViewWindow;
  try {
    // The app registers addJavaScriptHandler(handlerName: 'logout').
    // Prefer that exact bridge, sending no URL or extra arguments.
    if (typeof host.flutter_inappwebview?.callHandler === 'function') {
      await host.flutter_inappwebview.callHandler('logout');
    } else if (typeof host.logout === 'function') {
      await host.logout();
    } else if (typeof host.logout?.postMessage === 'function') {
      await host.logout.postMessage('logout');
    } else if (typeof host.webkit?.messageHandlers?.logout?.postMessage === 'function') {
      await host.webkit.messageHandlers.logout.postMessage('logout');
    } else if (typeof host.ReactNativeWebView?.postMessage === 'function') {
      await host.ReactNativeWebView.postMessage('logout');
    } else {
      console.warn('[WebView] No logout bridge registered.');
      return false;
    }
    return true;
  } catch {
    console.warn('[WebView] Native logout bridge failed.');
    // A disconnected native host must not prevent the completed web logout.
    return false;
  }
}
