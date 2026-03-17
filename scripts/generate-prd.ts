
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePrd } from '../services/ai/agents/productAgent';
import { SpecSchema } from '../types/beads';
import { AIConfig } from '../services/ai/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const BEADS_DIR = path.join(ROOT_DIR, '.bushido');

async function main() {
    const specPath = path.join(BEADS_DIR, 'spec.json');
    if (!fs.existsSync(specPath)) {
        console.error("❌ spec.json not found in .bushido/");
        process.exit(1);
    }

    const specContent = fs.readFileSync(specPath, 'utf-8');
    const spec: SpecSchema = JSON.parse(specContent);

    console.log(`🚀 Generating PRD for: ${spec.title}`);

    try {
        const prd = await generatePrd(spec);

        const prdPath = path.join(BEADS_DIR, 'prd.json');
        fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));

        console.log(`✅ PRD saved to: ${prdPath}`);
        console.log(`Stories: ${prd.stories.length}`);
        console.log(`Non-Negotiables: ${prd.nonNegotiables.length}`);
    } catch (error) {
        console.error("❌ Failed to generate PRD:", error);
        process.exit(1);
    }
}

main();
