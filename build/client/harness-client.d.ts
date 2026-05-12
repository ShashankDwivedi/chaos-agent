import type { Config } from "../config.js";
import type { RequestOptions } from "./types.js";
export declare class HarnessClient {
    private readonly baseUrl;
    private readonly apiKey;
    private readonly bearerToken;
    private readonly cookie;
    private readonly accountId;
    private readonly timeout;
    private readonly maxRetries;
    private readonly rateLimiter;
    constructor(config: Config);
    get account(): string;
    request<T>(options: RequestOptions): Promise<T>;
    private buildUrl;
}
//# sourceMappingURL=harness-client.d.ts.map