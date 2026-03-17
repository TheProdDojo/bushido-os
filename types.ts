export enum StageType {
  MARKET_ANALYSIS = 'MARKET_ANALYSIS',
  USER_PERSONA = 'USER_PERSONA',
  SOLUTION_CONCEPT = 'SOLUTION_CONCEPT',
  PRODUCT_SPEC = 'PRODUCT_SPEC', // Stage 4: PRD & Flows
  EXECUTION_ROADMAP = 'EXECUTION_ROADMAP', // Stage 5: OKRs & Gantt
  DEEP_RESEARCH = 'DEEP_RESEARCH'
}

export enum ArtifactStatus {
  EMPTY = 'EMPTY',
  PENDING = 'PENDING', // Waiting in queue
  GENERATING = 'GENERATING', // Currently being created by AI
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED'
}

export interface Source {
  title: string;
  uri: string;
}

export interface Artifact {
  id: string;
  type: StageType;
  title: string;
  content: string; // Markdown content
  imageUrl?: string; // Optional generated image (e.g., for Persona)
  sources?: Source[]; // Google Search Grounding sources
  status: ArtifactStatus;
  lastUpdated: number;
}

export interface ProjectMetadata {
  id: string;
  lastUpdated: number;
  isKickstarted: boolean;
  idea: string;
  researchBrief: string;
}

export type ProjectArtifacts = Record<StageType, Artifact>;

export interface ProjectState extends ProjectMetadata {
  artifacts: ProjectArtifacts;
  // Persisted research planning data (survives refresh)
  researchLogs?: ResearchLog[];
  researchPlan?: string[];
  researchPillars?: ResearchPillar[];
}

export interface GenerationStep {
  message: string;
  isActive: boolean;
  isComplete: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

export interface ResearchLog {
  id: string;
  type: 'plan' | 'thought' | 'action';
  message: string;
  timestamp: number;
}

export interface ResearchPillar {
  stage: StageType;
  label: string;
  goals: string[];
}

export const STAGE_CONFIG: Record<StageType, { label: string; description: string; nextStage?: StageType; isStructured?: boolean }> = {
  [StageType.MARKET_ANALYSIS]: {
    label: "Market Analysis",
    description: "Problem Validation, Target User Research, TAM/SAM/SOM, and Competitor Analysis.",
    nextStage: StageType.USER_PERSONA
  },
  [StageType.USER_PERSONA]: {
    label: "User Validation",
    description: "Assumptions, Questionnaires, Journey Mapping, Empathy Mapping, and Persona Profile.",
    nextStage: StageType.SOLUTION_CONCEPT
  },
  [StageType.SOLUTION_CONCEPT]: {
    label: "Solution Concept",
    description: "Value Prop Canvas, Vision & Strategy, Business Model Canvas, SWOT, and Pitch Deck.",
    nextStage: StageType.PRODUCT_SPEC
  },
  [StageType.PRODUCT_SPEC]: {
    label: "Product Spec",
    description: "Executable Specifications (JSON). Problem-Solution Mapping, MVP Prioritization, and PRD.",
    nextStage: StageType.EXECUTION_ROADMAP,
    isStructured: true
  },
  [StageType.EXECUTION_ROADMAP]: {
    label: "Execution Roadmap",
    description: "OKRs, Now/Next/Later Strategy, and Gantt Chart Planning.",
    nextStage: undefined
  },
  [StageType.DEEP_RESEARCH]: {
    label: "Deep Research",
    description: "In-depth market research and analysis using web search.",
    nextStage: StageType.MARKET_ANALYSIS
  }
};