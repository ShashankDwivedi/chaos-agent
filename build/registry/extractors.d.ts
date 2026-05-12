/** Pass-through extractor — returns raw response unchanged. */
export declare const passthrough: (raw: unknown) => unknown;
/** Extract `data` from standard NG API responses: `{ status, data, ... }` */
export declare const ngExtract: (raw: unknown) => unknown;
/** Extract paginated content from NG API responses: `{ data: { content, totalElements } }` */
export declare const pageExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Generic Chaos REST list extractor.
 * Chaos APIs return various shapes: bare arrays, `{ content: [...] }`, `{ data: [...] }`, etc.
 * This tries common patterns and normalizes into `{ items, total }`.
 */
export declare const chaosListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos experiment list — extract and compact experiment entries.
 */
export declare const chaosExperimentListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos experiment run list — extract run history.
 */
export declare const chaosExperimentRunListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos hub list — compact hub entries.
 */
export declare const chaosHubListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos infrastructure list — compact infra entries.
 */
export declare const chaosInfraListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos probe list — compact probe entries.
 */
export declare const chaosProbeListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Chaos fault list — compact fault entries.
 */
export declare const chaosFaultListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * ChaosGuard condition list — compact.
 */
export declare const chaosGuardConditionListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * ChaosGuard rule list — compact.
 */
export declare const chaosGuardRuleListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Network map list — compact.
 */
export declare const chaosNetworkMapListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Experiment stats — flatten overview statistics.
 */
export declare const chaosExperimentStatsExtract: (raw: unknown) => unknown;
/**
 * Chaos recommendations list — compact.
 */
export declare const chaosRecommendationListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Risk/service stats — flatten service resilience stats.
 */
export declare const chaosRiskExtract: (raw: unknown) => unknown;
/**
 * DR tests list — compact.
 */
export declare const chaosDrTestListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
/**
 * Action list — compact chaos action entries.
 */
export declare const chaosActionListExtract: (raw: unknown) => {
    items: unknown[];
    total: number;
};
//# sourceMappingURL=extractors.d.ts.map