/**
 * @file agents.ts
 * @description Production-grade MNC Interview Simulator — 7-Agent Orchestrated Pipeline.
 *
 * Pipeline:
 *   Orchestrator → [Search + RAG (parallel)] → Curator → Interview → Evaluator → FollowUp → Report
 *
 * Models:
 *   - gemini-2.5-pro  → Search, Curator, Interview, Evaluator (quality-critical)
 *   - gemini-2.5-flash → FollowUp, Report (speed-critical)
 *   - text-embedding-004 → RAG vector embeddings
 *
 * All agents run server-side inside Next.js API routes.
 */

import { GoogleGenAI } from "@google/genai";
import companyQuestions from "@/data/companyQuestions.json";
import { retrieveSimilarQuestions } from "@/lib/rag";
import type {
  CandidateProfile,
  RawQuestion,
  CuratedQuestion,
  EvaluationResult,
  FinalReport,
  VoiceAnalytics,
  MediaPipeMetrics,
} from "@/types/agents";

// ─── Model Configuration ──────────────────────────────────────────────────────

const MODELS = {
  pro:   "gemini-2.5-pro",    // Search, Curator, Interview, Evaluator
  flash: "gemini-2.5-flash",  // FollowUp, Report
} as const;

// ─── Gemini Client ─────────────────────────────────────────────────────────────

let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey.trim() !== "" && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
  try {
    ai = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("[agents] Failed to initialize GoogleGenAI:", e);
  }
}

// ─── System Prompts ────────────────────────────────────────────────────────────

const SEARCH_AGENT_SYSTEM = `You are a specialized research agent. Your job is to retrieve publicly available interview experiences and reported questions from trusted sources such as Glassdoor, GeeksForGeeks, InterviewBit, Naukri, and LeetCode Discuss.

EXTRACTION RULES:
- Include coding challenges with inputs/outputs/constraints as shared by interviewees in public forums
- Include SQL questions with table structures where publicly documented
- Include system design questions with scale/context requirements where stated publicly
- Include behavioral/HR questions in their reported STAR-trigger format
- DO NOT fabricate questions — only extract what is publicly documented
- DO NOT include vague or generic theory questions ("What is recursion?" "Define OOP")
- ALWAYS prefer specific, concrete problems with verifiable public documentation
- If a question cannot be attributed to a real public source, mark isReal:false

SOURCE ATTRIBUTION:
- Always populate the 'source' field with the platform name (Glassdoor, GeeksForGeeks, etc.)
- Do not claim company-internal data — only use publicly shared candidate experiences

OUTPUT: Return ONLY a valid JSON array. No markdown. No preamble.
[
  {
    "question": "question text with inputs/outputs/constraints where publicly available",
    "source": "Glassdoor|GeeksForGeeks|InterviewBit|Naukri|LeetCode Discuss",
    "year": "2025",
    "type": "technical|hr|managerial|system_design",
    "topic": "specific topic",
    "difficulty": "easy|medium|hard",
    "isReal": true,
    "companyVerified": false
  }
]`;

const ORCHESTRATOR_AGENT_SYSTEM = `You are the Master Orchestrator Agent of Mockora.ai.

Your responsibility is NOT to ask questions directly. Your responsibility is to design and manage a complete company-specific recruitment process based on publicly reported interview experiences, recruitment patterns, candidate reports, and company hiring practices.

Primary Objective: Create a realistic interview journey that closely resembles the target company's recruitment process.
The process must adapt based on Company, Job Role, Experience Level, Candidate Skills, Interview Type, and Difficulty Level.

Core Responsibilities:
1. Round Planning: Determine the most realistic round sequence for the selected company.
   - TCS: Aptitude -> Logical Reasoning -> Technical -> HR
   - Google: DSA -> DSA -> System Design -> Behavioral
   - Amazon: Coding -> Coding -> Leadership Principles -> Bar Raiser
   - Zoho: Programming -> Advanced Coding -> Technical -> HR

2. Dynamic Round Generation: Do NOT use a fixed structure. Select rounds based on the specific company and role. Assign 1 or 2 questions per round to keep the total interview length to 4-6 questions total.

3. Round Allocation Rules:
   - Aptitude: Percentage, Probability, Ratios
   - Logical: Number Series, Puzzles
   - Coding: Arrays, Strings, HashMap, Graphs
   - Technical: OOP, DBMS, OS, Networking, Cloud
   - System Design: Scalability, APIs, Caching
   - Managerial: Teamwork, Conflict Resolution
   - HR: Tell Me About Yourself, Strengths/Weaknesses
   - Leadership: Customer Obsession, Ownership

4. Agent Routing: Assign each round to the appropriate agent (e.g. Aptitude Agent, Technical Agent, HR Agent).

5. Realism: Prefer realistic hiring patterns.

OUTPUT FORMAT: Return ONLY JSON. Do not generate questions.
{
  "company": "",
  "role": "",
  "experienceLevel": "",
  "totalRounds": 0,
  "rounds": [
    {
      "roundNumber": 1,
      "roundName": "",
      "agent": "",
      "questionCount": 0,
      "difficulty": ""
    }
  ]
}`;

