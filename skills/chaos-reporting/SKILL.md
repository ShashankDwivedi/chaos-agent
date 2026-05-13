---
name: chaos-report
description: >-
  Generate a PDF resilience report for a Harness Chaos project. Fetches
  experiment execution data for a user-specified timeframe, analyzes
  resiliency scores, identifies trends, and produces a detailed PDF.
  Use when the user asks for a chaos report, resilience report, experiment
  summary, execution history report, project health report, or wants to
  review chaos results over a time period.
---

# Chaos Resilience Report

Generates a **PDF report** summarizing all chaos experiment executions within a user-specified timeframe. The report includes executive summary, per-experiment breakdowns, resiliency score trends, insights, and actionable recommendations.

## When to Use

Trigger this skill when the user asks about:
- Chaos experiment report or summary
- Resilience report for a project
- Experiment execution history over a time period
- Project health or resiliency trends
- Review of chaos results for a date range
- PDF report of chaos experiments

## Tool: `harness_chaos_report`

### Step 1 — Ask for the Timeframe

Before calling the tool, ask the user:

> "What date range should the report cover? (e.g. last 30 days, last quarter, specific dates)"

Convert their answer to `start_date` and `end_date` in `YYYY-MM-DD` format. Examples:
- "last 30 days" → `start_date=today-30d`, `end_date=today`
- "April 2026" → `start_date=2026-04-01`, `end_date=2026-04-30`
- "last quarter" → calculate Q dates

If the user doesn't specify, suggest "last 30 days" as a default.

### Step 2 — Call the Tool

```
harness_chaos_report(
  project_id="<project_id>",
  start_date="2026-04-01",
  end_date="2026-05-11"
)
```

If called without dates, the tool returns `dates_required` with prompts to ask the user.

### Step 3 — Present Results

The tool returns:
- **PDF path** — the generated report file location
- **Summary** — total experiments, runs, overall score, degrading experiments
- **Insights** — per-experiment findings that need attention
- **Experiment scores** — table of all experiments with run counts, avg scores, and trends

Present the summary and key insights to the user, then mention the PDF is available at the returned path.

## What the Report Contains

### Page 1: Cover
- Project name, org, date range, generation timestamp

### Page 2: Executive Summary
- Total experiments with runs, total runs, completion rates
- Overall average resiliency score with letter grade (A-F)
- Count of degrading and attention-needed experiments

### Page 3: Key Insights & Action Items
- Consolidated list of all findings across experiments
- Each insight tagged with the experiment name

### Per-Experiment Pages:
- Run statistics (completed, failed, stopped, errors)
- Average resiliency score with trend indicator (improving/degrading/stable)
- Run history table with dates, phases, scores, and who triggered each run
- Experiment-specific insights

### Final Page: Recommendations
- Prioritized action items (CRITICAL, WARNING, general)
- Based on score analysis, failure patterns, and trend data

## Insights the Tool Generates

The tool automatically identifies:
- Experiments with more stopped than completed runs
- Runs that ended in error (infrastructure issues)
- Low resiliency scores (< 50)
- Degrading score trends (recent runs worse than older ones)
- Improving score trends (fixes having positive effect)
- Experiments where no runs completed successfully
- High score variance indicating environment instability
- Missing resiliency scores (runs stopped before faults executed)

## Example Conversation

**User:** "Can you generate a chaos report for the last 2 months?"

**Agent:**
1. Calculates: start_date = 2026-03-11, end_date = 2026-05-11
2. Calls `harness_chaos_report(project_id="default_project", start_date="2026-03-11", end_date="2026-05-11")`
3. Presents:
   > "I've generated your chaos resilience report. Here's the summary:
   > - 8 experiments had runs in this period with 45 total executions
   > - Overall resiliency score: 72/100 (Grade B)
   > - 2 experiments are showing degrading scores
   > - 1 experiment needs immediate attention (no successful completions)
   >
   > Key insights:
   > - payment-api-block: scores dropped from 90 to 65 — possible regression
   > - pod-delete-test: all 5 runs stopped prematurely — check ChaosGuard rules
   >
   > The full PDF report is saved at: ./chaos-report-default_project-2026-03-11-to-2026-05-11.pdf"
