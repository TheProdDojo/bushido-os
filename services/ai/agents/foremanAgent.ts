import { BeadClient } from '../beadClient';
import { PrdSchema } from '../../../types/beads';
import { runAlignmentAudit } from './alignmentService';

/**
 * Foreman Agent
 * Role: Audits the implementation (Code) against the Blueprints (PRD).
 * Output: A "Punch List" of discrepancies for the IDE to fix.
 */
export const runForemanAudit = async (projectFiles: string[]) => {
    console.log('[Foreman] Starting Code Audit...');

    // 1. Read Blueprints (PRD)
    const prd = await BeadClient.read<PrdSchema>('prd.json');
    if (!prd) {
        console.error('[Foreman] No PRD found. Cannot audit without blueprints.');
        return;
    }

    // 2. Gather Context (Read actual code)
    // In a real app, we'd probably scan the directory. For now, we accept a list of critical files.
    let codebaseContext = "";
    for (const file of projectFiles) {
        const content = await BeadClient.readFile(file);
        if (content) {
            codebaseContext += `\n--- FILE: ${file} ---\n${content}\n`;
        } else {
            console.warn(`[Foreman] Skipped file (not found or could not read): ${file}`);
        }
    }

    if (!codebaseContext) {
        console.warn('[Foreman] No code found to audit.');
        return;
    }

    // 3. Run Audit
    const report = await runAlignmentAudit(prd, codebaseContext);
    console.log(`[Foreman] Audit Complete. Score: ${report.score}/100.`);

    // 4. Generate Punch List
    if (!report.aligned) {
        console.log('[Foreman] Discrepancies found. Generating Punch List...');
        const punchList = {
            id: `punchlist-${Date.now()}`,
            timestamp: new Date().toISOString(),
            score: report.score,
            items: report.discrepancies.map(d => ({
                violation: d.violatedItem,
                fix: d.suggestedFix,
                severity: d.severity
            }))
        };
        await BeadClient.write('punchlist.json', punchList);
        console.log('[Foreman] Punch List saved to punchlist.json');
        return punchList;
    } else {
        console.log('[Foreman] Implementation looks good! No punch list needed.');
        await BeadClient.write('punchlist.json', { status: 'CLEAN', timestamp: new Date().toISOString() });
        return null;
    }
};
