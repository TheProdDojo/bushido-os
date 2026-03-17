
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Ensure .bushido directory exists
const BEADS_DIR = path.join(ROOT_DIR, '.bushido');
if (!fs.existsSync(BEADS_DIR)) {
    fs.mkdirSync(BEADS_DIR, { recursive: true });
}

app.post('/api/sync', (req, res) => {
    try {
        const { files } = req.body;

        if (!files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'Invalid payload' });
        }

        console.log(`[SyncServer] Syncing ${files.length} files...`);

        files.forEach(file => {
            // Validate path to prevent directory traversal
            const safePath = path.resolve(ROOT_DIR, file.path);
            if (!safePath.startsWith(ROOT_DIR)) {
                console.warn(`[SyncServer] Blocked unsafe write to ${file.path}`);
                return;
            }

            // Ensure directory exists
            const dir = path.dirname(safePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(safePath, file.content);
            console.log(`[SyncServer] Wrote ${file.path}`);
        });

        res.json({ success: true, count: files.length });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/bead?name=spec.json
app.get('/api/bead', (req, res) => {
    try {
        const { name } = req.query;
        if (!name) return res.status(400).json({ error: 'Name required' });

        // Prevent directory traversal
        const safeName = path.basename(name);
        const filePath = path.join(BEADS_DIR, safeName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Bead not found' });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        res.json({ content }); // wrap in object
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/read-file?path=components/App.tsx
// Used by Foreman Agent to read source code for auditing
app.get('/api/read-file', (req, res) => {
    try {
        const { path: queryPath } = req.query;
        if (!queryPath) return res.status(400).json({ error: 'Path required' });

        // Prevent directory traversal and restrict to project root
        // We allow reading any file in ROOT_DIR except .env, .git, etc.
        const safePath = path.resolve(ROOT_DIR, queryPath);
        if (!safePath.startsWith(ROOT_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (!fs.existsSync(safePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const content = fs.readFileSync(safePath, 'utf-8');
        res.json({ content });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`[SyncServer] Running on http://localhost:${PORT}`);
    console.log(`[SyncServer] Ready to persist BushidoOS state to ${ROOT_DIR}`);
});
