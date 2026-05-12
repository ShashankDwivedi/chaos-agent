/**
 * Compact item utility — strips verbose metadata from list results,
 * keeping only fields that are actionable for an LLM.
 */
/**
 * Strip verbose fields from an array of list items.
 * Keeps identity, status, type, ownership, timestamp, and deep link fields.
 * Merges openInHarness into name as a markdown hyperlink.
 */
export declare function compactItems(items: unknown[]): unknown[];
//# sourceMappingURL=compact.d.ts.map