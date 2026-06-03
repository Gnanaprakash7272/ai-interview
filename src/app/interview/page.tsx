"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Brain,
  Clock,
  Cpu,
  Loader2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  User,
  Send,
  Bot
} from "lucide-react";
import Image from "next/image";
import AIAvatar from "@/assets/ai-avatar.png";

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
  const [isMuted, setIsMuted] = useState(false);
  
  // Timer states
  const [elapsedTime, setElapsedTime] = useState(0);

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

  // Timer Effect
  useEffect(() => {
    if (loading || submitting || error) return;
    const interval = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [loading, submitting, error]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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
    if (!loading && !error) {
      startCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [loading, error]);

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
      const currentAns = questions[currentIndex] ? (answers[questions[currentIndex].id] || "") : "";
      setBaseTranscript(currentAns + (currentAns.endsWith(" ") || currentAns === "" ? "" : " "));
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const playQuestionAudio = () => {
    if (!questions[currentIndex] || isMuted) return;
    const text = questions[currentIndex].question;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) || voices.find(v => v.lang.includes('en-US'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.rate = 0.95;
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  // Play audio when question changes manually or on first load
  useEffect(() => {
    if (questions.length > 0 && !loading && !error) {
      if (!isMuted) playQuestionAudio();
      
      if (isRecording && recognitionRef.current) {
         recognitionRef.current.stop();
         setIsRecording(false);
      }
    }
    return () => window.speechSynthesis.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions, loading, error, isMuted]);


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
    setBaseTranscript(e.target.value);
  };

  const currentAnswer = questions[currentIndex] ? (answers[questions[currentIndex].id] || "") : "";
  const wordCount = currentAnswer.trim() === "" ? 0 : currentAnswer.trim().split(/\s+/).length;

  const handleNextOrSubmit = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
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
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <main className="interview-room-container">
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
        
        {/* Top Bar matching screenshot */}
        <header className="top-bar-card">
          <div className="tags-row">
            <span className="tag tag-primary">{interview?.domain.replace(/_/g, " ")}</span>
            <span className="tag tag-secondary">{interview?.difficulty} Level</span>
            <span className="tag tag-outline">Technical Focus</span>
          </div>
          <div className="timer-badge">
            <Clock size={16} />
            <span>{formatTime(elapsedTime)}</span>
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
          <div className="video-panels-grid">
            
            {/* Left: AI Interviewer */}
            <div className="video-panel ai-panel">
              <div className="panel-badge-row">
                <div className="panel-badge badge-dark">
                  <Bot size={14} />
                  <span>AI Recruiter</span>
                </div>
                {isAiSpeaking && (
                  <div className="panel-badge badge-purple-glow animate-pulse">
                    <span>SPEAKING</span>
                  </div>
                )}
              </div>
              
              <div className="ai-center-visual">
                <div className={`ai-avatar-circle ${isAiSpeaking ? 'speaking' : ''}`}>
                  <Image src={AIAvatar} alt="AI Recruiter Avatar" className="ai-avatar-img" />
                </div>
                <div className={`waveform-visualizer ${isAiSpeaking ? 'active' : ''}`}>
                  <svg viewBox="0 0 200 40" className="waveform-svg">
                    <path className="wave path-1" d="M0 20 Q 25 20, 50 20 T 100 20 T 150 20 T 200 20" />
                    <path className="wave path-2" d="M0 20 Q 25 20, 50 20 T 100 20 T 150 20 T 200 20" />
                    <path className="wave path-3" d="M0 20 Q 25 20, 50 20 T 100 20 T 150 20 T 200 20" />
                  </svg>
                </div>
              </div>
              
              <div className="caption-box">
                <p>{currentQuestion.question}</p>
              </div>
            </div>

            {/* Right: Candidate Camera */}
            <div className="video-panel candidate-panel">
               <div className="panel-badge-row">
                <div className="panel-badge badge-dark">
                  <User size={14} />
                  <span>You (Candidate)</span>
                </div>
                <div className="panel-badge badge-green">
                   <div className="green-dot"></div>
                   <span>Live Webcam</span>
                </div>
              </div>

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
                className={`webcam-video ${cameraActive ? 'active' : ''}`}
              />

              <div className="transcript-overlay">
                <textarea
                  className="floating-transcript-input"
                  placeholder={isRecording ? "Listening..." : "Click Mic to speak or type..."}
                  value={currentAnswer}
                  onChange={handleTextChange}
                  disabled={submitting}
                />
              </div>
            </div>

          </div>
        )}

        {/* Footer Actions */}
        <footer className="floating-footer">
          <div className="footer-stats">
            <span>Q{currentIndex + 1} of {questions.length}</span>
            <span className="dot">•</span>
            <span>{wordCount} words</span>
            <span className="dot">•</span>
            <span>{formatTime(elapsedTime)}s</span>
          </div>

          <div className="footer-controls">
            <button 
              onClick={toggleRecording} 
              className={`control-btn mic-btn ${isRecording ? 'recording' : ''}`}
              title="Toggle Microphone"
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <button 
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) window.speechSynthesis.cancel();
              }} 
              className="control-btn vol-btn"
              title="Toggle AI Voice"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          <button
            onClick={handleNextOrSubmit}
            className="footer-submit-btn"
            disabled={submitting}
          >
            <span>{isLastQuestion ? "Finish & Get Report" : "Next Question"}</span>
            <Send size={16} />
          </button>
        </footer>
      </div>

      <style jsx>{`
        .interview-room-container {
          min-height: calc(100vh - 70px);
          padding: 30px 0 60px 0;
          background-color: #f8fafc;
        }
        
        .interview-loading {
          min-height: calc(100vh - 70px);
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; color: var(--primary); }
        
        .interview-room-content {
          display: flex; flex-direction: column; gap: 24px; max-width: 1200px; margin: 0 auto;
        }
        
        /* Top Bar */
        .top-bar-card {
          background: white; border-radius: 16px; padding: 16px 24px;
          display: flex; justify-content: space-between; align-items: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .tags-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .tag { padding: 6px 14px; border-radius: 99px; font-size: 13px; font-weight: 600; text-transform: capitalize; }
        .tag-primary { background: rgba(139, 92, 246, 0.1); color: #7c3aed; }
        .tag-secondary { background: rgba(241, 245, 249, 1); color: #475569; }
        .tag-outline { border: 1px solid #e2e8f0; color: #64748b; }
        
        .timer-badge {
          display: flex; align-items: center; gap: 8px; font-weight: 700; color: #334155;
          padding: 8px 16px; background: #f8fafc; border-radius: 99px; border: 1px solid #e2e8f0;
        }

        /* Video Panels */
        .video-panels-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px; height: 500px;
        }
        @media (max-width: 900px) {
          .video-panels-grid { grid-template-columns: 1fr; height: auto; }
        }

        .video-panel {
          border-radius: 20px; overflow: hidden; position: relative;
          display: flex; flex-direction: column;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
        }

        .panel-badge-row {
          position: absolute; top: 20px; left: 20px; right: 20px;
          display: flex; justify-content: space-between; z-index: 10;
        }
        .panel-badge {
          display: flex; align-items: center; gap: 6px; padding: 6px 14px;
          border-radius: 99px; font-size: 12px; font-weight: 600;
        }
        .badge-dark { background: rgba(15, 23, 42, 0.7); color: white; backdrop-filter: blur(8px); }
        .badge-purple-glow { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.4); text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; }
        .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); backdrop-filter: blur(8px); }
        .green-dot { width: 8px; height: 8px; background: #34d399; border-radius: 50%; box-shadow: 0 0 8px #34d399; }

        /* AI Panel */
        .ai-panel {
          background: linear-gradient(145deg, #1e1b4b, #0f172a);
          justify-content: center; align-items: center;
        }
        
        .ai-center-visual {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 20px; transform: translateY(-20px);
        }
        .ai-avatar-circle {
          width: 100px; height: 100px; border-radius: 50%; border: 3px solid rgba(139, 92, 246, 0.3);
          display: flex; align-items: center; justify-content: center;
          background: rgba(139, 92, 246, 0.1); transition: all 0.3s;
          overflow: hidden;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
        }
        .ai-avatar-circle.speaking {
          border-color: #a78bfa;
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.6), inset 0 0 20px rgba(139, 92, 246, 0.4);
          transform: scale(1.05);
        }
        .ai-avatar-img {
          width: 100%; height: 100%; object-fit: cover;
        }

        .waveform-visualizer { width: 240px; height: 40px; opacity: 0.3; transition: opacity 0.3s; }
        .waveform-visualizer.active { opacity: 1; }
        .waveform-svg { width: 100%; height: 100%; overflow: visible; }
        .wave { fill: none; stroke-width: 2; stroke-linecap: round; }
        .path-1 { stroke: #c084fc; transform-origin: center; animation: wave-anim 2s infinite linear; }
        .path-2 { stroke: #818cf8; transform-origin: center; animation: wave-anim 3s infinite linear reverse; opacity: 0.7; }
        .path-3 { stroke: #f472b6; transform-origin: center; animation: wave-anim 2.5s infinite linear; opacity: 0.5; }
        @keyframes wave-anim {
          0% { transform: scaleY(1); }
          25% { transform: scaleY(2); }
          50% { transform: scaleY(0.5); }
          75% { transform: scaleY(1.5); }
          100% { transform: scaleY(1); }
        }

        .caption-box {
          position: absolute; bottom: 24px; left: 24px; right: 24px;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1);
          border-left: 3px solid #a78bfa; padding: 16px 20px; border-radius: 12px;
          color: white; font-size: 15px; line-height: 1.6; text-align: center;
        }

        /* Candidate Panel */
        .candidate-panel { background: #000; min-height: 350px; }
        .webcam-video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); opacity: 0; transition: opacity 0.5s; }
        .webcam-video.active { opacity: 1; }
        .camera-placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: rgba(255,255,255,0.5); gap: 12px; }

        .transcript-overlay {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          width: 80%; max-width: 500px; z-index: 10;
        }
        .floating-transcript-input {
          width: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.15);
          color: white; border-radius: 12px; padding: 14px 20px; min-height: 52px; font-size: 14px;
          resize: none; outline: none; transition: all 0.3s;
          text-align: center;
        }
        .floating-transcript-input:focus { background: rgba(0,0,0,0.7); border-color: rgba(255,255,255,0.3); min-height: 100px; text-align: left; }
        .floating-transcript-input::placeholder { color: rgba(255,255,255,0.4); text-align: center; font-style: italic; }

        /* Floating Footer */
        .floating-footer {
          background: #27273a; border-radius: 16px; padding: 16px 24px;
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        }
        @media (max-width: 768px) {
           .floating-footer { flex-direction: column; gap: 20px; }
        }

        .footer-stats {
          display: flex; align-items: center; gap: 12px; color: #94a3b8; font-size: 14px; font-weight: 500;
        }
        .dot { opacity: 0.5; font-size: 10px; }

        .footer-controls { display: flex; gap: 16px; }
        .control-btn {
          width: 54px; height: 54px; border-radius: 50%; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.2s;
        }
        .mic-btn { background: #3f3f5a; color: white; }
        .mic-btn:hover { background: #4f4f70; }
        .mic-btn.recording { background: #ef4444; color: white; box-shadow: 0 0 20px rgba(239,68,68,0.4); animation: pulse-red 2s infinite; }
        .vol-btn { background: #8b5cf6; color: white; }
        .vol-btn:hover { background: #7c3aed; }
        
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .footer-submit-btn {
          background: #7c3aed; color: white; border: none; padding: 12px 24px; border-radius: 12px;
          display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 15px; cursor: pointer;
          transition: background 0.2s;
        }
        .footer-submit-btn:hover { background: #6d28d9; }
        .footer-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .eval-overlay { position: fixed; inset: 0; background: rgba(248, 250, 252, 0.85); backdrop-filter: blur(20px); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .eval-loader { max-width: 480px; width: 100%; padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; background: white; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.1); }
        .eval-brain-icon { color: #8b5cf6; }
        .eval-loader h3 { font-size: 20px; font-weight: 700; }
        .eval-loader p { font-size: 14px; color: var(--text-muted); min-height: 40px; }
        .progress-ring-loader { border: 3px solid #f1f5f9; border-top: 3px solid #8b5cf6; border-radius: 50%; width: 24px; height: 24px; animation: spin 0.8s linear infinite; }
      `}</style>
    </main>
  );
}

export default function InterviewRoomPage() {
  return (
    <Suspense fallback={
      <div className="interview-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin" size={40} color="#8b5cf6" />
      </div>
    }>
      <InterviewRoomContent />
    </Suspense>
  );
}
