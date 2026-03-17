/**
 * BushidoOS MCP Server — The Agent's Interface to the Orchestrator
 * 
 * This server exposes BushidoOS capabilities as MCP tools that coding agents
 * (Cursor, Copilot, Claude, etc.) can call directly from the IDE.
 * 
 * Tools:
 *   get_project_context    — Full project state in one call
 *   get_spec               — Read the living PRD (spec.json)
 *   get_feature             — Get a specific feature by ID
 *   get_constraints        — Read tech stack and coding rules
 *   run_audit              — Run Foreman alignment audit
 *   get_audit_report       — Read the latest audit report
 *   get_punchlist          — Get outstanding violations
 *   push_change            — Propose a requirement change with impact cascade
 *   get_change_history     — Read the change log
 *   report_progress        — Agent reports what it built (for audit tracking)
 *   read_bead              — Read any .bushido/ artifact by name
 *   write_bead             — Write any .bushido/ artifact by name
 * 
 * Resources:
 *   bushido://spec         — Live spec.json
 *   bushido://strategy     — Strategy overview
 *   bushido://cursorrules  — Generated IDE constraints
 *   bushido://audit        — Latest alignment report
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const BEADS_DIR = path.join(ROOT_DIR, ".bushido");

// Create server
const server = new McpServer({
    name: "BushidoOS",
    version: "1.1.0",
});

// ─── Helpers ────────────────────────────────────────

const safeRead = (filename) => {
    const filePath = path.join(BEADS_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8");
};

const safeReadJSON = (filename) => {
    const raw = safeRead(filename);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
};

const textResult = (text) => ({
    content: [{ type: "text", text }]
});

const jsonResult = (obj) => ({
    content: [{ type: "text", text: JSON.stringify(obj, null, 2) }]
});

const errorResult = (msg) => ({
    isError: true,
    content: [{ type: "text", text: `❌ ${msg}` }]
});

// ─── RESOURCES ──────────────────────────────────────

server.resource("spec", "bushido://spec", async (uri) => {
    const content = safeRead("spec.json");
    return { contents: [{ uri: uri.href, text: content || '{"error": "No spec. Run bushido kickstart."}' }] };
});

server.resource("strategy", "bushido://strategy", async (uri) => {
    const content = safeRead("strategy.md");
    return { contents: [{ uri: uri.href, text: content || "No strategy generated yet." }] };
});

server.resource("cursorrules", "bushido://cursorrules", async (uri) => {
    const p = path.join(ROOT_DIR, ".cursorrules");
    const content = fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : "No .cursorrules generated yet.";
    return { contents: [{ uri: uri.href, text: content }] };
});

server.resource("audit", "bushido://audit", async (uri) => {
    const content = safeRead("alignment-report.json");
    return { contents: [{ uri: uri.href, text: content || '{"error": "No audit run yet."}' }] };
});

// ─── TOOL: get_project_context ──────────────────────
// The "one call to rule them all" — gives the agent everything it needs

server.tool(
    "get_project_context",
    "Get full project context: spec, constraints, recent changes, audit status, and .cursorrules. Call this FIRST before writing any code.",
    {},
    async () => {
        const spec = safeReadJSON("spec.json");
        const alignment = safeReadJSON("alignment-report.json");
        const punchlist = safeReadJSON("punchlist.json");
        const changes = safeReadJSON("changes.json");
        const cursorrules = (() => {
            const p = path.join(ROOT_DIR, ".cursorrules");
            return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
        })();

        const context = {
            project: spec ? {
                title: spec.title,
                version: spec.version,
                description: spec.description,
                featureCount: spec.features?.length || 0,
                features: spec.features?.map(f => ({
                    id: f.id,
                    name: f.name,
                    priority: f.priority,
                    acceptanceCriteria: f.acceptanceCriteria
                })),
                techStack: spec.constraints?.techStack,
                codingStandards: spec.constraints?.codingStandards,
                excludedPatterns: spec.constraints?.excludedPatterns,
            } : null,
            audit: alignment ? {
                score: alignment.score,
                aligned: alignment.aligned,
                summary: alignment.summary,
            } : null,
            punchlist: punchlist?.items || punchlist || null,
            recentChanges: changes?.slice(-3) || null,
            cursorrules: cursorrules,
            instructions: [
                "Read the features and acceptance criteria before implementing anything.",
                "Follow the tech stack and coding standards listed above.",
                "Avoid the excluded patterns.",
                "After implementing, run the 'run_audit' tool to verify alignment.",
                "If you need a requirement changed, use 'push_change' — never modify spec.json directly.",
            ]
        };

        return jsonResult(context);
    }
);

// ─── TOOL: get_spec ─────────────────────────────────

server.tool(
    "get_spec",
    "Get the current product specification (Living PRD). Returns features, constraints, and version info.",
    {},
    async () => {
        const spec = safeReadJSON("spec.json");
        if (!spec) return errorResult("No spec found. Run `bushido kickstart` first.");
        return jsonResult(spec);
    }
);

// ─── TOOL: get_feature ──────────────────────────────

server.tool(
    "get_feature",
    "Get a specific feature by its ID (e.g., F001). Returns the user story, acceptance criteria, and priority.",
    { featureId: z.string().describe("Feature ID, e.g. 'F001'") },
    async ({ featureId }) => {
        const spec = safeReadJSON("spec.json");
        if (!spec) return errorResult("No spec found.");

        const feature = spec.features?.find(f => f.id === featureId);
        if (!feature) {
            const available = spec.features?.map(f => `${f.id}: ${f.name}`).join(", ") || "none";
            return errorResult(`Feature "${featureId}" not found. Available: ${available}`);
        }
        return jsonResult(feature);
    }
);

// ─── TOOL: get_constraints ──────────────────────────

server.tool(
    "get_constraints",
    "Get tech stack, coding standards, and excluded patterns. Check this before making architectural decisions.",
    {},
    async () => {
        const spec = safeReadJSON("spec.json");
        if (!spec?.constraints) return errorResult("No constraints found.");
        return jsonResult(spec.constraints);
    }
);

// ─── TOOL: run_audit ────────────────────────────────

server.tool(
    "run_audit",
    "Run the Foreman alignment audit — compares the codebase against the spec. Returns a score (0-100) and a punchlist of violations. Call this AFTER implementing features to verify alignment.",
    { quick: z.boolean().optional().describe("If true, skip the AI call and return the last cached audit") },
    async ({ quick }) => {
        // If quick mode, just return cached report
        if (quick) {
            const alignment = safeReadJSON("alignment-report.json");
            const punchlist = safeReadJSON("punchlist.json");
            if (alignment) {
                return jsonResult({ audit: alignment, punchlist: punchlist || { items: [] } });
            }
            return errorResult("No cached audit. Run with quick=false to generate one.");
        }

        // Run real audit via CLI (subprocess)
        const { execSync } = await import("child_process");
        try {
            const output = execSync(
                `npx tsx scripts/cli.ts audit --skip-fixes 2>&1`,
                { cwd: ROOT_DIR, timeout: 120000, encoding: "utf-8" }
            );

            // Read the fresh results
            const alignment = safeReadJSON("alignment-report.json");
            const punchlist = safeReadJSON("punchlist.json");

            return jsonResult({
                audit: alignment || { score: 0, summary: "Audit completed but report not generated" },
                punchlist: punchlist || { items: [] },
                rawOutput: output.substring(0, 2000)
            });
        } catch (err) {
            return errorResult(`Audit failed: ${err.message}`);
        }
    }
);

// ─── TOOL: get_audit_report ─────────────────────────

server.tool(
    "get_audit_report",
    "Get the latest alignment audit report without re-running the audit.",
    {},
    async () => {
        const alignment = safeReadJSON("alignment-report.json");
        if (!alignment) return errorResult("No audit report. Run 'run_audit' first.");
        return jsonResult(alignment);
    }
);

// ─── TOOL: get_punchlist ────────────────────────────

server.tool(
    "get_punchlist",
    "Get the list of spec violations (discrepancies between code and spec). Each item has a severity and description.",
    {},
    async () => {
        const punchlist = safeReadJSON("punchlist.json");
        if (!punchlist) return textResult("No punchlist. Run 'run_audit' to generate one.");
        return jsonResult(punchlist);
    }
);

// ─── TOOL: push_change ─────────────────────────────

server.tool(
    "push_change",
    "Propose a requirement change. This runs AI impact analysis, updates the spec with version bump, and identifies downstream artifacts that need updating. Use this instead of editing spec.json directly.",
    {
        description: z.string().describe("Description of the change, e.g. 'Add dark mode support'"),
        skipAudit: z.boolean().optional().describe("Skip re-audit after applying change (default: true)")
    },
    async ({ description, skipAudit = true }) => {
        const { execSync } = await import("child_process");
        try {
            const auditFlag = skipAudit ? "--skip-audit" : "";
            const output = execSync(
                `npx tsx scripts/cli.ts change "${description.replace(/"/g, '\\"')}" ${auditFlag} 2>&1`,
                { cwd: ROOT_DIR, timeout: 120000, encoding: "utf-8" }
            );

            const spec = safeReadJSON("spec.json");
            const changes = safeReadJSON("changes.json");
            const lastChange = changes?.[changes.length - 1];

            return jsonResult({
                success: true,
                newVersion: spec?.version,
                change: lastChange,
                output: output.substring(0, 2000)
            });
        } catch (err) {
            return errorResult(`Change failed: ${err.message}`);
        }
    }
);

// ─── TOOL: get_change_history ───────────────────────

server.tool(
    "get_change_history",
    "Get the change log showing all requirement changes with versions, dates, and impact analysis.",
    {},
    async () => {
        const changes = safeReadJSON("changes.json");
        if (!changes || changes.length === 0) return textResult("No changes recorded yet.");
        return jsonResult(changes);
    }
);

// ─── TOOL: report_progress ──────────────────────────

server.tool(
    "report_progress",
    "Report what you implemented. This logs your progress for audit tracking and can trigger a re-audit.",
    {
        featureId: z.string().describe("Feature ID you worked on, e.g. 'F001'"),
        summary: z.string().describe("Brief summary of what you implemented"),
        filesChanged: z.array(z.string()).optional().describe("List of files you modified"),
        runAudit: z.boolean().optional().describe("Trigger a re-audit after reporting (default: false)")
    },
    async ({ featureId, summary, filesChanged, runAudit = false }) => {
        // Log progress to .bushido/progress.json        
        const progressFile = path.join(BEADS_DIR, "progress.json");
        let progress = [];
        try {
            if (fs.existsSync(progressFile)) {
                progress = JSON.parse(fs.readFileSync(progressFile, "utf-8"));
            }
        } catch { /* fresh start */ }

        progress.push({
            featureId,
            summary,
            filesChanged: filesChanged || [],
            timestamp: new Date().toISOString(),
        });

        if (!fs.existsSync(BEADS_DIR)) fs.mkdirSync(BEADS_DIR, { recursive: true });
        fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));

        const result = { logged: true, totalReports: progress.length };

        // Optionally trigger audit
        if (runAudit) {
            const { execSync } = await import("child_process");
            try {
                execSync(`npx tsx scripts/cli.ts audit --skip-fixes 2>&1`, {
                    cwd: ROOT_DIR, timeout: 120000, encoding: "utf-8"
                });
                const alignment = safeReadJSON("alignment-report.json");
                result.audit = alignment;
            } catch (err) {
                result.auditError = err.message;
            }
        }

        return jsonResult(result);
    }
);

