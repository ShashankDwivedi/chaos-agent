import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const VALID_TRANSPORTS = new Set(["stdio", "http"]);
const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65535;
const HELP_TEXT = `
harness-mcp-server — MCP server for Harness.io CI/CD platform

Usage:
  harness-mcp-server [stdio|http] [options]

Options:
  --port <number>  Port for HTTP transport (default: 3000, or PORT env var)
  --help           Show this help message and exit
  --version        Print version and exit

Transport defaults to "stdio" if not specified.
`.trim();
function getVersion() {
    try {
        const thisDir = dirname(fileURLToPath(import.meta.url));
        const pkgPath = resolve(thisDir, "..", "..", "package.json");
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        return pkg.version ?? "unknown";
    }
    catch {
        return "unknown";
    }
}
/**
 * Parse CLI arguments for transport mode and port.
 *
 * Usage:
 *   node build/index.js [stdio|http] [--port <number>]
 *
 * - Transport defaults to "stdio" if not specified.
 * - Port defaults to --port flag, then PORT env var, then 3000.
 * - Throws on unknown transport names.
 * - --help and --version cause the process to exit.
 */
export function parseArgs(argv = process.argv.slice(2)) {
    if (argv.includes("--help")) {
        console.error(HELP_TEXT);
        process.exit(0);
    }
    if (argv.includes("--version")) {
        console.error(getVersion());
        process.exit(0);
    }
    const transport = parseTransport(argv);
    const port = parsePort(argv);
    return { transport, port };
}
function parseTransport(argv) {
    // First positional arg that isn't a flag or flag value
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--port") {
            i++; // skip the value after --port
            continue;
        }
        if (arg.startsWith("-"))
            continue;
        if (!VALID_TRANSPORTS.has(arg)) {
            throw new Error(`Unknown transport: "${arg}". Supported: stdio, http`);
        }
        return arg;
    }
    return "stdio";
}
function parsePort(argv) {
    // Check --port flag first
    const portFlagIndex = argv.indexOf("--port");
    if (portFlagIndex !== -1 && portFlagIndex + 1 < argv.length) {
        const parsed = Number(argv[portFlagIndex + 1]);
        if (isValidPort(parsed))
            return parsed;
    }
    // Fall back to PORT env var
    const envPort = process.env.PORT;
    if (envPort !== undefined) {
        const parsed = Number(envPort);
        if (isValidPort(parsed))
            return parsed;
    }
    return DEFAULT_PORT;
}
function isValidPort(n) {
    return Number.isInteger(n) && n >= MIN_PORT && n <= MAX_PORT;
}
//# sourceMappingURL=cli.js.map