/**
 * The cart.
 *
 * A tiny store rather than React context, because the cart badge in the header
 * and the cart panel on the menu page are in different branches of the tree and
 * a context provider high enough to cover both would re-render the whole site
 * on every quantity change.
 *
 * ── Why it survives a reload ───────────────────────────────────────────────
 * The realistic failure here is not a browser crash. It is a phone dropping to
 * one bar mid-order, the page reloading, and eleven dollars of chosen food
 * disappearing. Nobody rebuilds that cart; they close the tab. localStorage
 * costs one line and removes the whole failure.
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'galeyr.cart.v1';

export interface CartLine {
  menuItemId: string;
  name: string;
  /** Cents, as everywhere. Kept for display; the server re-prices on checkout. */
  priceCents: number;
  quantity: number;
  notes?: string;
}

export interface Cart {
  /**
   * One restaurant per cart.
   *
   * ── Why not a basket across restaurants ──────────────────────────────────
   * One order is one courier making one journey to one kitchen. Two restaurants
   * means two pickups, two prep times and two delivery fees — a different
   * product, not a longer list. Holding items from both would let a customer
   * build something that cannot be delivered and only discover it at checkout.
   */
  restaurantId: string | null;
  restaurantName: string | null;
  lines: CartLine[];
}

const EMPTY: Cart = { restaurantId: null, restaurantName: null, lines: [] };

function read(): Cart {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed = JSON.parse(raw) as Cart;
    if (!Array.isArray(parsed.lines)) return EMPTY;
    return parsed;
  } catch {
    /* Corrupt or unavailable storage — private browsing, a quota error, a
       half-written value. An empty cart is recoverable; a thrown exception on
       page load is a white screen. */
    return EMPTY;
  }
}

let state: Cart = typeof window === 'undefined' ? EMPTY : read();
const listeners = new Set<() => void>();

function commit(next: Cart): void {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* Storage full or blocked. The in-memory cart still works for this visit,
       which is the part that matters right now. */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Read the cart, re-rendering when it changes. */
export function useCart(): Cart {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => EMPTY,
  );
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                  */
/* -------------------------------------------------------------------------- */

export interface AddResult {
  ok: boolean;
  /** Set when the cart already holds another restaurant's food. */
  conflictWith?: string;
}

/**
 * Add an item.
 *
 * Refuses rather than silently clearing when the cart belongs to a different
 * restaurant. Emptying someone's basket without asking is the kind of thing
 * that gets noticed only after the order is placed; the caller shows a
 * confirmation and calls `replaceRestaurant` if the customer agrees.
 */
export function addItem(
  restaurantId: string,
  restaurantName: string,
  line: Omit<CartLine, 'quantity'>,
  quantity = 1,
): AddResult {
  if (state.restaurantId && state.restaurantId !== restaurantId && state.lines.length > 0) {
    return { ok: false, conflictWith: state.restaurantName ?? 'another restaurant' };
  }

  const lines = [...state.lines];
  const existing = lines.findIndex((l) => l.menuItemId === line.menuItemId);

  if (existing >= 0) {
    const current = lines[existing];
    if (current) lines[existing] = { ...current, quantity: current.quantity + quantity };
  } else {
    lines.push({ ...line, quantity });
  }

  commit({ restaurantId, restaurantName, lines });
  return { ok: true };
}

/** Empty the cart and start again at a different restaurant. */
export function replaceRestaurant(
  restaurantId: string,
  restaurantName: string,
  line: Omit<CartLine, 'quantity'>,
): void {
  commit({ restaurantId, restaurantName, lines: [{ ...line, quantity: 1 }] });
}

export function setQuantity(menuItemId: string, quantity: number): void {
  if (quantity <= 0) {
    removeItem(menuItemId);
    return;
  }

  commit({
    ...state,
    lines: state.lines.map((l) =>
      l.menuItemId === menuItemId ? { ...l, quantity: Math.min(50, quantity) } : l,
    ),
  });
}

export function removeItem(menuItemId: string): void {
  const lines = state.lines.filter((l) => l.menuItemId !== menuItemId);

  // Dropping the last item releases the restaurant lock, so the next thing the
  // customer taps just works instead of asking them to confirm a clash with an
  // empty cart.
  commit(lines.length === 0 ? EMPTY : { ...state, lines });
}

export function clearCart(): void {
  commit(EMPTY);
}

/* -------------------------------------------------------------------------- */
/* Derived                                                                     */
/* -------------------------------------------------------------------------- */

export function cartCount(cart: Cart): number {
  return cart.lines.reduce((n, l) => n + l.quantity, 0);
}

/**
 * Cart subtotal in cents — for display only.
 *
 * The authoritative subtotal is computed by `galeyr_place_order` from the menu
 * table. This one can be stale: a price can change, or an item can be marked
 * unavailable, while the cart sits in localStorage overnight. When they
 * disagree the server wins and the customer is told, rather than being charged
 * yesterday's price or, worse, today's higher one without notice.
 */
export function cartSubtotalCents(cart: Cart): number {
  return cart.lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}
