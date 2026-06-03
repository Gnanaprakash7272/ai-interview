"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle, ArrowLeft, Loader2, 
  RefreshCw, Star, Info, MessageSquareCode, Award, Compass, BookOpen, Clock, BarChart2,
  ThumbsUp, ThumbsDown, Lightbulb, Target, FileCheck, Briefcase
} from "lucide-react";

interface ResponseFeedback {
  _id: string;
  question: string;
  answer: string;
  score: number;
  technicalAccuracy: number;
  communication: number;
  confidence: number;
  fluency: number;
  // New sub-scores
  grammarScore: number;
  clarityScore: number;
  problemSolvingScore: number;
  // Verdict fields
  hiringRecommendation: "Strong Hire" | "Hire" | "Weak Hire" | "Reject";
  round: string;
  expectedAnswer: string;
  // Voice metrics
  duration: number;
  speakingSpeed: number;
  hesitationCount: number;
  // Qualitative
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingConcepts: string[];
  improvedAnswer: string;
}

interface HiringBadgeConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
  emoji: string;
  desc: string;
}

const HIRING_CONFIG: Record<string, HiringBadgeConfig> = {
  "Strong Hire": {
    label: "Strong Hire",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.1)",
    border: "rgba(5, 150, 105, 0.3)",
    emoji: "🌟",
    desc: "Exceptional performance. Highly recommended for the role."
  },
  "Hire": {
    label: "Hire",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.1)",
    border: "rgba(37, 99, 235, 0.3)",
    emoji: "✅",
    desc: "Good performance with minor gaps. Recommended for the role."
  },
  "Weak Hire": {
    label: "Weak Hire",
    color: "#d97706",
    bg: "rgba(217, 119, 6, 0.1)",
    border: "rgba(217, 119, 6, 0.3)",
    emoji: "⚠️",
    desc: "Average performance. Conditional hire with coaching recommended."
  },
  "Reject": {
    label: "Reject",
    color: "#dc2626",
    bg: "rgba(220, 38, 38, 0.1)",
    border: "rgba(220, 38, 38, 0.3)",
    emoji: "❌",
    desc: "Significant gaps in knowledge and communication. Not recommended."
  }
};

