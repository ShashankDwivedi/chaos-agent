/**
 * stderr-only structured logger.
 * CRITICAL: Never write to stdout — it's reserved for JSON-RPC in stdio transport.
 */
type LogLevel = "debug" | "info" | "warn" | "error";
export declare function setLogLevel(level: LogLevel): void;
export interface Logger {
    debug: (msg: string, data?: Record<string, unknown>) => void;
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
}
export declare function createLogger(module: string): Logger;
export {};
//# sourceMappingURL=logger.d.ts.map