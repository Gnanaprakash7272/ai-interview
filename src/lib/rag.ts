/**
 * @file rag.ts
 * @description RAG (Retrieval Augmented Generation) module for the MNC Interview Simulator.
 *
 * Uses Gemini text-embedding-004 to generate 768-dim embeddings for interview questions.
 * Stores questions in MongoDB QuestionBank collection.
 * Retrieves semantically similar questions using cosine similarity (no Atlas required).
 *
 * Self-improving loop:
 *   Session ends → store answered questions → next candidate gets better questions
 */

import { GoogleGenAI } from "@google/genai";
import dbConnect from "@/lib/mongodb";
import QuestionBank from "@/models/QuestionBank";
import type { RawQuestion } from "@/types/agents";

// ─── Gemini Embedding Client ───────────────────────────────────────────────────

let embeddingClient: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;
if (apiKey && apiKey.trim() !== "" && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
  try {
    embeddingClient = new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("[RAG] Failed to init embedding client:", e);
  }
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const EMBEDDING_MODEL = "text-embedding-004"; // 768-dim, multilingual
const EMBEDDING_DIM = 768;
const MAX_CANDIDATES = 300; // pre-filter before cosine similarity

// ─── Core: Text → Embedding Vector ────────────────────────────────────────────

/**
 * Embeds a text string using Gemini text-embedding-004.
 * Returns a 768-dimensional float array, or null if embedding fails.
 */
export async function embedText(text: string): Promise<number[] | null> {
  if (!embeddingClient || !text.trim()) return null;

  try {
    const result = await embeddingClient.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text.slice(0, 2048), // text-embedding-004 limit
    });
    return (result as any).embeddings?.[0]?.values ?? null;
  } catch (err) {
    console.error("[RAG] Embedding failed:", err);
    return null;
  }
}

/**
 * Cosine similarity between two vectors (0.0 – 1.0).
 * Returns 0 if either vector is zero or lengths differ.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── Store: Upsert question + embedding into MongoDB ──────────────────────────

export interface StoreQuestionInput {
  question: string;
  company: string;
  role: string;
  topic: string;
  round: "Technical Round" | "HR Round" | "Managerial Round" | "System Design Round";
  difficulty: "easy" | "medium" | "hard";
  source?: string;
  year?: string;
  isReal?: boolean;
  companyVerified?: boolean;
  expectedKeywords?: string[];
  /** The correct model answer — NEVER the candidate's raw answer */
  modelAnswer?: string;
  /** Who stored this: 'seed' = initial seed, 'evaluator' = from Evaluator Agent output */
  storedBy?: "seed" | "evaluator" | "admin";
}

/**
 * Stores a question + model answer in the MongoDB QuestionBank with its embedding vector.
 * Skips if the exact question already exists (upsert by question text).
 *
 * IMPORTANT: modelAnswer must be the Evaluator Agent's correct answer.
 * NEVER pass a candidate's raw answer here.
 */
export async function storeQuestion(input: StoreQuestionInput): Promise<boolean> {
  try {
    await dbConnect();

    // Check if already exists
    const exists = await QuestionBank.exists({ question: input.question });
    if (exists) return false;

    // Generate embedding using question + company + topic for richer semantic search
    const embeddingText = `${input.company} ${input.role} ${input.topic} ${input.round} ${input.question}`;
    const embedding = await embedText(embeddingText);

    await QuestionBank.create({
      ...input,
      embedding: embedding || [],
      source: input.source || "System",
      year: input.year || "2025",
      isReal: input.isReal ?? true,
      companyVerified: input.companyVerified ?? false,
      expectedKeywords: input.expectedKeywords || [],
      modelAnswer: input.modelAnswer || "",
      storedBy: input.storedBy || "seed",
    });

    return true;
  } catch (err) {
    console.error("[RAG] storeQuestion failed:", err);
    return false;
  }
}


// ─── Retrieve: Semantic similarity search ─────────────────────────────────────

export interface RAGRetrieveParams {
  query: string;            // Free-text query (e.g., "TCS Java OOP polymorphism question")
  company: string;
  role?: string;
  difficulty?: "easy" | "medium" | "hard";
  round?: string;
  limit?: number;           // How many results to return (default: 10)
  minSimilarity?: number;   // Minimum cosine similarity threshold (default: 0.65)
}

/**
 * Retrieves semantically similar questions from MongoDB using cosine similarity.
 * 
 * Steps:
 * 1. Embed the query using text-embedding-004
 * 2. Pre-filter MongoDB by company + role + difficulty (fast indexed query)
 * 3. Compute cosine similarity in Node.js against all candidate vectors
 * 4. Return top-K results above minSimilarity threshold
 */
