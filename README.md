# Harness Resilience Agent

An MCP (Model Context Protocol) server that gives AI agents full access to the **Harness Chaos Engineering (Resilience Testing)** platform — experiments, faults, probes, ChaosGuard governance, infrastructure management, recommendations, and service resilience scoring.

## What It Does

Connect any MCP-compatible AI agent (Claude, Cursor, Windsurf, etc.) to your Harness account and ask questions in plain language:

> *"What experiments are running in my project?"*
> *"Is my chaos infrastructure healthy?"*
> *"Which services have the lowest resilience scores?"*
> *"Run the pod-kill experiment on the payments service"*

The server handles all API calls and response normalization. The agent just asks the question.

---

## Tools

| Tool | Description |
|------|-------------|
| `harness_chaos_guide` | **Call this first.** Returns the complete agent guide — resource types, tool calling conventions, common workflows, troubleshooting. |
| `harness_chaos_list` | List chaos resources with filtering and pagination |
| `harness_chaos_get` | Get a single chaos resource by ID |
| `harness_chaos_create` | Create a new chaos resource |
| `harness_chaos_update` | Update an existing chaos resource |
| `harness_chaos_delete` | Delete a chaos resource |
| `harness_chaos_execute` | Run experiments, launch templates, enable ChaosGuard rules |
| `harness_chaos_describe` | Discover available resource types and their schemas — no API call |
| `harness_chaos_onboard` | **Kubernetes onboarding automation.** Lists delegates, then generates a complete Terraform config (org, project, K8s connector, env, infra, chaos infra, discovery agent) |

---

## Resource Types

All resource types are accessed via `harness_chaos_list` / `harness_chaos_get` / etc. Pass `resource_type` to select:

| Category | Resource Types |
|---|---|
| **Experiments** | `chaos_experiment`, `chaos_experiment_run`, `chaos_experiment_stats`, `chaos_experiment_template` |
| **Hubs** | `chaos_hub`, `chaos_hub_fault` |
| **Faults** | `chaos_fault`, `chaos_fault_template` |
| **Actions** | `chaos_action`, `chaos_action_template` |
| **Infrastructure** | `chaos_infrastructure`, `chaos_infra_manifest`, `chaos_infra_helm_command`, `chaos_infra_stats`, `chaos_infra_version` |
| **Probes** | `chaos_probe`, `chaos_probe_template` |
| **ChaosGuard** | `chaosguard_condition`, `chaosguard_rule` |
| **Network Maps** | `chaos_network_map` |
| **Recommendations** | `chaos_recommendation` |
| **Risks & Reports** | `chaos_risk`, `chaos_service_stats`, `chaos_service_report` |
| **DR Tests** | `chaos_dr_test` |
| **Other** | `chaos_component`, `chaos_health`, `chaos_image_registry` |

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd harness-chaos-advisor-agent
pnpm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — set HARNESS_ACCOUNT_ID and HARNESS_API_KEY
```

### 3. Build and run

```bash
pnpm build

# HTTP mode (recommended)
pnpm start:http

# Stdio mode (for Claude Desktop, Cursor, Windsurf)
pnpm start
```

---

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HARNESS_API_KEY` | Yes* | — | Harness PAT or service account token |
| `HARNESS_BEARER_TOKEN` | No* | — | Browser session JWT (alternative auth) |
| `HARNESS_ACCOUNT_ID` | Yes | *(from PAT)* | Account identifier. Auto-extracted from PAT tokens. |
| `HARNESS_BASE_URL` | No | `https://app.harness.io` | Override for self-managed Harness. |
| `PORT` | No | `3000` | HTTP transport port. |
| `HARNESS_DEFAULT_ORG_ID` | No | `default` | Default org identifier. |
| `HARNESS_DEFAULT_PROJECT_ID` | No | — | Default project identifier. |
| `HARNESS_API_TIMEOUT_MS` | No | `30000` | HTTP request timeout (ms). |
| `HARNESS_MAX_RETRIES` | No | `3` | Retries for transient failures (429, 5xx). |
| `HARNESS_READ_ONLY` | No | `false` | When true, blocks create/update/delete/execute. |
| `LOG_LEVEL` | No | `info` | `debug` \| `info` \| `warn` \| `error`. |