const CURATOR_AGENT_SYSTEM = `You are an expert interview question curator for MNC companies.
Select and adapt the best questions from a raw scraped list to fit a specific candidate profile and the Master Orchestrator's Workflow Plan.

CURATION RULES:
1. You will be provided with a JSON "Workflow Plan" detailing the rounds to conduct. You MUST output EXACTLY the number of questions requested per round in that plan.
2. Skill match — adapt tech stack (Java→Python etc.) to candidate's declared skills.
3. Every technical question MUST have: problem statement + input example + output + constraints.
4. Add 4-6 expectedKeywords for each question (terms a perfect answer MUST include).
5. For each question, you MUST include the "roundName" and "roundAgent" exactly as specified in the Workflow Plan.

OUTPUT: ONLY valid JSON array. No markdown.
[
  {
    "question": "...",
    "round": "Technical Round",
    "topic": "...",
    "difficulty": "medium",
    "realSource": "...",
    "isReal": true,
    "expectedKeywords": ["..."],
    "roundName": "Name of the round from workflow plan",
    "roundAgent": "Agent from workflow plan"
  }
]`;

const EVALUATOR_AGENT_SYSTEM = `You are a strict, realistic MNC interview panel evaluator.

ANTI-INFLATION POLICY (NON-NEGOTIABLE):
| Condition                              | technicalAccuracy | answerRelevance | Verdict    |
|----------------------------------------|-------------------|-----------------|------------|
| Off-topic / irrelevant / gibberish     | 0–5               | 0–2             | Reject     |
| Only definitions, no application       | 20–35             | 4–6             | Weak Hire  |
| Partially correct, key concept missing | 40–55             | 6–7             | Weak Hire  |
| Correct but poorly communicated        | 60–70             | 7–8             | Hire       |
| Fully correct and well structured      | 75–90             | 8–9             | Hire       |
| Exceptional with edge cases            | 90–100            | 9–10            | Strong Hire|

NEVER give 100 unless literally perfect.

EXACT SCORE FORMULA (use this, do not deviate):
score = round((technicalAccuracy*0.35) + (communication*0.20) + (confidence*0.15) + (fluency*0.10) + (answerRelevance*10*0.15) + (problemSolvingScore*10*0.05))

OUTPUT: Raw JSON ONLY. No markdown. No preamble.`;

const FOLLOWUP_AGENT_SYSTEM = `You are a sharp senior technical interviewer generating targeted follow-up questions.

RULES:
1. Analyze the candidate's WEAKEST point from the evaluation — their lowest-scoring dimension
2. Generate ONE focused follow-up question that probes exactly that weakness
3. If answerRelevance < 6: Ask the same question rephrased more simply
4. If technicalAccuracy < 50: Ask a slightly simpler variant on the same topic
5. If score > 80: Escalate — ask a harder variant or adjacent advanced topic
6. The question must be SPECIFIC with clear inputs, constraints, and expected approach
7. Cite the company — phrase it exactly as that company's interviewer would

OUTPUT: ONLY the spoken recruiter follow-up question. No JSON. No labels. No markdown.`;

// ─── Company Styles (Interview Agent) ─────────────────────────────────────────

const COMPANY_STYLES: Record<string, string> = {
  tcs: `You are a senior TCS Technical Lead (10 years experience). Style: structured, friendly-but-formal. Value: CS fundamentals (OOP, DS, DBMS, OS), project experience, TCS values. Correction style: "That's a good start, but let me add something important..."`,
  infosys: `You are a senior Infosys Systems Engineer interviewer. Style: logical, systematic. Value: algorithmic thinking, clear communication, adaptability. Correction: "You're on the right track. The key insight you're missing is..."`,
  wipro: `You are a Wipro senior software engineer. Style: warm, structured campus feel. Focus: core CS, project clarity, relocation willingness, teamwork.`,
  accenture: `You are an Accenture senior consultant interviewer. Style: professional, client-oriented. Focus: communication, agile, cloud, stakeholder management.`,
  cognizant: `You are a Cognizant Technical Manager. Style: structured, practical. Focus: OOP, Java basics, SQL, team collaboration.`,
  capgemini: `You are a Capgemini Technical Architect. Style: process-driven, DevOps-aware. Focus: Spring Boot, microservices, CI/CD, cloud.`,
  hcl: `You are an HCL Technologies senior engineer. Style: straightforward, infrastructure-aware. Focus: Java/C++, networking, cloud migrations, enterprise patterns.`,
  google: `You are a senior Google SWE conducting a loop interview. Style: intellectually rigorous, collaborative, data-driven. After each answer probe for optimal solution: "Interesting. What's the time complexity? Can we do better?"`,
  amazon: `You are an Amazon Bar Raiser. Leadership Principles are required in every behavioral answer. After behavioral: "Tell me more about YOUR specific contribution, not the team's."`,
  microsoft: `You are a senior Microsoft engineer. Style: thorough, growth-mindset focused. Value: clean code, system thinking, collaborative problem solving.`,
  zoho: `You are a Zoho senior engineer. Style: no-nonsense, deep technical. "Don't tell me you'd use a library. How would you implement it yourself from scratch?"`,
  flipkart: `You are a Flipkart Senior SDE. Style: product-focused, scale-aware. Value: trade-offs in e-commerce scale, caching, search indexing.`,
  goldman_sachs: `You are a Goldman Sachs quantitative developer interviewer. Style: mathematically rigorous, low-latency focused. Value: finance domain, threading, Big-O.`,
};

