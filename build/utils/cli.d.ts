/**
 * CLI argument parsing for transport selection and port configuration.
 */
export type Transport = "stdio" | "http";
export interface CliArgs {
    transport: Transport;
    port: number;
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
export declare function parseArgs(argv?: string[]): CliArgs;
//# sourceMappingURL=cli.d.ts.map