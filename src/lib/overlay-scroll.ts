// Reference-counted because an AI action preview can open above an analysis dialog.
let locks = 0;
let restore: (() => void) | undefined;

export function lockOverlayScroll() {
  if (locks++ === 0) {
    const body = document.body;
    const previous = body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    restore = () => {
      body.style.overflow = previous;
      document.documentElement.style.overflow = rootOverflow;
    };
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--locks === 0) { restore?.(); restore = undefined; }
  };
}
