---
name: pod-api-block-experiment
description: >-
  Create a Pod API Block chaos experiment for testing downstream API
  dependencies, third-party API failures, or API unavailability scenarios.
  Use when the user mentions API blocking, API dependency testing, downstream
  service failure, third-party API chaos, API resilience, egress blocking,
  or wants to simulate an API outage on a Kubernetes workload.
---

# Pod API Block Chaos Experiment

Creates a **Pod API Block** experiment that intercepts and blocks specific API calls from a Kubernetes workload, simulating downstream API dependency failures.

## When to Use

Trigger this skill when the user asks about any of:
- Downstream dependency failure testing
- Third-party API failure simulation
- API outage chaos testing
- Blocking specific API paths or endpoints
- Egress traffic disruption
- Service-to-service communication failure

## Tool: `harness_chaos_pod_api_block`

This tool has a **3-phase** interactive flow with **4 mandatory runtime inputs** that the user must provide via the chat.

### Runtime Inputs (User MUST Provide)

These 4 parameters are **mandatory user inputs** — never use defaults or placeholders for them. Always ask the user explicitly:

| # | Parameter | What to ask the user |
|---|-----------|---------------------|
| 1 | `target_workload_namespace` | "What is the Kubernetes namespace where your target workload runs?" |
| 2 | `target_workload_names` | "What is the name of the deployment/workload you want to disrupt?" |
| 3 | `path_filter` | "Which API path should be blocked?" (e.g. `/api/v1/payments`) |
| 4 | `destination_hosts` | "What is the destination host whose API calls should be blocked?" (e.g. `payment-svc.default.svc.cluster.local`) |

### Phase 1 — List Environments

Call without `environment_id`:

```
harness_chaos_pod_api_block(project_id="<project_id>")
```

Present the environment list to the user and ask: **"Which environment should I create this experiment in?"**

### Phase 2 — List Infrastructures + Collect Runtime Inputs

Call with chosen `environment_id`:

```
harness_chaos_pod_api_block(
  project_id="<project_id>",
  environment_id="<chosen_env_id>"
)
```

Present the infrastructure list and ask the user for **ALL of the following in one message**:

1. Which infrastructure to use
2. The **4 runtime inputs** listed above

Example prompt to the user:
> "Which infrastructure should I use? Also, I need the following details:
> - **Namespace**: Where does your target workload run?
> - **Workload name**: What deployment should be disrupted?
> - **API path**: Which API path should be blocked?
> - **Destination host**: What host should the blocking target?"

### Phase 3 — Create Experiment

Only call Phase 3 **after the user has provided all 4 runtime inputs**:

```
harness_chaos_pod_api_block(
  project_id="<project_id>",
  environment_id="<env_id>",
  infra_id="<infra_id>",
  target_workload_namespace="<user_provided>",
  target_workload_names="<user_provided>",
  path_filter="<user_provided>",
  destination_hosts="<user_provided>"
)
```

If any runtime input is missing, the tool returns `runtime_inputs_missing` with the specific questions to ask the user. Ask them and call again.

## Example Conversation

**User:** "I want to test what happens when our payment service can't reach the Stripe API"

**Agent:**
1. Calls Phase 1 → gets environment list
2. Asks: *"Which environment should I create this experiment in?"*

**User:** "Use chaosdemo"

**Agent:**
3. Calls Phase 2 → gets infrastructure list
4. Asks: *"Which infrastructure should I use? Also I need:*
   - *What namespace does payment-service run in?*
   - *What's the exact deployment name?*
   - *Which Stripe API path should be blocked?*
   - *What's the Stripe host/endpoint?"*

**User:** "Use shashankchaosinfra. Namespace is production, deployment is payment-service, block /v1/charges on api.stripe.com"

**Agent:**
5. Calls Phase 3 with all user-provided values:
   - `infra_id="shashankchaosinfra"`
   - `target_workload_namespace="production"`
   - `target_workload_names="payment-service"`
   - `path_filter="/v1/charges"`
   - `destination_hosts="api.stripe.com"`
6. Returns the experiment link and next steps

## Other Parameters (Optional — have defaults)

| Parameter | Default | Description |
|-----------|---------|-------------|
| `experiment_name` | `pod-api-block` | Experiment display name |
| `target_workload_kind` | `deployment` | `deployment`, `statefulset`, or `daemonset` |
| `chaos_duration` | `240` | Duration in seconds |
| `data_direction` | `response` | `request`, `response`, or `both` |
| `service_direction` | `egress` | `ingress` or `egress` |
| `pod_affected_percentage` | `100` | % of pods to affect (1-100) |
| `transaction_percentage` | `100` | % of transactions to block |
| `namespace` | `harness-delegate-ng` | Namespace for experiment runner |

## What the Experiment Does

The Pod API Block fault:
1. Identifies pods matching the target workload
2. Installs an eBPF-based network interceptor on those pods
3. Matches outgoing (egress) or incoming (ingress) API calls by path and destination host
4. Blocks matching API calls for the specified duration
5. Cleans up after the chaos duration expires

This validates whether the target service handles API dependency failures gracefully — retries, circuit breakers, fallbacks, timeouts, etc.
