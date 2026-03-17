
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { runAlignmentAudit } from './alignmentService';
import { SpecSchema, PrdSchema } from '../../../types/beads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../../');
const BEADS_DIR = path.join(ROOT_DIR, '.bushido');

export const runDiscrepancyLoop = async () => {
    console.log("[DiscrepancyLoop] Starting alignment check...");

    // 1. Load PRD
    const prdPath = path.join(BEADS_DIR, 'prd.json');
    if (!fs.existsSync(prdPath)) {
        console.error("❌ No PRD found. Run 'npm run generate-prd' first.");
        return;
    }
    const prd: PrdSchema = JSON.parse(fs.readFileSync(prdPath, 'utf-8'));

    // 2. Gather Context (Mocking for now, in real life related to Git/File system)
    // For this proof of concept, we read the project's package.json to check dependencies
    const packageJsonPath = path.join(ROOT_DIR, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath) ? fs.readFileSync(packageJsonPath, 'utf-8') : "{}";

    // We also read the main App.tsx to check for high level structure
    const appTsxPath = path.join(ROOT_DIR, 'App.tsx');
    const appTsx = fs.existsSync(appTsxPath) ? fs.readFileSync(appTsxPath, 'utf-8') : "";

    const context = `
    package.json:
    ${packageJson}

    App.tsx:
    ${appTsx}
    `;

    // 3. Run Audit
    const report = await runAlignmentAudit(prd, context);

    // 4. Output Results
    console.log(`\n📊 Alignment Score: ${report.score}/100`);
    if (report.aligned) {
        console.log("✅ System is aligned with PRD.");
    } else {
        console.log("⚠️ Discrepancies Found:");
        report.discrepancies.forEach(d => {
            console.log(`- [${d.severity.toUpperCase()}] ${d.title}: ${d.description}`);
            console.log(`  Fix: ${d.suggestedFix}`);
        });
    }

    // 5. Save Report
    const reportPath = path.join(BEADS_DIR, 'alignment-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
};
