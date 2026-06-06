"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { 
  Building2, ArrowLeft, Play, Calendar, HelpCircle, 
  CheckCircle, Target, BookOpen, Sparkles, ExternalLink, Award, Loader2
} from "lucide-react";
import companyQuestions from "@/data/companyQuestions.json";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CompanyDetailPage({ params }: PageProps) {
  const router = useRouter();
  const [launching, setLaunching] = useState(false);
  const { id } = use(params);
  const companyKey = id.toLowerCase();
  const company = (companyQuestions as any)[companyKey];

  if (!company) {
    notFound();
  }

  const domain = company.domain || `${companyKey}.com`;

  const handleLaunchInterview = async () => {
    setLaunching(true);
    try {
      // 1. Fetch user profile to get candidate info
      const profileRes = await fetch("/api/users/profile");
      
      // If unauthorized, redirect to login
      if (profileRes.status === 401) {
        router.push(`/login?callbackUrl=/companies/${companyKey}`);
        return;
      }
      
      let profileData: any = {};
      if (profileRes.ok) {
        const data = await profileRes.json();
        profileData = data.user || {};
      }

      // 2. Initialize the mock interview session
      const skillsArray = profileData.skills || [];
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: "software_developer", // Default to Software Developer
          difficulty: "intermediate",    // Default to Intermediate
          interviewType: "technical",    // Default to Technical
          language: "en",                // Default to English
          questionCount: 3,              // Default to 3 Questions
          resumeText: profileData.resumeText || "",
          jobDescriptionText: "",
          targetCompany: companyKey,
          candidateName: profileData.name || "Candidate",
          skills: skillsArray,
          experienceLevel: profileData.experienceLevel || "fresher"
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to initialize interview");
      }

      const interviewData = await res.json();
      
      // 3. Redirect to the interview setup room
      router.push(`/interviews/${interviewData.interview._id}/setup`);
    } catch (error: any) {
      console.error("Error launching interview:", error);
      alert(error.message || "Failed to launch mock interview. Please try again.");
      setLaunching(false);
    }
  };

  // Default timeline for other companies
  const defaultRounds = [
    {
      name: "Online Assessment",
      description: "A timed assessment (60-90 mins) focusing on algorithmic coding problems (usually LeetCode Easy-Medium) and core technical MCQs."
    },
    {
      name: "Technical Coding Round 1",
      description: "Face-to-face coding interview focusing on core data structures, algorithms, space-time complexities, and live coding exercises."
    },
    {
      name: "System Design (L2/L3)",
      description: "Discussion on scaling, database design (SQL/NoSQL trade-offs), caching, load balancing, API design, and microservices architecture."
    },
    {
      name: "HR & Leadership Round",
      description: "Culture fit assessment, behavioral questions using the STAR methodology, background review, and discussion of company core values."
    }
  ];

  // Default syllabus for other companies
  const defaultSyllabus = {
    aptitude: ["Data Interpretation", "Quantitative Ability", "Logical Reasoning", "Verbal Aptitude"],
    c_aptitude: ["Data Structures Basics", "Big-O Time Complexity", "Object-Oriented Design", "Core Programming Logic"]
  };

  // Default FAQs for other companies
  const defaultFaqs = [
    {
      q: `What is the interview style for ${company.name}?`,
      a: `The interview process typically focuses on deep problem-solving skills, architectural design capabilities, and dynamic communication skills. Expect a mix of coding logic and system scaling questions.`
    },
    {
      q: "How should I prepare for this mock interview?",
      a: "Review the target company's core focus area, practice writing clean modular code, study common system design patterns, and practice speaking your thought process aloud."
    },
    {
      q: "What is the typical cool-off period?",
      a: "Most product companies maintain a cool-off period of 6 months before you can re-apply for the same position."
    }
  ];

  const rounds = company.rounds || defaultRounds;
  const syllabus = company.syllabus || defaultSyllabus;
  const prepTips = company.prepTips || [
    "Speak clearly and explain your programming logic step-by-step as you think.",
    "Understand alternative approaches and be ready to discuss space-time complexity trade-offs.",
    "Structure behavioral answers using the STAR method (Situation, Task, Action, Result).",
    "Keep your code clean, modular, and well-structured."
  ];
  const faqs = company.faqs || defaultFaqs;

  return (
    <div className="company-detail-container container animate-fade-in">
      <div className="app-bg-glow"></div>
      <div className="bg-grid-pattern"></div>

      {/* Back button */}
      <div className="back-nav">
        <Link href="/companies" className="btn-back">
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </Link>
      </div>

      {/* Hero Header */}
      <header className="company-hero glass-card">
        <div className="hero-content">
          <div className="company-branding">
            <div className="detail-logo-badge">
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
                alt={`${company.name} logo`}
                className="detail-logo"
              />
            </div>
            <div>
              <div className="featured-row">
                <h1>{company.name} Interview Guide</h1>
                {companyKey === "zoho" && (
                  <span className="featured-badge">
                    <Award size={12} />
                    <span>Verified Details</span>
                  </span>
                )}
              </div>
              <p className="domain-text">
                <Building2 size={14} />
                <span>Target Company: {domain}</span>
              </p>
            </div>
          </div>
          <p className="hero-focus">{company.focus}</p>
        </div>

        <div className="hero-actions">
          <button 
            onClick={handleLaunchInterview} 
            disabled={launching}
            className="btn btn-primary btn-lg launch-cta"
          >
            {launching ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <Play size={16} fill="currentColor" />
                <span>Launch Mock Interview</span>
              </>
            )}
          </button>
          <Link href={`/interviews/new?company=${companyKey}`} className="customize-link">
            Configure options manually
          </Link>
          <a 
            href={`https://${domain}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-secondary site-cta"
          >
            <span>Careers Page</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Split Columns */}
      <div className="detail-layout">
        
        {/* Left Column: Rounds, Syllabus, Sample Questions */}
        <main className="detail-main">
          
          {/* Recruitment Timeline */}
          <section className="detail-section glass-card">
            <h2 className="section-title">
              <Calendar size={18} className="title-icon" />
              <span>Interview Rounds Timeline</span>
            </h2>
            <div className="timeline-container">
              {rounds.map((round: any, index: number) => (
                <div key={index} className="timeline-item">
                  <div className="timeline-left">
                    <span className="step-num">{index + 1}</span>
                    {index < rounds.length - 1 && <span className="step-line"></span>}
                  </div>
                  <div className="timeline-right">
                    <h3>{round.name}</h3>
                    <p>{round.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Test Syllabus / Subjects */}
          <section className="detail-section glass-card">
            <h2 className="section-title">
              <BookOpen size={18} className="title-icon" />
              <span>Syllabus & Core Focus Areas</span>
            </h2>
            <div className="syllabus-grid">
              <div className="syllabus-box">
                <h4>General Aptitude topics</h4>
                <ul className="syllabus-list">
                  {syllabus.aptitude.map((item: string, i: number) => (
                    <li key={i}>
                      <span className="dot"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="syllabus-box highlight-box">
                <h4>Technical & Coding topics</h4>
                <ul className="syllabus-list">
                  {syllabus.c_aptitude.map((item: string, i: number) => (
                    <li key={i}>
                      <span className="dot primary-dot"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Sample Questions */}
          <section className="detail-section glass-card">
            <h2 className="section-title">
              <Target size={18} className="title-icon" />
              <span>Sample Practice Questions</span>
            </h2>
            <p className="section-subtitle">
              Below are typical questions asked in {company.name} technical and system design rounds. 
              The Gemini Mock Interviewer is calibrated to ask similar questions in live practice.
            </p>
            <div className="questions-stack">
              {company.sampleQuestions?.map((question: string, i: number) => (
                <div key={i} className="question-item">
                  <span className="q-label">Q{i + 1}</span>
                  <p className="q-text">{question}</p>
                </div>
              ))}
            </div>
          </section>

        </main>

        {/* Right Column: Quick Stats, Tips, FAQs */}
        <aside className="detail-sidebar">
          
          {/* Quick Stats */}
          <div className="sidebar-card glass-card">
            <h3>Quick Overview</h3>
            <div className="stats-list">
              <div className="stat-row">
                <span className="stat-lbl">Recruitment Rounds</span>
                <span className="stat-val">{rounds.length} Stages</span>
              </div>
              <div className="stat-row">
                <span className="stat-lbl">Typical Rigor</span>
                <span className="stat-val capitalize">{companyKey === "zoho" ? "Focus on Logic & LLD" : "DSA & Scale"}</span>
              </div>
              <div className="stat-row">
                <span className="stat-lbl">Practice Sessions</span>
                <span className="stat-val highlight-val">Mock Mode Enabled</span>
              </div>
            </div>
          </div>

          {/* Preparation Tips */}
          <div className="sidebar-card glass-card">
            <h3>Interview Preparation Tips</h3>
            <ul className="tips-list">
              {prepTips.map((tip: string, i: number) => (
                <li key={i}>
                  <CheckCircle size={16} className="tip-icon" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ Accordions */}
          <div className="sidebar-card glass-card">
            <h3>Frequently Asked Questions</h3>
            <div className="faqs-accordion">
              {faqs.map((faq: any, i: number) => (
                <details key={i} className="faq-details">
                  <summary className="faq-summary">
                    <span>{faq.q}</span>
                    <HelpCircle size={14} className="faq-icon" />
                  </summary>
                  <p className="faq-answer">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>

        </aside>

      </div>

      <style jsx>{`
        .company-detail-container {
          padding-top: 30px;
          padding-bottom: 80px;
          position: relative;
        }

        .back-nav {
          margin-bottom: 24px;
        }

        .btn-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }

        .btn-back:hover {
          color: var(--text-main);
        }

        /* Hero Header */
        .company-hero {
          padding: 32px;
          margin-bottom: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 30px;
        }

        @media (max-width: 900px) {
          .company-hero {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }
        }

        .hero-content {
          flex: 1;
        }

        .company-branding {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 16px;
        }

        .detail-logo-badge {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-md);
          background: #fff;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: var(--shadow-md);
          flex-shrink: 0;
        }

        .detail-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 6px;
        }

        .featured-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .featured-row h1 {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-main);
        }

        .featured-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 9999px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }

        .domain-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--text-muted);
          font-weight: 500;
        }

        .hero-focus {
          font-size: 15px;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 800px;
        }

        .hero-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
          width: 240px;
        }

        @media (max-width: 900px) {
          .hero-actions {
            flex-direction: row;
            width: 100%;
          }
          .launch-cta, .site-cta {
            flex: 1;
            justify-content: center;
          }
        }

        .launch-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .site-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        /* Layout Columns */
        .detail-layout {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 32px;
        }

        @media (max-width: 1024px) {
          .detail-layout {
            grid-template-columns: 1fr;
          }
        }

        .detail-main {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .detail-section {
          padding: 30px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-main);
          border-bottom: 1px solid var(--border);
          padding-bottom: 12px;
        }

        .title-icon {
          color: var(--primary);
        }

        .section-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 20px;
          line-height: 1.5;
        }

        /* Timeline Rounds */
        .timeline-container {
          display: flex;
          flex-direction: column;
          padding-left: 8px;
        }

        .timeline-item {
          display: flex;
          gap: 20px;
        }

        .timeline-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
        }

        .step-num {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: var(--primary-glow-subtle);
          border: 2px solid var(--primary);
          color: var(--primary-hover);
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-line {
          flex: 1;
          width: 2px;
          background: var(--border);
          margin: 8px 0;
          min-height: 48px;
        }

        .timeline-right {
          padding-bottom: 24px;
          flex: 1;
        }

        .timeline-right h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 6px;
          color: var(--text-main);
        }

        .timeline-right p {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-muted);
        }

        /* Syllabus Grid */
        .syllabus-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }

        @media (max-width: 640px) {
          .syllabus-grid {
            grid-template-columns: 1fr;
          }
        }

        .syllabus-box {
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 20px;
          background: rgba(15, 23, 42, 0.01);
        }

        .syllabus-box.highlight-box {
          border-color: rgba(139, 92, 246, 0.2);
          background: var(--primary-glow-subtle);
        }

        .syllabus-box h4 {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 14px;
          color: var(--text-main);
        }

        .syllabus-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .syllabus-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-muted);
        }

        .dot {
          width: 6px;
          height: 6px;
          background: var(--text-muted);
          border-radius: 9999px;
          flex-shrink: 0;
        }

        .dot.primary-dot {
          background: var(--primary);
        }

        /* Practice Questions */
        .questions-stack {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .question-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
        }

        .q-label {
          font-size: 11px;
          font-weight: 800;
          background: var(--primary);
          color: #fff;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          margin-top: 2px;
          flex-shrink: 0;
        }

        .q-text {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-main);
          font-weight: 500;
        }

        /* Sidebar Elements */
        .sidebar-card {
          padding: 24px;
        }

        .sidebar-card h3 {
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 18px;
          color: var(--text-main);
          border-left: 3px solid var(--primary);
          padding-left: 10px;
        }

        /* Stats List */
        .stats-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .stat-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          padding-bottom: 10px;
          border-bottom: 1px dashed var(--border);
        }

        .stat-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .stat-lbl {
          color: var(--text-muted);
        }

        .stat-val {
          font-weight: 600;
          color: var(--text-main);
        }

        .stat-val.highlight-val {
          color: #10b981;
        }

        /* Tips List */
        .tips-list {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .tips-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-muted);
        }

        .tip-icon {
          color: #10b981;
          margin-top: 2px;
          flex-shrink: 0;
        }

        /* FAQs Accordion */
        .faqs-accordion {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .faq-details {
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(15, 23, 42, 0.01);
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .faq-details[open] {
          border-color: var(--border-hover);
          background: #fff;
        }

        .faq-summary {
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-main);
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          list-style: none;
        }

        .faq-summary::-webkit-details-marker {
          display: none;
        }

        .faq-icon {
          color: var(--text-muted);
          transition: transform 0.2s;
        }

        .faq-details[open] .faq-icon {
          color: var(--primary);
          transform: rotate(180deg);
        }

        .faq-answer {
          padding: 0 16px 16px 16px;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-muted);
          border-top: 1px solid rgba(15, 23, 42, 0.03);
          margin-top: 8px;
          padding-top: 8px;
        }

        .customize-link {
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
          text-decoration: underline;
          text-decoration-color: transparent;
          transition: all 0.2s ease;
          display: inline-block;
          margin-top: -2px;
          margin-bottom: 2px;
        }
        
        .customize-link:hover {
          color: var(--primary);
          text-decoration-color: var(--primary);
        }

        .animate-spin {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
