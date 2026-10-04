interface MessageBridge { postMessage(message: string): void }
type AppWebViewWindow = Window & {
  logout?: MessageBridge;
  webkit?: { messageHandlers?: { logout?: MessageBridge } };
  ReactNativeWebView?: MessageBridge;
};

/** Notify the native host after an explicit, successful logout. */
export function notifyWebViewLogout(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window as AppWebViewWindow;
  const bridge = [host.logout,
    host.webkit?.messageHandlers?.logout,
    host.ReactNativeWebView].find(candidate => typeof candidate?.postMessage === 'function');
  if (!bridge) return false;
  try {
    // Send once, even when the host exposes multiple bridge interfaces.
    bridge.postMessage('logout');
    return true;
  } catch {
    // A disconnected native host must not prevent the completed web logout.
    return false;
  }
}
