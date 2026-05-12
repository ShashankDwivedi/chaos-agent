/**
 * Token-bucket rate limiter. Default: 10 requests/second.
 */
export declare class RateLimiter {
    private readonly maxTokens;
    private readonly refillRatePerMs;
    private tokens;
    private lastRefill;
    constructor(maxTokens?: number, refillRatePerMs?: number);
    acquire(): Promise<void>;
    private refill;
}
//# sourceMappingURL=rate-limiter.d.ts.map