import type { Config } from "../config.js";
import type { HarnessClient } from "../client/harness-client.js";
import type { ResourceDefinition, ToolsetDefinition, OperationName, FilterFieldSpec } from "./types.js";
/**
 * The enabled registry — filtered by HARNESS_TOOLSETS config.
 */
export declare class Registry {
    private config;
    private resourceMap;
    private toolsets;
    constructor(config: Config);
    private parseToolsetFilter;
    get defaultOrgId(): string;
    get defaultProjectId(): string | undefined;
    /** Get a resource definition by type, or throw. */
    getResource(resourceType: string): ResourceDefinition;
    /** Get all enabled resource types. */
    getAllResourceTypes(): string[];
    /** Get all unique filter fields across all enabled resource definitions. */
    getAllFilterFields(): FilterFieldSpec[];
    /** Get all enabled toolsets with their resources. */
    getAllToolsets(): ToolsetDefinition[];
    /** Check if a resource type supports an operation. */
    supportsOperation(resourceType: string, operation: OperationName): boolean;
    private static readonly READ_OPERATIONS;
    /** Dispatch a CRUD operation to the Harness API. */
    dispatch(client: HarnessClient, resourceType: string, operation: OperationName, input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
    private executeSpec;
    /** Get describe metadata for all enabled resource types (full detail). */
    describe(): Record<string, unknown>;
    /** Search resource types by keyword. */
    searchResources(query: string): Array<{
        type: string;
        name: string;
        toolset: string;
        ops: string[];
        description: string;
    }>;
    /** Get compact summary — one line per resource type. */
    describeSummary(): Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map