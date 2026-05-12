/**
 * Runtime type guards for safe narrowing at API boundaries.
 * Use these instead of `as Record<string, unknown>` when the source is external (API responses, user input).
 */
/** Narrow `unknown` to `Record<string, unknown>` with a runtime check. */
export declare function isRecord(value: unknown): value is Record<string, unknown>;
/** Safely access a nested record field, returning undefined if the path is not a record. */
export declare function asRecord(value: unknown): Record<string, unknown> | undefined;
/** Safely coerce to string, returning undefined for non-strings. */
export declare function asString(value: unknown): string | undefined;
/** Safely coerce to number, returning undefined for non-numbers. */
export declare function asNumber(value: unknown): number | undefined;
//# sourceMappingURL=type-guards.d.ts.map