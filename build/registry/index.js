import { createLogger } from "../utils/logger.js";
import { buildDeepLink, appendStoreType } from "../utils/deep-links.js";
import { chaosToolset } from "./toolsets/chaos.js";
const log = createLogger("registry");
/** All available toolsets */
const ALL_TOOLSETS = [
    chaosToolset,
];
/**
 * The enabled registry — filtered by HARNESS_TOOLSETS config.
 */
export class Registry {
    config;
    resourceMap = new Map();
    toolsets = [];
    constructor(config) {
        this.config = config;
        const enabledNames = this.parseToolsetFilter();
        this.toolsets = enabledNames
            ? ALL_TOOLSETS.filter((t) => enabledNames.has(t.name))
            : ALL_TOOLSETS;
        for (const toolset of this.toolsets) {
            for (const resource of toolset.resources) {
                this.resourceMap.set(resource.resourceType, resource);
            }
        }
        log.info(`Registry loaded: ${this.resourceMap.size} resource types from ${this.toolsets.length} toolsets`);
    }
    parseToolsetFilter() {
        const raw = this.config.HARNESS_TOOLSETS;
        if (!raw || raw.trim() === "")
            return null;
        const validNames = new Set(ALL_TOOLSETS.map((t) => t.name));
        const parsed = raw.split(",").map((s) => s.trim()).filter(Boolean);
        const valid = [];
        const invalid = [];
        for (const name of parsed) {
            if (validNames.has(name)) {
                valid.push(name);
            }
            else {
                invalid.push(name);
            }
        }
        if (invalid.length > 0) {
            const available = Array.from(validNames).sort().join(", ");
            throw new Error(`Invalid HARNESS_TOOLSETS: ${invalid.map((n) => `"${n}"`).join(", ")}. ` +
                `Valid toolset names: ${available}`);
        }
        if (valid.length === 0)
            return null;
        return new Set(valid);
    }
    get defaultOrgId() { return this.config.HARNESS_DEFAULT_ORG_ID; }
    get defaultProjectId() { return this.config.HARNESS_DEFAULT_PROJECT_ID; }
    /** Get a resource definition by type, or throw. */
    getResource(resourceType) {
        const def = this.resourceMap.get(resourceType);
        if (!def) {
            const available = Array.from(this.resourceMap.keys()).sort().join(", ");
            throw new Error(`Unknown resource_type "${resourceType}". Available: ${available}`);
        }
        return def;
    }
    /** Get all enabled resource types. */
    getAllResourceTypes() {
        return Array.from(this.resourceMap.keys()).sort();
    }
    /** Get all unique filter fields across all enabled resource definitions. */
    getAllFilterFields() {
        const seen = new Set();
        const fields = [];
        for (const [, def] of this.resourceMap) {
            for (const f of def.listFilterFields ?? []) {
                if (!seen.has(f.name)) {
                    seen.add(f.name);
                    fields.push(f);
                }
            }
        }
        return fields;
    }
    /** Get all enabled toolsets with their resources. */
    getAllToolsets() {
        return this.toolsets;
    }
    /** Check if a resource type supports an operation. */
    supportsOperation(resourceType, operation) {
        const def = this.resourceMap.get(resourceType);
        return def?.operations[operation] !== undefined;
    }
    static READ_OPERATIONS = new Set(["list", "get"]);
    /** Dispatch a CRUD operation to the Harness API. */
    async dispatch(client, resourceType, operation, input, signal) {
        if (this.config.HARNESS_READ_ONLY && !Registry.READ_OPERATIONS.has(operation)) {
            throw new Error(`Read-only mode is enabled (HARNESS_READ_ONLY=true). "${operation}" operations are not allowed.`);
        }
        const def = this.getResource(resourceType);
        const spec = def.operations[operation];
        if (!spec) {
            const supported = Object.keys(def.operations).join(", ");
            throw new Error(`Resource "${resourceType}" does not support "${operation}". Supported: ${supported}`);
        }
        return this.executeSpec(client, def, spec, input, signal);
    }
    async executeSpec(client, def, spec, input, signal) {
        let path = spec.path;
        if (spec.pathParams) {
            for (const [inputKey, pathPlaceholder] of Object.entries(spec.pathParams)) {
                let value = input[inputKey];
                if (value === undefined || value === "") {
                    if (pathPlaceholder === "accountId" || pathPlaceholder === "accountID") {
                        value = this.config.HARNESS_ACCOUNT_ID;
                    }
                    else if (pathPlaceholder === "org" && (def.scope === "project" || def.scope === "org")) {
                        value = this.config.HARNESS_DEFAULT_ORG_ID;
                    }
                    else if (pathPlaceholder === "project" && def.scope === "project") {
                        value = this.config.HARNESS_DEFAULT_PROJECT_ID;
                    }
                }
                if (value === undefined || value === "") {
                    throw new Error(`Missing required field "${inputKey}" for path parameter "${pathPlaceholder}"`);
                }
                path = path.replace(`{${pathPlaceholder}}`, encodeURIComponent(String(value)));
            }
        }
        const params = {};
        if (def.scope === "project" || def.scope === "org") {
            params.orgIdentifier = input.org_id ?? this.config.HARNESS_DEFAULT_ORG_ID;
        }
        if (def.scope === "project") {
            params.projectIdentifier = input.project_id ?? this.config.HARNESS_DEFAULT_PROJECT_ID;
        }
        if (spec.queryParams) {
            for (const [inputKey, queryKey] of Object.entries(spec.queryParams)) {
                const value = input[inputKey];
                if (value !== undefined && value !== "") {
                    params[queryKey] = value;
                }
            }
        }
        const mergedInput = { ...input };
        const body = spec.bodyBuilder ? spec.bodyBuilder(mergedInput) : undefined;
        if (spec.bodySchema && body && typeof body === "object") {
            const bodyRecord = body;
            const payload = spec.bodyWrapperKey &&
                bodyRecord[spec.bodyWrapperKey] != null &&
                typeof bodyRecord[spec.bodyWrapperKey] === "object"
                ? bodyRecord[spec.bodyWrapperKey]
                : bodyRecord;
            const missing = spec.bodySchema.fields
                .filter(f => f.required && payload[f.name] === undefined)
                .map(f => f.name);
            if (missing.length > 0) {
                throw new Error(`Missing required fields for ${def.resourceType}: ${missing.join(", ")}. ` +
                    `Use harness_chaos_describe(resource_type="${def.resourceType}") to see the schema.`);
            }
        }
        const raw = await client.request({
            method: spec.method,
            path,
            params,
            body,
            ...(spec.headers ? { headers: spec.headers } : {}),
            signal,
        });
        const result = spec.responseExtractor ? spec.responseExtractor(raw) : raw;
        if (result && typeof result === "object" && params.storeType) {
            const r = result;
            if (!r.storeType) {
                r.storeType = params.storeType;
            }
        }
        if (def.deepLinkTemplate && typeof result === "object" && result !== null) {
            const resultRecord = result;
            const baseLinkParams = {
                orgIdentifier: params.orgIdentifier ?? "",
                projectIdentifier: params.projectIdentifier ?? "",
            };
            const allPathParams = {
                ...def.operations.get?.pathParams,
                ...spec.pathParams,
            };
            for (const [inputKey, pathPlaceholder] of Object.entries(allPathParams)) {
                if (baseLinkParams[pathPlaceholder])
                    continue;
                let value = input[inputKey];
                if (!value && pathPlaceholder === "org") {
                    value = this.config.HARNESS_DEFAULT_ORG_ID;
                }
                else if (!value && pathPlaceholder === "project") {
                    value = this.config.HARNESS_DEFAULT_PROJECT_ID;
                }
                if (value) {
                    baseLinkParams[pathPlaceholder] = value;
                }
            }
            const getPathParam = def.operations.get?.pathParams;
            for (const field of def.identifierFields) {
                const pathParamName = spec.pathParams?.[field] ?? getPathParam?.[field] ?? field;
                let value = input[field];
                if (!value && resultRecord) {
                    value = resultRecord[pathParamName] ?? resultRecord.identifier;
                }
                if (value) {
                    baseLinkParams[pathParamName] = String(value);
                }
            }
            const r = result;
            const isList = r.items && Array.isArray(r.items);
            if (!isList) {
                try {
                    let link = buildDeepLink(this.config.HARNESS_BASE_URL, this.config.HARNESS_ACCOUNT_ID, def.deepLinkTemplate, baseLinkParams);
                    link = appendStoreType(link, resultRecord);
                    resultRecord.openInHarness = link;
                }
                catch {
                    // non-critical
                }
            }
            if (r.items && Array.isArray(r.items)) {
                for (const item of r.items) {
                    if (typeof item !== "object" || item === null)
                        continue;
                    try {
                        const itemRecord = item;
                        const itemLinkParams = { ...baseLinkParams };
                        for (const field of def.identifierFields) {
                            const getParam = def.operations.get?.pathParams?.[field];
                            const pathParamName = spec.pathParams?.[field] ?? getParam ?? field;
                            if (itemRecord[pathParamName] !== undefined) {
                                itemLinkParams[pathParamName] = String(itemRecord[pathParamName]);
                            }
                            else if (itemRecord.identifier !== undefined) {
                                itemLinkParams[pathParamName] = String(itemRecord.identifier);
                            }
                        }
                        let itemLink = buildDeepLink(this.config.HARNESS_BASE_URL, this.config.HARNESS_ACCOUNT_ID, def.deepLinkTemplate, itemLinkParams);
                        itemLink = appendStoreType(itemLink, itemRecord);
                        itemRecord.openInHarness = itemLink;
                    }
                    catch {
                        // non-critical
                    }
                }
            }
        }
        return result;
    }
    /** Get describe metadata for all enabled resource types (full detail). */
    describe() {
        const toolsets = {};
        for (const ts of this.toolsets) {
            toolsets[ts.name] = {
                displayName: ts.displayName,
                description: ts.description,
                resources: ts.resources.map((r) => ({
                    resource_type: r.resourceType,
                    displayName: r.displayName,
                    description: r.description,
                    scope: r.scope,
                    operations: Object.keys(r.operations),
                    identifierFields: r.identifierFields,
                    listFilterFields: r.listFilterFields,
                    diagnosticHint: r.diagnosticHint ?? undefined,
                })),
            };
        }
        return {
            total_resource_types: this.resourceMap.size,
            total_toolsets: this.toolsets.length,
            toolsets,
        };
    }
    /** Search resource types by keyword. */
    searchResources(query) {
        const q = query.toLowerCase();
        const results = [];
        for (const def of this.resourceMap.values()) {
            let score = 0;
            const toolsetName = this.toolsets.find((t) => t.resources.includes(def))?.name ?? "";
            if (def.resourceType.toLowerCase() === q)
                score = 100;
            else if (def.resourceType.toLowerCase().includes(q))
                score = 80;
            else if (def.displayName.toLowerCase().includes(q))
                score = 60;
            else if (toolsetName.toLowerCase().includes(q))
                score = 40;
            else if (def.description.toLowerCase().includes(q))
                score = 20;
            if (score > 0) {
                const ops = Object.keys(def.operations);
                results.push({
                    type: def.resourceType,
                    name: def.displayName,
                    toolset: toolsetName,
                    ops,
                    description: def.description,
                    score,
                });
            }
        }
        return results
            .sort((a, b) => b.score - a.score)
            .map(({ score, ...rest }) => rest);
    }
    /** Get compact summary — one line per resource type. */
    describeSummary() {
        const resource_types = [];
        for (const ts of this.toolsets) {
            for (const r of ts.resources) {
                const ops = Object.keys(r.operations);
                resource_types.push({
                    type: r.resourceType,
                    name: r.displayName,
                    toolset: ts.name,
                    ops,
                });
            }
        }
        return {
            total_resource_types: this.resourceMap.size,
            total_toolsets: this.toolsets.length,
            resource_types,
            hint: "Call harness_chaos_describe(resource_type='<type>') for full details including filter fields and diagnosticHint.",
        };
    }
}
//# sourceMappingURL=index.js.map