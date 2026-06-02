"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle, ArrowLeft, Loader2, 
  RefreshCw, Star, Info, MessageSquareCode, Award, Compass, BookOpen, Clock, BarChart2 
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
  duration: number;
  speakingSpeed: number;
  hesitationCount: number;
  strengths: string[];
  weaknesses: string[];
  missingConcepts: string[];
  improvedAnswer: string;
}

export default function InterviewFeedback({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);

  // States
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
        
        // Expand first response by default
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
          <p>Compiling mock recruiter evaluations and custom roadmaps...</p>
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

  // Recruiter speech metrics
  const avgDuration = Math.round(responses.reduce((sum, r) => sum + (r.duration || 0), 0) / responses.length) || 0;
  const avgWpm = Math.round(responses.reduce((sum, r) => sum + (r.speakingSpeed || 0), 0) / responses.length) || 0;
  const totalHesitations = responses.reduce((sum, r) => sum + (r.hesitationCount || 0), 0);

  // SVG parameters for overall ring
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
            Detailed performance scorecard for your <span className="highlight-text">{interview?.domain.replace("_", " ")}</span> session
          </p>
        </div>
      </header>

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
              Your voice responses scored an overall {totalScore}%. {totalScore >= 80 ? "You displayed excellent command of technical concepts and high clarity." : totalScore >= 60 ? "Solid base concepts with minor gaps in architectural depth and speech fluency." : "Significant gaps in conceptual definitions and structure. Practice regular mock tests."}
            </p>
          </div>
        </div>

        {/* Breakdown scores card */}
        <div className="glass-card breakdown-card">
          <h3>Evaluation Breakdown</h3>
          <p>Divided across technical depth, behavior, and speaking metrics</p>
          
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

      {/* Recruiter Speech Metrics Section */}
      <section className="speech-metrics-row glass-card">
        <h3>Recruiter Voice Analytics</h3>
        <p className="metrics-intro">Speaking speed, speech duration, and filler hesitations measured during live microphone capture.</p>
        
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
              <p>{avgWpm} WPM (Words/Min)</p>
            </div>
          </div>

          <div className="metric-box">
            <AlertTriangle size={20} className="warning-color" />
            <div className="metric-info">
              <h4>Total Fillers / Hesitations</h4>
              <p>{totalHesitations} Fillers (umm, aaa, etc.)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Accordion Questions Audit */}
      <section className="audit-section">
        <h2>Detailed Conversational Audit</h2>
        <p className="section-desc">Click each conversational node to review granular AI evaluations, speech details, and ideal answers.</p>
        
        <div className="audit-list">
          {responses.map((resDoc, idx) => {
            const isExpanded = expandedResponse === resDoc._id;
            return (
              <div key={resDoc._id} className="audit-item-wrapper glass-card">
                {/* Accordion Trigger */}
                <button 
                  onClick={() => toggleExpand(resDoc._id)} 
                  className={`audit-trigger ${isExpanded ? "active" : ""}`}
                >
                  <div className="trigger-left">
                    <span className="question-number-badge">Q{idx + 1}</span>
                    <span className="trigger-question-text">{resDoc.question}</span>
                  </div>
                  <div className="trigger-right">
                    <span className={`trigger-score-badge ${getScoreColorClass(resDoc.score)}`}>
                      {resDoc.score}%
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="audit-details animate-fade-in">
                    
                    {/* Specific Voice stats */}
                    <div className="response-voice-row">
                      <span>Speaking Speed: <strong>{resDoc.speakingSpeed} WPM</strong></span>
                      <span>Duration: <strong>{resDoc.duration} Seconds</strong></span>
                      <span>Hesitations: <strong>{resDoc.hesitationCount}</strong></span>
                    </div>

                    {/* Scores row */}
                    <div className="sub-scores-row">
                      <div className="sub-score-badge">
                        <span>Technical Accuracy:</span>
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
                    </div>

                    {/* Answer Grid */}
                    <div className="audit-answers-grid">
                      <div className="answer-box user-answer">
                        <h4>Your Recorded Speech Answer</h4>
                        <p>{resDoc.answer || <em className="text-dark">Silent / No response recorded.</em>}</p>
                      </div>

                      <div className="answer-box ideal-answer">
                        <div className="ideal-title-row">
                          <MessageSquareCode size={16} className="primary-color" />
                          <h4>AI Recommended Phrasing</h4>
                        </div>
                        <p>{resDoc.improvedAnswer}</p>
                      </div>
                    </div>

                    {/* Bullet analysis */}
                    <div className="analysis-grid">
                      <div className="analysis-box strengths-box">
                        <div className="box-title">
                          <CheckCircle size={16} className="success-color" />
                          <h5>Recruiter Positives</h5>
                        </div>
                        <ul>
                          {resDoc.strengths.map((str, sIdx) => (
                            <li key={sIdx}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="analysis-box weaknesses-box">
                        <div className="box-title">
                          <AlertTriangle size={16} className="warning-color" />
                          <h5>Recruiter Critiques</h5>
                        </div>
                        <ul>
                          {resDoc.weaknesses.map((weak, wIdx) => (
                            <li key={wIdx}>{weak}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Missing Concepts block */}
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

      {/* AI Career Advice Roadmap Panel */}
      {careerGuidance && careerGuidance.skillsToLearn && (
        <section className="career-guidance-section glass-card">
          <div className="guidance-header">
            <Compass size={24} className="primary-color" />
            <h2>AI Career Guidance Advisor</h2>
          </div>
          <p className="guidance-desc">Custom study roadmap created by the mock recruiter matching your experience flaws.</p>
          
          <div className="guidance-grid-main">
            
            {/* Left Box: Skills and certs */}
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

            {/* Right Box: Roadmap checkpoints */}
            <div className="guidance-right-col">
              <h4>Recruiter Learning Roadmap</h4>
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
          <span>Practice Another Mock Recruiter</span>
        </Link>
      </footer>

      <style jsx>{`
        .feedback-wrapper {
          padding-top: 30px;
          padding-bottom: 80px;
          max-width: 1000px !important;
        }

        .feedback-header {
          margin-bottom: 36px;
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

        .back-link:hover {
          color: var(--text-main);
        }

        .header-meta h1 {
          font-size: 32px;
          margin-bottom: 6px;
        }

        .highlight-text {
          color: var(--primary-hover);
          text-transform: capitalize;
        }

        /* Overview Row */
        .overview-row {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          margin-bottom: 30px;
        }

        @media (max-width: 768px) {
          .overview-row {
            grid-template-columns: 1fr;
          }
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
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
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

        .ring-meta h3 {
          font-size: 18px;
          margin-bottom: 8px;
        }

        .ring-meta p {
          font-size: 13px;
          line-height: 1.5;
        }

        .breakdown-card {
          padding: 30px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .breakdown-card h3 {
          font-size: 18px;
          margin-bottom: 6px;
        }

        .breakdown-card p {
          font-size: 13px;
          margin-bottom: 16px;
        }

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

        .dimension-name {
          color: var(--text-muted);
        }

        .dimension-score {
          font-weight: 700;
        }

        .progress-bar-track {
          height: 6px;
          background: rgba(15, 23, 42, 0.04);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 9999px;
        }

        .tech-fill {
          background: linear-gradient(to right, var(--primary), var(--primary-hover));
        }

        .comm-fill {
          background: linear-gradient(to right, var(--color-info), var(--primary-hover));
        }

        .conf-fill {
          background: linear-gradient(to right, var(--color-warning), var(--color-info));
        }

        .flue-fill {
          background: linear-gradient(to right, var(--color-success), var(--color-info));
        }

        /* Voice metrics row */
        .speech-metrics-row {
          padding: 24px;
          margin-bottom: 36px;
        }

        .speech-metrics-row h3 {
          font-size: 16px;
          margin-bottom: 4px;
        }

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

        /* Detailed audits */
        .audit-section h2 {
          font-size: 22px;
          margin-bottom: 4px;
        }

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
          gap: 12px;
        }

        .question-number-badge {
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-hover);
        }

        .trigger-question-text {
          font-size: 15px;
          font-weight: 600;
          line-height: 1.4;
        }

        .trigger-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .trigger-score-badge {
          font-size: 14px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .score-high {
          background: var(--color-success-bg);
          color: var(--color-success);
        }

        .score-mid {
          background: var(--color-warning-bg);
          color: var(--color-warning);
        }

        .score-low {
          background: var(--color-danger-bg);
          color: var(--color-danger);
        }

        /* Collapsed Details */
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
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .sub-score-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          font-size: 12px;
        }

        .primary-color { color: var(--primary); }
        .info-color { color: var(--color-info); }
        .success-color { color: var(--color-success); }
        .warning-color { color: var(--color-warning); }

        .audit-answers-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 768px) {
          .audit-answers-grid {
            grid-template-columns: 1fr;
          }
        }

        .answer-box {
          padding: 20px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .answer-box h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 12px;
        }

        .ideal-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 12px;
        }

        .ideal-title-row h4 {
          margin-bottom: 0;
        }

        .answer-box p {
          font-size: 13px;
          line-height: 1.6;
          color: var(--text-muted);
          white-space: pre-line;
        }

        .ideal-answer p {
          color: var(--text-main);
        }

        /* Analysis bullet boxes */
        .analysis-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 600px) {
          .analysis-grid {
            grid-template-columns: 1fr;
          }
        }

        .analysis-box {
          padding: 20px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .box-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .box-title h5 {
          font-size: 14px;
        }

        .analysis-box ul {
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .analysis-box li {
          font-size: 13px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .missing-concepts-panel {
          padding: 16px;
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
          background: rgba(14, 165, 233, 0.01);
        }

        .missing-concepts-panel .box-title {
          margin-bottom: 8px;
        }

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

        /* Career advisor section */
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

        .guidance-header h2 {
          font-size: 20px;
          margin-bottom: 0;
        }

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
          .guidance-grid-main {
            grid-template-columns: 1fr;
          }
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
          top: 10px;
          bottom: 10px;
          left: 15px;
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
          width: 32px;
          height: 32px;
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

        .node-text {
          padding-top: 6px;
        }

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

