/**
 * Standard MCP response formatters.
 *
 * Uses compact JSON (no indentation) to minimize token count for LLM consumers.
 * Errors keep minimal formatting for readability in tool-call error surfaces.
 */
export type ToolContentPart = {
    type: "text";
    text: string;
} | {
    type: "image";
    data: string;
    mimeType: string;
};
export interface ToolResult {
    /** Required: MCP SDK's CallToolResult extends Result which has an index signature. */
    [key: string]: unknown;
    content: ToolContentPart[];
    isError?: boolean;
}
export declare function jsonResult(data: unknown): ToolResult;
export declare function errorResult(message: string): ToolResult;
/** PNG chart + JSON summary for MCP clients that render images inline. */
export declare function chartResult(summary: Record<string, unknown>, pngBuffer: Buffer): ToolResult;
//# sourceMappingURL=response-formatter.d.ts.map