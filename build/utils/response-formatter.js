/**
 * Standard MCP response formatters.
 *
 * Uses compact JSON (no indentation) to minimize token count for LLM consumers.
 * Errors keep minimal formatting for readability in tool-call error surfaces.
 */
export function jsonResult(data) {
    return {
        content: [{ type: "text", text: JSON.stringify(data) }],
    };
}
export function errorResult(message) {
    return {
        content: [{ type: "text", text: JSON.stringify({ error: message }) }],
        isError: true,
    };
}
/** PNG chart + JSON summary for MCP clients that render images inline. */
export function chartResult(summary, pngBuffer) {
    return {
        content: [
            { type: "text", text: JSON.stringify(summary) },
            { type: "image", data: pngBuffer.toString("base64"), mimeType: "image/png" },
        ],
    };
}
//# sourceMappingURL=response-formatter.js.map