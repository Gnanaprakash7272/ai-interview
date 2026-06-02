import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Response from "@/models/Response";
import { generateNextConversationalQuestion } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { 
      domain, 
      difficulty, 
      interviewType, 
      language, 
      questionCount, 
      resumeText, 
      jobDescriptionText,
      targetCompany
    } = await req.json();

    if (!domain || !difficulty) {
      return NextResponse.json({ error: "Job role and difficulty are required" }, { status: 400 });
    }

    const count = parseInt(questionCount) || 3;
    const userId = (session.user as any).id;

    // 1. Create Interview session document with metadata
    const newInterview = await Interview.create({
      userId,
      domain, // Stores Job Role
      difficulty,
      interviewType: interviewType || "technical",
      language: language || "en",
      resumeText: resumeText || "",
      jobDescriptionText: jobDescriptionText || "",
      targetCompany: targetCompany || "general",
      questionCount: count,
      currentQuestionIndex: 0,
      status: "pending",
      totalScore: 0,
      confidenceScore: 0,
      fluencyScore: 0,
      recommendations: [],
      careerGuidance: {}
    });

    // 2. Generate the first recruiter welcome + question dynamically
    const firstQuestion = await generateNextConversationalQuestion(
      domain,
      difficulty,
      interviewType || "technical",
      language || "en",
      [], // No history yet
      resumeText || "",
      jobDescriptionText || "",
      targetCompany || "general"
    );

    // 3. Create the first Response record for the interview
    const firstResponse = await Response.create({
      interviewId: newInterview._id,
      question: firstQuestion,
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

    return NextResponse.json({
      interview: newInterview,
      firstQuestion,
      responseId: firstResponse._id
    }, { status: 201 });
    
  } catch (error: any) {
    console.error("Failed to create interview session:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

