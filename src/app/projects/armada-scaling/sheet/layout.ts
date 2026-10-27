/** Below this width the page is laid out for phones. Matches $narrow in _sheet.scss. */
export const NARROW_MAX_PX = 760;

/** The media query for that layout, for scripts that need to follow it. */
export const NARROW_QUERY = `(width <= ${NARROW_MAX_PX}px)`;
