import * as z from "zod/v4";
/**
 * Extract the account ID from a Harness PAT token.
 * PAT format: pat.<accountId>.<tokenId>.<secret>
 */
export declare function extractAccountIdFromToken(apiKey: string): string | undefined;
export declare const ConfigSchema: z.ZodPipe<z.ZodObject<{
    HARNESS_API_KEY: z.ZodOptional<z.ZodString>;
    HARNESS_BEARER_TOKEN: z.ZodOptional<z.ZodString>;
    HARNESS_COOKIE: z.ZodOptional<z.ZodString>;
    HARNESS_ACCOUNT_ID: z.ZodOptional<z.ZodString>;
    HARNESS_BASE_URL: z.ZodDefault<z.ZodString>;
    HARNESS_DEFAULT_ORG_ID: z.ZodDefault<z.ZodString>;
    HARNESS_DEFAULT_PROJECT_ID: z.ZodOptional<z.ZodString>;
    HARNESS_API_TIMEOUT_MS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    HARNESS_MAX_RETRIES: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        debug: "debug";
        info: "info";
        warn: "warn";
        error: "error";
    }>>;
    HARNESS_TOOLSETS: z.ZodOptional<z.ZodString>;
    HARNESS_MAX_BODY_SIZE_MB: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    HARNESS_RATE_LIMIT_RPS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    HARNESS_READ_ONLY: z.ZodDefault<z.ZodCoercedBoolean<unknown>>;
}, z.core.$strip>, z.ZodTransform<{
    HARNESS_API_KEY: string | undefined;
    HARNESS_BEARER_TOKEN: string | undefined;
    HARNESS_COOKIE: string | undefined;
    HARNESS_ACCOUNT_ID: string;
    HARNESS_BASE_URL: string;
    HARNESS_DEFAULT_ORG_ID: string;
    HARNESS_API_TIMEOUT_MS: number;
    HARNESS_MAX_RETRIES: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    HARNESS_MAX_BODY_SIZE_MB: number;
    HARNESS_RATE_LIMIT_RPS: number;
    HARNESS_READ_ONLY: boolean;
    HARNESS_DEFAULT_PROJECT_ID?: string | undefined;
    HARNESS_TOOLSETS?: string | undefined;
}, {
    HARNESS_BASE_URL: string;
    HARNESS_DEFAULT_ORG_ID: string;
    HARNESS_API_TIMEOUT_MS: number;
    HARNESS_MAX_RETRIES: number;
    LOG_LEVEL: "debug" | "info" | "warn" | "error";
    HARNESS_MAX_BODY_SIZE_MB: number;
    HARNESS_RATE_LIMIT_RPS: number;
    HARNESS_READ_ONLY: boolean;
    HARNESS_API_KEY?: string | undefined;
    HARNESS_BEARER_TOKEN?: string | undefined;
    HARNESS_COOKIE?: string | undefined;
    HARNESS_ACCOUNT_ID?: string | undefined;
    HARNESS_DEFAULT_PROJECT_ID?: string | undefined;
    HARNESS_TOOLSETS?: string | undefined;
}>>;
export type Config = z.infer<typeof ConfigSchema>;
export declare function loadConfig(): Config;
//# sourceMappingURL=config.d.ts.map