import { useEffect, useRef } from 'react';

/**
 * Makes the phone's Back button close the top-most open layer (a card, a dialog,
 * an inner screen) instead of leaving the site.
 *
 * Safari on iPhone drops history entries that a page adds without a tap behind them, and a
 * layer is opened from a React effect, a moment after the tap. So the entry is added
 * ahead of time, inside the tap itself (a capture listener on the document runs before the
 * button's own handler): there is always one spare entry, and opening a layer just claims it.
 */

interface Layer {
  close: () => void;
}

const stack: Layer[] = [];
let entries = 0; // history entries added by this module and still in the history
let ignorePops = 0;
let listening = false;

function onPopState() {
  const had = entries > 0;
  if (had) entries--;
  if (ignorePops > 0) {
    ignorePops--; // this event came from us trimming a spare entry
    return;
  }
  const layer = stack.pop();
  if (layer) {
    layer.close();
  } else if (had) {
    history.back(); // only a spare entry was used up: carry on and leave, as Back normally would
  }
}

/** Adds the spare entry; called inside a tap. */
function ensureSpare() {
  if (entries > stack.length) return;
  history.pushState({ derangLayer: true }, '');
  entries++;
}

function listen() {
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', onPopState);
  for (const type of ['pointerup', 'touchend', 'click'] as const) {
    document.addEventListener(type, ensureSpare, { capture: true, passive: true });
  }
}

function push(close: () => void): () => void {
  listen();
  const layer: Layer = { close };
  stack.push(layer);
  if (entries < stack.length) ensureSpare(); // opened without a tap (e.g. by a timer): best effort
  return () => {
    const index = stack.indexOf(layer);
    if (index === -1) return; // already closed by the Back button
    stack.splice(index, 1);
    // Closed with its own button: keep one spare entry for the next layer, drop any others.
    if (entries > stack.length + 1) {
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
