/**
 * @file agents.ts
 * @description Shared TypeScript types for all MNC Interview Agent functions.
 * Includes: CandidateProfile, RawQuestion, CuratedQuestion, EvaluationResult,
 *           FinalReport, VoiceAnalytics, MediaPipeMetrics, RAGQuestion, OrchestratorConfig,
 *           InterviewWorkflowPlan, WorkflowRound
 */

/** Per-agent model selection for the Orchestrator */
export type AgentModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.0-flash";

export interface OrchestratorConfig {
  searchAgent: AgentModel;
  curatorAgent: AgentModel;
  interviewAgent: AgentModel;
  evaluatorAgent: AgentModel;
  followupAgent: AgentModel;
  reportAgent: AgentModel;
}

/** Default model config — 2.5 Pro for quality-critical agents, Flash for speed */
export const DEFAULT_ORCHESTRATOR_CONFIG: OrchestratorConfig = {
  searchAgent: "gemini-2.5-pro",
  curatorAgent: "gemini-2.5-pro",
  interviewAgent: "gemini-2.5-pro",
  evaluatorAgent: "gemini-2.5-pro",
  followupAgent: "gemini-2.5-flash",
  reportAgent: "gemini-2.5-flash",
};

/** RAG question retrieved from MongoDB QuestionBank */
export interface RAGQuestion {
  question: string;
  topic: string;
  round: "Technical Round" | "HR Round" | "Managerial Round" | "System Design Round";
  difficulty: "easy" | "medium" | "hard";
  source: string;          // e.g. "RAG/Glassdoor (similarity: 87%)"
  similarity: number;      // 0–1 cosine similarity score
  isReal: boolean;
  expectedKeywords: string[];
}

/** Input profile for every agent — built from the user's session and MongoDB interview document */
export interface CandidateProfile {
  name: string;
  company: string;
  role: string;
  experienceLevel: "fresher" | "junior" | "mid" | "senior";
  skills: string;          // comma-separated e.g. "Java, Spring Boot, SQL"
  resumeText: string;
  interviewType: "technical" | "hr" | "mixed";
  difficulty: "easy" | "medium" | "hard";
  numQuestions: number;
  language: string;        // "en", "ta", "hi", etc.
}

/** A dynamically generated interview round from the Master Orchestrator */
export interface WorkflowRound {
  roundNumber: number;
  roundName: string;
  agent: string;
  questionCount: number;
  difficulty: string;
}

/** The overall interview workflow plan generated before the interview starts */
export interface InterviewWorkflowPlan {
  company: string;
  role: string;
  experienceLevel: string;
  totalRounds: number;
  rounds: WorkflowRound[];
}

/** Raw question as returned by the Search Agent (before curation) */
export interface RawQuestion {
  question: string;
  source: string;          // "Glassdoor" | "GeeksForGeeks" | "InterviewBit" | "Naukri" | "LeetCode Discuss"
  year: string;            // "2024"
  type: "technical" | "hr" | "managerial" | "system_design";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  isReal: boolean;
  companyVerified?: boolean;
}

/** Curated question — after Curator Agent selects, adapts, and enriches raw questions */
export interface CuratedQuestion {
  question: string;
  round: "Technical Round" | "HR Round" | "Managerial Round" | "System Design Round";
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  realSource: string;      // e.g. "Glassdoor 2024" or "AI-generated based on TCS patterns"
  isReal: boolean;
  expectedKeywords: string[];
  adaptedFrom?: string;    // note if adapted from original
  companyRelevance?: string;
  roundName?: string;      // Links back to WorkflowRound.roundName
  roundAgent?: string;     // Links back to WorkflowRound.agent
}

/** Full evaluation result from the Evaluator Agent */
export interface EvaluationResult {
  score: number;                  // 0–100 overall weighted
  technicalAccuracy: number;      // 0–100
  communication: number;          // 0–100
  confidence: number;             // 0–100
  fluency: number;                // 0–100
  grammarScore: number;           // 0–10
  clarityScore: number;           // 0–10
  problemSolvingScore: number;    // 0–10
  answerRelevance: number;        // 0–10
  eyeContactScore: number;        // 0–10 (MediaPipe)
  engagementScore: number;        // 0–10 (MediaPipe)
  hiringRecommendation: "Strong Hire" | "Hire" | "Weak Hire" | "Reject";
  round: string;
  expectedAnswer: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingConcepts: string[];
  expectedKeywords: string[];
  coveredKeywords: string[];
  improvedAnswer: string;
  nextQuestion: string | null;
}

/** Final session report from Report Agent */
export interface FinalReport {
  candidateName: string;
  company: string;
  role: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  confidenceScore: number;
  finalVerdict: "Strong Hire" | "Hire" | "Weak Hire" | "Reject";
  topStrengths: string[];
  topWeaknesses: string[];
  topMissingConcepts: string[];
  questionBreakdown: Array<{
    question: string;
    answer: string;
    score: number;
    round: string;
    improvedAnswer: string;
    hiringRecommendation: string;
  }>;
  studyRecommendations: string[];
}

/** Voice analytics from browser Speech Recognition */
export interface VoiceAnalytics {
  speakingSpeed: number;    // WPM
  duration: number;         // seconds
  hesitationCount: number;  // filler words
}

/** Facial/engagement metrics from MediaPipe */
export interface MediaPipeMetrics {
  eyeContactScore: number;       // 0–10
  headStabilityScore: number;    // 0–10
  faceVisibilityScore: number;   // 0–10
  engagementScore: number;       // 0–10
}
