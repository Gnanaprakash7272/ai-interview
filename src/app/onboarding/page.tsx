"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Wrench, Briefcase, FileText, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

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
      <Navbar />
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
              <label htmlFor="resume" className="form-label">
                <FileText size={16} />
                <span>Paste Resume (Optional)</span>
              </label>
              <textarea
                id="resume"
                className="form-input custom-textarea"
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here... The AI recruiter will ask deep-dive questions based on your projects and experience."
              />
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
        `}</style>
      </div>
    </>
  );
}
