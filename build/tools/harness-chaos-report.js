import * as z from "zod/v4";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { jsonResult, errorResult } from "../utils/response-formatter.js";
import { toMcpError } from "../utils/errors.js";
import { createLogger } from "../utils/logger.js";
const log = createLogger("chaos-report");
// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function fetchExperiments(client, orgId, projectId) {
    const raw = await client.request({
        method: "GET",
        path: "/gateway/chaos/manager/api/rest/v2/experiment",
        params: {
            organizationIdentifier: orgId,
            projectIdentifier: projectId,
        },
    });
    const resp = raw;
    return resp?.data ?? [];
}
// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------
function msToDate(ms) {
    return new Date(typeof ms === "string" ? parseInt(ms, 10) : ms);
}
function analyzeExperiment(exp, startDate, endDate) {
    const allRuns = exp.recentWorkflowRunDetails ?? [];
    const runsInWindow = allRuns.filter((r) => {
        const runDate = msToDate(r.createdAt);
        return runDate >= startDate && runDate <= endDate;
    });
    if (runsInWindow.length === 0)
        return null;
    const scores = runsInWindow
        .map((r) => r.resiliencyScore)
        .filter((s) => s !== null && s !== undefined && s >= 0);
    const completed = runsInWindow.filter((r) => r.phase === "Completed").length;
    const failed = runsInWindow.filter((r) => r.phase === "Failed").length;
    const stopped = runsInWindow.filter((r) => r.phase === "Stopped").length;
    const errored = runsInWindow.filter((r) => r.phase === "Error").length;
    const avgScore = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    const worstScore = scores.length > 0 ? Math.min(...scores) : null;
    let scoreTrend = "insufficient_data";
    if (scores.length >= 3) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const diff = avgSecond - avgFirst;
        if (diff > 5)
            scoreTrend = "improving";
        else if (diff < -5)
            scoreTrend = "degrading";
        else
            scoreTrend = "stable";
    }
    const insights = [];
    if (stopped > completed && stopped > 0) {
        insights.push(`${stopped} of ${runsInWindow.length} runs were stopped prematurely — investigate why experiments are being halted.`);
    }
    if (errored > 0) {
        insights.push(`${errored} run(s) ended in error — check infrastructure connectivity and ChaosGuard rules.`);
    }
    if (avgScore !== null && avgScore < 50) {
        insights.push(`Average resiliency score is ${avgScore}/100 — this service has significant resilience gaps. Review failed faults and add retry/circuit-breaker patterns.`);
    }
    if (scoreTrend === "degrading") {
        insights.push("Resiliency scores are trending downward — recent changes may have introduced regressions.");
    }
    if (scoreTrend === "improving") {
        insights.push("Resiliency scores are improving — resilience fixes are having a positive effect.");
    }
    if (completed === 0 && runsInWindow.length > 0) {
        insights.push("No runs completed successfully — all were stopped or errored. This needs immediate attention.");
    }
    if (scores.length === 0 && runsInWindow.length > 0) {
        insights.push("No resiliency scores recorded — runs may have been stopped before faults could execute.");
    }
    if (bestScore !== null && worstScore !== null && bestScore - worstScore > 30) {
        insights.push(`Score variance is high (${worstScore} to ${bestScore}) — results are inconsistent, possibly due to environment instability.`);
    }
    const runs = runsInWindow
        .sort((a, b) => parseInt(a.createdAt, 10) - parseInt(b.createdAt, 10))
        .map((r) => ({
        runId: r.workflowRunID,
        sequence: r.runSequence ?? 0,
        phase: r.phase,
        resiliencyScore: r.resiliencyScore !== undefined && r.resiliencyScore !== null && r.resiliencyScore >= 0
            ? r.resiliencyScore
            : null,
        date: msToDate(r.createdAt).toISOString(),
        triggeredBy: r.createdBy?.username ?? "unknown",
    }));
    return {
        experimentName: exp.name,
        experimentId: exp.experimentID,
        infrastructure: exp.infra?.identity ?? "unknown",
        environment: exp.infra?.environmentId ?? "unknown",
        tags: exp.tags ?? [],
        totalRuns: runsInWindow.length,
        completedRuns: completed,
        failedRuns: failed,
        stoppedRuns: stopped,
        errorRuns: errored,
        avgResiliencyScore: avgScore,
        bestScore,
        worstScore,
        scoreTrend,
        runs,
        insights,
    };
}
// ---------------------------------------------------------------------------
// PDF Generation
// ---------------------------------------------------------------------------
async function generatePdf(reports, projectId, orgId, startDate, endDate, outputPath) {
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    const finished = new Promise((resolve) => doc.on("end", resolve));
    const NAVY = "#1a2332";
    const BLUE = "#0063F7";
    const GREEN = "#36b37e";
    const RED = "#e63535";
    const ORANGE = "#ff8b00";
    const GRAY = "#6b778c";
    const LIGHT_BG = "#f4f5f7";
    const totalRuns = reports.reduce((s, r) => s + r.totalRuns, 0);
    const totalCompleted = reports.reduce((s, r) => s + r.completedRuns, 0);
    const totalFailed = reports.reduce((s, r) => s + r.failedRuns, 0);
    const totalStopped = reports.reduce((s, r) => s + r.stoppedRuns, 0);
    const totalErrors = reports.reduce((s, r) => s + r.errorRuns, 0);
    const allScores = reports
        .map((r) => r.avgResiliencyScore)
        .filter((s) => s !== null);
    const overallAvg = allScores.length > 0
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
        : null;
    const allInsights = reports.flatMap((r) => r.insights.map((insight) => ({ experiment: r.experimentName, insight })));
    const degrading = reports.filter((r) => r.scoreTrend === "degrading");
    const needsAttention = reports.filter((r) => r.completedRuns === 0 && r.totalRuns > 0);
    // ---- Cover page ----
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(NAVY);
    doc.fillColor("white").fontSize(32).font("Helvetica-Bold")
        .text("Chaos Engineering", 50, 200)
        .text("Resilience Report", 50, 240);
    doc.fontSize(14).font("Helvetica")
        .text(`Project: ${projectId}`, 50, 310)
        .text(`Organization: ${orgId}`, 50, 330)
        .text(`Period: ${startDate.toLocaleDateString()} — ${endDate.toLocaleDateString()}`, 50, 350)
        .text(`Generated: ${new Date().toLocaleString()}`, 50, 370);
    doc.fontSize(11).fillColor(GRAY)
        .text("Generated by Harness Chaos Advisor Agent", 50, 720);
    // ---- Executive Summary ----
    doc.addPage();
    doc.fillColor(NAVY).fontSize(22).font("Helvetica-Bold")
        .text("Executive Summary", 50, 50);
    doc.moveTo(50, 80).lineTo(545, 80).strokeColor(BLUE).lineWidth(2).stroke();
    let y = 100;
    doc.fontSize(11).font("Helvetica").fillColor(NAVY);
    const summaryItems = [
        ["Total Experiments with Runs", `${reports.length}`],
        ["Total Experiment Runs", `${totalRuns}`],
        ["Completed", `${totalCompleted}`],
        ["Failed", `${totalFailed}`],
        ["Stopped", `${totalStopped}`],
        ["Errors", `${totalErrors}`],
        ["Overall Avg Resiliency Score", overallAvg !== null ? `${overallAvg} / 100` : "N/A"],
        ["Experiments Degrading", `${degrading.length}`],
        ["Experiments Needing Attention", `${needsAttention.length}`],
    ];
    for (const [label, value] of summaryItems) {
        const bgColor = y % 2 === 0 ? LIGHT_BG : "white";
        doc.rect(50, y, 495, 22).fill(bgColor);
        doc.fillColor(NAVY).fontSize(10).font("Helvetica")
            .text(label, 60, y + 6)
            .text(value, 400, y + 6, { width: 135, align: "right" });
        y += 22;
    }
    // Resilience Grade
    y += 20;
    let grade;
    let gradeColor;
    if (overallAvg === null) {
        grade = "N/A";
        gradeColor = GRAY;
    }
    else if (overallAvg >= 90) {
        grade = "A";
        gradeColor = GREEN;
    }
    else if (overallAvg >= 70) {
        grade = "B";
        gradeColor = GREEN;
    }
    else if (overallAvg >= 50) {
        grade = "C";
        gradeColor = ORANGE;
    }
    else if (overallAvg >= 30) {
        grade = "D";
        gradeColor = ORANGE;
    }
    else {
        grade = "F";
        gradeColor = RED;
    }
    doc.rect(50, y, 495, 50).fill(LIGHT_BG);
    doc.fillColor(NAVY).fontSize(12).font("Helvetica-Bold")
        .text("Resilience Grade:", 60, y + 8);
    doc.fillColor(gradeColor).fontSize(28).font("Helvetica-Bold")
        .text(grade, 400, y + 4, { width: 135, align: "right" });
    // ---- Key Insights ----
    if (allInsights.length > 0) {
        doc.addPage();
        doc.fillColor(NAVY).fontSize(22).font("Helvetica-Bold")
            .text("Key Insights & Action Items", 50, 50);
        doc.moveTo(50, 80).lineTo(545, 80).strokeColor(RED).lineWidth(2).stroke();
        y = 100;
        for (const { experiment, insight } of allInsights) {
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
            doc.fillColor(BLUE).fontSize(9).font("Helvetica-Bold")
                .text(experiment, 50, y);
            y += 14;
            doc.fillColor(NAVY).fontSize(10).font("Helvetica")
                .text(`  → ${insight}`, 50, y, { width: 495 });
            y += doc.heightOfString(`  → ${insight}`, { width: 495 }) + 10;
        }
    }
    // ---- Per-Experiment Details ----
    for (const report of reports) {
        doc.addPage();
        doc.fillColor(NAVY).fontSize(18).font("Helvetica-Bold")
            .text(report.experimentName, 50, 50);
        doc.fillColor(GRAY).fontSize(9).font("Helvetica")
            .text(`ID: ${report.experimentId}`, 50, 75)
            .text(`Infra: ${report.infrastructure} | Env: ${report.environment}`, 50, 88)
            .text(`Tags: ${report.tags.length > 0 ? report.tags.join(", ") : "none"}`, 50, 101);
        doc.moveTo(50, 118).lineTo(545, 118).strokeColor(BLUE).lineWidth(1).stroke();
        y = 130;
        // Stats row
        const stats = [
            { label: "Total Runs", value: report.totalRuns, color: NAVY },
            { label: "Completed", value: report.completedRuns, color: GREEN },
            { label: "Failed", value: report.failedRuns, color: RED },
            { label: "Stopped", value: report.stoppedRuns, color: ORANGE },
            { label: "Errors", value: report.errorRuns, color: RED },
        ];
        const colW = 99;
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const x = 50 + i * colW;
            doc.rect(x, y, colW - 4, 45).fill(LIGHT_BG);
            doc.fillColor(stat.color).fontSize(18).font("Helvetica-Bold")
                .text(String(stat.value), x + 5, y + 5, { width: colW - 14, align: "center" });
            doc.fillColor(GRAY).fontSize(8).font("Helvetica")
                .text(stat.label, x + 5, y + 28, { width: colW - 14, align: "center" });
        }
        y += 55;
        // Scores
        doc.rect(50, y, 240, 45).fill(LIGHT_BG);
        doc.fillColor(NAVY).fontSize(9).font("Helvetica-Bold").text("Avg Score", 60, y + 5);
        doc.fillColor(report.avgResiliencyScore !== null && report.avgResiliencyScore < 50 ? RED : GREEN)
            .fontSize(16).font("Helvetica-Bold")
            .text(report.avgResiliencyScore !== null ? `${report.avgResiliencyScore}` : "N/A", 60, y + 20);
        doc.rect(300, y, 245, 45).fill(LIGHT_BG);
        doc.fillColor(NAVY).fontSize(9).font("Helvetica-Bold").text("Trend", 310, y + 5);
        const trendLabel = report.scoreTrend === "improving" ? "↑ Improving"
            : report.scoreTrend === "degrading" ? "↓ Degrading"
                : report.scoreTrend === "stable" ? "→ Stable" : "— Not enough data";
        const trendColor = report.scoreTrend === "improving" ? GREEN
            : report.scoreTrend === "degrading" ? RED : GRAY;
        doc.fillColor(trendColor).fontSize(14).font("Helvetica-Bold")
            .text(trendLabel, 310, y + 20);
        y += 55;
        // Run history table
        doc.fillColor(NAVY).fontSize(12).font("Helvetica-Bold").text("Run History", 50, y);
        y += 20;
        doc.rect(50, y, 495, 18).fill(NAVY);
        doc.fillColor("white").fontSize(8).font("Helvetica-Bold");
        doc.text("#", 55, y + 5, { width: 30 });
        doc.text("Date", 90, y + 5, { width: 140 });
        doc.text("Phase", 235, y + 5, { width: 90 });
        doc.text("Score", 330, y + 5, { width: 60 });
        doc.text("Triggered By", 395, y + 5, { width: 150 });
        y += 18;
        for (const run of report.runs) {
            if (y > 720) {
                doc.addPage();
                y = 50;
            }
            const bg = run.phase === "Completed" ? "#e3fcef"
                : run.phase === "Error" ? "#ffebe6"
                    : run.phase === "Failed" ? "#ffebe6"
                        : LIGHT_BG;
            doc.rect(50, y, 495, 16).fill(bg);
            doc.fillColor(NAVY).fontSize(8).font("Helvetica");
            doc.text(String(run.sequence), 55, y + 4, { width: 30 });
            doc.text(new Date(run.date).toLocaleString(), 90, y + 4, { width: 140 });
            const phaseColor = run.phase === "Completed" ? GREEN
                : run.phase === "Error" || run.phase === "Failed" ? RED
                    : ORANGE;
            doc.fillColor(phaseColor).text(run.phase, 235, y + 4, { width: 90 });
            const scoreStr = run.resiliencyScore !== null ? String(run.resiliencyScore) : "—";
            const scoreColor = run.resiliencyScore !== null && run.resiliencyScore < 50 ? RED : NAVY;
            doc.fillColor(scoreColor).text(scoreStr, 330, y + 4, { width: 60 });
            doc.fillColor(GRAY).text(run.triggeredBy, 395, y + 4, { width: 150 });
            y += 16;
        }
        // Insights for this experiment
        if (report.insights.length > 0) {
            y += 15;
            if (y > 680) {
                doc.addPage();
                y = 50;
            }
            doc.fillColor(NAVY).fontSize(11).font("Helvetica-Bold").text("Insights", 50, y);
            y += 18;
            for (const insight of report.insights) {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }
                doc.fillColor(RED).fontSize(9).font("Helvetica").text("▸ ", 50, y);
                doc.fillColor(NAVY).text(insight, 65, y, { width: 480 });
                y += doc.heightOfString(insight, { width: 480 }) + 8;
            }
        }
    }
    // ---- Recommendations page ----
    doc.addPage();
    doc.fillColor(NAVY).fontSize(22).font("Helvetica-Bold")
        .text("Recommendations", 50, 50);
    doc.moveTo(50, 80).lineTo(545, 80).strokeColor(GREEN).lineWidth(2).stroke();
    y = 100;
    const recommendations = [];
    if (needsAttention.length > 0) {
        recommendations.push(`CRITICAL: ${needsAttention.length} experiment(s) had runs but none completed — ` +
            `investigate: ${needsAttention.map((r) => r.experimentName).join(", ")}`);
    }
    if (degrading.length > 0) {
        recommendations.push(`WARNING: ${degrading.length} experiment(s) show degrading resiliency scores — ` +
            `check for recent regressions: ${degrading.map((r) => r.experimentName).join(", ")}`);
    }
    if (overallAvg !== null && overallAvg < 50) {
        recommendations.push("Overall resiliency is below 50% — prioritize adding retry logic, circuit breakers, and graceful degradation patterns.");
    }
    if (totalStopped > totalCompleted) {
        recommendations.push(`More runs were stopped (${totalStopped}) than completed (${totalCompleted}) — review ChaosGuard rules and infrastructure stability.`);
    }
    if (totalErrors > 0) {
        recommendations.push(`${totalErrors} run(s) errored out — check chaos infrastructure connectivity and agent health.`);
    }
    if (reports.length === 0) {
        recommendations.push("No experiments were executed in this timeframe. Schedule regular chaos experiments to continuously validate resilience.");
    }
    if (recommendations.length === 0) {
        recommendations.push("All experiments are performing well. Continue running chaos experiments regularly and expand fault coverage.");
    }
    for (const rec of recommendations) {
        if (y > 720) {
            doc.addPage();
            y = 50;
        }
        const isRed = rec.startsWith("CRITICAL");
        const isOrange = rec.startsWith("WARNING");
        doc.fillColor(isRed ? RED : isOrange ? ORANGE : NAVY)
            .fontSize(10).font("Helvetica-Bold")
            .text("●", 50, y);
        doc.fillColor(NAVY).fontSize(10).font("Helvetica")
            .text(rec, 65, y, { width: 480 });
        y += doc.heightOfString(rec, { width: 480 }) + 12;
    }
    doc.end();
    await finished;
    const pdfBuffer = Buffer.concat(chunks);
    const dir = resolve(outputPath, "..");
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    writeFileSync(outputPath, pdfBuffer);
}
// ---------------------------------------------------------------------------
// Tool Registration
// ---------------------------------------------------------------------------
export function registerChaosReportTool(server, client, config) {
    server.registerTool("harness_chaos_report", {
        description: "Generate a PDF resilience report for a Chaos project. " +
            "Fetches all experiment execution data within a user-specified timeframe, " +
            "analyzes resiliency scores, identifies trends, and produces a polished PDF " +
            "with executive summary, per-experiment breakdowns, insights, and recommendations. " +
            "Ask the user for the timeframe (start_date and end_date) before calling.",
        inputSchema: z.object({
            project_id: z.string().describe("Harness project identifier").optional(),
            org_id: z.string().describe("Organization identifier").optional(),
            start_date: z.string().describe("Report start date in YYYY-MM-DD format (e.g. '2026-01-01'). Ask the user for this.").optional(),
            end_date: z.string().describe("Report end date in YYYY-MM-DD format (e.g. '2026-05-11'). Ask the user for this.").optional(),
            output_path: z.string().describe("File path for the generated PDF (e.g. './chaos-report.pdf')").optional(),
        }).passthrough(),
        annotations: {
            title: "Generate Chaos Resilience Report",
            readOnlyHint: true,
            openWorldHint: true,
        },
    }, async (args) => {
        try {
            const orgId = args.org_id ?? config.HARNESS_DEFAULT_ORG_ID;
            const projectId = args.project_id ?? config.HARNESS_DEFAULT_PROJECT_ID;
            if (!projectId) {
                return errorResult("project_id is required. Provide it explicitly or set HARNESS_DEFAULT_PROJECT_ID.");
            }
            // Validate dates
            if (!args.start_date?.trim() || !args.end_date?.trim()) {
                return jsonResult({
                    status: "dates_required",
                    message: "Ask the user for the report timeframe. Both start_date and end_date are required.",
                    prompts: [
                        "What date range should the report cover?",
                        "For example: start_date='2026-04-01', end_date='2026-05-11'",
                    ],
                    required_inputs: [
                        { parameter: "start_date", format: "YYYY-MM-DD", ask: "What is the start date for the report?" },
                        { parameter: "end_date", format: "YYYY-MM-DD", ask: "What is the end date for the report?" },
                    ],
                });
            }
            const startDate = new Date(args.start_date);
            const endDate = new Date(args.end_date);
            endDate.setHours(23, 59, 59, 999);
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return errorResult("Invalid date format. Use YYYY-MM-DD (e.g. '2026-01-01').");
            }
            if (startDate > endDate) {
                return errorResult("start_date must be before end_date.");
            }
            log.info("Generating chaos report", { orgId, projectId, startDate: args.start_date, endDate: args.end_date });
            // Fetch all experiments
            const experiments = await fetchExperiments(client, orgId, projectId);
            if (experiments.length === 0) {
                return errorResult(`No experiments found in project "${projectId}". Create experiments first.`);
            }
            // Analyze each experiment within the time window
            const reports = [];
            for (const exp of experiments) {
                const report = analyzeExperiment(exp, startDate, endDate);
                if (report)
                    reports.push(report);
            }
            // Generate PDF
            const outputPath = resolve(args.output_path ?? `./chaos-report-${projectId}-${args.start_date}-to-${args.end_date}.pdf`);
            await generatePdf(reports, projectId, orgId, startDate, endDate, outputPath);
            log.info("Chaos report generated", { outputPath, experiments: reports.length });
            // Build summary for the agent
            const totalRuns = reports.reduce((s, r) => s + r.totalRuns, 0);
            const allScores = reports.map((r) => r.avgResiliencyScore).filter((s) => s !== null);
            const overallAvg = allScores.length > 0
                ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
                : null;
            const allInsights = reports.flatMap((r) => r.insights.map((i) => ({ experiment: r.experimentName, insight: i })));
            return jsonResult({
                status: "report_generated",
                message: `Chaos resilience report saved to ${outputPath}`,
                pdf_path: outputPath,
                summary: {
                    project: projectId,
                    organization: orgId,
                    period: `${args.start_date} to ${args.end_date}`,
                    total_experiments_with_runs: reports.length,
                    total_experiments_without_runs: experiments.length - reports.length,
                    total_runs: totalRuns,
                    overall_avg_resiliency_score: overallAvg,
                    experiments_degrading: reports.filter((r) => r.scoreTrend === "degrading").length,
                    experiments_needing_attention: reports.filter((r) => r.completedRuns === 0 && r.totalRuns > 0).length,
                },
                insights: allInsights,
                experiment_scores: reports.map((r) => ({
                    name: r.experimentName,
                    runs: r.totalRuns,
                    avg_score: r.avgResiliencyScore,
                    trend: r.scoreTrend,
                    insight_count: r.insights.length,
                })),
            });
        }
        catch (err) {
            if (err instanceof Error) {
                log.error("Chaos report error", { error: err.message });
                return errorResult(`Error generating report: ${err.message}`);
            }
            throw toMcpError(err);
        }
    });
}
//# sourceMappingURL=harness-chaos-report.js.map