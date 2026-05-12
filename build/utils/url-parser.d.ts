/**
 * Parse Harness UI URLs to extract identifiers (org, project, resource type, resource ID, etc.).
 * Enables users to paste a Harness URL instead of manually specifying individual parameters.
 */
export interface ParsedHarnessUrl {
    account_id: string;
    org_id?: string;
    project_id?: string;
    module?: string;
    resource_type?: string;
    resource_id?: string;
}
/**
 * Parse a Harness UI URL and extract identifiers.
 *
 * Handles patterns like:
 * - .../account/{accountId}/ce/perspectives/{perspectiveId}/...
 * - .../orgs/{org}/projects/{project}/...
 * - Vanity domains (e.g. app3.harness.io)
 */
export declare function parseHarnessUrl(urlStr: string): ParsedHarnessUrl;
/**
 * If `url` is provided, parse it and merge extracted values into args as defaults.
 * Explicit args always take precedence over URL-derived values.
 * Returns a new object (does not mutate the original).
 */
export declare function applyUrlDefaults(args: Record<string, unknown>, url?: unknown): Record<string, unknown>;
//# sourceMappingURL=url-parser.d.ts.map