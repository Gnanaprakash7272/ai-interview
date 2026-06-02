import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Response from "@/models/Response";
import Analytics from "@/models/Analytics";
import { evaluateAnswer, generateNextConversationalQuestion, generateCareerGuidance, generateGeneralRecommendations } from "@/lib/gemini";

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

    const { responseId, answer, duration, speakingSpeed, hesitationCount } = await req.json();

    if (!responseId || answer === undefined) {
      return NextResponse.json({ error: "Response ID and answer are required" }, { status: 400 });
    }

    const currentResponse = await Response.findById(responseId);
    if (!currentResponse || currentResponse.interviewId.toString() !== interviewId) {
      return NextResponse.json({ error: "Response record invalid" }, { status: 404 });
    }

    // 1. Grade the current answer with Gemini and Voice metrics
    const evaluation = await evaluateAnswer(
      currentResponse.question,
      answer,
      duration || 0,
      speakingSpeed || 0,
      hesitationCount || 0,
      interview.language
    );

    // Save evaluation to response document
    currentResponse.answer = answer;
    currentResponse.score = evaluation.score;
    currentResponse.technicalAccuracy = evaluation.technicalAccuracy;
    currentResponse.communication = evaluation.communication;
    currentResponse.confidence = evaluation.confidence;
    currentResponse.fluency = evaluation.fluency;
    currentResponse.duration = duration || 0;
    currentResponse.speakingSpeed = speakingSpeed || 0;
    currentResponse.hesitationCount = hesitationCount || 0;
    currentResponse.strengths = evaluation.strengths;
    currentResponse.weaknesses = evaluation.weaknesses;
    currentResponse.missingConcepts = evaluation.missingConcepts;
    currentResponse.improvedAnswer = evaluation.improvedAnswer;
    await currentResponse.save();

    // 2. Fetch all completed responses so far for history compilation
    const completedResponses = await Response.find({ 
      interviewId, 
      answer: { $ne: "" } 
    }).sort({ createdAt: 1 });

    const totalAnsweredCount = completedResponses.length;

    // 3. Determine if the interview has reached the question limit
    if (totalAnsweredCount >= interview.questionCount) {
      // Interview complete: compile final aggregate scores
      let scoreSum = 0;
      let techSum = 0;
      let commSum = 0;
      let confSum = 0;
      let flueSum = 0;

      completedResponses.forEach(r => {
        scoreSum += r.score;
        techSum += r.technicalAccuracy;
        commSum += r.communication;
        confSum += r.confidence;
        flueSum += r.fluency;
      });

      const avgScore = Math.round(scoreSum / totalAnsweredCount);
      const avgTech = Math.round(techSum / totalAnsweredCount);
      const avgComm = Math.round(commSum / totalAnsweredCount);
      const avgConf = Math.round(confSum / totalAnsweredCount);
      const avgFlue = Math.round(flueSum / totalAnsweredCount);

      // Generate Career guidance roadmaps & suggested certifications
      const historySummary = completedResponses.map(r => ({
        question: r.question,
        answer: r.answer,
        weaknesses: r.weaknesses,
        missingConcepts: r.missingConcepts
      }));

      const guidance = await generateCareerGuidance(
        interview.domain,
        interview.difficulty,
        avgScore,
        historySummary
      );

      // Update Interview session details
      interview.status = "completed";
      interview.totalScore = avgScore;
      interview.confidenceScore = avgConf;
      interview.fluencyScore = avgFlue;
      interview.careerGuidance = guidance;
      
      // Calculate and save advice recommendations
      const simplifiedHistory = completedResponses.map(r => ({
        domain: interview.domain,
        difficulty: interview.difficulty,
        totalScore: r.score
      }));
      interview.recommendations = await generateGeneralRecommendations(simplifiedHistory);
      await interview.save();

      // Recalculate global User Analytics
      const userId = (session.user as any).id;
      const allUserInterviews = await Interview.find({ userId, status: "completed" });
      const completedCount = allUserInterviews.length;

      let globalScoreSum = 0;
      allUserInterviews.forEach(item => {
        globalScoreSum += item.totalScore;
      });

      const globalAvgScore = completedCount > 0 ? Math.round(globalScoreSum / completedCount) : 0;

      // Update user statistics
      await Analytics.findOneAndUpdate(
        { userId },
        {
          userId,
          avgScore: globalAvgScore,
          technicalScore: avgTech,
          communicationScore: avgComm,
          confidenceScore: avgConf,
          recommendations: interview.recommendations
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({
        isCompleted: true,
        redirectUrl: `/interviews/${interviewId}/feedback`
      });

    } else {
      // Interview incomplete: Generate the next dynamic question
      const conversationHistory = completedResponses.map(r => ({
        question: r.question,
        answer: r.answer
      }));

      const nextQuestionText = await generateNextConversationalQuestion(
        interview.domain,
        interview.difficulty,
        interview.interviewType,
        interview.language,
        conversationHistory,
        interview.resumeText,
        interview.jobDescriptionText,
        interview.targetCompany || "general"
      );

      // Create new pending Response document for the next question
      const nextResponse = await Response.create({
        interviewId,
        question: nextQuestionText,
        answer: "",
        score: 0,
        technicalAccuracy: 0,
        communication: 0,
        confidence: 0,
        fluency: 0,
        duration: 0,
        speakingSpeed: 0,
        hesitationCount: 0,
        strengths: [],
        weaknesses: [],
        missingConcepts: [],
        improvedAnswer: ""
      });

      // Update interview current index
      interview.currentQuestionIndex = totalAnsweredCount;
      await interview.save();

      return NextResponse.json({
        isCompleted: false,
        nextQuestion: nextQuestionText,
        nextResponseId: nextResponse._id
      });
    }

  } catch (error: any) {
    console.error("Failed to submit dynamic answer:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
