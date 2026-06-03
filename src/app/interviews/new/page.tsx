"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Code2, Server, Compass, ClipboardList, Loader2, Award, Zap, 
  Cpu, BarChart2, ShieldAlert, FileText, Globe, UserCheck, Building2,
  User, Wrench, Briefcase, CheckCircle
} from "lucide-react";
import allCompanies from "@/data/allCompanies.json";
import companyQuestions from "@/data/companyQuestions.json";

const JOB_ROLES = [
  { id: "cloud_engineer", name: "Cloud Engineer", icon: Cpu, desc: "AWS, Cloud architecture, Terraform, serverless, VPC networks, scaling." },
  { id: "software_developer", name: "Software Developer", icon: Code2, desc: "Full-stack development, algorithms, design patterns, clean code, database schemas." },
  { id: "devops_engineer", name: "DevOps Engineer", icon: Server, desc: "CI/CD pipelines, Docker, Kubernetes, Linux systems, infrastructure automation." },
  { id: "uiux_designer", name: "UI/UX Designer", icon: Compass, desc: "User research, wireframing, high-fidelity mockups, UI heuristics, Figma." },
  { id: "data_analyst", name: "Data Analyst", icon: BarChart2, desc: "SQL, Python, data visualization, statistics, ETL pipelines, dashboards." },
  { id: "cybersecurity_analyst", name: "Cybersecurity Analyst", icon: ShieldAlert, desc: "Network security, cryptography, penetration testing, IAM, threat models." }
];

const DIFFICULTIES = [
  { id: "beginner", name: "Beginner", desc: "Core concepts, basic definitions, standard terminology, and basic procedures." },
  { id: "intermediate", name: "Intermediate", desc: "Real-world trade-offs, standard designs, troubleshooting, and tool operations." },
  { id: "advanced", name: "Advanced", desc: "System architecture, advanced security models, high-scale engineering, complex trade-offs." }
];

const INTERVIEW_TYPES = [
  { id: "technical", name: "Technical Interview", desc: "Focuses strictly on coding logic, system design, technical accuracy, and toolsets." },
  { id: "hr", name: "HR Interview", desc: "Assess culture fit, behavioral questions, work ethic, situational scenarios, and motivation." },
  { id: "mixed", name: "Mixed Interview", desc: "A combined session grading both engineering knowledge and behavioral communication." }
];

const LANGUAGES = [
  { id: "en", name: "English", flag: "🇬🇧", desc: "Global Professional English" },
  { id: "ta", name: "Tamil (தமிழ்)", flag: "🇮🇳", desc: "தமிழ் நேர்காணல்" },
  { id: "te", name: "Telugu (తెలుగు)", flag: "🇮🇳", desc: "తెలుగు ఇంటర్వ్యూ" },
  { id: "hi", name: "Hindi (हिन्दी)", flag: "🇮🇳", desc: "हिन्दी साक्षात्कार" },
  { id: "ja", name: "Japanese (日本語)", flag: "🇯🇵", desc: "日本語面接" }
];

const EXPERIENCE_LEVELS = [
  { id: "fresher", name: "Fresher / Entry Level", desc: "0–1 year. Basic concepts, internship projects, academic work." },
  { id: "junior", name: "Junior (1–3 Years)", desc: "Real-world project experience with guided team support." },
  { id: "mid", name: "Mid-Level (3–6 Years)", desc: "Independent development, system design awareness." },
  { id: "senior", name: "Senior (6+ Years)", desc: "Architecture, mentorship, cross-team technical leadership." },
];

const QUESTION_COUNTS = [3, 5];

const COMPANIES = Object.entries(companyQuestions).map(([id, data]: [string, any]) => ({
  id,
  name: data.name,
  desc: data.focus.length > 80 ? data.focus.substring(0, 77) + "..." : data.focus,
  domain: data.domain || null
}));