function buildInterviewSystemPrompt(profile: CandidateProfile): string {
  const key = profile.company.toLowerCase().replace(/[\s-]/g, "_");
  const style = COMPANY_STYLES[key] || `You are a senior technical recruiter at ${profile.company}. Professional, warm, and rigorous.`;

  return `${style}

CANDIDATE: ${profile.name} | ${profile.role} | ${profile.experienceLevel} | Skills: ${profile.skills}
RESUME: ${profile.resumeText ? profile.resumeText.slice(0, 400) : "Not provided"}

ABSOLUTE RULES:
1. Output ONLY spoken words. No JSON, no labels, no markdown.
2. ONE question per message. Wait for candidate response.
3. Address candidate by name occasionally (not every message).
4. NEVER help during their answer — only correct them AFTER.
5. "I don't know" → "That's okay. Walk me through how you'd approach thinking about it."
6. Wrong answer → professionally correct BEFORE moving on.
7. Round transitions: "Great work on the [X] round, ${profile.name}. Let's move into the [Y] round now."
8. For technical questions: read the FULL problem with inputs, constraints, examples.`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseJsonArray<T>(raw: string): T[] {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("["), e = cleaned.lastIndexOf("]");
  if (s < 0 || e <= s) return [];
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return []; }
}

function parseJsonObject<T>(raw: string): Partial<T> {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if (s < 0 || e <= s) return {};
  try { return JSON.parse(cleaned.slice(s, e + 1)); } catch { return {}; }
}

