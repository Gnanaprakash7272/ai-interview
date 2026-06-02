"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";

interface QuestionItem {
  id: string;
  question: string;
  answer: string;
}

interface InterviewData {
  _id: string;
  domain: string;
  difficulty: string;
  status: string;
}

function InterviewRoomContent() {
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [evalStatus, setEvalStatus] = useState("Analyzing your responses...");
  const [error, setError] = useState("");

  useEffect(() => {
    if (authStatus !== "authenticated" || !interviewId) return;

    const fetchInterview = async () => {
      try {
        const res = await fetch(`/api/interview?id=${interviewId}`);
        if (!res.ok) {
          throw new Error("Failed to load interview session");
        }
        const data = await res.json();
        
        if (data.interview.status === "completed") {
          router.push(`/results?id=${interviewId}`);
          return;
        }

        setInterview(data.interview);
        setQuestions(data.questions);

        // Prepopulate answers if any
        const initialAnswers: Record<string, string> = {};
        data.questions.forEach((q: QuestionItem) => {
          initialAnswers[q.id] = q.answer || "";
        });
        setAnswers(initialAnswers);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load questions");
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId, authStatus, router]);

  // Loading quotes during evaluation
  useEffect(() => {
    if (!submitting) return;
    const quotes = [
      "Gemini is evaluating your technical accuracy...",
      "Measuring communication clarity and articulation...",
      "Synthesizing detailed strengths and gaps...",
      "Generating personalized learning recommendations...",
      "Compiling your metrics dashboard...",
    ];
    let quoteIndex = 0;
    const interval = setInterval(() => {
      quoteIndex = (quoteIndex + 1) % quotes.length;
      setEvalStatus(quotes[quoteIndex]);
    }, 3000);

    return () => clearInterval(interval);
  }, [submitting]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const currentQ = questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: e.target.value,
    }));
  };

  const currentAnswer = questions[currentIndex] ? (answers[questions[currentIndex].id] || "") : "";
  const wordCount = currentAnswer.trim() === "" ? 0 : currentAnswer.trim().split(/\s+/).length;

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmitInterview = async () => {
    setSubmitting(true);
    setError("");

    try {
      // Map state answers back to the API format
      const formattedAnswers = questions.map((q) => ({
        responseId: q.id,
        answer: answers[q.id] || "",
      }));

      const res = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewId,
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit interview for evaluation");
      }

      router.push(`/results?id=${interviewId}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit responses");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="interview-loading">
        <Loader2 className="animate-spin" size={40} />
        <p>Setting up your virtual interview room...</p>
        <style jsx>{`
          .interview-loading {
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

  if (error && !interview) {
    return (
      <div className="container interview-error-container">
        <div className="glass-card error-card">
          <AlertCircle size={40} className="text-danger" />
          <h2>Unable to join room</h2>
          <p>{error}</p>
          <button onClick={() => router.push("/dashboard")} className="btn btn-secondary">
            Return to Dashboard
          </button>
        </div>
        <style jsx>{`
          .interview-error-container {
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

  const currentQuestion = questions[currentIndex];
  const progressPercent = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <main className="interview-room-container">
      <div className="app-bg-glow"></div>

      {submitting && (
        <div className="eval-overlay">
          <div className="eval-loader glass-card animate-pulse-glow">
            <Brain size={48} className="eval-brain-icon animate-pulse" />
            <h3>Evaluating Responses</h3>
            <p>{evalStatus}</p>
            <div className="progress-ring-loader"></div>
          </div>
        </div>
      )}

      <div className="container interview-room-content animate-fade-in">
        {/* Header Indicator */}
        <header className="room-header flex-between">
          <div className="room-meta">
            <div className="room-badge">
              <Cpu size={14} />
              <span>{interview?.domain.replace(/_/g, " ").toUpperCase()}</span>
            </div>
            <span className="room-diff-badge">{interview?.difficulty} Prep</span>
          </div>

          <div className="progress-indicator">
            <span className="progress-text">Question {currentIndex + 1} of {questions.length}</span>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </header>

        {error && (
          <div className="error-alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Live Question Card */}
        {currentQuestion && (
          <div className="glass-card question-workspace">
            <div className="question-side">
              <div className="question-title">
                <Sparkles size={16} className="text-purple" />
                <h3>Question</h3>
              </div>
              <p className="question-text">{currentQuestion.question}</p>
              
              <div className="study-guide-box">
                <h5>Pro Tip:</h5>
                <p>Structure your answer using the STAR method. Keep it concise but cover technical concepts and specify trade-offs.</p>
              </div>
            </div>

            <div className="answer-side">
              <div className="answer-title-row flex-between">
                <h4>Your Answer</h4>
                <span className={`word-indicator ${wordCount > 30 ? "sufficient" : ""}`}>
                  {wordCount} words
                </span>
              </div>

              <textarea
                className="form-input answer-textarea"
                placeholder="Type your detailed response here..."
                value={currentAnswer}
                onChange={handleTextChange}
                disabled={submitting}
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <footer className="room-footer flex-between">
          <button
            onClick={handlePrev}
            className="btn btn-secondary"
            disabled={currentIndex === 0 || submitting}
          >
            <ArrowLeft size={16} />
            <span>Previous</span>
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              onClick={handleNext}
              className="btn btn-primary"
              disabled={submitting}
            >
              <span>Next Question</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmitInterview}
              className="btn btn-primary btn-submit-final"
              disabled={submitting}
            >
              <span>Submit Interview</span>
              <Send size={16} />
            </button>
          )}
        </footer>
      </div>

      <style jsx>{`
        .interview-room-container {
          min-height: calc(100vh - 70px);
          padding: 30px 0 60px 0;
        }
        .interview-room-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1000px;
        }
        .room-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }
        .room-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .room-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--primary-hover);
        }
        .room-diff-badge {
          font-size: 13px;
          color: var(--text-muted);
          font-weight: 500;
        }
        .progress-indicator {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          width: 200px;
        }
        .progress-text {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
        }
        .progress-bar-track {
          width: 100%;
          height: 6px;
          background: rgba(15, 23, 42, 0.05);
          border-radius: 999px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        
        .error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-danger-bg);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--color-danger);
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 14px;
        }
        
        /* Question workspace layout */
        .question-workspace {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          min-height: 420px;
          overflow: hidden;
        }
        @media (max-width: 768px) {
          .question-workspace {
            grid-template-columns: 1fr;
          }
        }
        
        .question-side {
          padding: 32px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: rgba(15, 23, 42, 0.01);
        }
        @media (max-width: 768px) {
          .question-side {
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
        }
        .question-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .question-title h3 {
          font-size: 12px;
          color: var(--text-muted);
        }
        .question-text {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.5;
          color: var(--text-main);
          flex-grow: 1;
        }
        .study-guide-box {
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 14px;
        }
        .study-guide-box h5 {
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-hover);
          margin-bottom: 4px;
        }
        .study-guide-box p {
          font-size: 12px;
          line-height: 1.5;
        }
        
        .answer-side {
          padding: 32px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .answer-title-row h4 {
          font-size: 15px;
          font-weight: 600;
        }
        .word-indicator {
          font-size: 12px;
          color: var(--text-dark);
          font-weight: 500;
        }
        .word-indicator.sufficient {
          color: var(--color-success);
        }
        .answer-textarea {
          flex-grow: 1;
          resize: none;
          min-height: 250px;
          font-size: 15px;
          line-height: 1.6;
          background: #ffffff;
        }
        
        .room-footer {
          border-top: 1px solid var(--border);
          padding-top: 20px;
        }
        .btn-submit-final {
          background: var(--color-success);
          box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4);
        }
        .btn-submit-final:hover {
          background: #34d399;
          box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.5);
        }
        
        /* Loading overlay styling */
        .eval-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(248, 250, 252, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .eval-loader {
          max-width: 480px;
          width: 100%;
          padding: 40px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.9);
        }
        .eval-brain-icon {
          color: var(--primary);
        }
        .eval-loader h3 {
          font-size: 20px;
          font-weight: 700;
        }
        .eval-loader p {
          font-size: 14px;
          color: var(--text-muted);
          min-height: 40px;
        }
        .progress-ring-loader {
          border: 3px solid rgba(15, 23, 42, 0.1);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        .animate-pulse {
          animation: pulse 2s infinite ease-in-out;
        }
      `}</style>
    </main>
  );
}

export default function InterviewRoomPage() {
  return (
    <Suspense fallback={
      <div className="interview-loading">
        <Loader2 className="animate-spin" size={40} />
        <p>Loading session parameters...</p>
        <style jsx>{`
          .interview-loading {
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
      <InterviewRoomContent />
    </Suspense>
  );
}
