# Harness Chaos Engineering — Agent Guide

## 1. Bootstrap

Call `harness_chaos_describe()` (no arguments) at the start of any session. It returns all available resource types, their supported operations, and filter fields.

## 2. Core Resource Types

| Resource Type | Description | Key Operations |
|---|---|---|
| `chaos_experiment` | Chaos experiments with fault injection sequences | list, get, create, update, delete, execute |
| `chaos_experiment_run` | Experiment execution history with resiliency scores | list, get |
| `chaos_experiment_stats` | Overview statistics (total experiments, runs) | get |
| `chaos_experiment_template` | Reusable experiment templates | list, get, create, update, delete, execute |
| `chaos_hub` | Git-based fault/experiment repositories | list, get, create, update, delete |
| `chaos_hub_fault` | Faults available across connected hubs | list |
| `chaos_fault` | Individual fault definitions (pod kill, CPU stress, etc.) | list, get, create |
| `chaos_fault_template` | Reusable fault templates | list, get, create, update, delete |
| `chaos_action` | Individual fault injection steps | list, get, create, update, delete |
| `chaos_action_template` | Reusable action templates | list, get, create, update, delete |
| `chaos_infrastructure` | K8s targets where experiments execute | list, get, create, delete |
| `chaos_infra_manifest` | K8s manifest YAML for agent install | get |
| `chaos_infra_helm_command` | Helm install command for agent | get |
| `chaos_infra_stats` | Infra overview stats (active/inactive counts) | get |
| `chaos_infra_version` | Latest agent version | get |
| `chaos_probe` | Steady-state validators (HTTP, CMD, Prom, K8s) | list, get, create, update, delete |
| `chaos_probe_template` | Reusable probe templates | list, get, create, update, delete |
| `chaosguard_condition` | Governance conditions (time, user, infra constraints) | list, get, create, update, delete |
| `chaosguard_rule` | Governance rules combining conditions | list, get, create, update, delete, execute |
| `chaos_network_map` | Service dependency maps for targeted testing | list, get, create, delete |
| `chaos_recommendation` | AI-generated resilience recommendations | list, create, execute |
| `chaos_risk` | Service-level risk scores | list, get |
| `chaos_service_stats` | Overall service resilience statistics | get |
| `chaos_service_report` | Detailed service resilience report | get |
| `chaos_dr_test` | Disaster recovery tests | list, create |
| `chaos_component` | CI/CD pipeline chaos integration | execute |
| `chaos_health` | Chaos Manager service health check | get |
| `chaos_image_registry` | Custom container image registry config | get |

## 3. Tool Calling Conventions

### harness_chaos_list
List resources with pagination and optional filters.
```
harness_chaos_list(resource_type="chaos_experiment", page=0, size=20)
harness_chaos_list(resource_type="chaos_infrastructure", filters={environmentID: "prod-env"})
```

### harness_chaos_get
Get a single resource by its primary identifier.
```
harness_chaos_get(resource_type="chaos_experiment", resource_id="exp-123")
harness_chaos_get(resource_type="chaos_infra_manifest", resource_id="infra-456")
```

### harness_chaos_create
Create a new resource with a body payload.
```
harness_chaos_create(resource_type="chaos_probe", body={name: "health-check", type: "httpProbe", ...})
```

### harness_chaos_update
Update an existing resource.
```
harness_chaos_update(resource_type="chaos_experiment", resource_id="exp-123", body={...})
```

### harness_chaos_delete
Delete a resource.
```
harness_chaos_delete(resource_type="chaos_experiment", resource_id="exp-123")
```

### harness_chaos_execute
Run experiments, launch templates, enable/disable ChaosGuard rules.
```
harness_chaos_execute(resource_type="chaos_experiment", resource_id="exp-123")
harness_chaos_execute(resource_type="chaosguard_rule", resource_id="rule-789", body={enabled: true})
```

### harness_chaos_describe
Discover resource types and schemas (no API call).
```
harness_chaos_describe()  // all resource types
harness_chaos_describe(resource_type="chaos_experiment")  // details for one type
harness_chaos_describe(search_term="probe")  // search by keyword
```

## 4. Common Workflows

### Investigate Experiment Results
1. List experiments: `harness_chaos_list(resource_type="chaos_experiment")`
2. Get run history: `harness_chaos_list(resource_type="chaos_experiment_run", filters={experiment_id: "<id>"})`
3. Analyze resiliency scores — `resiliencyScore` is 0-100, higher is better
4. Check `faultsPassed` / `faultsFailed` / `faultsStopped` for fault-level outcomes
5. For failed faults, check probe results and error messages in the run details

