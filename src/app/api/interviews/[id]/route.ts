import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Response from "@/models/Response";
import Analytics from "@/models/Analytics";
import { evaluateAnswer, generateGeneralRecommendations } from "@/lib/gemini";

// GET: Retrieve interview details and all responses/questions
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    // Security: Check if user owns this session
    if (interview.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const responses = await Response.find({ interviewId: id }).sort({ createdAt: 1 });

    return NextResponse.json({ interview, responses });
  } catch (error: any) {
    console.error("Failed to fetch interview details:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST: Submit completed interview answers for AI evaluation
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const interview = await Interview.findById(id);
    if (!interview) {
      return NextResponse.json({ error: "Interview not found" }, { status: 404 });
    }

    if (interview.userId.toString() !== (session.user as any).id) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    if (interview.status === "completed") {
      return NextResponse.json({ error: "Interview already evaluated" }, { status: 400 });
    }

    const { answers } = await req.json(); // Array of { responseId: string, answer: string }
    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Answers must be a valid array" }, { status: 400 });
    }

    let totalScoreSum = 0;
    let totalTechSum = 0;
    let totalCommSum = 0;
    const count = answers.length;

    // Hiring recommendation score tally
    const hiringScores: Record<string, number> = {
      "Strong Hire": 0,
      "Hire": 0,
      "Weak Hire": 0,
      "Reject": 0
    };

    // Evaluate each answer with full candidate context
    const evaluationPromises = answers.map(async (ans) => {
      const responseDoc = await Response.findById(ans.responseId);
      if (!responseDoc || responseDoc.interviewId.toString() !== id) {
        return;
      }

      // Grade the answer with candidate context for personalization
      const feedback = await evaluateAnswer(
        responseDoc.question,
        ans.answer,
        ans.duration || 60, // default duration
        ans.speakingSpeed || 130, // default speaking speed (WPM)
        ans.hesitationCount || 0, // default hesitation count
        interview.language || "en",
        interview.domain,
        interview.experienceLevel || interview.difficulty,
        interview.skills || [],
        undefined,
        undefined,
        undefined,
        ans.mediaPipeMetrics
      );

      // Save all evaluation fields to response doc
      responseDoc.answer = ans.answer;
      responseDoc.score = feedback.score;
      responseDoc.technicalAccuracy = feedback.technicalAccuracy;
      responseDoc.communication = feedback.communication;
      responseDoc.confidence = feedback.confidence;
      responseDoc.fluency = feedback.fluency;
      responseDoc.grammarScore = feedback.grammarScore;
      responseDoc.clarityScore = feedback.clarityScore;
      responseDoc.problemSolvingScore = feedback.problemSolvingScore;
      responseDoc.hiringRecommendation = feedback.hiringRecommendation;
      responseDoc.round = feedback.round;
      responseDoc.expectedAnswer = feedback.expectedAnswer;
      responseDoc.answerRelevance = feedback.answerRelevance;
      responseDoc.expectedKeywords = feedback.expectedKeywords;
      responseDoc.coveredKeywords = feedback.coveredKeywords;
      responseDoc.strengths = feedback.strengths;
      responseDoc.weaknesses = feedback.weaknesses;
      responseDoc.suggestions = feedback.suggestions || [];
      responseDoc.missingConcepts = feedback.missingConcepts;
      responseDoc.improvedAnswer = feedback.improvedAnswer;
      responseDoc.eyeContactScore = feedback.eyeContactScore;
      responseDoc.engagementScore = feedback.engagementScore;
      await responseDoc.save();

      totalScoreSum += feedback.score;
      totalTechSum += feedback.technicalAccuracy;
      totalCommSum += feedback.communication;

      // Tally hiring recommendations
      if (feedback.hiringRecommendation in hiringScores) {
        hiringScores[feedback.hiringRecommendation]++;
      }
    });

    await Promise.all(evaluationPromises);

    const avgScore = count > 0 ? Math.round(totalScoreSum / count) : 0;
    const avgTech = count > 0 ? Math.round(totalTechSum / count) : 0;
    const avgComm = count > 0 ? Math.round(totalCommSum / count) : 0;

    // Determine overall session hiring recommendation (majority vote)
    let overallHiringRec: string = "Weak Hire";
    if (avgScore >= 85) overallHiringRec = "Strong Hire";
    else if (avgScore >= 70) overallHiringRec = "Hire";
    else if (avgScore >= 55) overallHiringRec = "Weak Hire";
    else overallHiringRec = "Reject";

    // 1. Update Interview status
    interview.status = "completed";
    interview.totalScore = avgScore;
    interview.overallHiringRecommendation = overallHiringRec;
    await interview.save();

    // 2. Fetch all completed interviews for the user to recalculate Analytics
    const userId = (session.user as any).id;
    const completedInterviews = await Interview.find({ userId, status: "completed" });

    // Aggregate statistics
    const interviewCount = completedInterviews.length;
    let allScoreSum = 0;
    completedInterviews.forEach((item) => {
      allScoreSum += item.totalScore;
    });

    const userAvgScore = interviewCount > 0 ? Math.round(allScoreSum / interviewCount) : 0;

    // Get average technical accuracy and communication across all completed interviews
    const completedInterviewIds = completedInterviews.map((item) => item._id);
    const allResponses = await Response.find({
      interviewId: { $in: completedInterviewIds }
    });

    let overallTechSum = 0;
    let overallCommSum = 0;
    let responseCount = 0;

    allResponses.forEach((res) => {
      if (res.answer) {
        overallTechSum += res.technicalAccuracy;
        overallCommSum += res.communication;
        responseCount++;
      }
    });

    const userAvgTech = responseCount > 0 ? Math.round(overallTechSum / responseCount) : 0;
    const userAvgComm = responseCount > 0 ? Math.round(overallCommSum / responseCount) : 0;
    
    // Confidence score based on communication and some consistency factor
    const userAvgConfidence = Math.round(userAvgComm * 0.95); 

    // Generate smart recommendations based on history
    const historyList = completedInterviews.map((item) => ({
      domain: item.domain,
      difficulty: item.difficulty,
      totalScore: item.totalScore
    }));
    const customRecs = await generateGeneralRecommendations(historyList);

    // 3. Save to Analytics collection
    await Analytics.findOneAndUpdate(
      { userId },
      {
        userId,
        avgScore: userAvgScore,
        technicalScore: userAvgTech,
        communicationScore: userAvgComm,
        confidenceScore: userAvgConfidence,
        recommendations: customRecs
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: "Evaluation completed",
      totalScore: avgScore,
      technicalScore: avgTech,
      communicationScore: avgComm,
      overallHiringRecommendation: overallHiringRec
    });

  } catch (error: any) {
    console.error("Failed to submit answers for evaluation:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
