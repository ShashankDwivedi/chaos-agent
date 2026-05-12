/**
 * Build Harness UI deep-link URLs.
 */
export declare function buildDeepLink(baseUrl: string, accountId: string, template: string, params: Record<string, string>): string;
/**
 * Append storeType query param to a deep link if the record has one.
 * Harness UI requires ?storeType=INLINE or ?storeType=REMOTE to resolve correctly.
 */
export declare function appendStoreType(link: string, record: Record<string, unknown>): string;
//# sourceMappingURL=deep-links.d.ts.map