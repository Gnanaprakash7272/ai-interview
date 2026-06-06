"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, Building2, ExternalLink, ArrowRight, Sparkles, Award } from "lucide-react";
import companyQuestions from "@/data/companyQuestions.json";

// We extract all companies from the JSON except "general"
const COMPANIES = Object.entries(companyQuestions)
  .filter(([id]) => id !== "general")
  .map(([id, data]: [string, any]) => ({
    id,
    name: data.name,
    domain: data.domain || `${id}.com`,
    focus: data.focus,
    sampleCount: data.sampleQuestions?.length || 0,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredCompanies = COMPANIES.filter((company) => {
    const matchesSearch =
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.focus.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === "all") return matchesSearch;
    if (activeTab === "bigtech") {
      const bigTech = ["google", "amazon", "microsoft", "meta", "apple", "netflix", "adobe", "cisco", "bloomberg", "atlassian"];
      return bigTech.includes(company.id) && matchesSearch;
    }
    if (activeTab === "fintech") {
      const fintech = ["stripe", "paypal", "goldmansachs", "jpmorgan", "morganstanley", "visa", "mastercard", "intuit"];
      return fintech.includes(company.id) && matchesSearch;
    }
    if (activeTab === "indian_tech") {
      const indian = ["tcs", "infosys", "cognizant", "wipro", "hcl", "techmahindra", "accenture", "capgemini", "deloitte", "zoho", "flipkart", "zomato", "swiggy"];
      return indian.includes(company.id) && matchesSearch;
    }
    return matchesSearch;
  });

  return (
    <div className="companies-container container animate-fade-in">
      <div className="app-bg-glow"></div>
      <div className="bg-grid-pattern"></div>

      {/* Header */}
      <header className="companies-header">
        <div className="header-badge">
          <Sparkles size={14} className="badge-icon" />
          <span>Targeted Company Prep Guides</span>
        </div>
        <h1>Explore Target Company Guides</h1>
        <p>
          Prepare specifically for your dream company. Access custom syllabus breakdowns, interview structures, and practice questions sourced directly from real recruitment rounds.
        </p>
      </header>

      {/* Search & Tabs Controls */}
      <section className="controls-section glass-card">
        <div className="search-bar-wrapper">
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by company name, technology, or interview focus..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        <div className="tabs-container">
          <button
            onClick={() => setActiveTab("all")}
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
          >
            All Companies ({COMPANIES.length})
          </button>
          <button
            onClick={() => setActiveTab("bigtech")}
            className={`tab-btn ${activeTab === "bigtech" ? "active" : ""}`}
          >
            Big Tech & Product
          </button>
          <button
            onClick={() => setActiveTab("fintech")}
            className={`tab-btn ${activeTab === "fintech" ? "active" : ""}`}
          >
            FinTech & Investment
          </button>
          <button
            onClick={() => setActiveTab("indian_tech")}
            className={`tab-btn ${activeTab === "indian_tech" ? "active" : ""}`}
          >
            Top Recruiters
          </button>
        </div>
      </section>

      {/* Grid List */}
      <section className="companies-grid">
        {filteredCompanies.length > 0 ? (
          filteredCompanies.map((company) => (
            <div key={company.id} className="company-card glass-card">
              <div className="company-card-glow"></div>
              
              <div className="card-top">
                <div className="logo-badge">
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`}
                    alt={`${company.name} logo`}
                    className="company-logo"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                  <div className="fallback-svg" style={{ display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
                    <Building2 size={20} />
                  </div>
                </div>
                {company.id === "zoho" && (
                  <span className="premium-tag">
                    <Award size={12} />
                    <span>Featured Guide</span>
                  </span>
                )}
              </div>

              <div className="card-body">
                <h3>{company.name}</h3>
                <p className="company-focus">{company.focus}</p>
                <div className="company-meta">
                  <span className="meta-item">
                    <strong>{company.sampleCount}</strong> Sample Questions
                  </span>
                </div>
              </div>

              <div className="card-footer">
                <Link href={`/companies/${company.id}`} className="btn-details">
                  <span>Prepare Guide</span>
                  <ArrowRight size={14} className="arrow-icon" />
                </Link>
                <Link
                  href={`https://${company.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-website"
                  title={`Visit ${company.name} Careers`}
                >
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="no-results glass-card">
            <Building2 size={48} className="no-results-icon" />
            <h3>No Companies Found</h3>
            <p>We couldn&apos;t find any company matching &quot;{searchQuery}&quot;. Try adjusting your search query.</p>
          </div>
        )}
      </section>

      <style jsx>{`
        .companies-container {
          padding-top: 40px;
          padding-bottom: 80px;
          position: relative;
        }

        .companies-header {
          text-align: center;
          max-width: 760px;
          margin: 0 auto 40px auto;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 9999px;
          color: var(--primary-hover);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
        }

        .badge-icon {
          color: var(--primary);
        }

        .companies-header h1 {
          font-size: 38px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
          background: linear-gradient(135deg, var(--text-main) 30%, rgba(15, 23, 42, 0.7));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .companies-header p {
          font-size: 16px;
          line-height: 1.6;
          color: var(--text-muted);
        }

        /* Controls Section */
        .controls-section {
          padding: 24px;
          margin-bottom: 40px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .search-bar-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(15, 23, 42, 0.02);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          position: relative;
          transition: all 0.2s ease;
        }

        .search-bar-wrapper:focus-within {
          border-color: var(--primary);
          background: #fff;
          box-shadow: var(--shadow-glow);
        }

        .search-icon {
          color: var(--text-muted);
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-main);
          font-size: 14px;
          width: 100%;
        }

        .clear-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 14px;
          padding: 4px;
        }

        .clear-btn:hover {
          color: var(--text-main);
        }

        .tabs-container {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tab-btn {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: rgba(15, 23, 42, 0.02);
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          background: rgba(15, 23, 42, 0.05);
          color: var(--text-main);
          border-color: var(--border-hover);
        }

        .tab-btn.active {
          background: var(--primary-glow-subtle);
          color: var(--primary-hover);
          border-color: var(--primary);
          font-weight: 600;
        }

        /* Companies Grid */
        .companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 24px;
        }

        .company-card {
          display: flex;
          flex-direction: column;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          height: 100%;
        }

        .company-card:hover {
          transform: translateY(-5px);
          border-color: var(--primary);
          box-shadow: var(--shadow-md), var(--shadow-glow);
        }

        .company-card-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(90deg, transparent, var(--primary), transparent);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .company-card:hover .company-card-glow {
          opacity: 1;
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .logo-badge {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: #fff;
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: var(--shadow-sm);
        }

        .company-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 4px;
        }

        .premium-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 9999px;
          color: #fff;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(217, 119, 6, 0.2);
        }

        .card-body {
          flex: 1;
          margin-bottom: 24px;
        }

        .card-body h3 {
          font-size: 18px;
          font-weight: 700;
          margin-bottom: 10px;
          color: var(--text-main);
        }

        .company-focus {
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-muted);
          margin-bottom: 16px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 58px;
        }

        .company-meta {
          display: flex;
          gap: 12px;
          font-size: 12px;
          color: var(--text-dark);
        }

        .meta-item {
          background: rgba(15, 23, 42, 0.03);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        .card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border);
          padding-top: 16px;
          margin-top: auto;
        }

        .btn-details {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: var(--primary);
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-details:hover {
          color: var(--primary-hover);
        }

        .arrow-icon {
          transition: transform 0.2s ease;
        }

        .btn-details:hover .arrow-icon {
          transform: translateX(4px);
        }

        .link-website {
          color: var(--text-muted);
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          border: 1px solid transparent;
        }

        .link-website:hover {
          color: var(--text-main);
          background: rgba(15, 23, 42, 0.04);
          border-color: var(--border-hover);
        }

        /* Empty State */
        .no-results {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
          gap: 12px;
        }

        .no-results-icon {
          color: var(--text-muted);
          margin-bottom: 8px;
        }

        .no-results h3 {
          font-size: 18px;
          font-weight: 600;
        }

        .no-results p {
          color: var(--text-muted);
          max-width: 400px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
