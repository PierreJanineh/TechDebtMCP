/**
 * Shared argument-validation helpers used by all MCP tool handlers.
 *
 * Centralising `isRecord` / `requireRecord` here avoids duplication across
 * `inputParser.ts`, `configValidator.ts`, and `dependencyHandlers.ts` and
 * ensures that any future changes to the prototype check or error message
 * propagate to every call site automatically.
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * Type guard: returns true when `value` is a plain, non-null, non-array object
 * whose prototype is exactly `Object.prototype` or `null` (i.e. not a class
 * instance, `Date`, `Map`, etc.).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value as object) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Assert that `args` is a plain non-null, non-array object, throwing
 * `McpError(InvalidParams)` when it is not.
 *
 * @returns The narrowed `Record<string, unknown>` so callers can index it safely.
 */
export function requireRecord(args: unknown): Record<string, unknown> {
  if (!isRecord(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Tool arguments must be a plain object',
    );
  }
  return args;
}
