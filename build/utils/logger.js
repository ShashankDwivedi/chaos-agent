/**
 * stderr-only structured logger.
 * CRITICAL: Never write to stdout — it's reserved for JSON-RPC in stdio transport.
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
let globalLevel = "info";
export function setLogLevel(level) {
    globalLevel = level;
}
export function createLogger(module) {
    function log(level, message, data) {
        if (LOG_LEVELS[level] < LOG_LEVELS[globalLevel])
            return;
        const entry = {
            ts: new Date().toISOString(),
            level,
            module,
            msg: message,
            ...data,
        };
        console.error(JSON.stringify(entry));
    }
    return {
        debug: (msg, data) => log("debug", msg, data),
        info: (msg, data) => log("info", msg, data),
        warn: (msg, data) => log("warn", msg, data),
        error: (msg, data) => log("error", msg, data),
    };
}
//# sourceMappingURL=logger.js.map