export async function retrieveSimilarQuestions(
  params: RAGRetrieveParams
): Promise<RawQuestion[]> {
  const {
    query, company, role, difficulty, round,
    limit = 10, minSimilarity = 0.60,
  } = params;

  try {
    await dbConnect();

    // Step 1: Embed the query
    const queryEmbedding = await embedText(query);
    if (!queryEmbedding) {
      console.warn("[RAG] Could not embed query, falling back to keyword search.");
      return await keywordFallback(company, role, difficulty, limit);
    }

    // Step 2: Pre-filter candidates from MongoDB (fetch embeddings)
    const filter: Record<string, any> = {
      company: { $regex: new RegExp(company, "i") },
      isApproved: true,
    };
    if (role) filter.role = { $regex: new RegExp(role.slice(0, 30), "i") };
    if (difficulty) filter.difficulty = difficulty;
    if (round) filter.round = round;

    const candidates = await QuestionBank
      .find(filter)
      .select("+embedding question source year topic round difficulty isReal companyVerified expectedKeywords")
      .limit(MAX_CANDIDATES)
      .lean();

    if (candidates.length === 0) {
      console.warn(`[RAG] No candidates in DB for company="${company}". Seed the question bank first.`);
      return [];
    }

    // Step 3: Cosine similarity ranking
    const scored = candidates
      .filter((c: any) => c.embedding && c.embedding.length === EMBEDDING_DIM)
      .map((c: any) => ({
        doc: c,
        score: cosineSimilarity(queryEmbedding, c.embedding),
      }))
      .filter((r) => r.score >= minSimilarity)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(`[RAG] Retrieved ${scored.length} questions (from ${candidates.length} candidates) for "${company}" with similarity >= ${minSimilarity}`);

    // Step 4: Map to RawQuestion[]
    return scored.map(({ doc, score }) => ({
      question: (doc as any).question,
      source: `RAG/${(doc as any).source || "QuestionBank"} (similarity: ${(score * 100).toFixed(0)}%)`,
      year: (doc as any).year || "2025",
      type: ((doc as any).round?.toLowerCase().includes("hr") ? "hr"
        : (doc as any).round?.toLowerCase().includes("system") ? "system_design"
          : (doc as any).round?.toLowerCase().includes("managerial") ? "managerial"
            : "technical") as RawQuestion["type"],
      topic: (doc as any).topic || "General",
      difficulty: ((doc as any).difficulty || "medium") as RawQuestion["difficulty"],
      isReal: (doc as any).isReal ?? true,
      companyVerified: (doc as any).companyVerified ?? false,
    }));

  } catch (err) {
    console.error("[RAG] retrieveSimilarQuestions failed:", err);
    return [];
  }
}

/**
 * Keyword fallback: simple MongoDB text query when embedding unavailable.
 */
async function keywordFallback(
  company: string,
  role?: string,
  difficulty?: string,
  limit = 10
): Promise<RawQuestion[]> {
  try {
    await dbConnect();
    const filter: Record<string, any> = {
      company: { $regex: new RegExp(company, "i") },
      isApproved: true,
    };
    if (difficulty) filter.difficulty = difficulty;

    const docs = await QuestionBank.find(filter).limit(limit).lean();
    return docs.map((doc: any) => ({
      question: doc.question,
      source: `QuestionBank/${doc.source}`,
      year: doc.year || "2025",
      type: "technical" as const,
      topic: doc.topic || "General",
      difficulty: (doc.difficulty || "medium") as RawQuestion["difficulty"],
      isReal: doc.isReal ?? true,
      companyVerified: doc.companyVerified ?? false,
    }));
  } catch (err) {
    return [];
  }
}

// ─── Batch Store: Seed the question bank ──────────────────────────────────────

export interface BatchSeedResult {
  total: number;
  stored: number;
  skipped: number;
  failed: number;
  timeMs: number;
}

/**
 * Batch-stores an array of questions with a small delay between each
 * to respect Gemini embedding API rate limits (250 RPM for free tier).
 */
export async function batchSeedQuestions(
  questions: StoreQuestionInput[],
  delayMs = 250
): Promise<BatchSeedResult> {
  const result: BatchSeedResult = {
    total: questions.length,
    stored: 0, skipped: 0, failed: 0, timeMs: 0,
  };
  const start = Date.now();

  for (const q of questions) {
    try {
      const stored = await storeQuestion(q);
      if (stored) result.stored++;
      else result.skipped++;
    } catch {
      result.failed++;
    }
    if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  result.timeMs = Date.now() - start;
  return result;
}

// ─── Update: Track question usage after session ───────────────────────────────

/**
 * After a session ends, update usage stats for questions that were asked.
 * Updates avgCandidateScore as a running average.
 */
export async function trackQuestionUsage(
  questionTexts: string[],
  scores: number[]
): Promise<void> {
  try {
    await dbConnect();
    for (let i = 0; i < questionTexts.length; i++) {
      const q = await QuestionBank.findOne({ question: questionTexts[i] });
      if (!q) continue;
      const oldAvg = q.avgCandidateScore || 0;
      const oldCount = q.usageCount || 0;
      q.usageCount = oldCount + 1;
      q.avgCandidateScore = Math.round(((oldAvg * oldCount) + (scores[i] || 0)) / q.usageCount);
      await q.save();
    }
  } catch (err) {
    console.error("[RAG] trackQuestionUsage failed:", err);
  }
}
