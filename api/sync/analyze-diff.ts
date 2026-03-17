/**
 * Semantic Diff Analyzer
 * Uses LLM to analyze code changes against product specification
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Types
interface AnalysisRequest {
    repoFullName: string;
    commitSha: string;
    branch: string;
    diff: string;
    specContent: string;
    architectureContent?: string;
}

interface DriftAnalysis {
    driftDetected: boolean;
    severity: 'none' | 'minor' | 'major' | 'critical';
    affectedArtifacts: string[];
    reasoning: string;
    suggestedUpdates: Array<{
        artifact: string;
        section: string;
        currentContent: string;
        suggestedContent: string;
        rationale: string;
    }>;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function analyzeSemanticDrift(
    diff: string,
    specContent: string,
    architectureContent?: string
): Promise<DriftAnalysis> {
    const contextDocs = `
## Product Specification
${specContent}

${architectureContent ? `## Architecture
${architectureContent}` : ''}
`;

    const prompt = `You are a Product Strategy Analyst reviewing code changes against product documentation.

## Your Task
Analyze the following git diff and determine if it represents "semantic drift" - code changes that deviate from or invalidate the product specification.

## Context Documents
${contextDocs}

## Code Changes (Git Diff)
\`\`\`diff
${diff}
\`\`\`

## Analysis Instructions
1. **Intent Analysis**: What is the developer trying to accomplish with these changes?
2. **Alignment Check**: Does this align with the documented product vision, features, and architecture?
3. **Drift Detection**: Are there any deviations that would require updating the specification?

## Response Format (JSON)
{
  "driftDetected": boolean,
  "severity": "none" | "minor" | "major" | "critical",
  "affectedArtifacts": ["spec.md", "architecture.md", etc.],
  "reasoning": "Detailed explanation of why drift was or wasn't detected",
  "suggestedUpdates": [
    {
      "artifact": "spec.md",
      "section": "Section Title",
      "currentContent": "What the spec currently says",
      "suggestedContent": "What it should say after this change",
      "rationale": "Why this update is needed"
    }
  ]
}

IMPORTANT:
- "minor" drift = cosmetic or implementation details that don't affect user-facing behavior
- "major" drift = new features, changed requirements, or architectural deviations
- "critical" drift = changes that contradict core product goals or could cause issues

If no drift is detected, return suggestedUpdates as an empty array.
Respond ONLY with valid JSON, no markdown code blocks.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
            },
        });

        const result = JSON.parse(response.text || '{}');
        return {
            driftDetected: result.driftDetected ?? false,
            severity: result.severity ?? 'none',
            affectedArtifacts: result.affectedArtifacts ?? [],
            reasoning: result.reasoning ?? 'Analysis could not be completed',
            suggestedUpdates: result.suggestedUpdates ?? [],
        };
    } catch (error) {
        console.error('Semantic analysis failed:', error);
        return {
            driftDetected: false,
            severity: 'none',
            affectedArtifacts: [],
            reasoning: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            suggestedUpdates: [],
        };
    }
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const body = req.body as AnalysisRequest;

    // Validate required fields
    if (!body.diff || !body.specContent) {
        return res.status(400).json({
            error: 'Missing required fields: diff and specContent are required'
        });
    }

    try {
        // Perform semantic analysis
        const analysis = await analyzeSemanticDrift(
            body.diff,
            body.specContent,
            body.architectureContent
        );

        // Log for monitoring
        console.log('Drift analysis completed:', {
            repo: body.repoFullName,
            commit: body.commitSha,
            driftDetected: analysis.driftDetected,
            severity: analysis.severity,
        });

        return res.status(200).json({
            success: true,
            analysis,
            metadata: {
                repoFullName: body.repoFullName,
                commitSha: body.commitSha,
                branch: body.branch,
                analyzedAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error('Analysis endpoint error:', error);
        return res.status(500).json({
            error: 'Analysis failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
