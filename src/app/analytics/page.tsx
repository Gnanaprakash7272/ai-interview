import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Analytics from "@/models/Analytics";
import Interview from "@/models/Interview";
import { ChevronLeft, Download, Award, Target, Activity, MessageSquare } from "lucide-react";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const analytics = await Analytics.findOne({ userId });
  const interviews = await Interview.find({ userId, status: "completed" }).sort({ createdAt: -1 });

  if (!analytics || interviews.length === 0) {
    return (
      <div className="container" style={{ padding: "100px 20px", textAlign: "center" }}>
        <h2>No Analytics Available</h2>
        <p>Complete at least one mock interview to view your analytics.</p>
        <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: "20px" }}>
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate historical trend data for the line chart
  const trendData = interviews.reverse().map((interview, idx) => ({
    name: `Session ${idx + 1}`,
    score: interview.totalScore,
    technical: interview.totalScore, // Approximate for chart
    confidence: interview.confidenceScore
  }));

  // Setup radar data
  const radarData = [
    { subject: 'Technical', A: analytics.technicalScore, fullMark: 100 },
    { subject: 'Communication', A: analytics.communicationScore, fullMark: 100 },
    { subject: 'Confidence', A: analytics.confidenceScore, fullMark: 100 },
    { subject: 'Overall', A: analytics.avgScore, fullMark: 100 },
    { subject: 'Fluency', A: Math.round((analytics.communicationScore + analytics.confidenceScore)/2), fullMark: 100 }
  ];

  return (
    <div className="analytics-page-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>
      
      <header className="page-header no-print">
        <Link href="/dashboard" className="back-link">
          <ChevronLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <div className="header-actions">
          <h1 className="page-title">Performance Analytics</h1>
          {/* We will handle print inside the client component, but can just use a simple button if we make this a client wrapper */}
        </div>
      </header>

      <AnalyticsClient 
        radarData={radarData} 
        trendData={trendData} 
        analytics={JSON.parse(JSON.stringify(analytics))} 
        interviews={JSON.parse(JSON.stringify(interviews))} 
      />

      <style dangerouslySetInnerHTML={{__html: `
        .analytics-page-wrapper {
          padding-top: 40px;
          padding-bottom: 60px;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        .back-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }
        .back-link:hover {
          color: var(--primary);
        }
        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
        }
      `}} />
    </div>
  );
}
