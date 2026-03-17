
import { runProductAgentLoop } from '../services/ai/agents/productAgent';
import { runRoastLoop } from '../services/ai/agents/roastService';
import { runForemanAudit } from '../services/ai/agents/foremanAgent';

async function main() {
    console.log('--- BUSHIDO OS: AGENT VERIFICATION ---');

    const mode = process.argv[2];

    try {
        if (mode === 'roast') {
            await runRoastLoop();
        } else if (mode === 'product') {
            await runProductAgentLoop();
        } else if (mode === 'foreman') {
            await runForemanAudit(['App.tsx', 'services/storageService.ts']);
        } else {
            console.log('\n[1] Running ROAST...');
            await runRoastLoop();

            console.log('\n[2] Running PRODUCT ARCHITECT...');
            await runProductAgentLoop();

            console.log('\n[3] Running FOREMAN AUDIT...');
            await runForemanAudit(['App.tsx', 'services/storageService.ts']);
        }
    } catch (e) {
        console.error('Agent Failure:', e);
        process.exit(1);
    }
}

main();
