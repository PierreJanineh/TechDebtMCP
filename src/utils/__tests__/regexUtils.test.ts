/**
 * Unit tests for escapeRegExp utility (regexUtils.ts).
 */

import { escapeRegExp } from '../regexUtils.js';

describe('escapeRegExp', () => {
  it('returns the original string when no metacharacters are present', () => {
    expect(escapeRegExp('hello')).toBe('hello');
    expect(escapeRegExp('dismissAction')).toBe('dismissAction');
    expect(escapeRegExp('')).toBe('');
  });

  it('escapes all regex metacharacters', () => {
    const metacharacters = '.', escaped = '\\.';
    expect(escapeRegExp(metacharacters)).toBe(escaped);

    expect(escapeRegExp('*')).toBe('\\*');
    expect(escapeRegExp('+')).toBe('\\+');
    expect(escapeRegExp('?')).toBe('\\?');
    expect(escapeRegExp('^')).toBe('\\^');
    expect(escapeRegExp('$')).toBe('\\$');
    expect(escapeRegExp('{')).toBe('\\{');
    expect(escapeRegExp('}')).toBe('\\}');
    expect(escapeRegExp('(')).toBe('\\(');
    expect(escapeRegExp(')')).toBe('\\)');
    expect(escapeRegExp('|')).toBe('\\|');
    expect(escapeRegExp('[')).toBe('\\[');
    expect(escapeRegExp(']')).toBe('\\]');
    expect(escapeRegExp('\\')).toBe('\\\\');
  });

  it('escapes a string containing multiple metacharacters', () => {
    expect(escapeRegExp('a.b*c+d?')).toBe('a\\.b\\*c\\+d\\?');
    expect(escapeRegExp('(foo|bar)')).toBe('\\(foo\\|bar\\)');
    expect(escapeRegExp('[0-9]+')).toBe('\\[0-9\\]\\+');
  });

  it('produces a safe pattern usable in new RegExp without throwing', () => {
    const dangerous = 'foo.bar(baz)*';
    expect(() => new RegExp(escapeRegExp(dangerous))).not.toThrow();
  });

  it('produces a pattern that matches the literal string, not a broader pattern', () => {
    const str = 'a.b';
    const safeRe = new RegExp(escapeRegExp(str));
    // Should match exactly "a.b"
    expect(safeRe.test('a.b')).toBe(true);
    // Should NOT match "axb" (dot must be literal)
    expect(safeRe.test('axb')).toBe(false);
  });
});