function topN(arr: string[], n: number): string[] {
  const counts: Record<string, number> = {};
  arr.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

const ROUND_DISTRIBUTIONS: Record<string, string> = {
  tcs: "50% technical (DS/OOP/SQL), 20% managerial (team/client), 30% HR",
  infosys: "50% technical, 20% logical reasoning, 30% HR",
  wipro: "55% technical, 15% managerial, 30% HR",
  accenture: "40% technical, 30% communication/case study, 30% HR",
  cognizant: "50% technical, 20% managerial, 30% HR",
  google: "65% DS/Algo + System Design, 35% Googleyness behavioral",
  amazon: "60% DS/Algo + System Design, 40% Leadership Principles (STAR)",
  microsoft: "60% coding + system design, 40% behavioral",
  zoho: "80% deep programming + DS, 20% HR",
  default: "50% technical, 20% managerial, 30% HR",
};

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR — Entry point that manages the full session pipeline
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrchestratorStartResult {
  workflowPlan: any;
  curatedQuestions: CuratedQuestion[];
  welcomeMessage: string;
  questionSources: string[];
  ragCount: number;
  agentLog: string[];
}

/**
 * Generates the Master Orchestrator Workflow Plan JSON based on the candidate's profile.
 */
async function generateWorkflowPlan(profile: CandidateProfile) {
  if (!ai) return { company: profile.company, totalRounds: 1, rounds: [{ roundNumber: 1, roundName: "Technical Round", agent: "Technical Agent", questionCount: profile.numQuestions, difficulty: profile.difficulty }] };

  const prompt = `Generate the Interview Workflow Plan for this candidate:
CANDIDATE: ${profile.name} | ${profile.company} | ${profile.role} | ${profile.experienceLevel}
SKILLS: ${profile.skills}
INTERVIEW TYPE: ${profile.interviewType}
DIFFICULTY: ${profile.difficulty}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.pro,
      contents: prompt,
      config: { systemInstruction: ORCHESTRATOR_AGENT_SYSTEM } as any,
    });
    return parseJsonObject<any>(response.text || "{}");
  } catch (err) {
    console.error("[Orchestrator] failed to generate plan:", err);
    return { company: profile.company, totalRounds: 1, rounds: [{ roundNumber: 1, roundName: "Technical Round", agent: "Technical Agent", questionCount: profile.numQuestions, difficulty: profile.difficulty }] };
  }
}

/**
 * Orchestrator — coordinates the SESSION START pipeline:
 *   generateWorkflowPlan → [Search + RAG] → Curator Agent → Interview Agent
 */
export async function orchestrateSessionStart(
  profile: CandidateProfile
): Promise<OrchestratorStartResult> {
  const agentLog: string[] = [];
  agentLog.push(`[Orchestrator] Session start — ${profile.name} @ ${profile.company} | Models: Pro=Curator/Interview/Evaluator, Flash=FollowUp, text-embedding-004=RAG`);

  // ── Step 0: Master Orchestrator generates the Workflow Plan
  agentLog.push(`[MasterOrchestrator] Generating dynamic multi-round workflow plan for ${profile.company}...`);
  const workflowPlan = await generateWorkflowPlan(profile);
  const totalPlannedQuestions = workflowPlan.rounds?.reduce((acc: number, r: any) => acc + (r.questionCount || 1), 0) || profile.numQuestions;
  agentLog.push(`[MasterOrchestrator] Plan generated: ${workflowPlan.totalRounds || 1} rounds, ~${totalPlannedQuestions} questions.`);

  // ── Step 1+RAG: Search Agent + RAG Agent in PARALLEL ────────────────────────────────
  agentLog.push(`[Orchestrator] Launching Search Agent (Google grounding) + RAG Agent (MongoDB) in parallel...`);

  const ragQuery = `${profile.company} ${profile.role} ${profile.experienceLevel} ${profile.skills} interview ${profile.difficulty}`;

  const [rawFromSearch, rawFromRAG] = await Promise.all([
    searchRealQuestions(profile).catch((err) => {
      console.error("[SearchAgent] error:", err);
      return [] as RawQuestion[];
    }),
    retrieveSimilarQuestions({
      query: ragQuery,
      company: profile.company,
      role: profile.role,
      difficulty: profile.difficulty,
      limit: 12,
      minSimilarity: 0.60,
    }).catch((err) => {
      console.error("[RAGAgent] error:", err);
      return [] as RawQuestion[];
    }),
  ]);

  agentLog.push(`[SearchAgent] Found ${rawFromSearch.length} live questions (gemini-2.5-pro + Google Search).`);
  agentLog.push(`[RAGAgent] Retrieved ${rawFromRAG.length} questions from MongoDB QuestionBank (text-embedding-004).`);

  // Merge + deduplicate (prefer live over RAG, dedup on first 60 chars)
  const seen = new Set<string>();
  const allRaw: RawQuestion[] = [...rawFromSearch, ...rawFromRAG].filter((q) => {
    const key = q.question.slice(0, 60).toLowerCase().replace(/\s/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const questionSources = [...new Set(allRaw.map((q) => q.source).filter(Boolean))];
  agentLog.push(`[Orchestrator] Merged pool: ${allRaw.length} unique questions from ${questionSources.length} sources.`);

  // ── Step 2: Curator Agent (gemini-2.5-pro) ───────────────────────────────────────
  agentLog.push(`[CuratorAgent] Curating questions to map to the ${workflowPlan.rounds?.length || 1}-round Workflow Plan (gemini-2.5-pro)...`);
  const curatedQuestions = await curateQuestions(allRaw, profile, workflowPlan);
  agentLog.push(`[CuratorAgent] Curated ${curatedQuestions.length} questions mapped to rounds: ${[...new Set(curatedQuestions.map(q => q.roundName || q.round))].join(", ")}`);

  // ── Step 3: Interview Agent — Welcome + Q1 ────────────────────────────────
  agentLog.push(`[InterviewAgent] Generating welcome message + first question...`);
  const welcomeMessage = await conductInterview({
    profile,
    question: curatedQuestions[0] || null,
    history: [],
    isFirstQuestion: true,
  });
  agentLog.push(`[InterviewAgent] Welcome message generated (${welcomeMessage.length} chars).`);
  agentLog.push(`[Orchestrator] Session start complete. Pipeline: Search ✓ → Curator ✓ → Interview ✓`);

  return { workflowPlan, curatedQuestions, welcomeMessage, questionSources, ragCount: 0, agentLog };
}

export interface OrchestratorAnswerResult {
  evaluation: EvaluationResult;
  nextQuestion: string | null;
  isCompleted: boolean;
  agentLog: string[];
}

/**
 * Orchestrator — coordinates the ANSWER EVALUATION pipeline:
 * Evaluator Agent → FollowUp Agent (if weak) → Report Agent (if last question)
 *
 * Call this on every candidate answer submission.
 */
export async function orchestrateAnswer(params: {
  profile: CandidateProfile;
  curatedQuestion: CuratedQuestion;
  answer: string;
  history: Array<{ question: string; answer: string }>;
  isLastQuestion: boolean;
  nextCuratedQuestion?: CuratedQuestion | null;
  voiceAnalytics?: VoiceAnalytics;
  mediapipeMetrics?: MediaPipeMetrics;
}): Promise<OrchestratorAnswerResult> {
  const {
    profile, curatedQuestion, answer, history,
    isLastQuestion, nextCuratedQuestion, voiceAnalytics, mediapipeMetrics,
  } = params;
  const agentLog: string[] = [];

  // ── Step 4: Evaluator Agent ───────────────────────────────────────────────
  agentLog.push(`[EvaluatorAgent] Evaluating answer for: "${curatedQuestion.topic}"...`);
  const evaluation = await evaluateAnswerStrict({
    profile, question: curatedQuestion, answer, history,
    isLastQuestion, voiceAnalytics, mediapipeMetrics,
  });
  agentLog.push(`[EvaluatorAgent] Score: ${evaluation.score}/100 | Verdict: ${evaluation.hiringRecommendation} | Relevance: ${evaluation.answerRelevance}/10`);

  if (isLastQuestion) {
    agentLog.push(`[Orchestrator] Last question answered. Routing to Report Agent.`);
    return { evaluation, nextQuestion: null, isCompleted: true, agentLog };
  }

  // ── Step 5: FollowUp Agent decision gate ─────────────────────────────────
  let nextQuestion: string | null = null;

  const needsFollowUp = evaluation.answerRelevance < 6 || evaluation.technicalAccuracy < 45;

  if (needsFollowUp) {
    agentLog.push(`[FollowUpAgent] Weak answer detected (tech=${evaluation.technicalAccuracy}, relevance=${evaluation.answerRelevance}). Generating targeted follow-up...`);
    nextQuestion = await generateFollowUp({ profile, evaluation, curatedQuestion, history });
    agentLog.push(`[FollowUpAgent] Follow-up generated on topic: "${curatedQuestion.topic}".`);
  } else if (evaluation.nextQuestion) {
    // Evaluator already embedded the next question
    nextQuestion = evaluation.nextQuestion;
    agentLog.push(`[Orchestrator] Using Evaluator's generated next question.`);
  } else if (nextCuratedQuestion) {
    // Use Interview Agent to deliver next curated question naturally
    agentLog.push(`[InterviewAgent] Delivering next curated question: "${nextCuratedQuestion.topic}"...`);
    nextQuestion = await conductInterview({
      profile,
      question: nextCuratedQuestion,
      history: [...history.map(h => ({ q: h.question, a: h.answer })), { q: curatedQuestion.question, a: answer }],
      isFirstQuestion: false,
      previousScore: evaluation.score,
    });
    agentLog.push(`[InterviewAgent] Next question delivered.`);
  }

  agentLog.push(`[Orchestrator] Answer cycle complete. Pipeline: Evaluator ✓ → ${needsFollowUp ? "FollowUp ✓" : "Interview ✓"}`);
  return { evaluation, nextQuestion, isCompleted: false, agentLog };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 1: SEARCH AGENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search Agent — uses Gemini with Google Search grounding to find REAL interview
 * questions reported by actual candidates. Falls back to companyQuestions.json.
 */
export async function searchRealQuestions(profile: CandidateProfile): Promise<RawQuestion[]> {
  const jsonKey = profile.company.toLowerCase().replace(/[\s-]/g, "");
  const staticData = (companyQuestions as any)[jsonKey];
  const staticFallback: RawQuestion[] = (staticData?.sampleQuestions || []).map((q: string) => ({
    question: q, source: "InterviewBit", year: "2025",
    type: "technical" as const, topic: "General",
    difficulty: profile.difficulty, isReal: true, companyVerified: true,
  }));

  if (!ai) return staticFallback;

  const skillList = profile.skills.split(",").map((s) => s.trim()).join(", ");
  const prompt = `Retrieve publicly available interview experiences and questions shared by candidates who interviewed at ${profile.company} for the "${profile.role}" role (${profile.experienceLevel} level, skills: ${skillList}).

Search these publicly accessible sources:
1. site:glassdoor.com "${profile.company} interview" ${profile.role} questions ${new Date().getFullYear()}
2. site:geeksforgeeks.org OR site:interviewbit.com "${profile.company}" interview questions ${skillList}
3. site:naukri.com OR site:leetcode.com/discuss "${profile.company}" interview experience ${profile.role} ${new Date().getFullYear()}

Extract 15-20 questions that are publicly documented. For technical questions include inputs/outputs/constraints where publicly stated.
Mark isReal:false for any question you cannot attribute to a specific public source. Return JSON array only per schema.`;


  try {
    const response = await ai.models.generateContent({
      model: MODELS.pro,
      contents: prompt,
      config: { systemInstruction: SEARCH_AGENT_SYSTEM, tools: [{ googleSearch: {} }] } as any,
    });
    const live = parseJsonArray<RawQuestion>(response.text || "[]");
    const merged = [...live, ...staticFallback];
    return merged.length >= 5 ? merged.slice(0, 25) : staticFallback;
  } catch (err) {
    console.error("[SearchAgent] Failed, using static fallback:", err);
    return staticFallback;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 2: CURATOR AGENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Curator Agent — selects and adapts raw questions to candidate profile,
 * applying round distribution and difficulty calibration.
 */
export async function curateQuestions(
  rawQuestions: RawQuestion[],
  profile: CandidateProfile,
  workflowPlan: any
): Promise<CuratedQuestion[]> {
  const companyKey = profile.company.toLowerCase().replace(/[\s-]/g, "");
  const dist = ROUND_DISTRIBUTIONS[companyKey] || ROUND_DISTRIBUTIONS.default;

  if (!ai) return getFallbackCuratedQuestions(profile);

  const prompt = `Raw scraped questions (${rawQuestions.length} items):
${JSON.stringify(rawQuestions.slice(0, 20), null, 2)}

Candidate:
- Company: ${profile.company} | Role: ${profile.role} | Level: ${profile.experienceLevel}
- Skills: ${profile.skills} | Type: ${profile.interviewType} | Difficulty: ${profile.difficulty}
- Resume: ${profile.resumeText ? profile.resumeText.slice(0, 400) : "Not provided"}

MASTER ORCHESTRATOR WORKFLOW PLAN (MANDATORY):
${JSON.stringify(workflowPlan, null, 2)}

Rules:
1. Ensure the total number of questions exactly matches the total questions requested across all rounds in the Workflow Plan.
2. Every technical question must have problem statement + input + output + constraints.
3. No duplicate topics. At least 2 isReal:true questions.
4. Add 4-6 expectedKeywords per question.
5. Assign each question a "roundName" and "roundAgent" exactly matching a round from the Workflow Plan.

Return the JSON array of questions only.`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.pro,
      contents: prompt,
      config: { systemInstruction: CURATOR_AGENT_SYSTEM } as any,
    });
    const curated = parseJsonArray<CuratedQuestion>(response.text || "[]");
    return curated.length >= 3 ? curated.slice(0, profile.numQuestions) : getFallbackCuratedQuestions(profile);
  } catch (err) {
    console.error("[CuratorAgent] Failed, using fallback:", err);
    return getFallbackCuratedQuestions(profile);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3: INTERVIEW AGENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ConductParams {
  profile: CandidateProfile;
  question: CuratedQuestion | null;
  history: Array<{ q: string; a: string }>;
  isFirstQuestion: boolean;
  previousScore?: number;
}

/**
 * Interview Agent — generates spoken recruiter messages with company-specific
 * persona. Warm, professional, adaptive based on candidate's performance.
 */
export async function conductInterview(params: ConductParams): Promise<string> {
  const { profile, question, history, isFirstQuestion, previousScore } = params;
  const historyText = history.map((h, i) => `Q${i + 1}: ${h.q}\nA${i + 1}: ${h.a}`).join("\n\n");

  let userPrompt = "";
  const currentRoundName = question?.roundName || question?.round || "Technical Round";
  
  if (isFirstQuestion && question) {
    userPrompt = `Welcome ${profile.name} warmly to their ${profile.company} ${profile.role} interview. Announce Round 1: ${currentRoundName}. Then ask this question naturally:\n\n${question.question}\n\n(Source: ${question.realSource} — do NOT mention source to candidate.)`;
  } else if (question) {
    userPrompt = `Conversation so far:\n${historyText}\n\nPrevious score: ${previousScore ?? "N/A"}/100.\n\nTransition naturally. If we are moving to a new round, announce the ${currentRoundName}. Then ask:\n\n${question.question}`;
  } else {
    userPrompt = `Conversation:\n${historyText}\n\nGenerate a logical follow-up based on conversation context within the ${currentRoundName}.`;
  }

  if (!ai) {
    return isFirstQuestion && question
      ? `Hello ${profile.name}, welcome to your ${profile.company} interview! Let's begin the ${question.round}. ${question.question}`
      : question?.question ?? "Can you elaborate on your previous answer?";
  }

  try {
    const response = await ai.models.generateContent({
      model: MODELS.pro,
      contents: userPrompt,
      config: { systemInstruction: buildInterviewSystemPrompt(profile) } as any,
    });
    return (response.text || "").trim() || (question?.question ?? "Let's continue. Walk me through your approach.");
  } catch (err) {
    console.error("[InterviewAgent] Failed:", err);
    return question?.question ?? "Let's continue. Can you walk me through your approach?";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 4: EVALUATOR AGENT
// ═══════════════════════════════════════════════════════════════════════════════

interface EvaluateStrictParams {
  profile: CandidateProfile;
  question: CuratedQuestion;
  answer: string;
  history: Array<{ question: string; answer: string }>;
  isLastQuestion: boolean;
  voiceAnalytics?: VoiceAnalytics;
  mediapipeMetrics?: MediaPipeMetrics;
}

const DEFAULT_EVAL: EvaluationResult = {
  score: 20, technicalAccuracy: 15, communication: 30, confidence: 25, fluency: 30,
  grammarScore: 3, clarityScore: 2, problemSolvingScore: 1, answerRelevance: 2,
  eyeContactScore: 7, engagementScore: 6,
  hiringRecommendation: "Reject",
  round: "Technical Round",
  expectedAnswer: "Please provide a complete technical response.",
  strengths: ["Attempted the question"],
  weaknesses: ["Answer was too short or off-topic", "Missing all key technical concepts"],
  suggestions: ["Study the topic in depth", "Practice with concrete examples and code"],
  missingConcepts: ["Core concept", "Time/Space complexity", "Real-world application"],
  expectedKeywords: [],
  coveredKeywords: [],
  improvedAnswer: "Please provide a structured answer: define → explain → example → trade-offs.",
  nextQuestion: null,
};

/**
 * Evaluator Agent — strictly scores answers using the anti-inflation policy
 * and exact weighted formula. Never inflates scores for irrelevant answers.
 */
export async function evaluateAnswerStrict(params: EvaluateStrictParams): Promise<EvaluationResult> {
  const { profile, question, answer, history, isLastQuestion, voiceAnalytics, mediapipeMetrics } = params;

  const wordCount = answer ? answer.trim().split(/\s+/).length : 0;
  if (!answer || wordCount < 5) {
    return { ...DEFAULT_EVAL, nextQuestion: isLastQuestion ? null : "Can you walk me through your thought process?" };
  }

  if (!ai) return DEFAULT_EVAL;

  const historyText = history.length > 0
    ? history.map((h, i) => `Q${i + 1}: ${h.question}\nA${i + 1}: ${h.answer}`).join("\n\n")
    : "No prior questions.";

  const prompt = `CONTEXT:
Company: ${profile.company} | Role: ${profile.role} | Level: ${profile.experienceLevel}
Skills: ${profile.skills} | Difficulty: ${profile.difficulty}

HISTORY:
${historyText}

QUESTION (Source: ${question.realSource}, isReal: ${question.isReal}, Round: ${question.round}):
${question.question}
Topic: ${question.topic} | Expected keywords: ${JSON.stringify(question.expectedKeywords || [])}

ANSWER:
${answer}

VOICE: ${voiceAnalytics ? `${voiceAnalytics.speakingSpeed} WPM, ${voiceAnalytics.duration}s, ${voiceAnalytics.hesitationCount} hesitations` : "N/A"}
MEDIAPIPE: ${mediapipeMetrics ? `eye=${mediapipeMetrics.eyeContactScore}/10, engagement=${mediapipeMetrics.engagementScore}/10` : "default 7.0"}

isLastQuestion: ${isLastQuestion}
${isLastQuestion ? "nextQuestion must be null." : "Generate a targeted follow-up question on the weakest concept identified."}

Apply ANTI-INFLATION POLICY strictly. Use EXACT formula:
score = round((technicalAccuracy*0.35) + (communication*0.20) + (confidence*0.15) + (fluency*0.10) + (answerRelevance*10*0.15) + (problemSolvingScore*10*0.05))

Return raw JSON matching this schema exactly:
{
  "score":number,"technicalAccuracy":number,"communication":number,"confidence":number,"fluency":number,
  "grammarScore":number,"clarityScore":number,"problemSolvingScore":number,"answerRelevance":number,
  "eyeContactScore":number,"engagementScore":number,
  "hiringRecommendation":"Strong Hire"|"Hire"|"Weak Hire"|"Reject",
  "round":string,"expectedAnswer":string,"strengths":string[],"weaknesses":string[],
  "suggestions":string[],"missingConcepts":string[],"expectedKeywords":string[],
  "coveredKeywords":string[],"improvedAnswer":string,"nextQuestion":string|null
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.pro,
      contents: prompt,
      config: { systemInstruction: EVALUATOR_AGENT_SYSTEM, responseMimeType: "application/json" } as any,
    });
    const parsed = parseJsonObject<EvaluationResult>(response.text || "{}");
    if (typeof parsed.score !== "number") return DEFAULT_EVAL;
    return { ...DEFAULT_EVAL, ...parsed };
  } catch (err) {
    console.error("[EvaluatorAgent] Failed:", err);
    return DEFAULT_EVAL;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 5: FOLLOWUP AGENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FollowUpParams {
  profile: CandidateProfile;
  evaluation: EvaluationResult;
  curatedQuestion: CuratedQuestion;
  history: Array<{ question: string; answer: string }>;
}

/**
 * FollowUp Agent — generates a targeted follow-up question when the candidate's
 * answer is weak (answerRelevance < 6 or technicalAccuracy < 45).
 * Routes automatically from Evaluator when score thresholds are not met.
 */
export async function generateFollowUp(params: FollowUpParams): Promise<string> {
  const { profile, evaluation, curatedQuestion, history } = params;

  const fallbackFollowUp = evaluation.answerRelevance < 4
    ? `Let me rephrase that question. ${curatedQuestion.question}`
    : `Let me dig deeper into that. You mentioned ${evaluation.coveredKeywords.join(", ") || "some concepts"} — but could you explain how you would actually implement it in code, step by step?`;

  if (!ai) return fallbackFollowUp;

  const historyText = history
    .slice(-2)
    .map((h, i) => `Q: ${h.question}\nA: ${h.answer}`)
    .join("\n\n");

  const prompt = `CONTEXT: ${profile.company} interview, ${profile.role}, ${profile.experienceLevel}

ORIGINAL QUESTION: ${curatedQuestion.question}
TOPIC: ${curatedQuestion.topic} | ROUND: ${curatedQuestion.round}

EVALUATION RESULTS:
- Overall Score: ${evaluation.score}/100
- Technical Accuracy: ${evaluation.technicalAccuracy}/100
- Answer Relevance: ${evaluation.answerRelevance}/10
- Missing Concepts: ${evaluation.missingConcepts.join(", ")}
- Covered Keywords: ${evaluation.coveredKeywords.join(", ")}
- Weakness: ${evaluation.weaknesses[0] || "insufficient depth"}

RECENT HISTORY:
${historyText}

Generate ONE targeted follow-up question that:
${evaluation.answerRelevance < 4 ? "- Rephrases the SAME question more simply since candidate was off-topic" : ""}
${evaluation.technicalAccuracy < 45 ? "- Probes the exact missing concept: " + (evaluation.missingConcepts[0] || "core understanding") : ""}
${evaluation.score > 70 ? "- Escalates difficulty — ask a harder variant or adjacent advanced concept" : ""}
- Is phrased exactly as a ${profile.company} interviewer would ask it
- Is specific, concrete, with inputs/constraints if technical`;

  try {
    const response = await ai.models.generateContent({
      model: MODELS.flash,
      contents: prompt,
      config: { systemInstruction: FOLLOWUP_AGENT_SYSTEM } as any,
    });
    return (response.text || "").trim() || fallbackFollowUp;
  } catch (err) {
    console.error("[FollowUpAgent] Failed:", err);
    return fallbackFollowUp;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 6: REPORT AGENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Report Agent — aggregates all evaluations into a comprehensive final report.
 * Called by the Orchestrator after the last question is answered.
 */
export function generateSessionReport(params: {
  profile: CandidateProfile;
  evaluations: EvaluationResult[];
  history: Array<{ question: string; answer: string }>;
}): FinalReport {
  const { profile, evaluations, history } = params;

  const avg = (key: keyof EvaluationResult): number =>
    evaluations.length > 0
      ? Math.round(evaluations.reduce((s, e) => s + (Number(e[key]) || 0), 0) / evaluations.length)
      : 0;

  // Weighted final verdict (worst-case anchoring: if any Reject → Reject)
  const verdictPriority = ["Reject", "Weak Hire", "Hire", "Strong Hire"];
  const voteCount: Record<string, number> = {};
  evaluations.forEach((e) => (voteCount[e.hiringRecommendation] = (voteCount[e.hiringRecommendation] || 0) + 1));
  const finalVerdict = (verdictPriority.find((v) => voteCount[v]) as FinalReport["finalVerdict"]) || "Reject";

  const allStrengths = evaluations.flatMap((e) => e.strengths || []);
  const allWeaknesses = evaluations.flatMap((e) => e.weaknesses || []);
  const allMissing = evaluations.flatMap((e) => e.missingConcepts || []);

  const uniqueMissing = [...new Set(allMissing)].slice(0, 5);
  const studyRecommendations = uniqueMissing.map(
    (concept) =>
      `Master "${concept}" — practice 5+ LeetCode/GFG problems and read the ${
        profile.company.toLowerCase() === "amazon" ? "Amazon Leadership Principles guide" : "GeeksForGeeks tutorial"
      } on this topic.`
  );

  return {
    candidateName: profile.name,
    company: profile.company,
    role: profile.role,
    overallScore: avg("score"),
    technicalScore: avg("technicalAccuracy"),
    communicationScore: avg("communication"),
    confidenceScore: avg("confidence"),
    finalVerdict,
    topStrengths: topN(allStrengths, 3),
    topWeaknesses: topN(allWeaknesses, 3),
    topMissingConcepts: topN(allMissing, 3),
    questionBreakdown: history.map((h, i) => ({
      question: h.question,
      answer: h.answer,
      score: evaluations[i]?.score ?? 0,
      round: evaluations[i]?.round ?? "",
      improvedAnswer: evaluations[i]?.improvedAnswer ?? "",
      hiringRecommendation: evaluations[i]?.hiringRecommendation ?? "",
    })),
    studyRecommendations,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FALLBACK QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getFallbackCuratedQuestions(profile: CandidateProfile): CuratedQuestion[] {
  const companyKey = profile.company.toLowerCase().replace(/[\s-]/g, "");
  const staticData = (companyQuestions as any)[companyKey];

  if (staticData?.sampleQuestions?.length) {
    return staticData.sampleQuestions.slice(0, profile.numQuestions).map((q: string, i: number): CuratedQuestion => ({
      question: q,
      round: (i < Math.ceil(profile.numQuestions * 0.6)
        ? "Technical Round"
        : i < Math.ceil(profile.numQuestions * 0.8)
          ? "Managerial Round"
          : "HR Round") as CuratedQuestion["round"],
      topic: "Company-Specific",
      difficulty: profile.difficulty as CuratedQuestion["difficulty"],
      realSource: `InterviewBit — ${profile.company} question bank`,
      isReal: true,
      expectedKeywords: [],
    }));
  }

  return [
    {
      question: `You have an unsorted array: [2, 3, 1, 2, 5, 3]. Find the FIRST element that appears more than once.\nInput: [2, 3, 1, 2, 5, 3]\nOutput: 2\nConstraint: O(N) time, O(N) space. Walk me through your approach using a HashSet.`,
      round: "Technical Round" as const, topic: "Arrays / HashSet", difficulty: "medium" as const,
      realSource: "GeeksForGeeks 2025", isReal: true,
      expectedKeywords: ["HashSet", "O(N)", "contains", "iteration", "first occurrence"],
    },
    {
      question: `Write a SQL query to find the 2nd highest salary from Employee(id, name, salary).\nDo NOT use LIMIT/TOP. Show your full query and explain the logic.`,
      round: "Technical Round" as const, topic: "SQL Subqueries", difficulty: "medium" as const,
      realSource: "InterviewBit 2025", isReal: true,
      expectedKeywords: ["MAX", "subquery", "NOT IN", "nested SELECT", "NULL handling"],
    },
    {
      question: `Tell me about yourself — your education, your most impactful project, and why you want to join ${profile.company} specifically.`,
      round: "HR Round" as const, topic: "Introduction", difficulty: "easy" as const,
      realSource: "Glassdoor 2025", isReal: true,
      expectedKeywords: ["background", "project impact", "skills", "company alignment", "motivation"],
    },
  ].slice(0, profile.numQuestions);
}
