/**
 * POST /api/rag/store
 * Self-improving RAG loop — stores KNOWLEDGE from completed interview sessions
 * into the MongoDB QuestionBank.
 *
 * CRITICAL RULE: We NEVER store the candidate's raw answer (which may be wrong).
 * We ONLY store the verified knowledge:
 *   - question (the asked question)
 *   - expectedAnswer (from the Evaluator Agent — the correct model answer)
 *   - expectedKeywords (verified correct terms)
 *   - topic, round, difficulty, company (metadata)
 *
 * This keeps the RAG knowledge base clean, accurate, and useful for future retrieval.
 * Wrong answers contaminating the knowledge base would degrade retrieval quality.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { storeQuestion, trackQuestionUsage } from "@/lib/rag";
import type { StoreQuestionInput } from "@/lib/rag";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { company, role, questions } = await req.json();
    /**
     * Expected shape per question item:
     * {
     *   question: string,          ← the question text
     *   topic: string,
     *   round: string,
     *   difficulty: string,
     *   score: number,             ← candidate's score (for tracking only)
     *   expectedAnswer: string,    ← Evaluator's model answer (stored, NOT candidate answer)
     *   expectedKeywords: string[], ← Evaluator's verified keywords
     *   improvedAnswer: string,    ← Evaluator's improved version (stored as model answer)
     *   hiringRecommendation: string,
     * }
     * NOTE: candidateAnswer is intentionally NOT accepted here — never stored.
     */

    if (!company || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "company and questions[] are required" }, { status: 400 });
    }

    let stored = 0, skipped = 0, rejectedLowQuality = 0;
    const questionTexts: string[] = [];
    const scores: number[] = [];

    for (const q of questions) {
      if (!q.question) continue;

      // Track all question usage (including low-score ones) for analytics
      questionTexts.push(q.question);
      scores.push(q.score || 0);

      // Quality gate: only add to knowledge base if we have a valid model answer.
      // We refuse to pollute the KB with questions that have no verified expected answer.
      const modelAnswer = (q.improvedAnswer || q.expectedAnswer || "").trim();
      const hasKeywords = Array.isArray(q.expectedKeywords) && q.expectedKeywords.length >= 2;

      if (!modelAnswer || !hasKeywords) {
        rejectedLowQuality++;
        continue; // skip — no verified answer to store
      }

      const input: StoreQuestionInput = {
        question: q.question,
        company: company.toLowerCase(),
        role: role || "Software Engineer",
        topic: q.topic || "General",
        round: q.round || "Technical Round",
        difficulty: q.difficulty || "medium",
        source: "Evaluator Agent",  // sourced from our own Evaluator, not user answer
        year: new Date().getFullYear().toString(),
        isReal: true,
        companyVerified: false,
        expectedKeywords: q.expectedKeywords || [],
        // Store the Evaluator's model answer — NOT the candidate's answer
        modelAnswer,
      };

      const ok = await storeQuestion(input);
      if (ok) stored++;
      else skipped++;
    }

    // Update usage stats (score tracking only — no answer data needed here)
    if (questionTexts.length > 0) {
      await trackQuestionUsage(questionTexts, scores);
    }

    return NextResponse.json({
      success: true,
      stored,
      skipped,
      rejectedLowQuality,
      note: "Only Evaluator-verified model answers are stored. Candidate answers are never persisted in the knowledge base.",
    });

  } catch (error: any) {
    console.error("[/api/rag/store]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