// ─── TOOL: read_bead ────────────────────────────────

server.tool(
    "read_bead",
    "Read any .bushido/ artifact by filename. Use for strategy.md, market-analysis.md, user-persona.md, etc.",
    {
        name: z.string().describe("Filename inside .bushido/, e.g. 'strategy.md', 'market-analysis.md'")
    },
    async ({ name }) => {
        // Prevent directory traversal
        const safeName = name.replace(/\.\./g, "");
        const content = safeRead(safeName);
        if (!content) {
            // List available beads
            const available = fs.existsSync(BEADS_DIR)
                ? fs.readdirSync(BEADS_DIR).filter(f => !f.startsWith(".")).join(", ")
                : "none";
            return errorResult(`Bead "${name}" not found. Available: ${available}`);
        }
        return textResult(content);
    }
);

// ─── TOOL: write_bead ───────────────────────────────

server.tool(
    "write_bead",
    "Write a .bushido/ artifact. Use sparingly — prefer push_change for spec modifications.",
    {
        name: z.string().describe("Filename inside .bushido/"),
        content: z.string().describe("File content to write")
    },
    async ({ name, content }) => {
        const safeName = name.replace(/\.\./g, "");
        const filePath = path.join(BEADS_DIR, safeName);
        try {
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, content, "utf-8");
            return textResult(`✅ Wrote ${safeName} (${content.length} bytes)`);
        } catch (e) {
            return errorResult(`Write failed: ${e.message}`);
        }
    }
);

// ─── Start ──────────────────────────────────────────

const transport = new StdioServerTransport();
server.connect(transport);

console.error("⛩  BushidoOS MCP Server v1.1.0 — 12 tools, 4 resources");
console.error(`   Project root: ${ROOT_DIR}`);
console.error(`   Beads dir: ${BEADS_DIR}`);
