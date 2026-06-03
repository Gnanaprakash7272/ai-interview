"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Wrench, Briefcase, FileText, CheckCircle } from "lucide-react";

const EXPERIENCE_LEVELS = [
  { id: "fresher", name: "Fresher / Entry Level", desc: "0–1 year. Basic concepts, internship projects, academic work." },
  { id: "junior", name: "Junior (1–3 Years)", desc: "Real-world project experience with guided team support." },
  { id: "mid", name: "Mid-Level (3–6 Years)", desc: "Independent development, system design awareness." },
  { id: "senior", name: "Senior (6+ Years)", desc: "Architecture, mentorship, cross-team technical leadership." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [name, setName] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("fresher");
  const [resumeText, setResumeText] = useState("");
  const [error, setError] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [showManualText, setShowManualText] = useState(false);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    // Fetch existing user data to pre-fill name (or if they partially completed)
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/users/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.isProfileComplete) {
              router.push("/dashboard");
              return;
            }
            setName(data.user.name || "");
            if (data.user.skills && data.user.skills.length > 0) {
              setSkillsInput(data.user.skills.join(", "));
            }
            if (data.user.experienceLevel) {
              setExperienceLevel(data.user.experienceLevel);
            }
            if (data.user.resumeText) {
              setResumeText(data.user.resumeText);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load user data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please upload a valid PDF file.");
      return;
    }

    setFileLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Failed to parse PDF");
      }

      const data = await res.json();
      if (data.text) {
        setResumeText(data.text);
        // Automatically hide the manual text box if it was open
        setShowManualText(false);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to extract text from PDF. You can paste it manually.");
      setShowManualText(true);
    } finally {
      setFileLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/users/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          skills: skillsInput,
          experienceLevel,
          resumeText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save profile");
      }

      // Profile saved successfully
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="center-wrapper">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <>
      <div className="onboarding-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        
        <div className="onboarding-card glass-card">
          <div className="onboarding-header">
            <h1>Complete Your Profile</h1>
            <p>Tell us about your technical background. We use this to dynamically tailor every AI mock interview just for you.</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={handleSubmit} className="onboarding-form">
            {/* Name */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                <User size={16} />
                <span>Full Name</span>
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gnana Prakash"
                required
              />
            </div>

            {/* Skills */}
            <div className="form-group">
              <label htmlFor="skills" className="form-label">
                <Wrench size={16} />
                <span>Core Skills & Tech Stack</span>
              </label>
              <input
                id="skills"
                type="text"
                className="form-input"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="e.g. Python, React, AWS, SQL (comma separated)"
              />
              <p className="form-hint">Our AI will specifically target these tools in technical rounds.</p>
            </div>

            {/* Experience Level */}
            <div className="form-group">
              <label className="form-label">
                <Briefcase size={16} />
                <span>Experience Level</span>
              </label>
              <div className="experience-grid">
                {EXPERIENCE_LEVELS.map((level) => {
                  const isSelected = experienceLevel === level.id;
                  return (
                    <div
                      key={level.id}
                      onClick={() => setExperienceLevel(level.id)}
                      className={`exp-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="exp-indicator">
                        {isSelected && <span className="exp-dot"></span>}
                      </div>
                      <div className="exp-info">
                        <h4>{level.name}</h4>
                        <p>{level.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resume */}
            <div className="form-group">
              <label className="form-label">
                <FileText size={16} />
                <span>Upload Resume (PDF only) - Optional</span>
              </label>

              {!showManualText ? (
                <div className="file-upload-zone">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="file-input-hidden"
                    id="resume-upload"
                    disabled={fileLoading}
                  />
                  <label htmlFor="resume-upload" className="file-upload-label">
                    {fileLoading ? (
                      <div className="upload-content">
                        <Loader2 className="animate-spin primary-color mb-2" size={32} />
                        <span className="upload-title">Extracting Text...</span>
                        <span className="upload-subtitle">Please wait while we read your resume</span>
                      </div>
                    ) : fileName ? (
                      <div className="upload-content success-state">
                        <CheckCircle className="success-color mb-2" size={32} />
                        <span className="upload-title">{fileName} uploaded successfully!</span>
                        <span className="upload-subtitle">Text extracted and ready for AI analysis.</span>
                      </div>
                    ) : (
                      <div className="upload-content">
                        <div className="upload-icon-wrapper mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="primary-color"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                        </div>
                        <span className="upload-title">Click to upload your resume</span>
                        <span className="upload-subtitle">Supported formats: PDF (Max 5MB)</span>
                      </div>
                    )}
                  </label>
                  
                  {fileName && (
                    <button 
                      type="button" 
                      className="text-btn toggle-manual-btn mt-3"
                      onClick={() => setShowManualText(true)}
                    >
                      View / Edit extracted text manually
                    </button>
                  )}
                  {!fileName && (
                    <button 
                      type="button" 
                      className="text-btn toggle-manual-btn mt-3"
                      onClick={() => setShowManualText(true)}
                    >
                      Or paste text manually
                    </button>
                  )}
                </div>
              ) : (
                <div className="manual-text-zone">
                  <div className="manual-text-header">
                    <span className="form-hint">Edit your extracted text below or paste it manually.</span>
                    <button 
                      type="button" 
                      className="text-btn small-btn"
                      onClick={() => setShowManualText(false)}
                    >
                      Cancel / Back to Upload
                    </button>
                  </div>
                  <textarea
                    id="resume"
                    className="form-input custom-textarea"
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Paste your resume text here... The AI recruiter will ask deep-dive questions based on your projects and experience."
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn btn-primary submit-btn" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          </form>
        </div>

        <style jsx>{`
          .center-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }

          .onboarding-wrapper {
            padding-top: 100px;
            padding-bottom: 80px;
            display: flex;
            justify-content: center;
          }

          .onboarding-card {
            width: 100%;
            max-width: 680px;
            padding: 40px;
          }

          @media (max-width: 600px) {
            .onboarding-card { padding: 24px; }
          }

          .onboarding-header {
            text-align: center;
            margin-bottom: 32px;
          }

          .onboarding-header h1 {
            font-size: 28px;
            margin-bottom: 8px;
          }

          .onboarding-header p {
            font-size: 14px;
            color: var(--text-muted);
            line-height: 1.5;
          }

          .error-banner {
            background: rgba(220, 38, 38, 0.1);
            border: 1px solid rgba(220, 38, 38, 0.3);
            color: #ef4444;
            padding: 12px;
            border-radius: var(--radius-sm);
            margin-bottom: 24px;
            font-size: 14px;
            text-align: center;
          }

          .onboarding-form {
            display: flex;
            flex-direction: column;
            gap: 24px;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .form-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--text-main);
          }

          .form-hint {
            font-size: 12px;
            color: var(--text-dark);
            margin-top: 2px;
          }

          .custom-textarea {
            min-height: 120px;
            resize: vertical;
          }

          /* Experience Grid */
          .experience-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          @media (max-width: 600px) {
            .experience-grid { grid-template-columns: 1fr; }
          }

          .exp-card {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            background: rgba(15, 23, 42, 0.02);
            border: 1px solid var(--border);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .exp-card:hover {
            border-color: var(--border-hover);
            background: rgba(15, 23, 42, 0.04);
          }

          .exp-card.selected {
            border-color: var(--primary);
            background: var(--primary-glow-subtle);
            box-shadow: var(--shadow-glow);
          }

          .exp-indicator {
            width: 18px;
            height: 18px;
            border-radius: 9999px;
            border: 2px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
            transition: border-color 0.2s;
          }

          .exp-card.selected .exp-indicator {
            border-color: var(--primary);
          }

          .exp-dot {
            width: 8px;
            height: 8px;
            background: var(--primary);
            border-radius: 9999px;
          }

          .exp-info h4 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
            color: var(--text-main);
          }

          .exp-info p {
            font-size: 12px;
            color: var(--text-muted);
            line-height: 1.4;
          }

          .submit-btn {
            height: 50px;
            margin-top: 12px;
            font-size: 15px;
          }

          /* File Upload Styles */
          .file-upload-zone {
            display: flex;
            flex-direction: column;
            width: 100%;
          }

          .file-input-hidden {
            display: none;
          }

          .file-upload-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 32px 24px;
            background: rgba(15, 23, 42, 0.02);
            border: 2px dashed var(--border);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
            min-height: 160px;
          }

          .file-upload-label:hover {
            border-color: var(--primary);
            background: rgba(15, 23, 42, 0.04);
          }

          .file-upload-label:active {
            transform: scale(0.99);
          }

          .upload-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }

          .upload-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-main);
          }

          .upload-subtitle {
            font-size: 13px;
            color: var(--text-muted);
          }

          .success-state {
            color: var(--success);
          }

          .text-btn {
            background: none;
            border: none;
            color: var(--primary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            padding: 0;
            text-decoration: underline;
            text-decoration-color: transparent;
            transition: all 0.2s;
          }

          .text-btn:hover {
            text-decoration-color: var(--primary);
          }

          .small-btn {
            font-size: 12px;
          }

          .toggle-manual-btn {
            align-self: flex-start;
          }

          .manual-text-zone {
            display: flex;
            flex-direction: column;
            gap: 8px;
            animation: fadeIn 0.3s ease;
          }

          .manual-text-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </>
  );
}
