/**
 * A release replaces the files of every screen. A page opened before it still
 * asks for the old ones, and the request fails. Pure, so the Admin's node
 * tests can pin the rule without a browser.
 */

/** The browser's words for «the screen's file is not there» — Chrome, Safari, Firefox. */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(message)
}

/**
 * The address to load anew: the tab that was clicked, and only without a click
 * in progress — the address the page is on. Reloading the address the page is
 * on while a tab was clicked leaves the reader where they were, as if the click
 * did nothing (owner, 07.10: «нажимаю вкладку, а переход не переходит»).
 *
 * Null when this address was already reloaded for: the file is missing from
 * the new release too, and a second reload would be a loop.
 */
export function reloadAddress(clicked: string | null, current: string, reloadedFor: string | null): string | null {
  const target = clicked ?? current
  return target === reloadedFor ? null : target
}
