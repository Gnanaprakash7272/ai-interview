import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Analytics from "@/models/Analytics";
import Interview from "@/models/Interview";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    await dbConnect();

    // 1. Get consolidated analytics document
    let userAnalytics = await Analytics.findOne({ userId });

    // 2. Get history of completed interviews for visual charts
    const completedInterviews = await Interview.find({ 
      userId, 
      status: "completed" 
    }).sort({ createdAt: 1 }); // Sort chronologically

    // If no analytics record exists yet, return default placeholder template
    if (!userAnalytics) {
      userAnalytics = {
        userId,
        avgScore: 0,
        technicalScore: 0,
        communicationScore: 0,
        confidenceScore: 0,
        recommendations: [
          "Select a domain and complete your first mock interview to get customized insights.",
          "Familiarize yourself with the dashboard resources to maximize your preparation.",
          "Prepare to answer with deep technical explanations, code structures, and trade-off analysis."
        ]
      };
    }

    return NextResponse.json({
      analytics: userAnalytics,
      history: completedInterviews
    });

  } catch (error: any) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