export default function InterviewFeedback({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);

  const [interview, setInterview] = useState<any>(null);
  const [responses, setResponses] = useState<ResponseFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFeedback() {
      try {
        const res = await fetch(`/api/interviews/${interviewId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load evaluation");
        }

        setInterview(data.interview);
        setResponses(data.responses);
        
        if (data.responses && data.responses.length > 0) {
          setExpandedResponse(data.responses[0]._id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load feedback details");
      } finally {
        setLoading(false);
      }
    }
    fetchFeedback();
  }, [interviewId]);

  const toggleExpand = (id: string) => {
    setExpandedResponse((prev) => (prev === id ? null : id));
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 80) return "score-high";
    if (score >= 60) return "score-mid";
    return "score-low";
  };

  if (loading) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="loading-card glass-card">
          <Loader2 className="animate-spin primary-color" size={40} />
          <p>Compiling AI evaluation report and career roadmap...</p>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .loading-card { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
          .animate-spin { animation: spin 1.2s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="glass-card error-card">
          <h2>Evaluation Not Found</h2>
          <p>{error}</p>
          <Link href="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .error-card { padding: 40px; text-align: center; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        `}</style>
      </div>
    );
  }

  // Calculate Averages
  const totalScore = interview?.totalScore || 0;
  const avgTech = Math.round(responses.reduce((sum, r) => sum + r.technicalAccuracy, 0) / responses.length) || 0;
  const avgComm = Math.round(responses.reduce((sum, r) => sum + r.communication, 0) / responses.length) || 0;
  const avgConf = Math.round(responses.reduce((sum, r) => sum + (r.confidence || 0), 0) / responses.length) || 0;
  const avgFlue = Math.round(responses.reduce((sum, r) => sum + (r.fluency || 0), 0) / responses.length) || 0;
  const avgGrammar = parseFloat((responses.reduce((sum, r) => sum + (r.grammarScore || 0), 0) / responses.length).toFixed(1)) || 0;
  const avgClarity = parseFloat((responses.reduce((sum, r) => sum + (r.clarityScore || 0), 0) / responses.length).toFixed(1)) || 0;
  const avgProblem = parseFloat((responses.reduce((sum, r) => sum + (r.problemSolvingScore || 0), 0) / responses.length).toFixed(1)) || 0;

  // Voice metrics
  const avgDuration = Math.round(responses.reduce((sum, r) => sum + (r.duration || 0), 0) / responses.length) || 0;
  const avgWpm = Math.round(responses.reduce((sum, r) => sum + (r.speakingSpeed || 0), 0) / responses.length) || 0;
  const totalHesitations = responses.reduce((sum, r) => sum + (r.hesitationCount || 0), 0);

  // Overall hiring recommendation from interview doc, fallback to computing from responses
  const overallHiring: string = interview?.overallHiringRecommendation ||
    (totalScore >= 85 ? "Strong Hire" : totalScore >= 70 ? "Hire" : totalScore >= 55 ? "Weak Hire" : "Reject");
  const hiringConfig = HIRING_CONFIG[overallHiring] || HIRING_CONFIG["Weak Hire"];

  // SVG ring
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (totalScore / 100) * circumference;

  const careerGuidance = interview?.careerGuidance || {};

  return (
    <div className="feedback-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      {/* Navigation */}
      <header className="feedback-header">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <div className="header-meta">
          <h1>AI Recruiter Feedback</h1>
          <p>
            Detailed performance scorecard for your <span className="highlight-text">{interview?.domain?.replace(/_/g, " ")}</span> session
            {interview?.candidateName && interview.candidateName !== "Candidate" && (
              <> — <span className="highlight-text">{interview.candidateName}</span></>
            )}
          </p>
        </div>
      </header>

      {/* ─── HIRING RECOMMENDATION BANNER ─── */}
      <section
        className="hiring-banner animate-fade-in"
        style={{
          background: hiringConfig.bg,
          border: `1px solid ${hiringConfig.border}`,
        }}
      >
        <div className="hiring-left">
          <div className="hiring-emoji">{hiringConfig.emoji}</div>
          <div className="hiring-text">
            <span className="hiring-label" style={{ color: hiringConfig.color }}>
              AI Verdict: {hiringConfig.label}
            </span>
            <p className="hiring-desc">{hiringConfig.desc}</p>
          </div>
        </div>
        <div className="hiring-score-badge" style={{ color: hiringConfig.color, borderColor: hiringConfig.border }}>
          <span className="hiring-score-num">{totalScore}%</span>
          <span className="hiring-score-label">Overall Score</span>
        </div>
      </section>

      {/* Candidate Profile Summary (if set) */}
      {interview?.candidateName && interview.candidateName !== "Candidate" && (
        <section className="candidate-summary glass-card">
          <div className="candidate-summary-row">
            <div className="cand-item">
              <Briefcase size={14} className="primary-color" />
              <span className="cand-label">Role:</span>
              <span className="cand-value">{interview?.domain?.replace(/_/g, " ")}</span>
            </div>
            {interview?.experienceLevel && (
              <div className="cand-item">
                <Star size={14} className="primary-color" />
                <span className="cand-label">Level:</span>
                <span className="cand-value cand-capitalize">{interview.experienceLevel.replace(/_/g, " ")}</span>
              </div>
            )}
            {interview?.skills && interview.skills.length > 0 && (
              <div className="cand-item cand-skills">
                <Target size={14} className="primary-color" />
                <span className="cand-label">Skills:</span>
                <div className="skill-chips">
                  {interview.skills.slice(0, 6).map((skill: string, i: number) => (
                    <span key={i} className="skill-chip">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Overview Block */}
      <section className="overview-row">
        {/* Progress ring card */}
        <div className="glass-card score-ring-card">
          <div className="ring-container">
            <svg width="150" height="150" className="progress-ring">
              <circle
                className="progress-ring-bg"
                stroke="rgba(15, 23, 42, 0.06)"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx="75"
                cy="75"
              />
              <circle
                className="progress-ring-fill"
                stroke="var(--primary)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="75"
                cy="75"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="ring-text-box">
              <span className="ring-number">{totalScore}%</span>
              <span className="ring-label">Overall</span>
            </div>
          </div>
          <div className="ring-meta">
            <h3>Recruiter Verdict</h3>
            <p>
              Your responses scored an overall {totalScore}%. {totalScore >= 80 ? "Excellent command of technical concepts and high clarity." : totalScore >= 60 ? "Solid base with minor gaps in depth and fluency." : "Significant gaps in conceptual definitions. Practice more mock tests."}
            </p>
          </div>
        </div>

        {/* Breakdown scores card */}
        <div className="glass-card breakdown-card">
          <h3>Evaluation Breakdown</h3>
          <p>Core dimensions scored across all responses</p>
          
          <div className="breakdown-stack">
            <div className="breakdown-item">
              <div className="breakdown-item-labels">
                <span className="dimension-name">Technical Accuracy</span>
                <span className="dimension-score">{avgTech}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill tech-fill" style={{ width: `${avgTech}%` }}></div>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-item-labels">
                <span className="dimension-name">Communication</span>
                <span className="dimension-score">{avgComm}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill comm-fill" style={{ width: `${avgComm}%` }}></div>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-item-labels">
                <span className="dimension-name">Confidence</span>
                <span className="dimension-score">{avgConf}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill conf-fill" style={{ width: `${avgConf}%` }}></div>
              </div>
            </div>

            <div className="breakdown-item">
              <div className="breakdown-item-labels">
                <span className="dimension-name">Fluency</span>
                <span className="dimension-score">{avgFlue}%</span>
              </div>
              <div className="progress-bar-track">
                <div className="progress-bar-fill flue-fill" style={{ width: `${avgFlue}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEW: Granular Sub-Score Panel (0-10) ─── */}
      <section className="sub-scores-panel glass-card">
        <h3>Granular Interview Scores <span className="sub-score-scale">(out of 10)</span></h3>
        <p className="sub-desc">Detailed dimension scoring computed per answer by the AI evaluator</p>
        <div className="sub-score-trio">
          <div className="sub-score-item">
            <div className="sub-score-circle" style={{ "--pct": `${(avgGrammar / 10) * 100}%` } as any}>
              <span className="sub-score-val">{avgGrammar}</span>
              <span className="sub-score-unit">/10</span>
            </div>
            <p>Grammar Score</p>
          </div>
          <div className="sub-score-item">
            <div className="sub-score-circle" style={{ "--pct": `${(avgClarity / 10) * 100}%` } as any}>
              <span className="sub-score-val">{avgClarity}</span>
              <span className="sub-score-unit">/10</span>
            </div>
            <p>Clarity Score</p>
          </div>
          <div className="sub-score-item">
            <div className="sub-score-circle" style={{ "--pct": `${(avgProblem / 10) * 100}%` } as any}>
              <span className="sub-score-val">{avgProblem}</span>
              <span className="sub-score-unit">/10</span>
            </div>
            <p>Problem Solving</p>
          </div>
        </div>
      </section>

      {/* Voice Analytics */}
      <section className="speech-metrics-row glass-card">
        <h3>Voice Analytics</h3>
        <p className="metrics-intro">Speaking speed, duration, and filler hesitations measured during the session.</p>
        
        <div className="metrics-grid">
          <div className="metric-box">
            <Clock size={20} className="primary-color" />
            <div className="metric-info">
              <h4>Avg. Response Time</h4>
              <p>{avgDuration} Seconds</p>
            </div>
          </div>

          <div className="metric-box">
            <BarChart2 size={20} className="info-color" />
            <div className="metric-info">
              <h4>Speaking Speed</h4>
              <p>{avgWpm} WPM</p>
            </div>
          </div>

          <div className="metric-box">
            <AlertTriangle size={20} className="warning-color" />
            <div className="metric-info">
              <h4>Total Filler Words</h4>
              <p>{totalHesitations} Fillers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion Questions Audit */}
      <section className="audit-section">
        <h2>Detailed Question-by-Question Audit</h2>
        <p className="section-desc">Click each question to review AI evaluation, expected answers, and personalized suggestions.</p>
        
        <div className="audit-list">
          {responses.map((resDoc, idx) => {
            const isExpanded = expandedResponse === resDoc._id;
            const qHiring = resDoc.hiringRecommendation || "Weak Hire";
            const qConfig = HIRING_CONFIG[qHiring] || HIRING_CONFIG["Weak Hire"];
            return (
              <div key={resDoc._id} className="audit-item-wrapper glass-card">
                {/* Accordion Trigger */}
                <button 
                  onClick={() => toggleExpand(resDoc._id)} 
                  className={`audit-trigger ${isExpanded ? "active" : ""}`}
                >
                  <div className="trigger-left">
                    <span className="question-number-badge">Q{idx + 1}</span>
                    {resDoc.round && (
                      <span className="round-badge">{resDoc.round}</span>
                    )}
                    <span className="trigger-question-text">{resDoc.question}</span>
                  </div>
                  <div className="trigger-right">
                    <span 
                      className="q-hiring-badge"
                      style={{ background: qConfig.bg, color: qConfig.color, border: `1px solid ${qConfig.border}` }}
                    >
                      {qConfig.emoji} {qConfig.label}
                    </span>
                    <span className={`trigger-score-badge ${getScoreColorClass(resDoc.score)}`}>
                      {resDoc.score}%
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="audit-details animate-fade-in">
                    
                    {/* Voice stats */}
                    <div className="response-voice-row">
                      <span>Speaking Speed: <strong>{resDoc.speakingSpeed} WPM</strong></span>
                      <span>Duration: <strong>{resDoc.duration} Seconds</strong></span>
                      <span>Hesitations: <strong>{resDoc.hesitationCount}</strong></span>
                    </div>

                    {/* Sub Scores Row (0-100 + 0-10) */}
                    <div className="sub-scores-row">
                      <div className="sub-score-badge">
                        <span>Technical:</span>
                        <strong className="primary-color">{resDoc.technicalAccuracy}%</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Communication:</span>
                        <strong className="info-color">{resDoc.communication}%</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Confidence:</span>
                        <strong className="warning-color">{resDoc.confidence || 0}%</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Fluency:</span>
                        <strong className="success-color">{resDoc.fluency || 0}%</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Grammar:</span>
                        <strong className="primary-color">{resDoc.grammarScore || 0}/10</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Clarity:</span>
                        <strong className="info-color">{resDoc.clarityScore || 0}/10</strong>
                      </div>
                      <div className="sub-score-badge">
                        <span>Problem Solving:</span>
                        <strong className="success-color">{resDoc.problemSolvingScore || 0}/10</strong>
                      </div>
                    </div>

                    {/* ─── Realistic Chat Transcript ─── */}
                    <div className="chat-transcript-container">
                      
                      {/* Recruiter Question Bubble */}
                      <div className="chat-bubble recruiter-bubble">
                        <div className="bubble-header">
                          <Bot size={14} />
                          <span>AI Recruiter</span>
                        </div>
                        <div className="bubble-body">
                          {resDoc.question}
                        </div>
                      </div>

                      {/* Candidate Answer Bubble */}
                      <div className="chat-bubble candidate-bubble">
                        <div className="bubble-header">
                          <User size={14} />
                          <span>You (Candidate)</span>
                        </div>
                        <div className="bubble-body">
                          {resDoc.answer || <em style={{ opacity: 0.6 }}>No verbal response recorded.</em>}
                        </div>
                      </div>

                      {/* AI Direct Coaching Feedback Bubble */}
                      <div className="chat-bubble coach-bubble">
                        <div className="bubble-header">
                          <MessageSquareCode size={14} />
                          <span>Direct AI Coaching</span>
                        </div>
                        <div className="bubble-body">
                          {resDoc.improvedAnswer}
                        </div>
                        {resDoc.expectedAnswer && (
                          <div className="ideal-reference">
                            <strong>Expert Reference:</strong> {resDoc.expectedAnswer}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Analysis Grid: Strengths + Weaknesses + Suggestions */}
                    <div className="analysis-grid-3">
                      <div className="analysis-box strengths-box">
                        <div className="box-title">
                          <CheckCircle size={16} className="success-color" />
                          <h5>Strengths</h5>
                        </div>
                        <ul>
                          {(resDoc.strengths || []).map((str, sIdx) => (
                            <li key={sIdx}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-box weaknesses-box">
                        <div className="box-title">
                          <AlertTriangle size={16} className="warning-color" />
                          <h5>Areas to Improve</h5>
                        </div>
                        <ul>
                          {(resDoc.weaknesses || []).map((weak, wIdx) => (
                            <li key={wIdx}>{weak}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-box suggestions-box">
                        <div className="box-title">
                          <Lightbulb size={16} className="primary-color" />
                          <h5>Suggestions</h5>
                        </div>
                        <ul>
                          {(resDoc.suggestions && resDoc.suggestions.length > 0
                            ? resDoc.suggestions
                            : ["Structure your answer: Define → Explain → Example → Trade-offs.", "Practice speaking answers aloud to improve fluency."]
                          ).map((sug, sgIdx) => (
                            <li key={sgIdx}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Missing Concepts */}
                    {resDoc.missingConcepts && resDoc.missingConcepts.length > 0 && (
                      <div className="missing-concepts-panel">
                        <div className="box-title">
                          <Info size={14} className="info-color" />
                          <h5>Missing Critical Concepts</h5>
                        </div>
                        <div className="concepts-list">
                          {resDoc.missingConcepts.map((concept, cIdx) => (
                            <span key={cIdx} className="concept-chip">{concept}</span>
                          ))}
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

      {/* AI Career Advice Roadmap */}
      {careerGuidance && careerGuidance.skillsToLearn && (
        <section className="career-guidance-section glass-card">
          <div className="guidance-header">
            <Compass size={24} className="primary-color" />
            <h2>AI Career Guidance Advisor</h2>
          </div>
          <p className="guidance-desc">Custom study roadmap created based on your performance gaps.</p>
          
          <div className="guidance-grid-main">
            <div className="guidance-left-col">
              <div className="guidance-card-content">
                <h4>Skills To Study</h4>
                <ul>
                  {careerGuidance.skillsToLearn.map((skill: string, sIdx: number) => (
                    <li key={sIdx}>{skill}</li>
                  ))}
                </ul>
              </div>

              <div className="guidance-card-content">
                <h4>Weak Topics to Improve</h4>
                <ul>
                  {careerGuidance.weakTopicsToImprove.map((topic: string, tIdx: number) => (
                    <li key={tIdx}>{topic}</li>
                  ))}
                </ul>
              </div>

              <div className="guidance-card-content certs-card">
                <h4>Suggested Certifications</h4>
                <div className="certs-list">
                  {careerGuidance.recommendedCertifications.map((cert: string, cIdx: number) => (
                    <span key={cIdx} className="cert-badge">
                      <Award size={13} />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="guidance-right-col">
              <h4>Learning Roadmap</h4>
              <div className="roadmap-timeline">
                {careerGuidance.learningRoadmap.map((step: string, sIdx: number) => (
                  <div key={sIdx} className="timeline-node">
                    <div className="node-number">{sIdx + 1}</div>
                    <div className="node-text">
                      <p>{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Footer */}
      <footer className="feedback-cta">
        <Link href="/interviews/new" className="btn btn-primary animate-pulse-glow">
          <RefreshCw size={16} />
          <span>Start Another Mock Interview</span>
        </Link>
      </footer>

      <style jsx>{`
        .feedback-wrapper {
          padding-top: 30px;
          padding-bottom: 80px;
          max-width: 1080px !important;
        }

        .feedback-header {
          margin-bottom: 28px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 20px;
          transition: color 0.2s ease;
        }

        .back-link:hover { color: var(--text-main); }

        .header-meta h1 {
          font-size: 32px;
          margin-bottom: 6px;
        }

        .highlight-text {
          color: var(--primary-hover);
          text-transform: capitalize;
        }

        /* ─── Hiring Banner ─── */
        .hiring-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 24px 28px;
          border-radius: var(--radius-lg);
          margin-bottom: 20px;
          animation: fadeSlideIn 0.5s ease-out;
        }

        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hiring-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .hiring-emoji {
          font-size: 36px;
          line-height: 1;
        }

        .hiring-label {
          display: block;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.01em;
          margin-bottom: 4px;
        }

        .hiring-desc {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .hiring-score-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 2px solid;
          border-radius: var(--radius-md);
          padding: 12px 24px;
          flex-shrink: 0;
        }

        .hiring-score-num {
          font-size: 32px;
          font-weight: 900;
          line-height: 1;
        }

        .hiring-score-label {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          opacity: 0.7;
          margin-top: 2px;
        }

        @media (max-width: 600px) {
          .hiring-banner { flex-direction: column; text-align: center; }
          .hiring-left { flex-direction: column; }
        }

        /* ─── Candidate Summary ─── */
        .candidate-summary {
          padding: 16px 22px;
          margin-bottom: 24px;
        }

        .candidate-summary-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          align-items: center;
        }

        .cand-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
        }

        .cand-label {
          font-weight: 600;
          color: var(--text-muted);
        }

        .cand-value {
          color: var(--text-main);
          font-weight: 500;
        }

        .cand-capitalize { text-transform: capitalize; }

        .cand-skills { flex-wrap: wrap; }

        .skill-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .skill-chip {
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: var(--primary-hover);
          padding: 2px 10px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
        }

        /* Overview Row */
        .overview-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        @media (max-width: 768px) {
          .overview-row { grid-template-columns: 1fr; }
        }

        .score-ring-card {
          padding: 30px;
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .ring-container {
          position: relative;
          width: 150px;
          height: 150px;
          flex-shrink: 0;
        }

        .progress-ring-fill {
          transition: stroke-dashoffset 1s ease-in-out;
          filter: drop-shadow(0 0 8px var(--primary-glow));
        }

        .ring-text-box {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .ring-number {
          font-size: 30px;
          font-weight: 800;
          color: var(--text-main);
        }

        .ring-label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-dark);
          letter-spacing: 0.05em;
        }

        .ring-meta h3 { font-size: 18px; margin-bottom: 8px; }
        .ring-meta p { font-size: 13px; line-height: 1.5; }

        .breakdown-card {
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .breakdown-card h3 { font-size: 18px; margin-bottom: 6px; }
        .breakdown-card p { font-size: 13px; margin-bottom: 16px; }

        .breakdown-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .breakdown-item-labels {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .dimension-name { color: var(--text-muted); }
        .dimension-score { font-weight: 700; }

        .progress-bar-track {
          height: 6px;
          background: rgba(15, 23, 42, 0.04);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill { height: 100%; border-radius: 9999px; }
        .tech-fill { background: linear-gradient(to right, var(--primary), var(--primary-hover)); }
        .comm-fill { background: linear-gradient(to right, var(--color-info), var(--primary-hover)); }
        .conf-fill { background: linear-gradient(to right, var(--color-warning), var(--color-info)); }
        .flue-fill { background: linear-gradient(to right, var(--color-success), var(--color-info)); }

        /* ─── Sub Score Panel ─── */
        .sub-scores-panel {
          padding: 28px;
          margin-bottom: 24px;
        }

        .sub-scores-panel h3 {
          font-size: 17px;
          margin-bottom: 6px;
        }

        .sub-score-scale {
          font-size: 13px;
          font-weight: 400;
          color: var(--text-muted);
        }

        .sub-desc {
          font-size: 13px;
          color: var(--text-dark);
          margin-bottom: 24px;
        }

        .sub-score-trio {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        @media (max-width: 600px) {
          .sub-score-trio { grid-template-columns: 1fr; }
        }

        .sub-score-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .sub-score-circle {
          position: relative;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: conic-gradient(var(--primary) var(--pct), rgba(15,23,42,0.08) var(--pct));
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 8px var(--bg-dark-secondary);
        }

        .sub-score-circle::before {
          content: "";
          position: absolute;
          inset: 10px;
          border-radius: 50%;
          background: var(--bg-dark-secondary);
        }

        .sub-score-val {
          position: relative;
          z-index: 1;
          font-size: 28px;
          font-weight: 800;
          color: var(--text-main);
          line-height: 1;
        }

        .sub-score-unit {
          position: relative;
          z-index: 1;
          font-size: 11px;
          color: var(--text-muted);
        }

        .sub-score-item p {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          text-align: center;
        }

        /* Voice metrics row */
        .speech-metrics-row {
          padding: 24px;
          margin-bottom: 36px;
        }

        .speech-metrics-row h3 { font-size: 16px; margin-bottom: 4px; }

        .metrics-intro {
          font-size: 13px;
          color: var(--text-dark);
          margin-bottom: 18px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .metric-box {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .metric-info h4 {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-dark);
          text-transform: uppercase;
        }

        .metric-info p {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-main);
          margin-top: 1px;
        }

        /* Audit section */
        .audit-section h2 { font-size: 22px; margin-bottom: 4px; }

        .section-desc {
          font-size: 14px;
          margin-bottom: 24px;
        }

        .audit-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 36px;
        }

        .audit-item-wrapper {
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .audit-trigger {
          width: 100%;
          padding: 20px 24px;
          background: transparent;
          border: none;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          color: var(--text-main);
          text-align: left;
          gap: 16px;
        }

        .audit-trigger.active {
          border-bottom: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.02);
        }

        .trigger-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .question-number-badge {
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-hover);
          flex-shrink: 0;
        }

        .round-badge {
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: var(--primary-hover);
          padding: 3px 9px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .trigger-question-text {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.4;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .trigger-right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .q-hiring-badge {
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .trigger-score-badge {
          font-size: 14px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
          white-space: nowrap;
        }

        .score-high { background: var(--color-success-bg); color: var(--color-success); }
        .score-mid { background: var(--color-warning-bg); color: var(--color-warning); }
        .score-low { background: var(--color-danger-bg); color: var(--color-danger); }

        .audit-details {
          padding: 24px;
          background: rgba(15, 23, 42, 0.02);
        }

        .response-voice-row {
          display: flex;
          gap: 18px;
          font-size: 12px;
          color: var(--text-dark);
          margin-bottom: 12px;
          border-bottom: 1px dashed var(--border);
          padding-bottom: 8px;
        }

        .sub-scores-row {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .sub-score-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          padding: 5px 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
        }

        .primary-color { color: var(--primary); }
        .info-color { color: var(--color-info); }
        .success-color { color: var(--color-success); }
        .warning-color { color: var(--color-warning); }

        /* ─── 3-Column Answer Grid ─── */
        .audit-answers-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        @media (max-width: 900px) {
          .audit-answers-grid-3 { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 600px) {
          .audit-answers-grid-3 { grid-template-columns: 1fr; }
        }

        .answer-box {
          padding: 18px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .answer-box h4 {
          font-size: 12px;
          font-weight: 700;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }

        .ideal-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }

        .ideal-title-row h4 { margin-bottom: 0; }

        .answer-box p {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
          white-space: pre-line;
        }

        .expected-answer {
          background: rgba(14, 165, 233, 0.02);
          border-color: rgba(14, 165, 233, 0.15);
        }

        .expected-answer p {
          color: var(--color-info);
        }

        .ideal-answer p { color: var(--text-main); }

        /* ─── 3-Column Analysis Grid ─── */
        .analysis-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        @media (max-width: 900px) {
          .analysis-grid-3 { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 600px) {
          .analysis-grid-3 { grid-template-columns: 1fr; }
        }

        .analysis-box {
          padding: 18px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .suggestions-box {
          background: rgba(124, 58, 237, 0.02);
          border-color: rgba(124, 58, 237, 0.15);
        }

        .box-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .box-title h5 { font-size: 13px; }

        .analysis-box ul {
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .analysis-box li {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }

          .chat-transcript-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
            margin-bottom: 24px;
            background: rgba(15, 23, 42, 0.4);
            padding: 24px;
            border-radius: 12px;
            border: 1px solid var(--border);
          }
          .chat-bubble {
            max-width: 85%;
            padding: 16px;
            border-radius: 12px;
            position: relative;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .bubble-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 8px;
            opacity: 0.9;
          }
          .bubble-body {
            font-size: 15px;
            line-height: 1.6;
          }
          .recruiter-bubble {
            align-self: flex-start;
            background: rgba(139, 92, 246, 0.15);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-bottom-left-radius: 4px;
          }
          .recruiter-bubble .bubble-header { color: #c4b5fd; }
          .candidate-bubble {
            align-self: flex-end;
            background: rgba(59, 130, 246, 0.15);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-bottom-right-radius: 4px;
          }
          .candidate-bubble .bubble-header { color: #93c5fd; }
          .coach-bubble {
            align-self: center;
            width: 100%;
            max-width: 100%;
            background: rgba(16, 185, 129, 0.1);
            border: 1px dashed rgba(16, 185, 129, 0.4);
            margin-top: 8px;
          }
          .coach-bubble .bubble-header { color: #6ee7b7; }
          .ideal-reference {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid rgba(255,255,255,0.1);
            font-size: 14px;
            color: var(--text-muted);
          }
          .ideal-reference strong { color: var(--text-main); }.missing-concepts-panel {
          padding: 14px;
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          background: rgba(14, 165, 233, 0.01);
        }

        .missing-concepts-panel .box-title { margin-bottom: 8px; }

        .concepts-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .concept-chip {
          background: rgba(14, 165, 233, 0.08);
          border: 1px solid rgba(14, 165, 233, 0.2);
          color: var(--color-info);
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 500;
        }

        /* Career advisor */
        .career-guidance-section {
          padding: 30px;
          margin-top: 36px;
        }

        .guidance-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .guidance-header h2 { font-size: 20px; margin-bottom: 0; }

        .guidance-desc {
          font-size: 14px;
          color: var(--text-dark);
          margin-bottom: 24px;
        }

        .guidance-grid-main {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
        }

        @media (max-width: 768px) {
          .guidance-grid-main { grid-template-columns: 1fr; }
        }

        .guidance-left-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .guidance-card-content h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 10px;
        }

        .guidance-card-content ul {
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .guidance-card-content li {
          font-size: 13px;
          color: var(--text-muted);
        }

        .certs-card {
          border-top: 1px dashed var(--border);
          padding-top: 16px;
        }

        .certs-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cert-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: var(--primary-hover);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
        }

        .guidance-right-col {
          border-left: 1px solid var(--border);
          padding-left: 30px;
        }

        @media (max-width: 768px) {
          .guidance-right-col {
            border-left: none;
            padding-left: 0;
            border-top: 1px solid var(--border);
            padding-top: 20px;
          }
        }

        .guidance-right-col h4 {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 16px;
        }

        .roadmap-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
        }

        .roadmap-timeline::after {
          content: "";
          position: absolute;
          top: 10px; bottom: 10px; left: 15px;
          width: 2px;
          background: var(--border);
          z-index: 1;
        }

        .timeline-node {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
          z-index: 2;
        }

        .node-number {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
          border: 4px solid var(--bg-dark-secondary);
        }

        .node-text { padding-top: 6px; }
        .node-text p {
          font-size: 13px;
          line-height: 1.4;
          color: var(--text-main);
        }

        .feedback-cta {
          margin-top: 36px;
          display: flex;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
