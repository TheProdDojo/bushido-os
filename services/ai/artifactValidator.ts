import { z } from 'zod';
import { ARTIFACT_VALIDATORS, ValidationRule } from './neural-engine';
import { StageType, STAGE_CONFIG } from '../../types';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export const ArtifactValidator = {
    /**
     * validate the content of an artifact against the rules defined for its stage.
     */
    validate: (stage: StageType, content: string): ValidationResult => {
        // Map StageType to Validator Key if possible
        // STAGE_CONFIG keys are like MARKET_ANALYSIS, USER_PERSONA
        // Validation keys in neural-engine.ts match these string enums.

        // We assume stage (enum) matches the specific keys in ARTIFACT_VALIDATORS
        // Or we convert the Enum value to the key string.
        const stageKey = StageType[stage as keyof typeof StageType] || stage;

        const rules = ARTIFACT_VALIDATORS[stageKey as keyof typeof ARTIFACT_VALIDATORS];

        if (!rules) {
            // No validators defined for this stage, pass by default
            return { isValid: true, errors: [] };
        }

        const errors: string[] = [];

        for (const rule of rules) {
            if (rule.type === 'regex' && rule.pattern) {
                if (!rule.pattern.test(content)) {
                    errors.push(rule.error);
                }
            } else if (rule.type === 'min_length' && rule.minLength) {
                if (content.length < rule.minLength) {
                    errors.push(rule.error);
                }
            }
            // JSON Schema validation requires parsing the content as JSON first
            // usage: if rule.type === 'json_schema' ...
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};