\* At least one of `HARNESS_API_KEY` or `HARNESS_BEARER_TOKEN` must be provided.

---

## Client Configuration

### Cursor (`.cursor/mcp.json`) — HTTP mode

```json
{
  "mcpServers": {
    "chaos-advisor": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Start the server first with `pnpm start:http`, then connect Cursor.

### Health check

```bash
curl http://localhost:3000/health
```

---

## Prompts

| Prompt | Description |
|--------|-------------|
| `resilience-assessment` | Comprehensive resilience posture assessment |
| `experiment-analysis` | Analyze experiment runs for resilience gaps |
| `infra-health-check` | Check infrastructure target health |
| `chaos-recommendations` | Prioritized resilience improvement plan |

---

## Development

```bash
# Build
pnpm build

# Watch mode with auto-restart
pnpm dev

# Type check only
pnpm typecheck

# Tests
pnpm test

# Interactive MCP Inspector
pnpm inspect
```

### Project Structure

```
src/
  index.ts                          # Server entrypoint, HTTP + stdio transport
  config.ts                         # Env var validation (Zod)
  client/
    harness-client.ts               # HTTP client (auth, retry, rate limiting)
    types.ts                        # Request/response types
  registry/
    index.ts                        # Registry class + dispatch logic
    types.ts                        # Resource, toolset, endpoint types
    extractors.ts                   # Response extractors for Chaos API shapes
    toolsets/
      chaos.ts                      # All Chaos resource definitions
  tools/
    index.ts                        # Tool registration
    harness-list.ts                 # harness_chaos_list
    harness-get.ts                  # harness_chaos_get
    harness-describe.ts             # harness_chaos_describe
    harness-chaos-execute.ts        # harness_chaos_execute
    harness-chaos-mutate.ts         # harness_chaos_create/update/delete
    harness-chaos-guide.ts          # harness_chaos_guide
  prompts/
    resilience-assessment.ts        # Resilience posture assessment
    experiment-analysis.ts          # Experiment run analysis
    infra-health-check.ts           # Infrastructure health check
    chaos-recommendations.ts        # Prioritized recommendations
  docs/
    chaos-guide.md                  # Full agent guide
  utils/
    logger.ts                       # stderr-only structured logger
    errors.ts                       # Error normalization
    rate-limiter.ts                 # Client-side rate limiting
    compact.ts                      # Response compaction
    type-guards.ts                  # Type guard utilities
    url-parser.ts                   # URL parsing
    deep-links.ts                   # Harness UI deep links
    cli.ts                          # CLI argument parsing
    response-formatter.ts           # MCP response formatting
  resources/
    index.ts                        # MCP resource registration (placeholder)
```

---

## Architecture

```
  AI Agent (Claude / Cursor / Windsurf / etc.)
         │  MCP (stdio or HTTP)
  ┌──────▼──────────────────────────────────────┐
  │  harness-chaos-advisor-agent  (port 3000)   │
  │                                             │
  │  MCP Tools  (harness_chaos_*)               │
  │       │                                     │
  │  Registry  (Chaos resource types)           │
  │       │                                     │
  │  HarnessClient  ────► Harness Chaos API     │
  │                       /gateway/chaos/...    │
  └─────────────────────────────────────────────┘
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Experiment runs fail | Chaos infrastructure inactive | Check `chaos_infrastructure` list — look for `isActive: false` |
| All faults fail | Missing K8s RBAC permissions | Ensure chaos agent service account has required cluster roles |
| ChaosGuard blocks execution | Active governance rule | List `chaosguard_rule` — check which rules are enabled |
| 401 on API calls | Invalid or expired API key | Refresh `HARNESS_API_KEY` |
| 404 on resource get | Wrong project scope | Verify `org_id` and `project_id` match the resource's project |
| `HARNESS_ACCOUNT_ID is required` | API key is not a PAT | Set `HARNESS_ACCOUNT_ID` explicitly |

---

## License

Apache 2.0
