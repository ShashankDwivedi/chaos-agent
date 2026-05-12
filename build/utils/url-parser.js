/**
 * Parse Harness UI URLs to extract identifiers (org, project, resource type, resource ID, etc.).
 * Enables users to paste a Harness URL instead of manually specifying individual parameters.
 */
/** Known Harness module identifiers that appear in URL paths */
const MODULES = new Set(["cd", "ci", "cf", "ce", "cv", "sto", "chaos", "idp", "sei"]);
/**
 * Maps URL path segments (plural resource names) to registry resource types.
 * Only CCM-relevant segments are included.
 */
const RESOURCE_SEGMENTS = {
    "perspectives": { type: "cost_perspective", contextField: "resource_id" },
};
/** Structural segments that should never be treated as resource IDs */
const STRUCTURAL = new Set([
    "ng", "all", "account", "module", "orgs", "projects", "organizations",
]);
/**
 * Parse a Harness UI URL and extract identifiers.
 *
 * Handles patterns like:
 * - .../account/{accountId}/ce/perspectives/{perspectiveId}/...
 * - .../orgs/{org}/projects/{project}/...
 * - Vanity domains (e.g. app3.harness.io)
 */
export function parseHarnessUrl(urlStr) {
    const url = new URL(urlStr);
    const segments = url.pathname.split("/").filter(Boolean);
    const result = { account_id: "" };
    const accountIdx = segments.indexOf("account");
    if (accountIdx >= 0 && accountIdx + 1 < segments.length) {
        result.account_id = segments[accountIdx + 1];
    }
    const moduleIdx = segments.indexOf("module");
    if (moduleIdx >= 0 && moduleIdx + 1 < segments.length) {
        result.module = segments[moduleIdx + 1];
    }
    const orgsIdx = segments.indexOf("orgs");
    if (orgsIdx >= 0 && orgsIdx + 1 < segments.length) {
        result.org_id = segments[orgsIdx + 1];
    }
    const projectsIdx = segments.indexOf("projects");
    if (projectsIdx >= 0 && projectsIdx + 1 < segments.length) {
        result.project_id = segments[projectsIdx + 1];
    }
    const allIdx = segments.indexOf("all");
    if (allIdx >= 0 && !result.module && allIdx + 1 < segments.length) {
        const afterAll = segments[allIdx + 1];
        if (MODULES.has(afterAll)) {
            result.module = afterAll;
        }
    }
    // Also detect "ce" module directly in the path (e.g. /account/{id}/ce/perspectives/...)
    const ceIdx = segments.indexOf("ce");
    if (ceIdx >= 0 && !result.module) {
        result.module = "ce";
    }
    const matches = [];
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const def = RESOURCE_SEGMENTS[seg];
        if (!def)
            continue;
        const next = segments[i + 1];
        let id;
        if (next &&
            !RESOURCE_SEGMENTS[next] &&
            !STRUCTURAL.has(next) &&
            !MODULES.has(next)) {
            id = decodeURIComponent(next);
            i++;
        }
        matches.push({ type: def.type, contextField: def.contextField, id });
    }
    if (matches.length > 0) {
        const primary = matches[matches.length - 1];
        result.resource_type = primary.type;
        for (const match of matches) {
            if (match.id) {
                result[match.contextField] = match.id;
            }
        }
        if (primary.id) {
            result.resource_id = primary.id;
        }
    }
    return result;
}
const MERGEABLE_FIELDS = [
    "org_id",
    "project_id",
    "module",
    "resource_type",
    "resource_id",
];
/**
 * If `url` is provided, parse it and merge extracted values into args as defaults.
 * Explicit args always take precedence over URL-derived values.
 * Returns a new object (does not mutate the original).
 */
export function applyUrlDefaults(args, url) {
    if (!url || typeof url !== "string")
        return args;
    let parsed;
    try {
        parsed = parseHarnessUrl(url);
    }
    catch {
        return args;
    }
    const merged = { ...args };
    for (const field of MERGEABLE_FIELDS) {
        if ((merged[field] === undefined || merged[field] === "") && parsed[field] !== undefined) {
            merged[field] = parsed[field];
        }
    }
    return merged;
}
//# sourceMappingURL=url-parser.js.map