/**
 * Utility helpers for safe RegExp construction.
 */

/**
 * Escapes all regex metacharacters in a string so it can be safely
 * interpolated into `new RegExp(...)` without unintended matching behaviour
 * or ReDoS vectors.
 *
 * Escaped characters: . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param str - The raw string to escape.
 * @returns The escaped string, safe for use inside a RegExp pattern.
 *
 * @example
 * const name = 'foo.bar';
 * const re = new RegExp(`\\b${escapeRegExp(name)}\\s*!`);
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
