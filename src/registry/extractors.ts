/**
 * Shared response extractors for Harness Chaos API responses.
 */
import { isRecord } from "../utils/type-guards.js";

/** Pass-through extractor — returns raw response unchanged. */
export const passthrough = (raw: unknown): unknown => raw;

/** Extract `data` from standard NG API responses: `{ status, data, ... }` */
export const ngExtract = (raw: unknown): unknown => {
  const r = raw as { data?: unknown };
  return r.data ?? raw;
};

/** Extract paginated content from NG API responses: `{ data: { content, totalElements } }` */
export const pageExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const r = raw as { data?: { content?: unknown[]; totalElements?: number } };
  return {
    items: r.data?.content ?? [],
    total: r.data?.totalElements ?? 0,
  };
};

/**
 * Generic Chaos REST list extractor.
 * Chaos APIs return various shapes: bare arrays, `{ content: [...] }`, `{ data: [...] }`, etc.
 * This tries common patterns and normalizes into `{ items, total }`.
 */
export const chaosListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  if (Array.isArray(raw)) {
    return { items: raw, total: raw.length };
  }
  if (!isRecord(raw)) return { items: [], total: 0 };

  if (Array.isArray(raw.content)) {
    const total = typeof raw.totalElements === "number" ? raw.totalElements
      : typeof raw.totalCount === "number" ? raw.totalCount
      : raw.content.length;
    return { items: raw.content, total };
  }

  if (Array.isArray(raw.data)) {
    return { items: raw.data, total: raw.data.length };
  }

  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.content)) {
      const total = typeof raw.data.totalElements === "number" ? raw.data.totalElements
        : typeof raw.data.totalCount === "number" ? raw.data.totalCount
        : raw.data.content.length;
      return { items: raw.data.content, total };
    }
    if (Array.isArray(raw.data.items)) {
      return { items: raw.data.items, total: raw.data.items.length };
    }
  }

  if (Array.isArray(raw.items)) {
    return { items: raw.items, total: raw.items.length };
  }

  return { items: [], total: 0 };
};

/**
 * Chaos experiment list — extract and compact experiment entries.
 */
export const chaosExperimentListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      experimentID: item.experimentID ?? item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      infraType: item.infraType,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      updatedBy: item.updatedBy,
      isCustomExperiment: item.isCustomExperiment,
      recentExperimentRunDetails: item.recentExperimentRunDetails,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Chaos experiment run list — extract run history.
 */
export const chaosExperimentRunListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      experimentRunID: item.experimentRunID ?? item.notifyID ?? item.id,
      experimentID: item.experimentID,
      phase: item.phase,
      resiliencyScore: item.resiliencyScore,
      faultsPassed: item.faultsPassed,
      faultsFailed: item.faultsFailed,
      faultsStopped: item.faultsStopped,
      faultsAwaited: item.faultsAwaited,
      faultsNa: item.faultsNa,
      totalFaults: item.totalFaults,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      updatedBy: item.updatedBy,
      runSequence: item.runSequence,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Chaos hub list — compact hub entries.
 */
export const chaosHubListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      hubID: item.hubID ?? item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      repoURL: item.repoURL,
      repoBranch: item.repoBranch,
      hubType: item.hubType,
      isDefault: item.isDefault,
      isPrivate: item.isPrivate,
      totalFaults: item.totalFaults,
      totalExperiments: item.totalExperiments,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Chaos infrastructure list — compact infra entries.
 */
export const chaosInfraListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      infraID: item.infraID ?? item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      environmentID: item.environmentID,
      infraType: item.infraType,
      platformName: item.platformName,
      infraScope: item.infraScope,
      infraNamespace: item.infraNamespace,
      serviceAccount: item.serviceAccount,
      isActive: item.isActive,
      isInfraConfirmed: item.isInfraConfirmed,
      version: item.version,
      lastHeartbeat: item.lastHeartbeat,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Chaos probe list — compact probe entries.
 */
export const chaosProbeListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      probeID: item.probeID ?? item.identity ?? item.id ?? item.probeId,
      name: item.name,
      description: item.description,
      tags: item.tags,
      type: item.type,
      infrastructureType: item.infrastructureType,
      recentExecutions: item.recentExecutions,
      referencedBy: item.referencedBy,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
      updatedBy: item.updatedBy,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Chaos fault list — compact fault entries.
 */
export const chaosFaultListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      faultID: item.identity ?? item.id ?? item.faultID,
      name: item.name,
      description: item.description,
      tags: item.tags,
      category: item.category,
      spec: item.spec,
      updatedAt: item.updatedAt,
      createdAt: item.createdAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * ChaosGuard condition list — compact.
 */
export const chaosGuardConditionListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      conditionID: item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      type: item.type,
      conditionDetails: item.conditionDetails,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * ChaosGuard rule list — compact.
 */
export const chaosGuardRuleListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      ruleID: item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      enabled: item.enabled,
      conditions: item.conditions,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Network map list — compact.
 */
export const chaosNetworkMapListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      networkMapID: item.applicationmapid ?? item.identity ?? item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      targetServices: item.targetServices,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Experiment stats — flatten overview statistics.
 */
export const chaosExperimentStatsExtract = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  const data = isRecord(raw.data) ? raw.data : raw;
  return {
    totalExperiments: data.totalExperiments,
    totalExperimentRuns: data.totalExperimentRuns,
    totalActiveExperiments: data.totalActiveExperiments,
  };
};

/**
 * Chaos recommendations list — compact.
 */
export const chaosRecommendationListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      recommendationID: item.identity ?? item.id,
      experimentName: item.experimentName,
      experimentID: item.experimentID,
      faultName: item.faultName,
      recommendation: item.recommendation,
      status: item.status,
      priority: item.priority,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Risk/service stats — flatten service resilience stats.
 */
export const chaosRiskExtract = (raw: unknown): unknown => {
  if (!isRecord(raw)) return raw;
  const data = isRecord(raw.data) ? raw.data : raw;
  return data;
};

/**
 * DR tests list — compact.
 */
export const chaosDrTestListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      drTestID: item.identity ?? item.id,
      name: item.name,
      description: item.description,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};

/**
 * Action list — compact chaos action entries.
 */
export const chaosActionListExtract = (raw: unknown): { items: unknown[]; total: number } => {
  const result = chaosListExtract(raw);
  const items = result.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      actionID: item.identity ?? item.id,
      name: item.name,
      description: item.description,
      tags: item.tags,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
  return { items, total: result.total || items.length };
};
