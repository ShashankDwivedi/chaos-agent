import { McpError } from "@modelcontextprotocol/sdk/types.js";
/**
 * Typed error for Harness API failures.
 */
export declare class HarnessApiError extends Error {
    readonly statusCode: number;
    readonly harnessCode?: string | undefined;
    readonly correlationId?: string | undefined;
    constructor(message: string, statusCode: number, harnessCode?: string | undefined, correlationId?: string | undefined, cause?: unknown);
}
/**
 * Returns true for user-fixable errors (registry validation, missing fields,
 * unknown resource types) — i.e. plain Errors that are NOT HarnessApiErrors.
 */
export declare function isUserError(err: unknown): err is Error;
/**
 * Returns true for Harness API errors that the LLM can act on (400 bad request,
 * 404 not found). These indicate wrong identifiers, missing resources, or bad
 * input — problems the LLM can fix by retrying with different parameters.
 */
export declare function isUserFixableApiError(err: unknown): err is HarnessApiError;
/**
 * Map a HarnessApiError (or generic Error) to an MCP-friendly McpError.
 */
export declare function toMcpError(err: unknown): McpError;
//# sourceMappingURL=errors.d.ts.map