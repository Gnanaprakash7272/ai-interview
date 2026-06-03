"use client";

import React, { use } from "react";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, Home } from "lucide-react";

export default function InterviewCompletedPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);

  return (
    <div className="completed-page-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>
      
      <div className="completed-content">
        <div className="success-circle animate-scale-in">
          <Check size={48} className="success-check-icon" />
        </div>
        
        <h1 className="completed-title">Thank you for taking the interview!</h1>
        
        <p className="completed-subtitle">
          We appreciate your time and effort. Your responses<br />
          have been recorded successfully.
        </p>
        
        <p className="completed-instruction">
          You can now view your detailed AI feedback report or return to the dashboard.
        </p>

        <div className="completed-actions">
          <button 
            onClick={() => router.push(`/interviews/${interviewId}/feedback`)}
            className="btn btn-primary completed-btn pulse-glow"
          >
            <span>View Detailed AI Feedback</span>
            <ArrowRight size={18} />
          </button>

          <button 
            onClick={() => router.push(`/dashboard`)}
            className="btn btn-secondary completed-btn"
          >
            <Home size={18} />
            <span>Go to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