### Check Infrastructure Health
1. List all infra: `harness_chaos_list(resource_type="chaos_infrastructure")`
2. Look for `isActive: false` — means the chaos agent pod is disconnected
3. Check `lastHeartbeat` to see when infra was last connected
4. Get install manifest: `harness_chaos_get(resource_type="chaos_infra_manifest", resource_id="<infraId>")`
5. Or get Helm command: `harness_chaos_get(resource_type="chaos_infra_helm_command", resource_id="<infraId>")`

### Review Governance (ChaosGuard)
1. List rules: `harness_chaos_list(resource_type="chaosguard_rule")`
2. Check which rules are `enabled: true`
3. List conditions: `harness_chaos_list(resource_type="chaosguard_condition")`
4. Enable/disable a rule: `harness_chaos_execute(resource_type="chaosguard_rule", resource_id="<id>", body={enabled: true/false})`

### Run an Experiment
1. Find the experiment: `harness_chaos_list(resource_type="chaos_experiment")`
2. Verify infra is active: `harness_chaos_list(resource_type="chaos_infrastructure")`
3. Execute: `harness_chaos_execute(resource_type="chaos_experiment", resource_id="<id>")`
4. Monitor: `harness_chaos_list(resource_type="chaos_experiment_run", filters={experiment_id: "<id>"})`

### Assess Service Resilience
1. Get overall stats: `harness_chaos_get(resource_type="chaos_service_stats", resource_id="<accountId>")`
2. List risks: `harness_chaos_list(resource_type="chaos_risk")`
3. Get recommendations: `harness_chaos_list(resource_type="chaos_recommendation")`

### Browse Available Faults
1. List hub faults: `harness_chaos_list(resource_type="chaos_hub_fault")`
2. List project faults: `harness_chaos_list(resource_type="chaos_fault")`
3. Get fault details: `harness_chaos_get(resource_type="chaos_fault", resource_id="<faultId>")`

## 5. Scope

Most chaos resources are **project-scoped**. Always ensure `org_id` and `project_id` are set, either:
- Explicitly in each tool call
- Via defaults: `HARNESS_DEFAULT_ORG_ID` and `HARNESS_DEFAULT_PROJECT_ID` env vars

Account-scoped resources (`chaos_risk`, `chaos_service_stats`, `chaos_service_report`, `chaos_health`) do not require org/project.

## 6. API Paths

All Chaos APIs use the base path `/gateway/chaos/manager/api/`. The main API versions are:
- `/rest/` — original REST endpoints (experiments, faults, hubs, probes, infra)
- `/rest/v2/` — updated v2 REST endpoints (experiments, probes, network maps)
- `/v3/` — v3 endpoints (ChaosGuard, DR tests, risks, health)

Authentication uses `x-api-key` header (PAT or service account token).

## 7. Resiliency Score

The resiliency score (0-100) measures how well a system handles chaos:
- **0-30**: Low resilience — many faults failed, probes detected issues
- **30-70**: Moderate resilience — some faults passed, some failed
- **70-100**: High resilience — most faults passed, probes confirmed steady state

## 8. Probe Types

| Probe Type | Use Case |
|---|---|
| `httpProbe` | Validate HTTP endpoint availability and response |
| `cmdProbe` | Run a shell command and check exit code/output |
| `promProbe` | Query Prometheus metrics and validate thresholds |
| `k8sProbe` | Check Kubernetes resource state (pods, deployments) |
| `datadogProbe` | Query Datadog metrics |
| `dynatraceProbe` | Query Dynatrace metrics |
| `sloProbe` | Validate SLO compliance |

## 9. Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Experiment stuck in "Running" | Infra agent disconnected | Check `chaos_infrastructure` — look for `isActive: false` |
| All faults fail | Missing RBAC permissions | Ensure chaos agent service account has required cluster roles |
| ChaosGuard blocks experiment | Active governance rule | List `chaosguard_rule` — check `enabled` rules and their conditions |
| Probes fail unexpectedly | Endpoint not reachable from infra namespace | Verify network connectivity from chaos agent to probe target |
| 401 on API calls | Expired or invalid API key | Refresh HARNESS_API_KEY |
| 404 on experiment get | Wrong project scope | Verify org_id and project_id match the experiment's project |
