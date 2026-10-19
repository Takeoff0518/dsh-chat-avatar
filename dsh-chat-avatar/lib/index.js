/**
 * Host half of `dsh-chat-avatar`.
 *
 * The whole feature lives in the browser: the Client half (`./client`) reads
 * its own preferences from `localStorage`, injects one stylesheet, and adds a
 * settings page. The Host therefore only needs a plugin that mounts cleanly so
 * the Loader entry exists and the `dsh.client` declaration is scanned.
 *
 * @module dsh-chat-avatar
 */

/** Loader/plugin identity. */
export const name = 'dsh-chat-avatar'

/** Nothing is injected: no Host service is required. */
export const inject = []

/**
 * Mount an inert Host plugin.
 *
 * @returns nothing — the Node half intentionally has no behaviour.
 */
export function apply() {}
