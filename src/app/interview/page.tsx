"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Cpu,
  Loader2,
  Send,
  Sparkles,
  Mic,
  MicOff,
  Volume2,
  Video
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

  // WebRTC & Speech states
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  
  // To keep track of previously typed/spoken text before starting a new recording session
  const [baseTranscript, setBaseTranscript] = useState("");

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

  // Setup Camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } catch (err) {
        console.error("Camera access denied", err);
      }
    };
    if (!loading) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [loading]);

  // Setup Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          setAnswers(prev => {
            const currentId = questions[currentIndex]?.id;
            if (!currentId) return prev;
            // Append the new final text to our base transcript
            const updatedBase = baseTranscript + finalTranscript;
            if (finalTranscript) setBaseTranscript(updatedBase);
            
            return {
              ...prev,
              [currentId]: updatedBase + interimTranscript
            };
          });
        };
        
        recognition.onend = () => {
           // If it stops unexpectedly, we can handle it, but for now just sync state
           setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [currentIndex, questions, baseTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      // Save current text box content as base before appending new speech
      const currentAns = questions[currentIndex] ? (answers[questions[currentIndex].id] || "") : "";
      setBaseTranscript(currentAns + (currentAns.endsWith(" ") || currentAns === "" ? "" : " "));
      
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const playQuestionAudio = () => {
    if (!questions[currentIndex]) return;
    const text = questions[currentIndex].question;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    // Prefer a generic english voice or Google voice if available
    const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en-US'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.rate = 0.95; // Slightly slower for clarity
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Play audio when question changes manually or on first load
  useEffect(() => {
    if (questions.length > 0 && !loading && !error) {
      // It requires user interaction to play audio in most browsers on first load,
      // so we might need them to click a button, but we try anyway.
      playQuestionAudio();
      
      // Also stop recording if they moved to next question
      if (isRecording && recognitionRef.current) {
         recognitionRef.current.stop();
         setIsRecording(false);
      }
    }
    return () => window.speechSynthesis.cancel();
  }, [currentIndex, questions, loading, error]);


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
    // Sync manual typing with base transcript so if they start recording again, it doesn't overwrite manual edits
    setBaseTranscript(e.target.value);
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

        {/* Live Video Workspace */}
        {currentQuestion && (
          <div className="video-workspace-grid">
            
            {/* Left: AI Interviewer */}
            <div className="glass-card video-panel interviewer-panel">
              <div className="panel-header flex-between">
                <div className="badge ai-badge">
                  <Sparkles size={14} />
                  <span>AI Interviewer</span>
                </div>
                <button onClick={playQuestionAudio} className="btn-icon" title="Repeat Question">
                  <Volume2 size={16} className={isAiSpeaking ? "text-primary animate-pulse" : ""} />
                </button>
              </div>
              
              <div className="interviewer-avatar-container">
                <div className={`ai-avatar-ring ${isAiSpeaking ? 'speaking' : ''}`}>
                  <Brain size={64} className="ai-brain-logo" />
                </div>
                {isAiSpeaking && (
                  <div className="voice-visualizer">
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                    <div className="bar"></div>
                  </div>
                )}
              </div>
              
              <div className="question-caption-box">
                <p>{currentQuestion.question}</p>
              </div>
            </div>

            {/* Right: Candidate Camera & Answer */}
            <div className="glass-card video-panel candidate-panel">
               <div className="panel-header flex-between">
                <div className="badge candidate-badge">
                  <Video size={14} />
                  <span>You (Live)</span>
                </div>
                <div className={`recording-indicator ${isRecording ? 'active' : ''}`}>
                   <div className="rec-dot"></div>
                   <span>{isRecording ? 'Recording...' : 'Standby'}</span>
                </div>
              </div>

              <div className="webcam-container">
                {!cameraActive && (
                  <div className="camera-placeholder">
                     <Loader2 size={24} className="animate-spin" />
                     <p>Starting Camera...</p>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className={`webcam-feed ${cameraActive ? 'active' : ''}`}
                />
              </div>

              <div className="answer-section">
                <div className="answer-header flex-between">
                  <h4>Real-time Transcript</h4>
                  <span className={`word-indicator ${wordCount > 30 ? "sufficient" : ""}`}>
                    {wordCount} words
                  </span>
                </div>
                
                <textarea
                  className="form-input transcript-textarea"
                  placeholder="Click the microphone to start answering with your voice..."
                  value={currentAnswer}
                  onChange={handleTextChange}
                  disabled={submitting}
                />
                
                <div className="action-row">
                   <button 
                     onClick={toggleRecording} 
                     className={`btn btn-mic ${isRecording ? 'recording' : ''}`}
                     disabled={submitting}
                   >
                     {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                     <span>{isRecording ? "Stop Answering" : "Speak Answer"}</span>
                   </button>
                </div>
              </div>

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
        .interview-loading {
          min-height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          color: var(--text-muted);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; color: var(--primary); }
        
        .interview-room-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          max-width: 1100px;
        }
        
        .room-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }
        .room-meta { display: flex; align-items: center; gap: 12px; }
        .room-badge {
          display: flex; align-items: center; gap: 6px; padding: 6px 12px;
          background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; color: var(--primary-hover);
        }
        .room-diff-badge { font-size: 13px; color: var(--text-muted); font-weight: 500; }
        
        .progress-indicator { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; width: 200px; }
        .progress-text { font-size: 12px; font-weight: 600; color: var(--text-muted); }
        .progress-bar-track { width: 100%; height: 6px; background: rgba(15, 23, 42, 0.05); border-radius: 999px; overflow: hidden; border: 1px solid var(--border); }
        .progress-bar-fill { height: 100%; background: var(--primary); border-radius: 999px; transition: width 0.3s ease; }
        
        .error-alert { display: flex; align-items: center; gap: 8px; background: var(--color-danger-bg); border: 1px solid rgba(239, 68, 68, 0.2); color: var(--color-danger); padding: 12px; border-radius: var(--radius-md); font-size: 14px; }
        
        /* New Split Screen Video Layout */
        .video-workspace-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
          min-height: 550px;
        }
        @media (max-width: 900px) {
          .video-workspace-grid { grid-template-columns: 1fr; }
        }

        .video-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.6);
        }

        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.5);
        }

        .badge {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 20px;
        }
        .ai-badge { background: rgba(139, 92, 246, 0.1); color: var(--primary); }
        .candidate-badge { background: rgba(59, 130, 246, 0.1); color: #2563eb; }

        .recording-indicator {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600; color: var(--text-muted);
        }
        .recording-indicator.active { color: var(--color-danger); }
        .rec-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); }
        .recording-indicator.active .rec-dot {
          background: var(--color-danger);
          animation: pulse 1.5s infinite;
        }

        .btn-icon {
          background: none; border: none; cursor: pointer; color: var(--text-muted);
          transition: all 0.2s; padding: 4px;
        }
        .btn-icon:hover { color: var(--primary); transform: scale(1.1); }

        /* AI Interviewer Side */
        .interviewer-avatar-container {
          flex-grow: 1;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: radial-gradient(circle at center, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
          min-height: 250px;
          position: relative;
        }

        .ai-avatar-ring {
          width: 120px; height: 120px;
          border-radius: 50%;
          background: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 10px 30px rgba(139, 92, 246, 0.1);
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }
        .ai-avatar-ring.speaking {
          border-color: var(--primary);
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.4);
          animation: pulse-ring 2s infinite;
        }
        .ai-brain-logo { color: var(--primary); }

        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(139, 92, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }

        .voice-visualizer {
          display: flex; gap: 4px; margin-top: 30px; height: 30px; align-items: center;
        }
        .voice-visualizer .bar {
          width: 4px; background: var(--primary); border-radius: 2px;
          animation: sound 0.5s ease-in-out infinite alternate;
        }
        .voice-visualizer .bar:nth-child(1) { height: 30%; animation-delay: 0.1s; }
        .voice-visualizer .bar:nth-child(2) { height: 100%; animation-delay: 0.2s; }
        .voice-visualizer .bar:nth-child(3) { height: 50%; animation-delay: 0.3s; }
        .voice-visualizer .bar:nth-child(4) { height: 80%; animation-delay: 0.4s; }
        .voice-visualizer .bar:nth-child(5) { height: 40%; animation-delay: 0.5s; }

        @keyframes sound {
          0% { height: 20%; opacity: 0.5; }
          100% { height: 100%; opacity: 1; }
        }

        .question-caption-box {
          padding: 24px;
          background: rgba(255,255,255,0.8);
          border-top: 1px solid var(--border);
          font-size: 16px; font-weight: 600; line-height: 1.6;
          color: var(--text-main);
          min-height: 120px;
        }

        /* Candidate Side */
        .candidate-panel {
          display: flex; flex-direction: column;
        }
        .webcam-container {
          position: relative;
          background: #000;
          height: 250px;
          width: 100%;
          overflow: hidden;
        }
        .camera-placeholder {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.7); gap: 10px; font-size: 14px;
        }
        .webcam-feed {
          width: 100%; height: 100%; object-fit: cover;
          opacity: 0; transition: opacity 0.5s;
          transform: scaleX(-1); /* Mirror effect */
        }
        .webcam-feed.active { opacity: 1; }

        .answer-section {
          padding: 20px; flex-grow: 1; display: flex; flex-direction: column; gap: 12px;
        }
        .answer-header h4 { font-size: 14px; font-weight: 700; color: var(--text-dark); }
        .word-indicator { font-size: 12px; color: var(--text-muted); font-weight: 500; }
        .word-indicator.sufficient { color: var(--color-success); }
        
        .transcript-textarea {
          flex-grow: 1; min-height: 120px; resize: none; font-size: 15px; line-height: 1.6;
          background: rgba(255,255,255,0.8); border-color: rgba(0,0,0,0.05);
        }
        .transcript-textarea:focus { background: #fff; }

        .action-row {
          display: flex; justify-content: center; padding-top: 10px;
        }
        .btn-mic {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: rgba(139, 92, 246, 0.1); color: var(--primary);
          border: 1px solid rgba(139, 92, 246, 0.2);
          width: 100%; font-weight: 600; padding: 12px;
          transition: all 0.3s;
        }
        .btn-mic:hover { background: rgba(139, 92, 246, 0.15); }
        .btn-mic.recording {
          background: var(--color-danger); color: white; border-color: var(--color-danger);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }
        
        .room-footer { border-top: 1px solid var(--border); padding-top: 20px; }
        .btn-submit-final { background: var(--color-success); box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.4); }
        .btn-submit-final:hover { background: #34d399; box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.5); }
        
        .eval-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(248, 250, 252, 0.85); backdrop-filter: blur(20px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .eval-loader { max-width: 480px; width: 100%; padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; background: rgba(255, 255, 255, 0.9); }
        .eval-brain-icon { color: var(--primary); }
        .eval-loader h3 { font-size: 20px; font-weight: 700; }
        .eval-loader p { font-size: 14px; color: var(--text-muted); min-height: 40px; }
        .progress-ring-loader { border: 3px solid rgba(15, 23, 42, 0.1); border-top: 3px solid var(--primary); border-radius: 50%; width: 24px; height: 24px; animation: spin 0.8s linear infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.05); } }
        .animate-pulse { animation: pulse 2s infinite ease-in-out; }
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
          .interview-loading { min-height: calc(100vh - 70px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted); }
          @keyframes spin { to { transform: rotate(360deg); } }
          .animate-spin { animation: spin 1s linear infinite; color: var(--primary); }
        `}</style>
      </div>
    }>
      <InterviewRoomContent />
    </Suspense>
  );
}
