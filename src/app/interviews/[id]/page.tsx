"use client";

import React, { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Volume2, VolumeX, ArrowRight, Loader2, Award, Clock, ArrowLeft, Send, 
  Video, VideoOff, Mic, MicOff, AlertCircle, Headphones, Cpu, Bot, User
} from "lucide-react";

interface QuestionResponse {
  _id: string;
  question: string;
  answer: string;
}

const SpeechRecognition =
  typeof window !== "undefined" &&
  ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

export default function InterviewRoom({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);
  
  // Data State
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [language, setLanguage] = useState("en");
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({}); // { responseId: answer }
  const [currentIndex, setCurrentIndex] = useState(0);

  // Status State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Timer & Session details
  const [timer, setTimer] = useState(0);
  const [activeDuration, setActiveDuration] = useState(0);
  const durationIntervalRef = useRef<any>(null);

  // SpeechSynthesis State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Webcam & Microphone State
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mediaError, setMediaError] = useState("");

  // Speech Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Web Audio Visualizer Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Fetch interview setup
  const initSession = async () => {
    try {
      const res = await fetch(`/api/interviews/${interviewId}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to load session");
      }

      if (data.interview.status === "completed") {
        router.push(`/interviews/${interviewId}/feedback`);
        return;
      }

      setDomain(data.interview.domain);
      setDifficulty(data.interview.difficulty);
      setInterviewType(data.interview.interviewType);
      setLanguage(data.interview.language);
      setResponses(data.responses);

      // Prepopulate with existing answers if any
      const initialAnswers: Record<string, string> = {};
      data.responses.forEach((resDoc: QuestionResponse) => {
        initialAnswers[resDoc._id] = resDoc.answer || "";
      });
      setAnswers(initialAnswers);

      // Find the first unanswered question to resume correctly
      const incomplete = data.responses.findIndex((r: QuestionResponse) => !r.answer);
      if (incomplete !== -1) {
        setCurrentIndex(incomplete);
      } else {
        setCurrentIndex(data.responses.length - 1);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load interview room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, [interviewId, router]);

  // Session timer
  useEffect(() => {
    if (loading || submitting) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, submitting]);

  // Initialize/manage camera and mic streams
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    async function startCamera() {
      try {
        setMediaError("");
        const constraints = {
          video: videoEnabled ? { width: 640, height: 480, facingMode: "user" } : false,
          audio: audioEnabled
        };

        if (!constraints.video && !constraints.audio) {
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }
          return;
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Error accessing camera/mic:", err);
        setMediaError("Could not access camera or microphone. Please check browser permissions.");
      }
    }

    if (!loading && !submitting) {
      startCamera();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoEnabled, audioEnabled, loading, submitting]);

  // Web Audio Waveform Visualizer
  const startVisualizer = () => {
    if (!stream || !canvasRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = audioContextRef.current || new AudioContextClass();
      audioContextRef.current = audioContext;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const analyser = analyserRef.current || audioContext.createAnalyser();
      analyser.fftSize = 128;
      analyserRef.current = analyser;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }

      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;
        animationFrameRef.current = requestAnimationFrame(draw);
        analyserRef.current.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.9;
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, "rgba(139, 92, 246, 0.1)");
          gradient.addColorStop(0.5, "rgba(139, 92, 246, 0.6)");
          gradient.addColorStop(1, "rgba(167, 139, 250, 1)");

          ctx.fillStyle = gradient;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      draw();
    } catch (err) {
      console.warn("Could not start visualizer:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  useEffect(() => {
    if (isRecording) {
      startVisualizer();
    } else {
      stopVisualizer();
    }
    return () => stopVisualizer();
  }, [isRecording, stream]);

  // AI Simulated Voice Visualizer
  const aiCanvasRef = useRef<HTMLCanvasElement>(null);
  const aiAnimationFrameRef = useRef<number | null>(null);

  const startAiVisualizer = () => {
    const canvas = aiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let time = 0;
    const draw = () => {
      aiAnimationFrameRef.current = requestAnimationFrame(draw);
      // Faster time increment for snappier voice feel
      time += 0.2; 
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Combine multiple sine waves for a Siri-like voice wave
      const numWaves = 4;
      for (let i = 0; i < numWaves; i++) {
        ctx.beginPath();
        
        // Randomly modulate amplitude using Math.sin
        const amplitudeMod = Math.sin(time * 0.3 + i * 1.5) * 0.6 + 0.4;
        const baseAmplitude = (height / 2.2);
        const amplitude = baseAmplitude * amplitudeMod;
        
        for (let x = 0; x < width; x++) {
          const frequency = 0.03 + i * 0.015;
          const phase = time * (1 + i * 0.3);
          
          // Gaussian envelope to keep waves centered horizontally
          const centerDist = (x - width / 2) / (width / 3.5);
          const envelope = Math.max(0, Math.exp(-centerDist * centerDist));
          
          const y = Math.sin(x * frequency + phase) * amplitude * envelope;
          
          if (x === 0) ctx.moveTo(x, centerY + y);
          else ctx.lineTo(x, centerY + y);
        }
        
        // Add vibrant colors
        if (i === 0) ctx.strokeStyle = `rgba(139, 92, 246, 0.9)`; // Primary purple
        else if (i === 1) ctx.strokeStyle = `rgba(59, 130, 246, 0.7)`; // Blue
        else if (i === 2) ctx.strokeStyle = `rgba(236, 72, 153, 0.7)`; // Pink
        else ctx.strokeStyle = `rgba(167, 139, 250, 0.4)`; // Light purple
        
        ctx.lineWidth = 2.5;
        // Global composite operation for glow effect
        ctx.globalCompositeOperation = 'screen';
        ctx.stroke();
      }
    };
    
    if (aiAnimationFrameRef.current) cancelAnimationFrame(aiAnimationFrameRef.current);
    draw();
  };

  const stopAiVisualizer = () => {
    if (aiAnimationFrameRef.current) {
      cancelAnimationFrame(aiAnimationFrameRef.current);
      aiAnimationFrameRef.current = null;
    }
    if (aiCanvasRef.current) {
      const ctx = aiCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, aiCanvasRef.current.width, aiCanvasRef.current.height);
    }
  };

  useEffect(() => {
    if (isSpeaking) {
      startAiVisualizer();
    } else {
      stopAiVisualizer();
    }
    return () => stopAiVisualizer();
  }, [isSpeaking]);

  // Dynamic TTS Speak question helper
  function speakQuestionText(text: string) {
    if (!window.speechSynthesis || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance; // Prevent garbage collection
    
    // Choose correct language code
    const langCodeMap: Record<string, string> = {
      en: "en-US",
      ta: "ta-IN",
      te: "te-IN",
      hi: "hi-IN",
      ja: "ja-JP"
    };
    utterance.lang = langCodeMap[language] || "en-US";

    const voices = window.speechSynthesis.getVoices();
    const matchVoice = voices.find(
      (v) => v.lang.toLowerCase().replace("_", "-").startsWith(langCodeMap[language] || "en-US")
    );
    if (matchVoice) {
      utterance.voice = matchVoice;
    }
    
    utterance.onend = () => {
      setIsSpeaking(false);
      // Auto-trigger recording on question speech end
      setTimeout(() => {
        startRecording();
      }, 400);
    };
    utterance.onerror = () => setIsSpeaking(false);
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);

    // Chrome bug workaround: periodic pause/resume if speech is very long
    // This strictly ensures the speech doesn't randomly stop in the middle!
    const resumeInfinity = setInterval(() => {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearInterval(resumeInfinity);
      }
    }, 10000);
  }

  function speakQuestion() {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const currentQuestion = responses[currentIndex]?.question;
    if (currentQuestion) {
      speakQuestionText(currentQuestion);
    }
  }

  // Trigger TTS on first render of a question
  useEffect(() => {
    if (responses.length > 0 && responses[currentIndex]?.question && !loading) {
      const timerObj = setTimeout(() => {
        speakQuestionText(responses[currentIndex].question);
      }, 1000);
      return () => clearTimeout(timerObj);
    }
  }, [currentIndex, responses, loading]);

  // Speech filler calculations
  const calculateHesitations = (text: string) => {
    const fillers = ['umm', 'aaa', 'ah', 'uh', 'like', 'you know', 'i don\'t know', 'வந்து', 'ஒரு நிமிடம்', 'मतलब', 'पता नहीं', 'ええと', 'あの'];
    let count = 0;
    const normalized = text.toLowerCase();
    fillers.forEach(filler => {
      const regex = new RegExp(filler.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      const matches = normalized.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    return count;
  };

  // Start Speech Recognition dictation
  function startRecording() {
    if (!stream) {
      alert("Camera and Microphone access are compulsory to proceed with the interview.");
      return;
    }

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    
    const currentId = responses[currentIndex]?._id;
    if (!currentId) return;

    const baseText = answers[currentId] || "";

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    const langCodeMap: Record<string, string> = {
      en: "en-US",
      ta: "ta-IN",
      te: "te-IN",
      hi: "hi-IN",
      ja: "ja-JP"
    };
    recognition.lang = langCodeMap[language] || "en-US";

    recognition.onstart = () => {
      setIsRecording(true);
      setActiveDuration(0);
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = setInterval(() => {
        setActiveDuration((prev) => prev + 1);
      }, 1000);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      const updatedAnswer = (baseText + " " + finalTranscript + interimTranscript).trim().replace(/\s+/g, " ");
      setAnswers(prev => ({
        ...prev,
        [currentId]: updatedAnswer
      }));
    };

    recognition.onerror = (err: any) => {
      console.error("Speech recognition error:", err);
      if (err.error !== "no-speech") {
        stopRecording();
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
  }

  // Clean up speaking & recording on transition
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    if (isRecording) {
      stopRecording();
    }
  }, [currentIndex]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleAnswerChange = (text: string) => {
    const currentId = responses[currentIndex]?._id;
    if (!currentId) return;
    setAnswers({ ...answers, [currentId]: text });
  };

  // Submit Answer Step-by-Step Conversational Recruiter loop
  const handleAnswerSubmit = async () => {
    if (isRecording) {
      stopRecording();
    }

    setSubmitting(true);
    setError("");

    const currentResponse = responses[currentIndex];
    if (!currentResponse) return;

    const currentAnswer = answers[currentResponse._id] || "";
    
    // Voice calculations
    const wordCount = currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0;
    const finalDuration = activeDuration || 5; 
    const finalSpeed = Math.round((wordCount / finalDuration) * 60);
    const finalHesitations = calculateHesitations(currentAnswer);

    try {
      const res = await fetch(`/api/interviews/${interviewId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responseId: currentResponse._id,
          answer: currentAnswer,
          duration: finalDuration,
          speakingSpeed: finalSpeed,
          hesitationCount: finalHesitations
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit answer");
      }

      if (data.isCompleted) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        router.push(data.redirectUrl);
      } else {
        // Fetch updated session and move forward
        await initSession();
        setSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || "Error submitting answer");
      setSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="loading-card glass-card">
          <Headphones className="animate-pulse primary-color" size={40} />
          <p>Connecting to secure mock recruiter server...</p>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .loading-card { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        `}</style>
      </div>
    );
  }

  if (error && !responses.length) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="glass-card error-card">
          <h2>Room Session Error</h2>
          <p>{error}</p>
          <button onClick={() => router.push("/dashboard")} className="btn btn-secondary">
            Return to Dashboard
          </button>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .error-card { padding: 40px; text-align: center; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        `}</style>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="loading-card glass-card">
          <Loader2 className="animate-spin primary-color" size={48} />
          <h2>AI Recruiter Evaluating</h2>
          <p className="eval-status-msg animate-pulse">Calculating fluency metrics & generating follow-up scenario...</p>
          <p className="eval-caution">Do not refresh or exit this page.</p>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .loading-card { padding: 50px 40px; text-align: center; display: flex; flex-direction: column; align-items: center; max-width: 480px; }
          .loading-card h2 { font-size: 24px; margin-bottom: 12px; }
          .eval-status-msg { font-size: 15px; color: var(--text-muted); min-height: 24px; margin-bottom: 16px; text-align: center; }
          .eval-caution { font-size: 12px; color: var(--text-dark); }
          .animate-spin { animation: spin 1.2s linear infinite; }
          .animate-pulse { animation: pulse 1.5s infinite ease-in-out; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  const currentResponse = responses[currentIndex];
  const currentAnswer = answers[currentResponse?._id] || "";
  const progressPercent = ((currentIndex + 1) / responses.length) * 100;

  return (
    <div className="room-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      {/* Top Session Bar */}
      <header className="room-navbar glass-card">
        <div className="room-meta">
          <span className="room-domain-badge">{domain.replace("_", " ")}</span>
          <span className="room-difficulty-badge">{difficulty} Level</span>
          <span className="room-type-badge">{interviewType} Focus</span>
        </div>
        <div className="room-timer-container">
          <Clock size={16} className="timer-icon" />
          <span className="timer-value">{formatTime(timer)}</span>
        </div>
      </header>

      {/* Main Video Call Grid */}
      <div className="video-call-grid">
        
        {/* Left/Top Tile: AI Recruiter */}
        <div className="video-tile recruiter-tile glass-card">
          <div className="tile-header">
            <div className="tile-header-left">
              <Bot size={16} />
              <span>AI Recruiter</span>
            </div>
            <span className={`status-badge-ai ${isSpeaking ? "status-speaking" : isRecording ? "status-listening" : submitting ? "status-thinking" : "status-idle"}`}>
              {isSpeaking ? "Speaking" : isRecording ? "Listening" : submitting ? "Thinking" : "Idle"}
            </span>
          </div>

          <div className="tile-body ai-body">
            <div className={`orb-container ${isSpeaking ? "orb-speaking" : isRecording ? "orb-listening" : submitting ? "orb-thinking" : ""}`}>
              <div className="orb-circle outer"></div>
              <div className="orb-circle middle"></div>
              <div className="orb-circle inner"></div>
              <div className="orb-core">
                <Cpu size={28} className="orb-cpu-icon" />
              </div>
            </div>
            
            <div className={`ai-visualizer-wrapper ${isSpeaking ? 'active' : ''}`}>
              <canvas ref={aiCanvasRef} width={280} height={50} className="ai-waveform-canvas" />
            </div>
          </div>

          <div className="live-captions-overlay">
            <p className="caption-text recruiter-caption">
              {currentResponse?.question || "Connecting..."}
            </p>
          </div>
        </div>

        {/* Right/Bottom Tile: Candidate Webcam */}
        <div className="video-tile candidate-tile glass-card">
          <div className="tile-header">
            <div className="tile-header-left">
              <User size={16} />
              <span>You (Candidate)</span>
            </div>
            {stream ? (
              <span className="status-badge status-active"><span className="ping-dot"></span> Live Webcam</span>
            ) : (
              <span className="status-badge status-inactive">Offline</span>
            )}
          </div>

          <div className="tile-body user-body">
            {videoEnabled && stream ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="webcam-video-element"
              />
            ) : (
              <div className="video-placeholder">
                <VideoOff size={44} className="placeholder-icon" />
                <p>Webcam preview is disabled</p>
              </div>
            )}
          </div>

          <div className="live-captions-overlay candidate-captions">
            <div className="canvas-visualizer-container-mini">
              <canvas ref={canvasRef} width={200} height={30} className="audio-waveform-canvas-mini" />
            </div>
            <p className="caption-text user-caption">
              {currentAnswer || <em style={{ opacity: 0.5 }}>{isRecording ? "Listening..." : "Click Mic to speak..."}</em>}
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Meeting Control Bar */}
      <footer className="meeting-control-bar glass-card">
        <div className="control-left">
          <div className="meeting-stats">
            <span>Q{currentIndex + 1} of {responses.length}</span>
            <span>•</span>
            <span>{currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0} words</span>
            <span>•</span>
            <span>{activeDuration || 0}s</span>
          </div>
        </div>

        <div className="control-center">
          <button 
            onClick={isRecording ? stopRecording : startRecording} 
            className={`meeting-icon-btn ${isRecording ? "btn-danger pulse-glow" : "btn-secondary"}`}
            title={isRecording ? "Stop Dictation" : "Dictate Response"}
          >
            {isRecording ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          
          <button 
            onClick={speakQuestion} 
            className={`meeting-icon-btn ${isSpeaking ? "btn-primary pulse-glow" : "btn-secondary"}`}
            title="Hear Question"
          >
            {isSpeaking ? <VolumeX size={22} /> : <Volume2 size={22} />}
          </button>
        </div>

        <div className="control-right">
          <button 
            onClick={handleAnswerSubmit} 
            disabled={!currentAnswer.trim() || submitting}
            className="meeting-submit-btn btn-primary"
          >
            <span>{submitting ? "Processing..." : (currentIndex + 1 >= responses.length ? "Finish & Get Report" : "Submit Answer")}</span>
            <Send size={16} />
          </button>
        </div>
      </footer>

      <style jsx>{`
        .room-wrapper {
          padding-top: 30px;
          padding-bottom: 60px;
          max-width: 1200px !important;
        }

        .room-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          margin-bottom: 30px;
          border-radius: var(--radius-md) !important;
        }

        .room-meta {
          display: flex;
          gap: 10px;
        }

        .room-domain-badge {
          font-size: 12px;
          font-weight: 700;
          text-transform: capitalize;
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          color: var(--primary-hover);
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .room-difficulty-badge, .room-type-badge {
          font-size: 12px;
          font-weight: 600;
          text-transform: capitalize;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          color: var(--text-muted);
          padding: 4px 10px;
          border-radius: 9999px;
        }

        .room-timer-container {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-main);
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          padding: 4px 12px;
          border-radius: var(--radius-sm);
        }

        .timer-icon {
          color: var(--primary);
        }

        .timer-value {
          font-family: monospace;
          font-size: 14px;
          font-weight: 600;
        }

        .room-body-grid {
          display: grid;
          grid-template-columns: 1.6fr 1fr;
          gap: 30px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .room-body-grid {
            grid-template-columns: 1fr;
          }
        }

        .room-main-panel {
          display: flex;
          flex-direction: column;
        }

        /* Progress indicator */
        .progress-indicator-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-muted);
          margin-bottom: 20px;
        }

        .progress-bar-track {
          height: 4px;
          background: rgba(15, 23, 42, 0.05);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--primary);
          border-radius: 9999px;
          transition: width 0.3s ease;
        }

        /* Question Box */
        .question-box {
          padding: 24px;
          margin-bottom: 24px;
        }

        .question-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .question-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tts-btn {
          padding: 6px 12px;
          font-size: 12px;
          height: 32px;
        }

        .tts-btn.speaking {
          background: var(--primary-glow-subtle);
          border-color: var(--primary);
          color: var(--primary-hover);
        }

        .question-text {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.5;
        }

        /* Answer Entry */
        .answer-section {
          margin-bottom: 30px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .answer-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .speech-rec-btn {
          font-size: 13px;
          padding: 6px 14px;
          height: 36px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .speech-rec-btn.recording {
          background: #ef4444;
          color: white;
          border-color: #dc2626;
        }

        .answer-textarea {
          min-height: 220px;
          resize: vertical;
          line-height: 1.6;
          font-family: inherit;
          background: var(--bg-card);
        }

        .canvas-visualizer-container {
          position: relative;
          width: 100%;
          height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: -8px;
        }

        .answer-section:has(.speech-rec-btn.recording) .canvas-visualizer-container,
        .canvas-visualizer-container:has(.visualizer-status-pulse) {
          height: 60px;
          opacity: 1;
          margin-top: 0;
          padding: 5px;
          border-color: rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.02);
        }

        .audio-waveform-canvas {
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 5px rgba(239, 68, 68, 0.5));
        }

        .visualizer-status-pulse {
          position: absolute;
          top: 8px;
          left: 12px;
          font-size: 11px;
          color: #ef4444;
          font-weight: 600;
          animation: pulse 1.5s infinite;
        }

        .word-indicator {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-dark);
          padding: 0 4px;
        }

        .voice-only-alert {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--color-warning);
          background: var(--color-warning-bg);
          border: 1px solid rgba(217, 119, 6, 0.15);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          margin-top: 4px;
        }

        /* Video Panel Styles */
        .room-video-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-radius: var(--radius-md) !important;
          background: var(--bg-card);
        }

        .video-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .video-card-header h3 {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-dark);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .status-active {
          background: var(--color-success-bg);
          color: var(--color-success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-inactive {
          background: rgba(15, 23, 42, 0.05);
          color: var(--text-dark);
          border: 1px solid var(--border);
        }

        .ping-dot {
          width: 8px;
          height: 8px;
          background: var(--color-success);
          border-radius: 50%;
          display: inline-block;
          position: relative;
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        .video-viewfinder-wrapper {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: #0f172a;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }

        .webcam-video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scaleX(-1); /* Mirror view */
        }

        .video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          color: rgba(255, 255, 255, 0.4);
        }

        .placeholder-icon {
          color: rgba(255, 255, 255, 0.2);
        }

        .media-error-banner {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(220, 38, 38, 0.9);
          color: white;
          padding: 8px 12px;
          font-size: 12px;
          text-align: center;
        }

        .video-controls-row {
          display: flex;
          gap: 10px;
        }

        .btn-control {
          flex: 1;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 38px;
        }

        .btn-active {
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.3);
          color: var(--primary-hover);
        }

        .btn-disabled {
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          color: var(--text-dark);
          opacity: 0.6;
        }

        .webcam-instructions {
          border-top: 1px dashed var(--border);
          padding-top: 16px;
        }

        .webcam-instructions h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        .webcam-instructions ul {
          padding-left: 18px;
          font-size: 12px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* Actions */
        .action-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
        }

        .submit-btn {
          flex: 1.5;
          max-width: 220px;
          justify-content: center;
          margin-left: auto;
        }

        /* AI Recruiter Avatar Card */
        .recruiter-avatar-card {
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-radius: var(--radius-md) !important;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.4);
        }

        .avatar-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .avatar-card-header h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .status-badge-ai {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .status-speaking {
          background: var(--primary-glow-subtle);
          color: var(--primary-hover);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }

        .status-listening {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-thinking {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .status-idle {
          background: rgba(100, 116, 139, 0.1);
          color: #64748b;
          border: 1px solid rgba(100, 116, 139, 0.2);
        }

        .avatar-pulse-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 10px 0;
          gap: 14px;
        }

        /* Glowing interactive Orb visualizer */
        .orb-container {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-circle {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(139, 92, 246, 0.1);
          transition: all 0.3s ease;
        }

        .orb-circle.outer {
          width: 80px;
          height: 80px;
          background: rgba(139, 92, 246, 0.03);
        }

        .orb-circle.middle {
          width: 60px;
          height: 60px;
          background: rgba(139, 92, 246, 0.06);
        }

        .orb-circle.inner {
          width: 44px;
          height: 44px;
          background: rgba(139, 92, 246, 0.12);
        }

        .orb-core {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 15px var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 2;
        }

        .orb-cpu-icon {
          color: #fff;
        }

        /* Speaking Animation: Concentric pulses */
        .orb-speaking .orb-circle.outer {
          animation: pulse-ring 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          border-color: rgba(139, 92, 246, 0.4);
          background: rgba(139, 92, 246, 0.08);
        }

        .orb-speaking .orb-circle.middle {
          animation: pulse-ring 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          animation-delay: 0.3s;
          border-color: rgba(139, 92, 246, 0.5);
        }

        .orb-speaking .orb-circle.inner {
          animation: pulse-ring 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          animation-delay: 0.6s;
        }

        .orb-speaking .orb-core {
          transform: scale(1.1);
          background: var(--primary-hover);
          box-shadow: 0 0 25px var(--primary);
        }

        /* AI Waveform Canvas */
        .ai-visualizer-wrapper {
          height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          justify-content: center;
          margin-top: -10px;
        }

        .ai-visualizer-wrapper.active {
          height: 50px;
          opacity: 1;
          margin-top: 10px;
        }

        .ai-waveform-canvas {
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
        }

        /* Listening Animation: green pulsing */
        .orb-listening .orb-core {
          background: #10b981;
          box-shadow: 0 0 20px #10b981;
        }

        .orb-listening .orb-circle.inner {
          border-color: rgba(16, 185, 129, 0.3);
          animation: listening-pulse 1.5s ease-in-out infinite;
        }

        /* Thinking Animation: orange slow breathing */
        .orb-thinking .orb-core {
          background: #f59e0b;
          box-shadow: 0 0 20px #f59e0b;
        }

        .orb-thinking .orb-circle.outer {
          transform: scale(0.95);
          animation: thinking-breath 2s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.7); opacity: 0.9; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        @keyframes listening-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 0.3; }
        }

        @keyframes thinking-breath {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.9; }
        }

        .avatar-status-text {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        /* Canvas visualizer block */
        .canvas-visualizer-container {
          padding: 12px;
          margin-top: 10px;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.02) !important;
          border: 1px dashed var(--border) !important;
          border-radius: var(--radius-sm) !important;
          overflow: hidden;
        }

        .audio-waveform-canvas {
          width: 100%;
          height: 44px;
          background: transparent;
        }

        .visualizer-status-pulse {
          font-size: 11px;
          font-weight: 600;
          color: var(--primary-hover);
          animation: text-pulse-glow 1.5s ease-in-out infinite;
        }

        @keyframes text-pulse-glow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        .candidate-feed-header {
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
}