const getCompanyDomain = (name: string) => {
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanName}.com`;
};

const LOADING_STEPS = [
  "Analyzing selected recruiter guidelines...",
  "Calibrating system parameters for dynamic voice feedback...",
  "Querying Google Gemini AI for customized job role scenarios...",
  "Validating and compiling test structures...",
  "Setting up the live conversational mock environment..."
];

export default function NewInterview() {
  const router = useRouter();
  const [jobRole, setJobRole] = useState("software_developer");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [interviewType, setInterviewType] = useState("technical");
  const [language, setLanguage] = useState("en");
  const [questionCount, setQuestionCount] = useState(3);
  const [targetCompany, setTargetCompany] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Candidate Profile (NEW)
  const [candidateName, setCandidateName] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("fresher");
  
  // Custom Inputs
  const [resumeText, setResumeText] = useState("");
  const [jobDescriptionText, setJobDescriptionText] = useState("");
  const [showResumeInput, setShowResumeInput] = useState(false);
  const [showJdInput, setShowJdInput] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [showManualText, setShowManualText] = useState(false);
  const [fileName, setFileName] = useState("");

  const isFeaturedSelected = COMPANIES.some(item => item.id === targetCompany);
  const customSelectedName = !isFeaturedSelected && targetCompany !== "general"
    ? allCompanies.find(c => c.id === targetCompany)?.name || (targetCompany.charAt(0).toUpperCase() + targetCompany.slice(1))
    : "";

  const filteredCompanies = searchQuery.trim() === ""
    ? allCompanies
    : allCompanies.filter(comp =>
        comp.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Fetch candidate profile to pre-fill fields
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.name) setCandidateName(data.user.name);
            if (data.user.skills && data.user.skills.length > 0) setSkillsInput(data.user.skills.join(", "));
            if (data.user.experienceLevel) setExperienceLevel(data.user.experienceLevel);
            if (data.user.resumeText) {
              setResumeText(data.user.resumeText);
              setShowResumeInput(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    };
    fetchProfile();
  }, []);

  // Cycle through loading steps to keep user wowed
  useEffect(() => {
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }

    setFileLoading(true);
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
        setShowManualText(false);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to extract text from PDF. You can paste it manually.");
      setShowManualText(true);
    } finally {
      setFileLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      // Parse skills from comma-separated string
      const skillsArray = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          domain: jobRole, 
          difficulty, 
          interviewType, 
          language, 
          questionCount,
          resumeText,
          jobDescriptionText,
          targetCompany,
          // New candidate profile fields
          candidateName: candidateName.trim() || "Candidate",
          skills: skillsArray,
          experienceLevel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize interview");
      }

      router.push(`/interviews/${data.interview._id}/setup`);
    } catch (error) {
      console.error(error);
      alert("Error starting interview. Please check your network and API key settings.");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="loader-card glass-card">
          <Loader2 className="animate-spin spinner-icon" size={48} />
          <h2>Preparing Interview Room</h2>
          <p className="step-message animate-pulse">{LOADING_STEPS[loadingStep]}</p>
          <div className="loader-progress">
            <div 
              className="loader-progress-bar" 
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <style jsx>{`
          .loader-wrapper {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 120px);
          }
          .loader-card {
            width: 100%;
            max-width: 500px;
            padding: 50px 40px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .spinner-icon {
            color: var(--primary);
            margin-bottom: 24px;
          }
          .loader-card h2 {
            font-size: 24px;
            margin-bottom: 12px;
          }
          .step-message {
            font-size: 14px;
            color: var(--text-muted);
            min-height: 20px;
            margin-bottom: 30px;
          }
          .loader-progress {
            width: 100%;
            height: 4px;
            background: rgba(15, 23, 42, 0.05);
            border-radius: 9999px;
            overflow: hidden;
          }
          .loader-progress-bar {
            height: 100%;
            background: var(--primary);
            border-radius: 9999px;
            transition: width 0.5s ease-in-out;
          }
          .animate-spin {
            animation: spin 1.2s linear infinite;
          }
          .animate-pulse {
            animation: pulse 1.5s infinite ease-in-out;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="setup-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      <header className="setup-header">
        <h1>Personalize Your Interview</h1>
        <p>Configure your target role, company, and difficulty to generate a dynamic interview session.</p>
      </header>

      <div className="setup-body">

        {/* ─── Candidate Profile Section (NEW) ─── */}
        <section className="setup-section candidate-profile-section">
          <h2>0. Candidate Profile</h2>
          <div className="candidate-profile-grid glass-card">

            {/* Candidate Name */}
            <div className="profile-field">
              <label className="profile-label" htmlFor="candidate-name">
                <User size={15} />
                <span>Your Name</span>
              </label>
              <input
                id="candidate-name"
                type="text"
                className="form-input profile-input"
                placeholder="e.g. Gnana Prakash"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Skills / Tech Stack */}
            <div className="profile-field">
              <label className="profile-label" htmlFor="skills-input">
                <Wrench size={15} />
                <span>Skills / Tech Stack</span>
              </label>
              <input
                id="skills-input"
                type="text"
                className="form-input profile-input"
                placeholder="e.g. Python, TensorFlow, SQL, React (comma-separated)"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
              />
              <p className="profile-hint">Gemini will ask questions tailored to these specific skills.</p>
            </div>

            {/* Experience Level */}
            <div className="profile-field profile-field-full">
              <label className="profile-label">
                <Briefcase size={15} />
                <span>Experience Level</span>
              </label>
              <div className="experience-grid">
                {EXPERIENCE_LEVELS.map((level) => {
                  const isSelected = experienceLevel === level.id;
                  return (
                    <button
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
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* Job Role Section */}
        <section className="setup-section">
          <h2>1. Target Job Role</h2>
          <div className="selection-grid">
            {JOB_ROLES.map((item) => {
              const Icon = item.icon;
              const isSelected = jobRole === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setJobRole(item.id)}
                  className={`selection-card glass-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="card-top-row">
                    <div className="icon-badge">
                      <Icon size={20} />
                    </div>
                    {isSelected && <span className="active-dot animate-pulse-glow"></span>}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Target Company Section */}
        <section className="setup-section">
          <h2>2. Target MNC Company</h2>
          <div className="selection-grid">
            {COMPANIES.map((item) => {
              const isSelected = targetCompany === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTargetCompany(item.id);
                    setSearchQuery("");
                  }}
                  className={`selection-card glass-card ${isSelected ? "selected" : ""}`}
                >
                  <div className="card-top-row">
                    <div className="icon-badge company-logo-badge">
                      {item.domain ? (
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${item.domain}&sz=128`}
                          alt={`${item.name} logo`}
                          className="company-logo"
                          onError={(e) => {
                            // Fallback to building icon if logo fails to load
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : (
                        <Building2 size={20} />
                      )}
                      {/* Fallback icon container in case image fails */}
                      {item.domain && (
                        <div className="fallback-svg" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={20} />
                        </div>
                      )}
                    </div>
                    {isSelected && <span className="active-dot animate-pulse-glow"></span>}
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                </button>
              );
            })}

            {/* Custom Company Card */}
            {!isFeaturedSelected && targetCompany !== "general" && (
              <button
                onClick={() => {
                  setTargetCompany("general");
                  setSearchQuery("");
                }}
                className="selection-card glass-card selected custom-company-card animate-pulse-glow"
              >
                <div className="card-top-row">
                  <div className="icon-badge company-logo-badge custom-selected">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${getCompanyDomain(customSelectedName)}&sz=128`}
                      alt={`${customSelectedName} logo`}
                      className="company-logo"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="fallback-svg" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={20} />
                    </div>
                  </div>
                  <span className="active-dot animate-pulse-glow"></span>
                </div>
                <h3>{customSelectedName}</h3>
                <p>Custom target company selected. AI Recruiter will dynamically structure your interview questions around {customSelectedName}&apos;s real recruitment style.</p>
              </button>
            )}
          </div>

          {/* Search autocomplete select */}
          <div className="search-company-container">
            <div className="search-company-bar glass-card">
              <Building2 size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Or search other 300+ companies (e.g. Flipkart, Deloitte, Oracle, Capgemini, Wipro...)"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="search-company-input"
              />
              {showDropdown && filteredCompanies.length > 0 && (
                <div className="search-dropdown-menu glass-card">
                  {filteredCompanies.map((comp) => (
                    <button
                      key={comp.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setTargetCompany(comp.id);
                        setSearchQuery("");
                        setShowDropdown(false);
                      }}
                      className="search-dropdown-item"
                    >
                      <div className="dropdown-logo-wrapper">
                        <img 
                          src={`https://www.google.com/s2/favicons?domain=${getCompanyDomain(comp.name)}&sz=32`}
                          alt=""
                          className="dropdown-company-logo"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="fallback-svg" style={{ display: 'none', alignItems: 'center', justifyContent: 'center' }}>
                          <Building2 size={12} />
                        </div>
                      </div>
                      {comp.name}
                    </button>
                  ))}
                </div>
              )}
              {showDropdown && searchQuery.trim() !== "" && filteredCompanies.length === 0 && (
                <div className="search-dropdown-menu glass-card no-results">
                  No matching companies found. Recruiter will use General guidelines.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Layout split */}
        <div className="setup-split-main">
          
          {/* Left Column: Difficulty, Type, Language */}
          <div className="setup-left-column">
            
            {/* Experience Level */}
            <section className="setup-section">
              <h2>3. Difficulty Level</h2>
              <div className="options-stack">
                {DIFFICULTIES.map((item) => {
                  const isSelected = difficulty === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setDifficulty(item.id)}
                      className={`option-row glass-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="option-checkbox">
                        {isSelected && <span className="checkbox-dot"></span>}
                      </div>
                      <div className="option-content">
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Interview Type */}
            <section className="setup-section">
              <h2>4. Interview Focus Type</h2>
              <div className="options-stack">
                {INTERVIEW_TYPES.map((item) => {
                  const isSelected = interviewType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setInterviewType(item.id)}
                      className={`option-row glass-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="option-checkbox">
                        {isSelected && <span className="checkbox-dot"></span>}
                      </div>
                      <div className="option-content">
                        <h4>{item.name}</h4>
                        <p>{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Language Selection */}
            <section className="setup-section">
              <h2>5. Recruiter Language</h2>
              <div className="language-grid">
                {LANGUAGES.map((lang) => {
                  const isSelected = language === lang.id;
                  return (
                    <button
                      key={lang.id}
                      onClick={() => setLanguage(lang.id)}
                      className={`lang-card glass-card ${isSelected ? "selected" : ""}`}
                    >
                      <div className="lang-flag">{lang.flag}</div>
                      <div className="lang-info">
                        <h4>{lang.name}</h4>
                        <p>{lang.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Right Column: Custom Inputs & Formats */}
          <div className="setup-right-column">
            
            {/* Format Settings */}
            <section className="setup-section">
              <h2>6. Session Options</h2>
              <div className="glass-card count-panel">
                <div className="count-label-row">
                  <ClipboardList size={18} className="primary-color" />
                  <h4>Total Interview Questions</h4>
                </div>
                <div className="count-selector">
                  {QUESTION_COUNTS.map((count) => (
                    <button
                      key={count}
                      onClick={() => setQuestionCount(count)}
                      className={`count-btn ${questionCount === count ? "active" : ""}`}
                    >
                      {count} Questions
                    </button>
                  ))}
                </div>
                <div className="info-box">
                  <Zap size={14} className="info-icon" />
                  <p>All answers must be spoken into the microphone. Voice duration, pauses, and fluency are measured.</p>
                </div>
              </div>
            </section>

            {/* Advanced Resumes/Job Description Uploads */}
            <section className="setup-section">
              <h2>7. Advanced Tailoring (Optional)</h2>
              <div className="glass-card uploads-panel">
                
                {/* Resume section */}
                <div className="tailor-option">
                  <button 
                    onClick={() => setShowResumeInput(!showResumeInput)}
                    className={`btn btn-secondary tailor-toggle-btn ${showResumeInput ? "active-toggle" : ""}`}
                  >
                    <FileText size={16} />
                    <span>{showResumeInput ? "Hide Resume Panel" : "Custom Resume-Based"}</span>
                  </button>
                  
                  {showResumeInput && (
                    <div className="tailor-input-wrapper mt-3">
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
                            id="resume-text"
                            className="form-input custom-textarea"
                            value={resumeText}
                            onChange={(e) => setResumeText(e.target.value)}
                            placeholder="Paste your resume text here... The AI recruiter will ask deep-dive questions based on your projects and experience."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Job Description section */}
                <div className="tailor-option">
                  <button 
                    onClick={() => setShowJdInput(!showJdInput)}
                    className={`btn btn-secondary tailor-toggle-btn ${showJdInput ? "active-toggle" : ""}`}
                  >
                    <FileText size={16} />
                    <span>{showJdInput ? "Hide JD Panel" : "Custom JD-Based"}</span>
                  </button>
                  
                  {showJdInput && (
                    <div className="tailor-input-wrapper">
                      <label className="form-label" htmlFor="jd-text">Paste Job Description</label>
                      <textarea
                        id="jd-text"
                        className="form-input custom-textarea"
                        placeholder="Paste the target Job Description (JD) here. AI Recruiter will design custom company questions mapping to required skills..."
                        value={jobDescriptionText}
                        onChange={(e) => setJobDescriptionText(e.target.value)}
                      ></textarea>
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Launch Button */}
            <div className="launch-section">
              <button onClick={handleStart} className="btn btn-primary start-session-btn animate-pulse-glow">
                <span>Launch Mock Interview</span>
                <Award size={18} />
              </button>
            </div>

          </div>
        </div>

      </div>

      <style jsx>{`
        .setup-wrapper {
          padding-top: 40px;
          padding-bottom: 80px;
        }

        /* ─── Candidate Profile ─── */
        .candidate-profile-section {
          margin-bottom: 0;
        }

        .candidate-profile-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          padding: 28px;
          margin-bottom: 40px;
        }

        @media (max-width: 768px) {
          .candidate-profile-grid {
            grid-template-columns: 1fr;
          }
        }

        .profile-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .profile-field-full {
          grid-column: 1 / -1;
        }

        .profile-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .profile-input {
          height: 42px;
          font-size: 14px;
        }

        .profile-hint {
          font-size: 11px;
          color: var(--text-dark);
          margin-top: -2px;
        }

        .experience-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
        }

        .exp-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          cursor: pointer;
          text-align: left;
          width: 100%;
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
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .exp-info p {
          font-size: 11px;
          color: var(--text-dark);
          line-height: 1.4;
        }

        .setup-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .setup-header h1 {
          font-size: 32px;
          margin-bottom: 6px;
        }

        .setup-section h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-muted);
          margin-bottom: 18px;
          letter-spacing: 0.02em;
        }

        /* Selection Cards */
        .selection-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .custom-company-card {
          border-style: dashed;
          background: rgba(124, 58, 237, 0.05);
        }

        .icon-badge.custom-selected {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary-hover);
        }

        .search-company-container {
          margin-top: -10px;
          margin-bottom: 40px;
          width: 100%;
        }

        .search-company-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          position: relative;
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          background: var(--bg-card);
          box-shadow: var(--shadow-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .search-company-bar.glass-card:hover {
          transform: none;
          border-color: var(--border-hover);
          background: var(--bg-card-hover);
        }

        .search-company-bar:focus-within {
          border-color: var(--primary);
          box-shadow: var(--shadow-md), var(--shadow-glow);
          background: #ffffff;
        }

        .search-icon {
          color: var(--text-muted);
          flex-shrink: 0;
          transition: color 0.2s ease;
        }

        .search-company-bar:focus-within .search-icon {
          color: var(--primary);
        }

        .search-company-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-main);
          font-size: 14px;
          width: 100%;
        }

        .search-company-input::placeholder {
          color: var(--text-muted);
          opacity: 0.8;
        }

        .search-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 100%;
          max-height: 250px;
          overflow-y: auto;
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
          padding: 8px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid var(--border);
        }

        .search-dropdown-menu::-webkit-scrollbar {
          width: 6px;
        }
        .search-dropdown-menu::-webkit-scrollbar-track {
          background: transparent;
        }
        .search-dropdown-menu::-webkit-scrollbar-thumb {
          background: rgba(124, 58, 237, 0.2);
          border-radius: 9999px;
        }
        .search-dropdown-menu::-webkit-scrollbar-thumb:hover {
          background: var(--primary);
        }

        .search-dropdown-item {
          width: 100%;
          padding: 12px 16px;
          text-align: left;
          background: transparent;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: background 0.2s ease;
        }

        .dropdown-logo-wrapper {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          background: #fff;
          border-radius: 4px;
          overflow: hidden;
        }

        .dropdown-company-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .search-dropdown-item:hover {
          background: rgba(15, 23, 42, 0.05);
        }

        .search-dropdown-item::after {
          content: '→';
          opacity: 0;
          transform: translateX(-6px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--primary);
          font-weight: bold;
        }

        .search-dropdown-item:hover {
          background: var(--primary-glow);
          color: var(--primary);
          padding-left: 24px;
        }

        .search-dropdown-item:hover::after {
          opacity: 1;
          transform: translateX(0);
        }

        .search-dropdown-menu.no-results {
          padding: 20px;
          font-size: 14px;
          color: var(--text-muted);
          text-align: center;
        }

        .selection-card {
          padding: 24px;
          text-align: left;
          cursor: pointer;
          width: 100%;
        }

        .selection-card.selected {
          border-color: var(--primary);
          background: var(--primary-glow-subtle);
          box-shadow: var(--shadow-md), var(--shadow-glow);
        }

        .card-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .icon-badge {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-main);
          transition: all 0.2s ease;
          overflow: hidden;
        }

        .company-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .fallback-icon .fallback-svg {
          display: flex !important;
          align-items: center;
          justify-content: center;
        }

        .selection-card.selected .icon-badge {
          background: var(--primary);
          color: #fff;
          border-color: var(--primary-hover);
        }

        .selection-card.selected .company-logo {
          background: #fff;
          border-radius: var(--radius-sm);
          padding: 2px;
        }

        .active-dot {
          width: 8px;
          height: 8px;
          background: var(--primary-hover);
          border-radius: 9999px;
        }

        .selection-card h3 {
          font-size: 17px;
          margin-bottom: 8px;
        }

        .selection-card p {
          font-size: 13px;
          line-height: 1.5;
        }

        /* Split layout */
        .setup-split-main {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 40px;
        }

        @media (max-width: 900px) {
          .setup-split-main {
            grid-template-columns: 1fr;
          }
        }

        .options-stack {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 30px;
        }

        .option-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .option-row.selected {
          border-color: var(--primary);
          background: var(--primary-glow-subtle);
        }

        .option-checkbox {
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .option-row.selected .option-checkbox {
          border-color: var(--primary);
        }

        .checkbox-dot {
          width: 10px;
          height: 10px;
          background: var(--primary);
          border-radius: 9999px;
        }

        .option-content h4 {
          font-size: 15px;
          margin-bottom: 2px;
        }

        .option-content p {
          font-size: 12px;
        }

        /* Language Selector */
        .language-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 30px;
        }

        .lang-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          text-align: left;
          width: 100%;
        }

        .lang-card.selected {
          border-color: var(--primary);
          background: var(--primary-glow-subtle);
        }

        .lang-flag {
          font-size: 24px;
        }

        .lang-info h4 {
          font-size: 14px;
          margin-bottom: 1px;
        }

        .lang-info p {
          font-size: 11px;
          color: var(--text-dark);
        }

        /* Format Settings */
        .count-panel {
          padding: 24px;
          margin-bottom: 30px;
        }

        .count-label-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .primary-color { color: var(--primary); }

        .count-label-row h4 {
          font-size: 15px;
        }

        .count-selector {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
        }

        .count-btn {
          flex: 1;
          padding: 10px;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .count-btn:hover {
          background: rgba(15, 23, 42, 0.05);
          color: var(--text-main);
        }

        .count-btn.active {
          background: var(--primary-glow-subtle);
          border-color: var(--primary);
          color: var(--primary-hover);
        }

        .info-box {
          display: flex;
          gap: 8px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px dashed var(--border);
          padding: 10px;
          border-radius: var(--radius-sm);
        }

        .info-icon {
          color: var(--color-info);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .info-box p {
          font-size: 11px;
          color: var(--text-dark);
        }

        /* Custom tailoring panels */
        .uploads-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 30px;
        }

        .tailor-option {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .tailor-toggle-btn {
          width: 100%;
          justify-content: flex-start;
          gap: 8px;
          height: 38px;
          font-size: 13px;
        }

        .active-toggle {
          background: var(--primary-glow-subtle);
          border-color: var(--primary);
          color: var(--primary-hover);
        }

        .tailor-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 6px;
          animation: slideDown 0.25s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
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

        .custom-textarea {
          min-height: 120px;
          font-size: 13px;
          resize: vertical;
        }

        .launch-section {
          margin-top: 20px;
        }

        .start-session-btn {
          width: 100%;
          height: 48px;
        }
      `}</style>
    </div>
  );
}

