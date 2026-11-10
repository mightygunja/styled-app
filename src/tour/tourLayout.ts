/**
 * Geometry for the walkthrough overlay: where the lit "hole" sits, the four
 * dimmed panels around it, and where the card goes so it never covers the
 * control it is describing and never leaves the screen.
 *
 * Pure arithmetic, so scripts/auditTour.ts can run it against phone, tablet
 * and desktop windows with targets in every corner.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Breathing room between a control and the ring around it. */
export const HOLE_PADDING = 6;
/** Gap between the hole and the card. */
export const CARD_GAP = 14;
/** The card never touches the window edge. */
export const EDGE = 16;
export const CARD_MAX_WIDTH = 340;

/**
 * Whether a measured control can be highlighted: it has a size and sits
 * wholly inside the window. A control scrolled off-screen, hidden behind a
 * keyboard or not laid out yet is not - the card is then shown centred
 * instead of a ring around nothing.
 */
export function isHighlightable(rect: Rect | null | undefined, window: Size): rect is Rect {
  if (!rect) return false;
  if (!(rect.width > 2 && rect.height > 2)) return false;
  return rect.x >= -1 && rect.y >= -1 && rect.x + rect.width <= window.width + 1 && rect.y + rect.height <= window.height + 1;
}

/** The ring is drawn just outside the lit area, so the lit area stops short of the window edge. */
export const HOLE_INSET = 4;
/** Thickness of the ring. */
export const RING_WIDTH = 2;

/**
 * The lit area: the control plus padding, kept a few points inside the
 * window so the ring around a full-width control is never cut off.
 */
export function holeFor(target: Rect, window: Size): Rect {
  const x = Math.max(HOLE_INSET, target.x - HOLE_PADDING);
  const y = Math.max(HOLE_INSET, target.y - HOLE_PADDING);
  const right = Math.min(window.width - HOLE_INSET, target.x + target.width + HOLE_PADDING);
  const bottom = Math.min(window.height - HOLE_INSET, target.y + target.height + HOLE_PADDING);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}

/**
 * Corner radius of the ring. The lit area itself is a plain rectangle (four
 * dim panels leave it clear - the one construction that renders identically
 * on every platform), so the ring keeps a small radius and sits just outside
 * it: the rectangle's corners then stay hidden under the ring's own.
 */
export const RING_RADIUS = 8;

/** The ring's frame: the lit area, grown by the ring's own thickness. */
export function ringFor(hole: Rect): Rect {
  return {
    x: hole.x - RING_WIDTH,
    y: hole.y - RING_WIDTH,
    width: hole.width + RING_WIDTH * 2,
    height: hole.height + RING_WIDTH * 2,
  };
}

/** The four dimmed panels that leave the hole clear: above, below, left, right. */
export function dimPanels(hole: Rect, window: Size): Rect[] {
  return [
    { x: 0, y: 0, width: window.width, height: hole.y },
    { x: 0, y: hole.y + hole.height, width: window.width, height: Math.max(0, window.height - hole.y - hole.height) },
    { x: 0, y: hole.y, width: hole.x, height: hole.height },
    { x: hole.x + hole.width, y: hole.y, width: Math.max(0, window.width - hole.x - hole.width), height: hole.height },
  ];
}

export interface CardPlacement {
  left: number;
  top: number;
  width: number;
  /** Which side of the hole the card sits on; 'center' when there is no hole. */
  side: 'above' | 'below' | 'center';
}

/**
 * Where the card goes. Below the control when there is more room below,
 * above otherwise, centred on it horizontally and then pulled inside the
 * window. With no hole, the middle of the window.
 */
export function placeCard(hole: Rect | null, window: Size, cardHeight: number): CardPlacement {
  const width = Math.min(CARD_MAX_WIDTH, window.width - EDGE * 2);
  const clampLeft = (left: number) => Math.max(EDGE, Math.min(left, window.width - EDGE - width));
  const clampTop = (top: number) => Math.max(EDGE, Math.min(top, window.height - EDGE - cardHeight));

  if (!hole) {
    return { left: clampLeft((window.width - width) / 2), top: clampTop((window.height - cardHeight) / 2), width, side: 'center' };
  }

  const roomBelow = window.height - (hole.y + hole.height);
  const roomAbove = hole.y;
  const below = roomBelow >= cardHeight + CARD_GAP + EDGE || roomBelow >= roomAbove;
  const top = below ? hole.y + hole.height + CARD_GAP : hole.y - CARD_GAP - cardHeight;
  return {
    left: clampLeft(hole.x + hole.width / 2 - width / 2),
    top: clampTop(top),
    width,
    side: below ? 'below' : 'above',
  };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
