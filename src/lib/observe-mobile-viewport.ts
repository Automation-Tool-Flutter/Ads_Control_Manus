/** Coalesce keyboard/browser-bar events and avoid layout writes while pinch-zooming. */
export function observeMobileViewport(element: HTMLElement, heightProperty: string, topProperty: string) {
  const viewport = window.visualViewport;
  let frame = 0, previousHeight = -1, previousTop = -1;
  const sync = () => {
    frame = 0;
    if (viewport && Math.abs(viewport.scale - 1) > .01) return;
    const height = Math.round(viewport?.height ?? window.innerHeight);
    const top = Math.round(viewport?.offsetTop ?? 0);
    if (height !== previousHeight) { element.style.setProperty(heightProperty, `${height}px`); previousHeight = height; }
    if (top !== previousTop) { element.style.setProperty(topProperty, `${top}px`); previousTop = top; }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
  sync();
  viewport?.addEventListener('resize', schedule);
  viewport?.addEventListener('scroll', schedule);
  window.addEventListener('resize', schedule);
  return () => {
    cancelAnimationFrame(frame);
    viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    element.style.removeProperty(heightProperty);
    element.style.removeProperty(topProperty);
  };
}
