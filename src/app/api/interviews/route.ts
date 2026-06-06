/**
 * POST /api/interviews
 * Starts a new interview session via the Orchestrator:
 *   Orchestrator → Search → Curator → Interview (welcome + Q1)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Response from "@/models/Response";
import { orchestrateSessionStart } from "@/lib/agents";
import type { CandidateProfile } from "@/types/agents";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const {
      domain, difficulty, interviewType, language, questionCount,
      resumeText, jobDescriptionText, targetCompany,
      candidateName, skills, experienceLevel,
    } = await req.json();

    if (!domain || !difficulty) {
      return NextResponse.json({ error: "Job role and difficulty are required" }, { status: 400 });
    }

    const count = parseInt(questionCount) || 3;
    const userId = (session.user as any).id;

    const skillsArray: string[] = Array.isArray(skills)
      ? skills
      : typeof skills === "string" && skills.trim()
        ? skills.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

    const profile: CandidateProfile = {
      name: candidateName || "Candidate",
      company: (targetCompany || "general").toLowerCase(),
      role: domain.replace(/_/g, " "),
      experienceLevel: (experienceLevel || difficulty) as CandidateProfile["experienceLevel"],
      skills: skillsArray.join(", ") || "General",
      resumeText: resumeText || "",
      interviewType: (interviewType || "technical") as CandidateProfile["interviewType"],
      difficulty: (difficulty || "medium") as CandidateProfile["difficulty"],
      numQuestions: count,
      language: language || "en",
    };

    // ── Orchestrator: Search → Curator → Interview ─────────────────────────
    console.log(`[Orchestrator] Initiating pipeline for ${profile.name} @ ${profile.company}`);
    const { workflowPlan, curatedQuestions, welcomeMessage, questionSources, ragCount, agentLog } =
      await orchestrateSessionStart(profile);

    agentLog.forEach((line) => console.log(line));

    // ── Persist interview session ───────────────────────────────────────────
    const newInterview = await Interview.create({
      userId, domain, difficulty,
      interviewType: interviewType || "technical",
      language: language || "en",
      resumeText: resumeText || "",
      jobDescriptionText: jobDescriptionText || "",
      targetCompany: profile.company,
      questionCount: curatedQuestions.length > 0 ? curatedQuestions.length : count,
      currentQuestionIndex: 0,
      status: "pending",
      workflowPlan,
      totalScore: 0, confidenceScore: 0, fluencyScore: 0,
      candidateName: profile.name,
      skills: skillsArray,
      experienceLevel: profile.experienceLevel,
      recommendations: [],
      careerGuidance: {},
      curatedQuestions,
      questionSources,
    });

    // ── Persist first response placeholder ─────────────────────────────────
    const firstResponse = await Response.create({
      interviewId: newInterview._id,
      question: welcomeMessage,
      answer: "",
      score: 0, technicalAccuracy: 0, communication: 0,
      confidence: 0, fluency: 0, grammarScore: 0, clarityScore: 0,
      problemSolvingScore: 0, hiringRecommendation: "Weak Hire",
      round: curatedQuestions[0]?.roundName || curatedQuestions[0]?.round || "Technical Round",
      duration: 0, speakingSpeed: 0, hesitationCount: 0,
      strengths: [], weaknesses: [], suggestions: [], missingConcepts: [],
      expectedAnswer: "", improvedAnswer: "",
    });

    console.log(`[Orchestrator] Session created: ${newInterview._id}. Pipeline: Search ✓ Curator ✓ Interview ✓`);

    return NextResponse.json({
      interview: newInterview,
      firstQuestion: welcomeMessage,
      responseId: firstResponse._id,
      questionSources,
      curatedCount: curatedQuestions.length,
      workflowPlan,
      ragCount,
      models: { curator: "gemini-2.5-pro", interview: "gemini-2.5-pro", evaluator: "gemini-2.5-pro", followup: "gemini-2.5-flash", embeddings: "text-embedding-004" },
      agentPipeline: "Orchestrator → [Search(gemini-2.5-pro) + RAG(text-embedding-004)] → Curator(gemini-2.5-pro) → Interview(gemini-2.5-pro)",
    }, { status: 201 });

  } catch (error: any) {
    console.error("[/api/interviews POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
