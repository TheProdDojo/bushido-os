#!/usr/bin/env node

// Load .env.local before anything else so process.env has VITE_* keys
import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const __cliFilename = fileURLToPath(import.meta.url);
const __cliDirname = path.dirname(__cliFilename);
dotenvConfig({ path: path.resolve(__cliDirname, '../.env.local') });

// ─── localStorage polyfill for Node.js ──────────────
// Required because usageService, costTracker, and rateLimitManager all use localStorage.
// We back it with a JSON file in .bushido/ for persistence.
if (typeof globalThis.localStorage === 'undefined') {
    const storageFile = path.resolve(__cliDirname, '../.bushido/.local-storage.json');
    let store: Record<string, string> = {};

    // Load existing data
    try {
        if (fs.existsSync(storageFile)) {
            store = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
        }
    } catch { /* start fresh */ }

    const persist = () => {
        try {
            const dir = path.dirname(storageFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(storageFile, JSON.stringify(store, null, 2));
        } catch { /* non-critical */ }
    };

    (globalThis as any).localStorage = {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => { store[key] = String(value); persist(); },
        removeItem: (key: string) => { delete store[key]; persist(); },
        clear: () => { store = {}; persist(); },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] ?? null,
    };
}
/**
 * BushidoOS CLI — The terminal interface for the AI Development Orchestrator.
 * 
 * Usage:
 *   bushido status              Show project state and spec health
 *   bushido kickstart <idea>    Full research → strategy → roast → spec pipeline
 *   bushido audit               Run Foreman against current codebase
 *   bushido roast               Re-run adversarial strategy review
 *   bushido change <desc>       Requirement change with impact cascade
 *   bushido diff                Show spec changes since last audit
 *   bushido history             Spec version history
 *   bushido chat                Interactive conversation with BushidoOS
 *   bushido serve               Start MCP server for IDE integration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { BeadFs } from '../services/fs/beadFs.js';
import { CostTrackerFs } from '../services/fs/costTrackerFs.js';
import type { SpecSchema, PrdSchema, AlignmentReport } from '../types/beads.js';

const VERSION = '0.1.0';

// ─── Brand ──────────────────────────────────────────
const BUSHIDO_BANNER = `
${chalk.red('⛩')}  ${chalk.bold.white('B U S H I D O   O S')}  ${chalk.red('⛩')}
${chalk.dim('   The AI Development Orchestrator')}
${chalk.dim(`   v${VERSION}`)}
`;

// ─── Program ────────────────────────────────────────
const program = new Command();

program
    .name('bushido')
    .description('BushidoOS — AI PM that orchestrates your development lifecycle')
    .version(VERSION);

// ─── STATUS ─────────────────────────────────────────
program
    .command('status')
    .description('Show project state, spec health, and pipeline status')
    .action(async () => {
        console.log(BUSHIDO_BANNER);

        const beadsDir = BeadFs.getBeadsDir();
        const beads = BeadFs.list();

        if (beads.length === 0) {
            console.log(chalk.yellow('\n  ⚠  No .bushido/ directory found.'));
            console.log(chalk.dim('  Run `bushido kickstart "<your idea>"` to begin.\n'));
            return;
        }

        console.log(chalk.bold('\n  📁 .bushido/ Artifacts:\n'));

        // Read spec
        const spec = BeadFs.read<SpecSchema>('spec.json');
        if (spec) {
            console.log(`  ${chalk.green('✓')} ${chalk.bold('spec.json')} — ${spec.title || 'Untitled'}`);
            console.log(`    ${chalk.dim(`v${spec.version} • ${spec.features?.length || 0} features • ${spec.lastUpdated || 'unknown'}`)}`);
            
            if (spec.constraints) {
                console.log(`    ${chalk.dim(`Tech: ${spec.constraints.techStack?.join(', ') || 'Not defined'}`)}`);
            }
        } else {
            console.log(`  ${chalk.red('✗')} ${chalk.bold('spec.json')} — Not found`);
        }

        // Read PRD
        const prd = BeadFs.read<PrdSchema>('prd.json');
        if (prd) {
            const storiesCount = prd.stories?.length || 0;
            const passedCount = prd.stories?.filter(s => s.passes).length || 0;
            console.log(`  ${chalk.green('✓')} ${chalk.bold('prd.json')} — ${storiesCount} stories (${passedCount} passing)`);
            console.log(`    ${chalk.dim(`v${prd.version} • ${prd.nonNegotiables?.length || 0} non-negotiables`)}`);
        } else {
            console.log(`  ${chalk.dim('○')} ${chalk.bold('prd.json')} — Not generated yet`);
        }

        // Read alignment report
        const alignment = BeadFs.read<AlignmentReport>('alignment-report.json');
        if (alignment) {
            const scoreColor = alignment.score >= 80 ? chalk.green : alignment.score >= 50 ? chalk.yellow : chalk.red;
            console.log(`  ${alignment.aligned ? chalk.green('✓') : chalk.red('✗')} ${chalk.bold('alignment-report.json')} — Score: ${scoreColor(`${alignment.score}/100`)}`);
            if (!alignment.aligned && alignment.discrepancies?.length) {
                console.log(`    ${chalk.dim(`${alignment.discrepancies.length} discrepancies found`)}`);
            }
        } else {
            console.log(`  ${chalk.dim('○')} ${chalk.bold('alignment-report.json')} — No audit run yet`);
        }

        // Read punch list
        const punchList = BeadFs.read<any>('punchlist.json');
        if (punchList) {
            if (punchList.status === 'CLEAN') {
                console.log(`  ${chalk.green('✓')} ${chalk.bold('punchlist.json')} — ${chalk.green('Clean')}`);
            } else if (punchList.items?.length) {
                console.log(`  ${chalk.red('✗')} ${chalk.bold('punchlist.json')} — ${punchList.items.length} items`);
                for (const item of punchList.items.slice(0, 3)) {
                    const sev = item.severity === 'critical' ? chalk.red : chalk.yellow;
                    console.log(`    ${sev(`[${item.severity?.toUpperCase()}]`)} ${item.violation}`);
                }
                if (punchList.items.length > 3) {
                    console.log(chalk.dim(`    ... and ${punchList.items.length - 3} more`));
                }
            }
        }

        // Read roast
        const roast = BeadFs.read<any>('roast.json');
        if (roast) {
            const roastColor = roast.overallScore >= 80 ? chalk.green : roast.overallScore >= 50 ? chalk.yellow : chalk.red;
            console.log(`  ${chalk.green('✓')} ${chalk.bold('roast.json')} — Score: ${roastColor(`${roast.overallScore}/100`)}`);
        }

        // Strategy context
        if (BeadFs.exists('strategy.md')) {
            console.log(`  ${chalk.green('✓')} ${chalk.bold('strategy.md')} — Strategy context`);
        }

        // .cursorrules
        if (BeadFs.readFile('.cursorrules')) {
            console.log(`  ${chalk.green('✓')} ${chalk.bold('.cursorrules')} — IDE constraints (auto-generated)`);
        }

        // Other beads
        const coreBeads = new Set(['spec.json', 'prd.json', 'alignment-report.json', 'punchlist.json', 'roast.json', 'strategy.md']);
        const otherBeads = beads.filter(b => !coreBeads.has(b));
        if (otherBeads.length > 0) {
            console.log(chalk.dim(`\n  + ${otherBeads.length} other beads: ${otherBeads.join(', ')}`));
        }

        // Cost summary
        const stats = CostTrackerFs.getStats();
        if (stats.totalEvents > 0) {
            console.log(chalk.dim(`\n  💰 Total AI cost: $${stats.totalCost.toFixed(4)} across ${stats.totalEvents} calls`));
        }

        console.log('');
    });

// ─── KICKSTART ──────────────────────────────────────
program
    .command('kickstart')
    .argument('<idea>', 'Your product idea in natural language')
    .description('Full research → strategy → roast → spec pipeline')
    .option('--skip-research', 'Skip deep research and go straight to strategy generation')
    .option('--skip-roast', 'Skip the adversarial roast gate')
    .action(async (idea: string, options: any) => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold(`\n  🚀 Kickstarting: "${idea}"\n`));

        // Phase 1: Load env and configure AI
        const spinner = ora({ text: 'Loading AI configuration...', spinner: 'dots' }).start();
        
        try {
            // Dynamically import AI services to avoid loading React-dependent code
            const { generateDeepResearchPlan, executeDeepResearchStream, generateStageDraftStream } = await import('../services/ai/aiService.js');
            const { STAGE_CONFIG, StageType } = await import('../types.js');
            
            // Check for API keys
            const googleKey = process.env.VITE_GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
            if (!googleKey) {
                spinner.fail('No Google AI API key found.');
                console.log(chalk.dim('  Set VITE_GOOGLE_API_KEY or GOOGLE_API_KEY in .env.local'));
                return;
            }

            const aiConfig = { provider: 'google' as any, modelName: 'gemini-2.5-flash', apiKey: googleKey };
            spinner.succeed('AI configuration loaded.');

            // Phase 2: Deep Research (unless skipped)
            let planPillars: string[] = [];

            if (!options.skipResearch) {
                const researchSpinner = ora({ text: '🔬 Running Deep Research...', spinner: 'dots' }).start();
                
                try {
                    // Generate research plan (async generator)
                    researchSpinner.text = '🔬 Generating research plan...';
                    for await (const update of generateDeepResearchPlan(idea, aiConfig)) {
                        if (update.thought) {
                            researchSpinner.text = `🔬 ${update.thought}`;
                        }
                        if (update.pillars) {
                            planPillars = update.pillars.map((p: any) => p.label || p.stage);
                            researchSpinner.succeed('Research plan generated.');
                            
                            console.log(chalk.bold('\n  📋 Research Plan:'));
                            update.pillars.forEach((p: any, i: number) => {
                                console.log(`    ${i + 1}. ${chalk.cyan(p.label || p.stage)} — ${p.goals?.join(', ') || ''}`);
                            });
                            console.log('');
                        }
                    }

                    // Execute research
                    const execSpinner = ora({ text: '🔬 Executing deep research (this may take a few minutes)...', spinner: 'dots' }).start();
                    let researchBrief = '';
                    
                    for await (const update of executeDeepResearchStream(idea, planPillars, aiConfig)) {
                        if (update.type === 'thinking' && update.thought) {
                            execSpinner.text = `🔬 ${update.thought}`;
                        }
                        if (update.type === 'done' && update.content) {
                            researchBrief = update.content;
                        }
                    }
                    
                    if (researchBrief) {
                        execSpinner.succeed(`Research complete. ${researchBrief.length} chars.`);
                        BeadFs.writeText('research-brief.md', researchBrief);
                        console.log(chalk.dim('  Saved to .bushido/research-brief.md\n'));
                    } else {
                        execSpinner.warn('Research completed but returned empty. Continuing with strategy generation...');
                    }
                } catch (err: any) {
                    researchSpinner.warn(`Research failed: ${err.message}. Continuing without research.`);
                }
            }

            // Phase 3: Generate 5 Pillars
            const stages = [
                StageType.MARKET_ANALYSIS,
                StageType.USER_PERSONA,
                StageType.SOLUTION_CONCEPT,
                StageType.PRODUCT_SPEC,
                StageType.EXECUTION_ROADMAP
            ];

            const researchBrief = BeadFs.readFile('.bushido/research-brief.md') || '';
            const artifacts: Record<string, any> = {};

            console.log(chalk.bold('  📝 Generating Strategy Pillars:\n'));

            for (const stage of stages) {
                const label = STAGE_CONFIG[stage]?.label || stage;
                const stageSpinner = ora({ text: `  Generating ${label}...`, spinner: 'dots' }).start();
                
                try {
                    let content = '';
                    for await (const update of generateStageDraftStream(stage, idea, artifacts as any, aiConfig, researchBrief)) {
                        if (update.type === 'text' && update.content) {
                            content += update.content;
                        }
                        if (update.type === 'thinking' && update.thought) {
                            stageSpinner.text = `  Generating ${label}... ${update.thought}`;
                        }
                        if (update.type === 'done') {
                            // Content accumulated from 'text' events
                        }
                    }

                    artifacts[stage] = {
                        id: `${stage}-${Date.now()}`,
                        type: stage,
                        title: label,
                        content,
                        status: 'draft',
                        lastUpdated: Date.now()
                    };

                    stageSpinner.succeed(`  ${chalk.green('✓')} ${label} (${content.length} chars)`);
                    
                    // Save each artifact as a bead
                    const filename = `${stage.toLowerCase().replace(/_/g, '-')}.md`;
                    BeadFs.writeText(filename, content);
                } catch (err: any) {
                    stageSpinner.fail(`  ${label} failed: ${err.message}`);
                }
            }

            // Phase 4: Roast Gate (unless skipped)
            if (!options.skipRoast && artifacts[StageType.PRODUCT_SPEC]) {
                console.log(chalk.bold('\n  🔥 Running Roast Gate...\n'));
                
                try {
                    const { roastStrategy } = await import('../services/ai/agents/roastService.js');
                    const { summarizeStrategy } = await import('../services/ai/strategyService.js');

                    const summarySpinner = ora({ text: '  Distilling pillar summaries...', spinner: 'dots' }).start();
                    const summaries = await summarizeStrategy(artifacts as any, aiConfig);
                    summarySpinner.succeed('  Summaries distilled.');

                    const roastSpinner = ora({ text: '  Summoning the Roast Swarm (CEO, Engineer, Designer, Growth)...', spinner: 'dots' }).start();
                    const roastResult = await roastStrategy(summaries, idea, aiConfig);
                    roastSpinner.succeed('  Roast complete.');

                    // Display roast results
                    const scoreColor = roastResult.overallScore >= 80 ? chalk.green : roastResult.overallScore >= 50 ? chalk.yellow : chalk.red;
                    console.log(`\n  ${chalk.bold('Roast Results:')} ${scoreColor(`${roastResult.overallScore}/100`)}\n`);

                    for (const feedback of roastResult.feedbacks) {
                        const verdictIcon = feedback.verdict === 'approved' ? chalk.green('✓') : feedback.verdict === 'rejected' ? chalk.red('✗') : chalk.yellow('~');
                        const fColor = feedback.score >= 80 ? chalk.green : feedback.score >= 50 ? chalk.yellow : chalk.red;
                        console.log(`  ${verdictIcon} ${chalk.bold(feedback.persona)} (${fColor(`${feedback.score}/100`)})`);
                        
                        if (feedback.criticalFlaws?.length) {
                            for (const flaw of feedback.criticalFlaws.slice(0, 2)) {
                                const flawText = typeof flaw === 'string' ? flaw : (flaw as any).text || flaw;
                                console.log(chalk.red(`    ⚠ ${flawText}`));
                            }
                        }
                    }

                    // Save roast result
                    BeadFs.write('roast.json', roastResult);
                    console.log(chalk.dim('\n  Saved to .bushido/roast.json'));
                } catch (err: any) {
                    console.log(chalk.yellow(`  ⚠ Roast failed: ${err.message}. Strategy saved without roasting.`));
                }
            }

            // Phase 5: Generate beads bundle
            const bundleSpinner = ora({ text: 'Packaging .bushido/ bundle...', spinner: 'dots' }).start();
            
            try {
                // Generate spec.json from the product spec artifact
                if (artifacts[StageType.PRODUCT_SPEC]?.content) {
                    const specContent = artifacts[StageType.PRODUCT_SPEC].content;
                    let spec: any;
                    try {
                        // The AI often streams multiple JSON blocks of increasing completeness.
                        // We want the LAST (most complete) JSON block.
                        const jsonBlocks = [...specContent.matchAll(/```json\n([\s\S]*?)\n```/g)];
                        if (jsonBlocks.length > 0) {
                            // Try from last to first, use the first one that parses
                            for (let i = jsonBlocks.length - 1; i >= 0; i--) {
                                try {
                                    spec = JSON.parse(jsonBlocks[i][1]);
                                    break;
                                } catch { continue; }
                            }
                        }
                        if (!spec) {
                            spec = JSON.parse(specContent);
                        }
                    } catch {
                        spec = {
                            id: `spec-${Date.now()}`,
                            title: idea,
                            version: '1.0.0',
                            lastUpdated: new Date().toISOString(),
                            description: idea,
                            definitions: { featureFlags: [], userRoles: [], entities: {} },
                            features: [],
                            constraints: { techStack: [], codingStandards: [], excludedPatterns: [] },
                        };
                    }
                    BeadFs.write('spec.json', spec);
                }

                // Generate strategy.md
                const strategy = [
                    `# Project Strategy: ${idea}`,
                    `> Generated by BushidoOS on ${new Date().toLocaleDateString()}`,
                    '',
                    '## Market Analysis',
                    artifacts[StageType.MARKET_ANALYSIS]?.content || '(Not yet defined)',
                    '',
                    '## Solution Concept',
                    artifacts[StageType.SOLUTION_CONCEPT]?.content || '(Not yet defined)',
                    '',
                    '## Target Audience',
                    artifacts[StageType.USER_PERSONA]?.content || '(Not yet defined)',
                    '',
                    '## Execution Roadmap',
                    artifacts[StageType.EXECUTION_ROADMAP]?.content || '(Not yet defined)'
                ].join('\n');
                BeadFs.writeText('strategy.md', strategy);

                // Generate .cursorrules
                const cursorRules = `
# BushidoOS Generated Rules for Cursor
# DO NOT EDIT MANUALLY - This file is auto-synced from the Orchestrator.

# 1. STRATEGIC CONTEXT
You are working on "${idea}".
Before writing any code, you MUST read:
- .bushido/strategy.md (High-level goals)
- .bushido/spec.json (Strict constraints)

# 2. BEHAVIORAL RULES
- **No Hallucinations**: Only implement features listed in 'spec.json'.
- **Atomic Commits**: Group changes by feature ID.
- **Design System**: Use existing components before creating new ones.

# 3. CRITICAL INSTRUCTIONS
If you are unsure about a requirement, STOP and ask the user to update the Spec in BushidoOS.
Do not make assumptions about business logic.
`.trim();
                BeadFs.writeCursorRules(cursorRules);

                bundleSpinner.succeed('Bundle packaged.');
            } catch (err: any) {
                bundleSpinner.fail(`Bundle failed: ${err.message}`);
            }

            // Done!
            console.log(chalk.bold.green('\n  ✅ Kickstart Complete!\n'));
            console.log('  Your .bushido/ directory is ready:');
            console.log(chalk.dim('    spec.json        — Machine-readable product spec'));
            console.log(chalk.dim('    strategy.md      — Strategy overview'));
            console.log(chalk.dim('    .cursorrules     — IDE constraints for coding agents'));
            console.log(chalk.dim('    roast.json       — Adversarial review results'));
            console.log('');
            console.log(chalk.dim('  Next steps:'));
            console.log(`    ${chalk.cyan('bushido status')}  — Check project health`);
            console.log(`    ${chalk.cyan('bushido audit')}   — Run Foreman against your code`);
            console.log(`    ${chalk.cyan('bushido change')}  — Push a requirement change`);
            console.log('');
            
        } catch (err: any) {
            spinner.fail(`Kickstart failed: ${err.message}`);
            console.error(chalk.dim(err.stack));
        }
    });

// ─── AUDIT ──────────────────────────────────────────
program
    .command('audit')
    .description('Run Foreman Agent to audit code against the PRD')
    .option('--files <files...>', 'Specific files to audit (default: auto-scan)')
    .action(async (options: any) => {
        console.log(BUSHIDO_BANNER);
        
        const spinner = ora({ text: 'Preparing audit...', spinner: 'dots' }).start();

        // Check prerequisites
        const prd = BeadFs.read<PrdSchema>('prd.json');
        const spec = BeadFs.read<SpecSchema>('spec.json');

        if (!prd && !spec) {
            spinner.fail('No PRD or spec found. Run `bushido kickstart` first.');
            return;
        }

        try {
            // Gather codebase context
            const filesToAudit = options.files || BeadFs.scanCodebase();
            spinner.text = `Scanning ${filesToAudit.length} files...`;

            let codebaseContext = '';
            const maxFiles = 20; // Limit to prevent token overflow
            const criticalFiles = filesToAudit.slice(0, maxFiles);

            for (const file of criticalFiles) {
                const content = BeadFs.readFile(file);
                if (content) {
                    codebaseContext += `\n--- FILE: ${file} ---\n${content}\n`;
                }
            }

            if (!codebaseContext) {
                spinner.warn('No source files found to audit.');
                return;
            }

            spinner.text = '🔍 Running Foreman alignment audit...';

            // Run audit
            const { runAlignmentAudit } = await import('../services/ai/agents/alignmentService.js');
            
            // Use PRD if available, otherwise construct from spec
            const auditTarget = prd || {
                id: spec!.id,
                version: spec!.version,
                lastUpdated: spec!.lastUpdated,
                nonNegotiables: spec!.constraints?.codingStandards || [],
                stories: spec!.features?.map(f => ({
                    id: f.id,
                    story: f.userStory,
                    acceptanceCriteria: f.acceptanceCriteria,
                    passes: false,
                    priority: f.priority
                })) || [],
                rawSpec: spec
            };

            const report = await runAlignmentAudit(auditTarget, codebaseContext);
            spinner.stop();

            // Display results
            const scoreColor = report.score >= 80 ? chalk.green : report.score >= 50 ? chalk.yellow : chalk.red;
            console.log(`\n  🔍 ${chalk.bold('Foreman Audit Results')}`);
            console.log(`  Score: ${scoreColor(chalk.bold(`${report.score}/100`))}`);
            console.log(`  Status: ${report.aligned ? chalk.green('✓ Aligned') : chalk.red('✗ Drift Detected')}\n`);

            if (!report.aligned && report.discrepancies?.length) {
                console.log(chalk.bold('  PUNCH LIST:\n'));
                for (const d of report.discrepancies) {
                    const sevColor = d.severity === 'critical' ? chalk.red : chalk.yellow;
                    console.log(`  ${sevColor(`[${d.severity.toUpperCase()}]`)} ${chalk.bold(d.title)}`);
                    console.log(chalk.dim(`    ${d.description}`));
                    console.log(chalk.cyan(`    Fix: ${d.suggestedFix}`));
                    console.log('');
                }
            } else {
                console.log(chalk.green('  ✅ Implementation looks good! No punch list needed.\n'));
            }

            // Save report
            BeadFs.write('alignment-report.json', report);
            
            if (!report.aligned) {
                const punchList = {
                    id: `punchlist-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    score: report.score,
                    items: report.discrepancies?.map(d => ({
                        violation: d.violatedItem,
                        fix: d.suggestedFix,
                        severity: d.severity
                    })) || []
                };
                BeadFs.write('punchlist.json', punchList);
                console.log(chalk.dim('  Reports saved to .bushido/alignment-report.json + punchlist.json\n'));
            } else {
                BeadFs.write('punchlist.json', { status: 'CLEAN', timestamp: new Date().toISOString() });
                console.log(chalk.dim('  Report saved to .bushido/alignment-report.json\n'));
            }

        } catch (err: any) {
            spinner.fail(`Audit failed: ${err.message}`);
            console.error(chalk.dim(err.stack));
        }
    });

// ─── DIFF ───────────────────────────────────────────
program
    .command('diff')
    .description('Show spec changes since last audit')
    .action(async () => {
        console.log(BUSHIDO_BANNER);

        const spec = BeadFs.read<SpecSchema>('spec.json');
        if (!spec) {
            console.log(chalk.yellow('  No spec.json found. Run `bushido kickstart` first.\n'));
            return;
        }

        console.log(chalk.bold(`\n  📋 Current Spec: ${spec.title}`));
        console.log(chalk.dim(`  v${spec.version} • Last updated: ${spec.lastUpdated}\n`));

        if (spec.features?.length) {
            console.log(chalk.bold('  Features:'));
            for (const f of spec.features) {
                const prioColor = f.priority === 'critical' ? chalk.red : f.priority === 'high' ? chalk.yellow : chalk.dim;
                console.log(`    ${prioColor(`[${f.priority}]`)} ${f.id}: ${f.name}`);
                console.log(chalk.dim(`      "${f.userStory}"`));
            }
        }

        if (spec.constraints) {
            console.log(chalk.bold('\n  Constraints:'));
            if (spec.constraints.techStack?.length) {
                console.log(`    Tech: ${spec.constraints.techStack.join(', ')}`);
            }
            if (spec.constraints.codingStandards?.length) {
                console.log(`    Standards: ${spec.constraints.codingStandards.join(', ')}`);
            }
        }

        console.log('');
    });

// ─── CHANGE ─────────────────────────────────────────
program
    .command('change')
    .argument('<description>', 'Describe the requirement change')
    .description('Push a requirement change with impact cascade')
    .option('--skip-audit', 'Skip re-audit after change')
    .action(async (description: string, options: any) => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold(`\n  🔄 Requirement Change: "${description}"\n`));

        const spec = BeadFs.read<SpecSchema>('spec.json');
        if (!spec) {
            console.log(chalk.red('  No spec.json found. Run `bushido kickstart` first.\n'));
            return;
        }

        const spinner = ora({ text: 'Versioning current spec...', spinner: 'dots' }).start();

        try {
            // 1. Version the current spec
            const version = spec.version || '1.0.0';
            const timestamp = new Date().toISOString();
            const historyDir = path.resolve(__cliDirname, '../.bushido/history');
            if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

            const versionFile = `spec-v${version}-${Date.now()}.json`;
            fs.writeFileSync(
                path.join(historyDir, versionFile),
                JSON.stringify(spec, null, 2)
            );
            spinner.succeed(`Current spec versioned as ${versionFile}`);

            // 2. Analyze impact via AI
            const impactSpinner = ora({ text: 'Analyzing impact of requirement change...', spinner: 'dots' }).start();

            const googleKey = process.env.VITE_GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
            if (!googleKey) {
                impactSpinner.fail('No API key for impact analysis.');
                return;
            }

            const { generateObject } = await import('ai');
            const { z } = await import('zod');
            const { ModelRegistry } = await import('../services/ai/modelRegistry.js');
            const { MODEL_SPECS } = await import('../services/ai/neural-engine.js');

            const model = ModelRegistry.create(MODEL_SPECS.GEMINI_FLASH);

            const { object: impact } = await generateObject({
                model,
                prompt: `
                    CURRENT SPEC:
                    ${JSON.stringify(spec, null, 2)}

                    REQUIREMENT CHANGE:
                    "${description}"

                    TASK:
                    1. Analyze how this change impacts the current spec.
                    2. Identify which features need to be added, modified, or removed.
                    3. Identify any constraints that need updating.
                    4. Generate the UPDATED spec with the change applied.
                    5. Increment the version (minor for additions, major for breaking changes).
                `,
                schema: z.object({
                    summary: z.string().describe('One-line summary of the change impact'),
                    changeType: z.enum(['addition', 'modification', 'removal', 'breaking']),
                    affectedFeatures: z.array(z.object({
                        id: z.string(),
                        action: z.enum(['add', 'modify', 'remove']),
                        description: z.string()
                    })),
                    updatedSpec: z.object({
                        id: z.string(),
                        title: z.string(),
                        version: z.string(),
                        lastUpdated: z.string(),
                        description: z.string(),
                        features: z.array(z.object({
                            id: z.string(),
                            name: z.string(),
                            userStory: z.string(),
                            acceptanceCriteria: z.array(z.string()),
                            priority: z.enum(['critical', 'high', 'medium', 'low']).optional()
                        })).optional(),
                        constraints: z.object({
                            techStack: z.array(z.string()).optional(),
                            codingStandards: z.array(z.string()).optional(),
                            excludedPatterns: z.array(z.string()).optional()
                        }).optional()
                    }),
                    cascadeActions: z.array(z.string()).describe('List of downstream artifacts that need regeneration')
                })
            });

            impactSpinner.succeed('Impact analysis complete.');

            // 3. Display impact cascade
            console.log(chalk.bold(`\n  📊 Impact Analysis:\n`));
            console.log(`  ${chalk.cyan('Summary:')} ${impact.summary}`);
            console.log(`  ${chalk.cyan('Change Type:')} ${impact.changeType}`);
            
            if (impact.affectedFeatures.length > 0) {
                console.log(chalk.bold(`\n  Affected Features:`));
                for (const f of impact.affectedFeatures) {
                    const actionIcon = f.action === 'add' ? chalk.green('+') : f.action === 'remove' ? chalk.red('-') : chalk.yellow('~');
                    console.log(`    ${actionIcon} ${chalk.bold(f.id)}: ${f.description}`);
                }
            }

            if (impact.cascadeActions.length > 0) {
                console.log(chalk.bold(`\n  🔗 Cascade Actions:`));
                for (const action of impact.cascadeActions) {
                    console.log(`    → ${chalk.dim(action)}`);
                }
            }

            // 4. Write updated spec
            const updateSpinner = ora({ text: 'Applying changes to spec...', spinner: 'dots' }).start();
            BeadFs.write('spec.json', impact.updatedSpec);

            // Update .cursorrules
            const cursorRules = `
# BushidoOS Generated Rules for Cursor
# DO NOT EDIT MANUALLY - This file is auto-synced from the Orchestrator.
# Updated: ${new Date().toISOString()} | Change: "${description}"

# 1. STRATEGIC CONTEXT
You are working on "${impact.updatedSpec.title}".
Before writing any code, you MUST read:
- .bushido/strategy.md (High-level goals)
- .bushido/spec.json (Strict constraints)

# 2. BEHAVIORAL RULES
- **No Hallucinations**: Only implement features listed in 'spec.json'.
- **Atomic Commits**: Group changes by feature ID.
- **Design System**: Use existing components before creating new ones.

# 3. RECENT CHANGE
Change: "${description}"
Type: ${impact.changeType}
Affected: ${impact.affectedFeatures.map(f => f.id).join(', ')}

# 4. CRITICAL INSTRUCTIONS
If you are unsure about a requirement, STOP and ask the user to update the Spec in BushidoOS.
Do not make assumptions about business logic.
`.trim();
            BeadFs.writeCursorRules(cursorRules);

            // Save change log
            const changeLog = BeadFs.read<any[]>('changes.json') || [];
            changeLog.push({
                timestamp,
                description,
                fromVersion: version,
                toVersion: impact.updatedSpec.version,
                changeType: impact.changeType,
                affectedFeatures: impact.affectedFeatures
            });
            BeadFs.write('changes.json', changeLog);

            updateSpinner.succeed(`Spec updated: v${version} → v${impact.updatedSpec.version}`);

            console.log(chalk.dim('\n  Saved: spec.json, .cursorrules, changes.json'));
            console.log(chalk.dim(`  History: .bushido/history/${versionFile}`));

            // 5. Re-audit (unless skipped)
            if (!options.skipAudit) {
                console.log(chalk.bold('\n  🔍 Re-running Foreman audit after change...\n'));
                // Trigger audit by importing the process
                const { runAlignmentAudit } = await import('../services/ai/agents/alignmentService.js');
                const prd: any = {
                    id: impact.updatedSpec.id,
                    version: impact.updatedSpec.version,
                    lastUpdated: impact.updatedSpec.lastUpdated,
                    nonNegotiables: impact.updatedSpec.constraints?.codingStandards || [],
                    stories: impact.updatedSpec.features?.map(f => ({
                        id: f.id,
                        story: f.userStory,
                        acceptanceCriteria: f.acceptanceCriteria,
                        passes: false,
                        priority: f.priority
                    })) || [],
                    rawSpec: impact.updatedSpec
                };

                const filesToAudit = BeadFs.scanCodebase();
                let codebaseContext = '';
                for (const file of filesToAudit.slice(0, 15)) {
                    const content = BeadFs.readFile(file);
                    if (content) codebaseContext += `\n--- FILE: ${file} ---\n${content}\n`;
                }

                if (codebaseContext) {
                    const report = await runAlignmentAudit(prd, codebaseContext);
                    const scoreColor = report.score >= 80 ? chalk.green : report.score >= 50 ? chalk.yellow : chalk.red;
                    console.log(`  Post-change audit: ${scoreColor(`${report.score}/100`)} ${report.aligned ? '✓ Aligned' : '✗ Drift'}`);
                    BeadFs.write('alignment-report.json', report);
                }
            }

            console.log(chalk.bold.green('\n  ✅ Change applied successfully.\n'));

        } catch (err: any) {
            spinner.fail(`Change failed: ${err.message}`);
            console.error(chalk.dim(err.stack));
        }
    });

// ─── HISTORY ────────────────────────────────────────
program
    .command('history')
    .description('View spec version history')
    .action(async () => {
        console.log(BUSHIDO_BANNER);

        const historyDir = path.resolve(__cliDirname, '../.bushido/history');
        if (!fs.existsSync(historyDir)) {
            console.log(chalk.yellow('  No version history found.\n'));
            return;
        }

        const versions = fs.readdirSync(historyDir)
            .filter(f => f.endsWith('.json'))
            .sort()
            .reverse();

        if (versions.length === 0) {
            console.log(chalk.yellow('  No version history found.\n'));
            return;
        }

        console.log(chalk.bold(`\n  📜 Spec Version History (${versions.length} versions):\n`));

        for (const file of versions) {
            try {
                const content = JSON.parse(fs.readFileSync(path.join(historyDir, file), 'utf-8'));
                const featureCount = content.features?.length || 0;
                console.log(`  ${chalk.cyan(file)}`);
                console.log(`    ${chalk.dim(`v${content.version} • ${content.title || 'Untitled'} • ${featureCount} features`)}`);
            } catch {
                console.log(`  ${chalk.dim(file)} (unreadable)`);
            }
        }

        // Show change log
        const changeLog = BeadFs.read<any[]>('changes.json');
        if (changeLog && changeLog.length > 0) {
            console.log(chalk.bold(`\n  📝 Change Log (${changeLog.length} changes):\n`));
            for (const change of changeLog.slice(-5)) {
                const icon = change.changeType === 'breaking' ? chalk.red('⚠') : chalk.green('→');
                console.log(`  ${icon} ${chalk.dim(change.timestamp?.split('T')[0] || 'unknown')} v${change.fromVersion} → v${change.toVersion}`);
                console.log(`    ${change.description}`);
            }
        }

        console.log('');
    });

// ─── ROAST ──────────────────────────────────────────
program
    .command('roast')
    .description('Re-run adversarial strategy review')
    .action(async () => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold('\n  🔥 Roast Gate — Adversarial Strategy Review\n'));

        const spec = BeadFs.read<SpecSchema>('spec.json');
        const strategyContent = BeadFs.readFile('.bushido/strategy.md');

        if (!spec && !strategyContent) {
            console.log(chalk.red('  No spec or strategy found. Run `bushido kickstart` first.\n'));
            return;
        }

        const spinner = ora({ text: 'Summoning the Roast Swarm (CEO, Engineer, Designer, Growth)...', spinner: 'dots' }).start();

        try {
            const googleKey = process.env.VITE_GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
            if (!googleKey) {
                spinner.fail('No API key for roast.');
                return;
            }

            const aiConfig = { provider: 'google' as any, modelName: 'gemini-2.5-flash', apiKey: googleKey };

            // Read all pillar artifacts for summarization
            const { StageType } = await import('../types.js');
            const { summarizeStrategy } = await import('../services/ai/strategyService.js');
            const { roastStrategy } = await import('../services/ai/agents/roastService.js');

            // Build artifacts from .bushido/ beads
            const pillarFiles = ['market-analysis.md', 'user-persona.md', 'solution-concept.md', 'product-spec.md', 'execution-roadmap.md'];
            const stageTypes = [StageType.MARKET_ANALYSIS, StageType.USER_PERSONA, StageType.SOLUTION_CONCEPT, StageType.PRODUCT_SPEC, StageType.EXECUTION_ROADMAP];
            const artifacts: Record<string, any> = {};

            for (let i = 0; i < pillarFiles.length; i++) {
                const content = BeadFs.readFile(`.bushido/${pillarFiles[i]}`);
                if (content) {
                    artifacts[stageTypes[i]] = {
                        id: pillarFiles[i],
                        type: stageTypes[i],
                        title: pillarFiles[i].replace('.md', ''),
                        content,
                        status: 'draft',
                        lastUpdated: Date.now()
                    };
                }
            }

            spinner.text = 'Distilling pillar summaries...';
            const summaries = await summarizeStrategy(artifacts as any, aiConfig);
            spinner.text = 'Running adversarial review...';
            const roastResult = await roastStrategy(summaries, spec?.title || 'Project', aiConfig);
            spinner.succeed('Roast complete.');

            // Display results
            const scoreColor = roastResult.overallScore >= 80 ? chalk.green : roastResult.overallScore >= 50 ? chalk.yellow : chalk.red;
            console.log(`\n  ${chalk.bold('Overall Score:')} ${scoreColor(`${roastResult.overallScore}/100`)}\n`);

            for (const feedback of roastResult.feedbacks) {
                const verdictIcon = feedback.verdict === 'approved' ? chalk.green('✓') : feedback.verdict === 'rejected' ? chalk.red('✗') : chalk.yellow('~');
                const fColor = feedback.score >= 80 ? chalk.green : feedback.score >= 50 ? chalk.yellow : chalk.red;
                console.log(`  ${verdictIcon} ${chalk.bold(feedback.persona)} (${fColor(`${feedback.score}/100`)})`);

                if (feedback.criticalFlaws?.length) {
                    for (const flaw of feedback.criticalFlaws.slice(0, 2)) {
                        const flawText = typeof flaw === 'string' ? flaw : (flaw as any).text || flaw;
                        console.log(chalk.red(`    ⚠ ${flawText}`));
                    }
                }
                if (feedback.suggestions?.length) {
                    for (const s of feedback.suggestions.slice(0, 1)) {
                        const text = typeof s === 'string' ? s : (s as any).text || s;
                        console.log(chalk.cyan(`    💡 ${text}`));
                    }
                }
            }

            BeadFs.write('roast.json', roastResult);
            console.log(chalk.dim('\n  Saved to .bushido/roast.json\n'));

        } catch (err: any) {
            spinner.fail(`Roast failed: ${err.message}`);
            console.error(chalk.dim(err.stack));
        }
    });
// ─── CHAT ───────────────────────────────────────────
program
    .command('chat')
    .description('Interactive conversation with BushidoOS')
    .action(async () => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold('  💬 BushidoOS Chat — Your AI Product Manager\n'));
        console.log(chalk.dim('  Commands: /status /clear /save /exit\n'));

        const readline = await import('readline');

        const googleKey = process.env.VITE_GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!googleKey) {
            console.log(chalk.red('  No API key found. Set VITE_GEMINI_API_KEY in .env.local\n'));
            return;
        }

        // Build project context from .bushido/
        let projectContext = '';
        const spec = BeadFs.read<SpecSchema>('spec.json');
        if (spec) {
            projectContext += `\nCURRENT SPEC:\nTitle: ${spec.title}\nVersion: ${spec.version}\nFeatures: ${spec.features?.map(f => `${f.id}: ${f.name}`).join(', ') || 'none'}\n`;
            if (spec.constraints) {
                projectContext += `Tech Stack: ${spec.constraints.techStack?.join(', ') || 'none'}\n`;
            }
        }
        const strategy = BeadFs.readFile('.bushido/strategy.md');
        if (strategy) {
            projectContext += `\nSTRATEGY SUMMARY:\n${strategy.substring(0, 2000)}\n`;
        }
        const changeLog = BeadFs.read<any[]>('changes.json');
        if (changeLog?.length) {
            const recent = changeLog.slice(-3);
            projectContext += `\nRECENT CHANGES:\n${recent.map(c => `- ${c.description} (${c.changeType}, ${c.fromVersion}→${c.toVersion})`).join('\n')}\n`;
        }
        const alignment = BeadFs.read<any>('alignment-report.json');
        if (alignment) {
            projectContext += `\nLATEST AUDIT: Score ${alignment.score}/100, ${alignment.aligned ? 'Aligned' : 'Drift detected'}\n`;
        }

        // Chat state
        const chatHistory: { role: string; text: string }[] = [];
        const systemPrompt = `You are BushidoOS, an AI Product Manager and Development Orchestrator. You are having a conversation with a developer/founder about their project.

PROJECT CONTEXT:
${projectContext || 'No .bushido/ project found. The user may need to run `bushido kickstart` first.'}

YOUR ROLE:
- Help the user understand their project status, strategy, and next steps.
- Answer questions about the spec, features, constraints, and architecture.
- Suggest improvements and identify potential issues.
- If the user wants to make changes, guide them to use \`bushido change "<description>"\`.
- If they ask about code quality, suggest \`bushido audit\`.
- Be concise and direct. You embody the Bushido principles: honor, courage, loyalty, truth.
- Keep responses to 2-5 sentences unless the user asks for more detail.`;

        // Load persisted conversation if it exists
        const convDir = path.resolve(__cliDirname, '../.bushido/conversations');
        if (!fs.existsSync(convDir)) fs.mkdirSync(convDir, { recursive: true });

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan('\n  you > '),
        });

        const askAI = async (userMessage: string) => {
            try {
                const { generateText } = await import('ai');
                const { ModelRegistry } = await import('../services/ai/modelRegistry.js');
                const { MODEL_SPECS } = await import('../services/ai/neural-engine.js');

                const model = ModelRegistry.create(MODEL_SPECS.GEMINI_FLASH);

                const messages = chatHistory.map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.text
                }));
                messages.push({ role: 'user', content: userMessage });

                const { text } = await generateText({
                    model,
                    messages: messages as any,
                    system: systemPrompt
                });

                return text;
            } catch (err: any) {
                return `⚠ Error: ${err.message}`;
            }
        };

        console.log(chalk.green(`  bushido > `) + chalk.white(
            spec
                ? `Ready. Project "${spec.title}" (v${spec.version}) loaded with ${spec.features?.length || 0} features. How can I help?`
                : 'No project loaded. Run `bushido kickstart "<your idea>"` to start, or ask me anything.'
        ));

        rl.prompt();

        rl.on('line', async (line: string) => {
            const input = line.trim();
            if (!input) { rl.prompt(); return; }

            // Meta commands
            if (input === '/exit' || input === '/quit') {
                // Save conversation
                if (chatHistory.length > 0) {
                    const convFile = `chat-${Date.now()}.json`;
                    fs.writeFileSync(
                        path.join(convDir, convFile),
                        JSON.stringify(chatHistory, null, 2)
                    );
                    console.log(chalk.dim(`\n  Conversation saved to .bushido/conversations/${convFile}`));
                }
                console.log(chalk.dim('  Sayonara. 🙏\n'));
                rl.close();
                process.exit(0);
            }

            if (input === '/status') {
                const s = BeadFs.read<SpecSchema>('spec.json');
                if (s) {
                    console.log(chalk.cyan(`\n  📋 ${s.title} v${s.version} — ${s.features?.length || 0} features`));
                    const a = BeadFs.read<any>('alignment-report.json');
                    if (a) console.log(chalk.dim(`  Audit: ${a.score}/100`));
                } else {
                    console.log(chalk.yellow('\n  No project loaded.'));
                }
                rl.prompt();
                return;
            }

            if (input === '/clear') {
                chatHistory.length = 0;
                console.log(chalk.dim('\n  Chat history cleared.'));
                rl.prompt();
                return;
            }

            if (input === '/save') {
                const convFile = `chat-${Date.now()}.json`;
                fs.writeFileSync(
                    path.join(convDir, convFile),
                    JSON.stringify(chatHistory, null, 2)
                );
                console.log(chalk.dim(`\n  Saved to .bushido/conversations/${convFile}`));
                rl.prompt();
                return;
            }

            // AI response
            chatHistory.push({ role: 'user', text: input });
            process.stdout.write(chalk.green('\n  bushido > ') + chalk.dim('thinking...'));

            const response = await askAI(input);
            
            // Clear "thinking..." and print response
            process.stdout.write('\r' + ' '.repeat(60) + '\r');
            console.log(chalk.green('  bushido > ') + chalk.white(response));
            
            chatHistory.push({ role: 'assistant', text: response });
            rl.prompt();
        });

        rl.on('close', () => {
            // Save on Ctrl+C
            if (chatHistory.length > 0) {
                const convFile = `chat-${Date.now()}.json`;
                fs.writeFileSync(
                    path.join(convDir, convFile),
                    JSON.stringify(chatHistory, null, 2)
                );
            }
        });
    });

// ─── PUSH ───────────────────────────────────────────
program
    .command('push')
    .description('Push .bushido/ artifacts to Supabase cloud')
    .action(async () => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold('  ☁️  Pushing .bushido/ to cloud...\n'));

        const bushidoDir = path.resolve(__cliDirname, '../.bushido');
        if (!fs.existsSync(bushidoDir)) {
            console.log(chalk.red('  No .bushido/ directory found. Run `bushido kickstart` first.\n'));
            return;
        }

        const spinner = ora({ text: 'Connecting to Supabase...', spinner: 'dots' }).start();

        try {
            const { pushToCloud, getSlug, testConnectivity } = await import('../services/fs/supabaseSync.js');

            // Pre-flight connectivity check
            const conn = await testConnectivity();
            if (!conn.ok) {
                spinner.fail('Cannot connect to Supabase.');
                console.log(chalk.yellow(`\n  ${conn.message}\n`));
                return;
            }

            const slug = getSlug(bushidoDir);
            spinner.text = `Uploading to "${slug}"...`;

            const result = await pushToCloud(bushidoDir);

            if (result.success) {
                spinner.succeed(`Pushed ${result.filesUploaded} files to cloud.`);
                console.log(chalk.dim(`  Project: ${slug}`));
                console.log(chalk.dim(`  Manifest saved to .bushido/.sync-manifest.json`));
            } else {
                spinner.warn(`Push completed with errors.`);
                if (result.filesUploaded) {
                    console.log(chalk.dim(`  ${result.filesUploaded} files uploaded successfully.`));
                }
                if (result.error?.includes('fetch failed')) {
                    console.log(chalk.yellow('\n  Supabase project may be paused. Visit https://supabase.com/dashboard to restore it.'));
                } else {
                    console.log(chalk.dim(`  Error: ${result.error}`));
                }
            }
        } catch (err: any) {
            spinner.fail(`Push failed: ${err.message}`);
        }

        console.log('');
    });

// ─── PULL ───────────────────────────────────────────
program
    .command('pull')
    .description('Pull .bushido/ artifacts from Supabase cloud')
    .option('--project <slug>', 'Specify project slug (default: auto-detect from spec)')
    .action(async (options: any) => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.bold('  ☁️  Pulling .bushido/ from cloud...\n'));

        const bushidoDir = path.resolve(__cliDirname, '../.bushido');
        const spinner = ora({ text: 'Connecting to Supabase...', spinner: 'dots' }).start();

        try {
            const { pullFromCloud, getSlug, testConnectivity } = await import('../services/fs/supabaseSync.js');

            // Pre-flight connectivity check
            const conn = await testConnectivity();
            if (!conn.ok) {
                spinner.fail('Cannot connect to Supabase.');
                console.log(chalk.yellow(`\n  ${conn.message}\n`));
                return;
            }

            const slug = options.project || getSlug(bushidoDir);
            spinner.text = `Pulling "${slug}" from cloud...`;

            const result = await pullFromCloud(bushidoDir, slug);

            if (result.success) {
                spinner.succeed(`Pulled ${result.filesDownloaded} files from cloud.`);

                if (result.conflicts?.length) {
                    console.log(chalk.yellow(`\n  ⚠ ${result.conflicts.length} conflicts detected:`));
                    for (const c of result.conflicts) {
                        console.log(chalk.yellow(`    ${c} (local backup: ${c}.local)`));
                    }
                    console.log(chalk.dim('\n  Cloud version was applied. Review .local backups to merge manually.'));
                }
            } else {
                if (result.error?.includes('fetch failed')) {
                    spinner.fail('Supabase project may be paused.');
                    console.log(chalk.yellow('\n  Visit https://supabase.com/dashboard to restore it.\n'));
                } else {
                    spinner.fail(`Pull failed: ${result.error}`);
                }
            }
        } catch (err: any) {
            spinner.fail(`Pull failed: ${err.message}`);
            console.error(chalk.dim(err.stack));
        }

        console.log('');
    });

// ─── SERVE ──────────────────────────────────────────
program
    .command('serve')
    .description('Start MCP server for IDE integration')
    .action(async () => {
        console.log(BUSHIDO_BANNER);
        console.log(chalk.dim('  Starting MCP server (stdio mode)...\n'));
        
        // Import and run the existing MCP server
        await import('./mcp-server.js');
    });

// ─── Parse ──────────────────────────────────────────
program.parse();
