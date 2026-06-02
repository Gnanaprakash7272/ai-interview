"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Info,
  Loader2,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

interface QuestionItem {
  id: string;
  question: string;
  answer: string;
  score: number;
  technicalAccuracy: number;
  communication: number;
  strengths: string[];
  weaknesses: string[];
  improvedAnswer: string;
}

interface InterviewData {
  _id: string;
  domain: string;
  difficulty: string;
  status: string;
  totalScore: number;
  recommendations: string[];
  createdAt: string;
}

function ResultsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("id");
  const { data: session, status: authStatus } = useSession();

  // Redirect if unauthenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [authStatus, router]);

  const [loading, setLoading] = useState(true);
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [activeTabs, setActiveTabs] = useState<Record<string, "eval" | "compare">>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (authStatus !== "authenticated" || !interviewId) return;

    const fetchResults = async () => {
      try {
        const res = await fetch(`/api/interview?id=${interviewId}`);
        if (!res.ok) {
          throw new Error("Failed to load interview results");
        }
        const data = await res.json();
        setInterview(data.interview);
        setQuestions(data.questions);

        // Prepopulate active tabs for each question
        const tabs: Record<string, "eval" | "compare"> = {};
        data.questions.forEach((q: QuestionItem) => {
          tabs[q.id] = "eval";
        });
        setActiveTabs(tabs);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [interviewId, authStatus]);

  const toggleAccordion = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleTabChange = (qId: string, tab: "eval" | "compare") => {
    setActiveTabs((prev) => ({
      ...prev,
      [qId]: tab,
    }));
  };

  if (loading) {
    return (
      <div className="results-loading">
        <Loader2 className="animate-spin" size={40} />
        <p>Retrieving detailed AI feedback metrics...</p>
        <style jsx>{`
          .results-loading {
            min-height: calc(100vh - 70px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: var(--text-muted);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
            color: var(--primary);
          }
        `}</style>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="container results-error-container">
        <div className="glass-card error-card">
          <AlertCircle size={40} className="text-danger" />
          <h2>Evaluation Not Found</h2>
          <p>{error || "We could not retrieve this interview session."}</p>
          <button onClick={() => router.push("/dashboard")} className="btn btn-secondary">
            Return to Dashboard
          </button>
        </div>
        <style jsx>{`
          .results-error-container {
            padding: 80px 24px;
            max-width: 500px;
          }
          .error-card {
            padding: 40px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .text-danger { color: var(--color-danger); }
        `}</style>
      </div>
    );
  }

  // Calculate local averages just in case
  const avgTech = questions.length ? (questions.reduce((acc, q) => acc + q.technicalAccuracy, 0) / questions.length).toFixed(1) : 0;
  const avgComm = questions.length ? (questions.reduce((acc, q) => acc + q.communication, 0) / questions.length).toFixed(1) : 0;

  return (
    <main className="results-container">
      <div className="app-bg-glow"></div>

      <div className="container results-content animate-fade-in">
        {/* Back Link */}
        <div className="results-header-nav">
          <button onClick={() => router.push("/dashboard")} className="btn-back">
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Title Block */}
        <header className="results-header">
          <div className="results-title-info">
            <span className="results-tag">PREPARATION RESULT</span>
            <h1>{interview.domain.replace(/_/g, " ").toUpperCase()} Interview</h1>
            <p className="results-diff-meta">{interview.difficulty} Level • Evaluated on {new Date(interview.createdAt).toLocaleDateString()}</p>
          </div>
          
          <div className="badge-wrapper-score">
            <div className="glass-card score-pill animate-pulse-glow">
              <span className="pill-title">TOTAL SCORE</span>
              <strong className="pill-number">{interview.totalScore}<span>/10</span></strong>
            </div>
          </div>
        </header>

        {/* Aggregate Ratings Grid */}
        <section className="ratings-grid">
          <div className="glass-card rating-detail-card">
            <div className="rating-card-header flex-between">
              <span>Technical Competence</span>
              <span className="rating-badge info">{avgTech}/10</span>
            </div>
            <div className="rating-bar-track">
              <div className="rating-bar-fill info" style={{ width: `${Number(avgTech) * 10}%` }}></div>
            </div>
            <p className="rating-card-desc">Measures the depth and correctness of architectural principles, frameworks, and patterns used.</p>
          </div>

          <div className="glass-card rating-detail-card">
            <div className="rating-card-header flex-between">
              <span>Communication & Logic</span>
              <span className="rating-badge warning">{avgComm}/10</span>
            </div>
            <div className="rating-bar-track">
              <div className="rating-bar-fill warning" style={{ width: `${Number(avgComm) * 10}%` }}></div>
            </div>
            <p className="rating-card-desc">Measures the clarity of terminology, articulation speed, logical structuring, and completeness.</p>
          </div>
        </section>

        {/* Learning Recommendations (Strongest Selling Point) */}
        {interview.recommendations && interview.recommendations.length > 0 && (
          <section className="recs-section">
            <div className="recs-section-header">
              <BookOpen size={20} className="text-purple" />
              <h2>AI Recommended Learning Curriculum</h2>
            </div>
            <div className="recs-grid">
              {interview.recommendations.map((rec, index) => (
                <div key={index} className="glass-card rec-card">
                  <div className="rec-card-icon">
                    <Sparkles size={16} className="text-purple" />
                  </div>
                  <div className="rec-card-body">
                    <h4>{rec}</h4>
                    <p>Revision point targeted directly to fill a knowledge gap detected during this session.</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Question-by-Question Accordion */}
        <section className="breakdown-section">
          <h2>Question Breakdown</h2>
          <div className="breakdown-list">
            {questions.map((q, index) => {
              const isExpanded = expandedIndex === index;
              const activeTab = activeTabs[q.id] || "eval";

              return (
                <div key={q.id} className="glass-card accordion-item">
                  {/* Header */}
                  <div className="accordion-header flex-between" onClick={() => toggleAccordion(index)}>
                    <div className="accordion-title-block">
                      <span className="accordion-q-num">QUESTION {index + 1}</span>
                      <p className="accordion-q-text">{q.question}</p>
                    </div>
                    <div className="accordion-meta-block">
                      <span className={`accordion-score-badge ${q.score >= 8 ? "high" : q.score >= 5 ? "mid" : "low"}`}>
                        {q.score}/10
                      </span>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Body */}
                  {isExpanded && (
                    <div className="accordion-body animate-fade-in">
                      {/* Tabs Navigation */}
                      <div className="accordion-tabs">
                        <button
                          className={`tab-btn ${activeTab === "eval" ? "active" : ""}`}
                          onClick={() => handleTabChange(q.id, "eval")}
                        >
                          <Info size={14} />
                          <span>Evaluation Summary</span>
                        </button>
                        <button
                          className={`tab-btn ${activeTab === "compare" ? "active" : ""}`}
                          onClick={() => handleTabChange(q.id, "compare")}
                        >
                          <HelpCircle size={14} />
                          <span>Side-by-side Comparison</span>
                        </button>
                      </div>

                      {/* Tab Content 1: Evaluation */}
                      {activeTab === "eval" && (
                        <div className="tab-pane-eval">
                          <div className="score-sub-row">
                            <div className="sub-score-item">
                              <span>Technical Accuracy:</span>
                              <strong>{q.technicalAccuracy}/10</strong>
                            </div>
                            <div className="sub-score-item">
                              <span>Communication:</span>
                              <strong>{q.communication}/10</strong>
                            </div>
                          </div>

                          <div className="evaluation-columns">
                            <div className="eval-col col-strengths">
                              <h5 className="flex-align-center text-green">
                                <ThumbsUp size={14} />
                                <span>Strengths</span>
                              </h5>
                              {q.strengths && q.strengths.length > 0 ? (
                                <ul>
                                  {q.strengths.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="no-items-text">No notable strengths recorded.</p>
                              )}
                            </div>

                            <div className="eval-col col-weaknesses">
                              <h5 className="flex-align-center text-warning">
                                <ThumbsDown size={14} />
                                <span>Gaps / Weaknesses</span>
                              </h5>
                              {q.weaknesses && q.weaknesses.length > 0 ? (
                                <ul>
                                  {q.weaknesses.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="no-items-text">No major technical gaps found!</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tab Content 2: Side-by-side comparison */}
                      {activeTab === "compare" && (
                        <div className="tab-pane-compare">
                          <div className="compare-workspace">
                            <div className="compare-box box-user">
                              <h5>Your Answer</h5>
                              <div className="compare-box-content">
                                {q.answer ? q.answer : <span className="no-answer-placeholder">No answer submitted.</span>}
                              </div>
                            </div>

                            <div className="compare-box box-model">
                              <h5>AI Suggested Answer</h5>
                              <div className="compare-box-content glow-border">
                                {q.improvedAnswer}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Back to Dashboard center */}
        <div className="results-footer-nav flex-between">
          <button onClick={() => router.push("/dashboard")} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </div>

      <style jsx>{`
        .results-container {
          min-height: calc(100vh - 70px);
          padding: 40px 0 80px 0;
        }
        .results-content {
          display: flex;
          flex-direction: column;
          gap: 36px;
          max-width: 1000px;
        }
        .results-header-nav {
          display: flex;
        }
        .btn-back {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .btn-back:hover {
          color: var(--text-main);
        }
        
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
          padding-bottom: 24px;
        }
        @media (max-width: 768px) {
          .results-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 20px;
          }
        }
        .results-title-info {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .results-tag {
          font-size: 11px;
          font-weight: 700;
          color: var(--primary);
          letter-spacing: 0.1em;
        }
        .results-header h1 {
          font-size: 32px;
          font-weight: 800;
        }
        .results-diff-meta {
          font-size: 14px;
          color: var(--text-muted);
        }
        .score-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 16px 28px;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .pill-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-bottom: 4px;
        }
        .pill-number {
          font-size: 36px;
          font-weight: 800;
          color: var(--primary-hover);
          line-height: 1;
        }
        .pill-number span {
          font-size: 16px;
          color: var(--text-muted);
          font-weight: 500;
        }
        
        /* Ratings Grid */
        .ratings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .ratings-grid {
            grid-template-columns: 1fr;
          }
        }
        .rating-detail-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .rating-card-header {
          font-size: 16px;
          font-weight: 600;
        }
        .rating-badge {
          font-size: 14px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }
        .rating-badge.info { background: var(--color-info-bg); color: var(--color-info); }
        .rating-badge.warning { background: var(--color-warning-bg); color: var(--color-warning); }
        
        .rating-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(15, 23, 42, 0.05);
          border: 1px solid var(--border);
          border-radius: 999px;
          overflow: hidden;
        }
        .rating-bar-fill {
          height: 100%;
          border-radius: 999px;
        }
        .rating-bar-fill.info { background: var(--color-info); }
        .rating-bar-fill.warning { background: var(--color-warning); }
        .rating-card-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.5;
        }
        
        /* Recommendations section */
        .recs-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .recs-section-header h2 {
          font-size: 20px;
          font-weight: 700;
        }
        .recs-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .recs-grid {
            grid-template-columns: 1fr;
          }
        }
        .rec-card {
          padding: 20px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          background: rgba(139, 92, 246, 0.02);
          border-color: rgba(139, 92, 246, 0.1);
        }
        .rec-card:hover {
          border-color: rgba(139, 92, 246, 0.25);
          background: rgba(139, 92, 246, 0.05);
        }
        .rec-card-icon {
          padding: 8px;
          border-radius: var(--radius-sm);
          background: var(--primary-glow-subtle);
          flex-shrink: 0;
        }
        .rec-card-body h4 {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .rec-card-body p {
          font-size: 12px;
          color: var(--text-muted);
        }
        
        /* Breakdown Section & Accordions */
        .breakdown-section h2 {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 20px;
        }
        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .accordion-item {
          overflow: hidden;
          background: var(--bg-card);
        }
        .accordion-header {
          padding: 20px 28px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .accordion-header:hover {
          background: rgba(15, 23, 42, 0.02);
        }
        .accordion-title-block {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-grow: 1;
          padding-right: 20px;
        }
        .accordion-q-num {
          font-size: 10px;
          font-weight: 700;
          color: var(--primary-hover);
          letter-spacing: 0.1em;
        }
        .accordion-q-text {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.4;
        }
        .accordion-meta-block {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .accordion-score-badge {
          font-size: 14px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
        }
        .accordion-score-badge.high { background: var(--color-success-bg); color: var(--color-success); }
        .accordion-score-badge.mid { background: var(--color-warning-bg); color: var(--color-warning); }
        .accordion-score-badge.low { background: var(--color-danger-bg); color: var(--color-danger); }
        
        .accordion-body {
          border-top: 1px solid var(--border);
          padding: 24px 28px;
          background: rgba(15, 23, 42, 0.02);
        }
        
        /* Accordion tabs */
        .accordion-tabs {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          color: var(--text-main);
          background: rgba(15, 23, 42, 0.03);
        }
        .tab-btn.active {
          color: var(--primary-hover);
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }
        
        /* Evaluation Panel styling */
        .score-sub-row {
          display: flex;
          gap: 24px;
          margin-bottom: 20px;
        }
        .sub-score-item {
          display: flex;
          align-items: baseline;
          gap: 8px;
          font-size: 14px;
          color: var(--text-muted);
        }
        .sub-score-item strong {
          font-size: 16px;
          color: var(--text-main);
        }
        
        .evaluation-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .evaluation-columns {
            grid-template-columns: 1fr;
          }
        }
        .eval-col h5 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }
        .flex-align-center {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .eval-col ul {
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 14px;
          color: var(--text-muted);
        }
        .eval-col li {
          line-height: 1.5;
        }
        .no-items-text {
          font-size: 13px;
          color: var(--text-dark);
          font-style: italic;
        }
        
        /* Compare panel styling */
        .compare-workspace {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 768px) {
          .compare-workspace {
            grid-template-columns: 1fr;
          }
        }
        .compare-box h5 {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-muted);
          margin-bottom: 10px;
        }
        .compare-box-content {
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 16px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-main);
          min-height: 180px;
          white-space: pre-line;
        }
        .compare-box-content.glow-border {
          border-color: rgba(139, 92, 246, 0.2);
          background: rgba(139, 92, 246, 0.02);
        }
        .no-answer-placeholder {
          color: var(--text-dark);
          font-style: italic;
        }
        
        .results-footer-nav {
          border-top: 1px solid var(--border);
          padding-top: 24px;
        }
      `}</style>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="results-loading">
        <Loader2 className="animate-spin" size={40} />
        <p>Loading result parameters...</p>
        <style jsx>{`
          .results-loading {
            min-height: calc(100vh - 70px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            color: var(--text-muted);
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .animate-spin {
            animation: spin 1s linear infinite;
            color: var(--primary);
          }
        `}</style>
      </div>
    }>
      <ResultsPageContent />
    </Suspense>
  );
}
