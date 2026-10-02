import { useEffect, useRef } from 'react';

/**
 * Makes the phone's Back button close the top-most open layer (a card, a dialog,
 * an inner screen) instead of leaving the site. Each open layer owns one history
 * entry: Back removes it and runs the layer's close handler; closing a layer with
 * its own button removes its entry again.
 */

interface Layer {
  close: () => void;
}

const stack: Layer[] = [];
let ignorePops = 0;
let listening = false;

function onPopState() {
  if (ignorePops > 0) {
    ignorePops--; // this event came from us taking an entry back
    return;
  }
  const layer = stack.pop();
  if (layer) layer.close();
}

function push(close: () => void): () => void {
  if (!listening) {
    window.addEventListener('popstate', onPopState);
    listening = true;
  }
  const layer: Layer = { close };
  stack.push(layer);
  history.pushState({ derangLayer: true }, '');
  return () => {
    const index = stack.indexOf(layer);
    if (index === -1) return; // already closed by the Back button
    stack.splice(index, 1);
    if (index === stack.length) {
      ignorePops++;
      history.back();
    }
  };
}

export function useBackLayer(active: boolean, onClose: () => void): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!active) return;
    return push(() => closeRef.current());
  }, [active]);
}
