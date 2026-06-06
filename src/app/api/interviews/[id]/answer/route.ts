/**
 * POST /api/interviews/[id]/answer
 * Processes one candidate answer via the Orchestrator:
 *   Orchestrator → Evaluator → FollowUp (if weak) → Report (if last)
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Response from "@/models/Response";
import Analytics from "@/models/Analytics";
import { orchestrateAnswer, generateSessionReport } from "@/lib/agents";
import { generateCareerGuidance, generateGeneralRecommendations } from "@/lib/gemini";
import type { CandidateProfile, CuratedQuestion, VoiceAnalytics, MediaPipeMetrics } from "@/types/agents";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: interviewId } = await params;
    await dbConnect();

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return NextResponse.json({ error: "Interview session not found" }, { status: 404 });
    }

    const {
      responseId, answer, duration, speakingSpeed, hesitationCount,
      forceEnd, eyeContactScore, engagementScore,
    } = await req.json();

    if (!responseId || answer === undefined) {
      return NextResponse.json({ error: "Response ID and answer are required" }, { status: 400 });
    }

    const currentResponse = await Response.findById(responseId);
    if (!currentResponse || currentResponse.interviewId.toString() !== interviewId) {
      return NextResponse.json({ error: "Response record invalid" }, { status: 404 });
    }

    // ── Build context ────────────────────────────────────────────────────────
    const pastResponses = await Response.find({
      interviewId,
      answer: { $ne: "" },
    }).sort({ createdAt: 1 });

    const isLastQuestion = (pastResponses.length + 1) >= interview.questionCount || forceEnd;

    const history = pastResponses.map((r: any) => ({
      question: r.question,
      answer: r.answer,
    }));

    // ── Retrieve curated question for this position ──────────────────────────
    const curatedList: CuratedQuestion[] = Array.isArray(interview.curatedQuestions)
      ? interview.curatedQuestions
      : [];

    const curatedQuestion: CuratedQuestion = curatedList[pastResponses.length] || {
      question: currentResponse.question,
      round: "Technical Round",
      topic: "General",
      difficulty: interview.difficulty || "medium",
      realSource: "Session",
      isReal: false,
      expectedKeywords: [],
    };

    const nextCuratedQuestion: CuratedQuestion | null =
      !isLastQuestion && curatedList[pastResponses.length + 1]
        ? curatedList[pastResponses.length + 1]
        : null;

    // ── Build candidate profile ──────────────────────────────────────────────
    const profile: CandidateProfile = {
      name: interview.candidateName || "Candidate",
      company: interview.targetCompany || "general",
      role: (interview.jobRole || interview.domain || "software_developer").replace(/_/g, " "),
      experienceLevel: (interview.experienceLevel || interview.difficulty || "fresher") as CandidateProfile["experienceLevel"],
      skills: Array.isArray(interview.skills)
        ? interview.skills.join(", ")
        : (interview.skills || "General"),
      resumeText: interview.resumeText || "",
      interviewType: (interview.interviewType || "technical") as CandidateProfile["interviewType"],
      difficulty: (interview.difficulty || "medium") as CandidateProfile["difficulty"],
      numQuestions: interview.questionCount || 3,
      language: interview.language || "en",
    };

    const voiceAnalytics: VoiceAnalytics = {
      speakingSpeed: speakingSpeed || 0,
      duration: duration || 0,
      hesitationCount: hesitationCount || 0,
    };

    const mediapipeMetrics: MediaPipeMetrics | undefined =
      eyeContactScore !== undefined
        ? { eyeContactScore: eyeContactScore || 7, engagementScore: engagementScore || 7, headStabilityScore: 7, faceVisibilityScore: 8 }
        : undefined;

    // ── Orchestrator: Evaluator → FollowUp → (Report if last) ───────────────
    console.log(`[Orchestrator] Processing answer ${pastResponses.length + 1}/${interview.questionCount} for session ${interviewId}`);
    const { evaluation, nextQuestion, isCompleted, agentLog } = await orchestrateAnswer({
      profile, curatedQuestion, answer, history,
      isLastQuestion, nextCuratedQuestion, voiceAnalytics, mediapipeMetrics,
    });
    agentLog.forEach((line: string) => console.log(line));

    // ── Persist evaluation to response document ──────────────────────────────
    currentResponse.answer = answer;
    currentResponse.score = evaluation.score;
    currentResponse.technicalAccuracy = evaluation.technicalAccuracy;
    currentResponse.communication = evaluation.communication;
    currentResponse.confidence = evaluation.confidence;
    currentResponse.fluency = evaluation.fluency;
    currentResponse.duration = duration || 0;
    currentResponse.speakingSpeed = speakingSpeed || 0;
    currentResponse.hesitationCount = hesitationCount || 0;
    currentResponse.grammarScore = evaluation.grammarScore || 0;
    currentResponse.clarityScore = evaluation.clarityScore || 0;
    currentResponse.problemSolvingScore = evaluation.problemSolvingScore || 0;
    currentResponse.hiringRecommendation = evaluation.hiringRecommendation || "Weak Hire";
    currentResponse.round = evaluation.round || "Technical Round";
    currentResponse.expectedAnswer = evaluation.expectedAnswer || "";
    currentResponse.strengths = evaluation.strengths;
    currentResponse.weaknesses = evaluation.weaknesses;
    currentResponse.missingConcepts = evaluation.missingConcepts;
    currentResponse.suggestions = evaluation.suggestions || [];
    currentResponse.improvedAnswer = evaluation.improvedAnswer;
    await currentResponse.save();

    const completedResponses = [...pastResponses, currentResponse];
    const totalAnsweredCount = completedResponses.length;

    // ── If last question: Run Report Agent + finalize session ────────────────
    if (isCompleted) {
      let scoreSum = 0, techSum = 0, commSum = 0, confSum = 0, flueSum = 0;
      completedResponses.forEach((r: any) => {
        scoreSum += r.score; techSum += r.technicalAccuracy;
        commSum += r.communication; confSum += r.confidence; flueSum += r.fluency;
      });

      const avgScore = Math.round(scoreSum / totalAnsweredCount);
      const avgTech  = Math.round(techSum  / totalAnsweredCount);
      const avgComm  = Math.round(commSum  / totalAnsweredCount);
      const avgConf  = Math.round(confSum  / totalAnsweredCount);
      const avgFlue  = Math.round(flueSum  / totalAnsweredCount);

      // Report Agent — generate final session report (logged, not persisted separately)
      const evaluationResults = completedResponses.map((r: any) => ({
        score: r.score, technicalAccuracy: r.technicalAccuracy,
        communication: r.communication, confidence: r.confidence,
        fluency: r.fluency, grammarScore: r.grammarScore || 0,
        clarityScore: r.clarityScore || 0, problemSolvingScore: r.problemSolvingScore || 0,
        answerRelevance: r.answerRelevance || 5, eyeContactScore: r.eyeContactScore || 7,
        engagementScore: r.engagementScore || 7,
        hiringRecommendation: r.hiringRecommendation || "Weak Hire",
        round: r.round || "Technical Round", expectedAnswer: r.expectedAnswer || "",
        strengths: r.strengths || [], weaknesses: r.weaknesses || [],
        suggestions: r.suggestions || [], missingConcepts: r.missingConcepts || [],
        expectedKeywords: r.expectedKeywords || [], coveredKeywords: r.coveredKeywords || [],
        improvedAnswer: r.improvedAnswer || "", nextQuestion: null,
      }));
      const fullReport = generateSessionReport({
        profile,
        evaluations: evaluationResults,
        history: completedResponses.map((r: any) => ({ question: r.question, answer: r.answer })),
      });
      console.log(`[ReportAgent] Final verdict: ${fullReport.finalVerdict} | Overall: ${fullReport.overallScore}/100`);

      // Career guidance
      const historySummary = completedResponses.map((r: any) => ({
        question: r.question, answer: r.answer,
        weaknesses: r.weaknesses, missingConcepts: r.missingConcepts,
      }));
      const guidance = await generateCareerGuidance(interview.domain, interview.difficulty, avgScore, historySummary);

      // Finalize interview
      interview.status = "completed";
      interview.totalScore = avgScore;
      interview.confidenceScore = avgConf;
      interview.fluencyScore = avgFlue;
      interview.careerGuidance = guidance;
      interview.overallHiringRecommendation = fullReport.finalVerdict;

      const simplifiedHistory = completedResponses.map((r: any) => ({
        domain: interview.domain, difficulty: interview.difficulty, totalScore: r.score,
      }));
      interview.recommendations = await generateGeneralRecommendations(simplifiedHistory);
      await interview.save();

      // Update analytics
      const userId = (session.user as any).id;
      const allUserInterviews = await Interview.find({ userId, status: "completed" });
      const completedCount = allUserInterviews.length;
      const globalAvgScore = completedCount > 0
        ? Math.round(allUserInterviews.reduce((s: number, item: any) => s + item.totalScore, 0) / completedCount)
        : 0;

      await Analytics.findOneAndUpdate(
        { userId },
        { userId, avgScore: globalAvgScore, technicalScore: avgTech, communicationScore: avgComm, confidenceScore: avgConf, recommendations: interview.recommendations },
        { upsert: true, new: true }
      );

      console.log(`[Orchestrator] Session ${interviewId} complete. Pipeline: Evaluator ✓ → Report ✓`);
      return NextResponse.json({ isCompleted: true, redirectUrl: `/interviews/${interviewId}/completed` });
    }

    // ── Not last: persist next question ─────────────────────────────────────
    const nextQuestionText = nextQuestion
      || (interview.language === "ta"
        ? "நீங்கள் கூறியது புரிகிறது. இதன் தொழில்நுட்ப பயன்பாடு மற்றும் சவால்கள் பற்றி விரிவாக கூற முடியுமா?"
        : "Interesting. Can you expand on the design choices, trade-offs, and challenges you faced?");

    const nextResponse = await Response.create({
      interviewId,
      question: nextQuestionText,
      answer: "", score: 0, technicalAccuracy: 0, communication: 0,
      confidence: 0, fluency: 0, duration: 0, speakingSpeed: 0, hesitationCount: 0,
      grammarScore: 0, clarityScore: 0, problemSolvingScore: 0,
      hiringRecommendation: "Weak Hire",
      round: nextCuratedQuestion?.round || "Technical Round",
      strengths: [], weaknesses: [], suggestions: [], missingConcepts: [],
      improvedAnswer: "",
    });

    interview.currentQuestionIndex = totalAnsweredCount;
    await interview.save();

    console.log(`[Orchestrator] Next question set for session ${interviewId}.`);
    return NextResponse.json({
      isCompleted: false,
      nextQuestion: nextQuestionText,
      nextResponseId: nextResponse._id,
      evaluation: {
        score: evaluation.score,
        hiringRecommendation: evaluation.hiringRecommendation,
        strengths: evaluation.strengths.slice(0, 2),
        weaknesses: evaluation.weaknesses.slice(0, 2),
      },
    });

  } catch (error: any) {
    console.error("[/api/interviews/[id]/answer POST]", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
