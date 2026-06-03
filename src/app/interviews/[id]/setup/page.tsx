"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Video, Mic, AlertCircle, Play, Square } from "lucide-react";

export default function SystemSetupPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: interviewId } = use(params);

  // States
  const [cameraAccess, setCameraAccess] = useState<boolean | null>(null);
  const [micAccess, setMicAccess] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Request Permissions on load
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    
    async function requestPermissions() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        activeStream = mediaStream;
        setStream(mediaStream);
        setCameraAccess(true);
        setMicAccess(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.error("Permission error:", err);
        // Fallback: check individually if one fails
        checkIndividualPermissions();
      }
    }

    async function checkIndividualPermissions() {
      try {
        const vidStream = await navigator.mediaDevices.getUserMedia({ video: true });
        vidStream.getTracks().forEach(t => t.stop());
        setCameraAccess(true);
      } catch (e) {
        setCameraAccess(false);
      }

      try {
        const audStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audStream.getTracks().forEach(t => t.stop());
        setMicAccess(true);
      } catch (e) {
        setMicAccess(false);
      }
    }

    requestPermissions();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Visualizer Logic
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
      analyser.fftSize = 256;
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
        const barWidth = (width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height;
          ctx.fillStyle = `rgb(14, 165, 233)`; // Modern blue
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

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  const handleProceed = () => {
    if (cameraAccess && micAccess && isConfirmed) {
      // Stop the setup stream before entering interview
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      router.push(`/interviews/${interviewId}`);
    }
  };

  const allReady = cameraAccess && micAccess && isConfirmed;

  return (
    <div className="setup-page-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      <div className="setup-container">
        
        {/* Left Side: Instructions and Checks */}
        <div className="setup-left-panel">
          <div className="setup-header-text">
            <h2>System Permissions Setup</h2>
            <p>Activates checks that maintain the integrity of your interview.</p>
          </div>

          <div className="setup-checks-list">
            
            {/* Camera Check */}
            <div className={`setup-check-item glass-card ${cameraAccess === true ? "success" : cameraAccess === false ? "error" : "loading"}`}>
              <div className="check-icon-wrapper">
                {cameraAccess === true ? <CheckCircle2 size={24} className="success-icon" /> : <Video size={24} />}
              </div>
              <div className="check-details">
                <h3>Camera Access</h3>
                <p>Required for face verification and monitoring during the assessment.</p>
              </div>
            </div>

            {/* Mic Check */}
            <div className={`setup-check-item glass-card ${micAccess === true ? "success" : micAccess === false ? "error" : "loading"}`}>
              <div className="check-icon-wrapper">
                {micAccess === true ? <CheckCircle2 size={24} className="success-icon" /> : <Mic size={24} />}
              </div>
              <div className="check-details">
                <h3>Audio Check</h3>
                <p>Required to ensure your microphone is working correctly and audio can be captured.</p>
              </div>
            </div>

          </div>

          <div className="setup-note-box glass-card">
            <h4>Please note:</h4>
            <ul>
              <li>We will access your camera feed for monitoring purposes during the assessment.</li>
              <li>You must be the registered candidate and take the assessment without external help.</li>
              <li>Your face should remain clearly visible throughout the assessment duration.</li>
            </ul>
          </div>
        </div>

        {/* Right Side: Preview & Voice Test */}
        <div className="setup-right-panel">
          
          <div className="setup-preview-card glass-card">
            <div className="preview-header">
              <AlertCircle size={18} />
              <span>Important Instructions</span>
            </div>

            <div className="webcam-preview-container">
              {stream ? (
                <video ref={videoRef} autoPlay playsInline muted className="setup-webcam-video" />
              ) : (
                <div className="webcam-placeholder">
                  <Video size={48} />
                  <p>Requesting camera access...</p>
                </div>
              )}
            </div>

            <div className="audio-test-section">
              <h4>Audio Check & Voice Verification</h4>
              <p className="test-instruction">
                Click on <strong>Start</strong> and read the sentence below to test your microphone:
              </p>
              <div className="test-sentence">
                "Hi, I am here to complete this assessment. I confirm that I am taking this test honestly."
              </div>
              
              <div className="audio-test-controls">
                <button onClick={toggleRecording} className={`test-mic-btn ${isRecording ? "recording" : ""}`}>
                  {isRecording ? (
                    <><Square size={16} /> Stop</>
                  ) : (
                    <><Play size={16} /> Start</>
                  )}
                </button>
                <div className="visualizer-container">
                  <canvas ref={canvasRef} width={200} height={30} className="setup-waveform-canvas" />
                </div>
              </div>
            </div>

          </div>
          
        </div>

      </div>

      <div className="setup-footer">
        <label className="confirm-checkbox-container">
          <input 
            type="checkbox" 
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
          />
          <span className="checkbox-text">
            I confirm that my voice is clearly audible, my microphone is working properly, and my face is visible. I understand that audio and video will be required during this assessment.
          </span>
        </label>
        
        <button 
          onClick={handleProceed} 
          disabled={!allReady}
          className="btn btn-primary setup-proceed-btn"
        >
          I understand, proceed
        </button>
      </div>

    </div>
  );
}
