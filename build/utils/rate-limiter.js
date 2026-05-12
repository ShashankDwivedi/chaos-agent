/**
 * Token-bucket rate limiter. Default: 10 requests/second.
 */
const MAX_WAIT_MS = 30_000;
export class RateLimiter {
    maxTokens;
    refillRatePerMs;
    tokens;
    lastRefill;
    constructor(maxTokens = 10, refillRatePerMs = maxTokens / 1000) {
        this.maxTokens = maxTokens;
        this.refillRatePerMs = refillRatePerMs;
        this.tokens = maxTokens;
        this.lastRefill = Date.now();
    }
    async acquire() {
        const deadline = Date.now() + MAX_WAIT_MS;
        while (Date.now() < deadline) {
            this.refill();
            if (this.tokens >= 1) {
                this.tokens -= 1;
                return;
            }
            // Wait until a token is available
            const waitMs = Math.ceil((1 - this.tokens) / this.refillRatePerMs);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
        throw new Error(`Rate limiter: timed out waiting ${MAX_WAIT_MS}ms for a token`);
    }
    refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRatePerMs);
        this.lastRefill = now;
    }
}
//# sourceMappingURL=rate-limiter.js.map