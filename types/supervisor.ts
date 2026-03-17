/**
 * Supervisor Agent Types
 * Definitions for the TAME (Trustworthy Agent Memory Evolution) verification layer.
 */

export interface DriftIssue {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    type: 'missing_file' | 'signature_mismatch' | 'logic_drift' | 'extra_code';
    message: string;
    file?: string;
    line?: number;
    expected?: string;
    actual?: string;
}

export interface DriftRecommendation {
    id: string;
    issueIds: string[]; // Linked issues
    action: 'create_file' | 'update_file' | 'delete_file' | 'refactor';
    description: string;
    codeSnippet?: string; // Proposed fix
}

export interface DriftReport {
    id: string; // Report ID
    timestamp: number;
    projectId: string;
    score: number; // 0-100 Alignment Score
    status: 'aligned' | 'drift_detected' | 'critical_failure';
    issues: DriftIssue[];
    recommendations: DriftRecommendation[];
    summary: string; // AI generated summary of the state
}

export interface CodebaseSummary {
    structure: string; // Tree structure
    keyFiles: Record<string, string>; // path -> content snippet
}
