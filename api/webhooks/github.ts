/**
 * GitHub Webhook Handler
 * Vercel Serverless Function for processing GitHub push events
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

// Types
interface GitHubPushPayload {
    ref: string;
    before: string;
    after: string;
    repository: {
        name: string;
        full_name: string;
        owner: { login: string };
    };
    commits: Array<{
        id: string;
        message: string;
        added: string[];
        removed: string[];
        modified: string[];
    }>;
    sender: { login: string };
    installation?: { id: number };
}

interface SyncAnalysisRequest {
    projectId: string;
    repoFullName: string;
    commitSha: string;
    diff: string;
    specContent: string;
}

// Verify GitHub webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

// Extract relevant file changes from push event
function extractRelevantChanges(payload: GitHubPushPayload): {
    hasCodeChanges: boolean;
    hasBushidoChanges: boolean;
    changedFiles: string[];
} {
    const allChanges = payload.commits.flatMap(c => [
        ...c.added,
        ...c.modified,
        ...c.removed
    ]);

    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];
    const hasCodeChanges = allChanges.some(f =>
        codeExtensions.some(ext => f.endsWith(ext))
    );

    const hasBushidoChanges = allChanges.some(f =>
        f.startsWith('.bushido/')
    );

    return {
        hasCodeChanges,
        hasBushidoChanges,
        changedFiles: allChanges
    };
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'] as string;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error('GITHUB_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    const rawBody = JSON.stringify(req.body);
    if (!verifySignature(rawBody, signature, webhookSecret)) {
        return res.status(401).json({ error: 'Invalid signature' });
    }

    // Handle different event types
    const eventType = req.headers['x-github-event'] as string;

    if (eventType === 'ping') {
        return res.status(200).json({ message: 'Pong! Webhook configured successfully.' });
    }

    if (eventType !== 'push') {
        return res.status(200).json({ message: `Event ${eventType} acknowledged but not processed` });
    }

    // Process push event
    const payload = req.body as GitHubPushPayload;
    const { hasCodeChanges, hasBushidoChanges, changedFiles } = extractRelevantChanges(payload);

    // Skip if only .bushido/ changes (avoid infinite loops)
    if (hasBushidoChanges && !hasCodeChanges) {
        return res.status(200).json({
            message: 'Only .bushido/ changes detected, skipping analysis',
            processed: false
        });
    }

    // Skip if no code changes
    if (!hasCodeChanges) {
        return res.status(200).json({
            message: 'No code changes detected',
            processed: false
        });
    }

    // Queue analysis job
    const analysisJob = {
        id: crypto.randomUUID(),
        repoFullName: payload.repository.full_name,
        commitSha: payload.after,
        branch: payload.ref.replace('refs/heads/', ''),
        changedFiles,
        timestamp: Date.now(),
        status: 'queued'
    };

    // In production, this would be sent to a job queue (e.g., Vercel KV, Redis)
    // For now, we'll trigger the analysis directly
    console.log('Analysis job created:', analysisJob);

    // TODO: Call the semantic diff analyzer
    // await fetch(`${process.env.VERCEL_URL}/api/sync/analyze-diff`, {
    //   method: 'POST',
    //   body: JSON.stringify(analysisJob)
    // });

    return res.status(200).json({
        message: 'Push event received and queued for analysis',
        processed: true,
        jobId: analysisJob.id
    });
}
