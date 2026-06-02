"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Loader2, Award, Zap, Cpu, Flame, BarChart2, Star, Target, CheckCircle2 } from "lucide-react";

interface HistoryRecord {
  _id: string;
  domain: string;
  difficulty: string;
  totalScore: number;
  createdAt: string;
}

export default function AnalyticsDeepDive() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [analytics, setAnalytics] = useState<any>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guard routing client-side
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/analytics");
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || "Failed to load metrics");
        }

        setAnalytics(data.analytics);
        setHistory(data.history);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics details");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [status]);

  if (loading) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="loading-card glass-card">
          <Loader2 className="animate-spin primary-color" size={40} />
          <p>Analyzing candidate stats and plotting trends...</p>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .loading-card { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
          .animate-spin { animation: spin 1.2s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="center-wrapper container animate-fade-in">
        <div className="app-bg-glow"></div>
        <div className="glass-card error-card">
          <h2>Analytics Error</h2>
          <p>{error}</p>
          <Link href="/dashboard" className="btn btn-secondary">
            Return to Dashboard
          </Link>
        </div>
        <style jsx>{`
          .center-wrapper { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 100px); }
          .error-card { padding: 40px; text-align: center; max-width: 400px; display: flex; flex-direction: column; gap: 16px; }
        `}</style>
      </div>
    );
  }

  // Averages default to 0 if not defined
  const avgOverall = analytics?.avgScore || 0;
  const avgTech = analytics?.technicalScore || 0;
  const avgComm = analytics?.communicationScore || 0;
  const avgConfidence = analytics?.confidenceScore || 0;
  const recommendations = analytics?.recommendations || [];

  // Generate SVG Coordinates for Custom Line Chart
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingX = 40;
  const paddingY = 20;

  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  let pointsString = "";
  let areaPointsString = "";
  const pointsCoords: { x: number; y: number; score: number; label: string }[] = [];

  if (history.length > 1) {
    history.forEach((record, index) => {
      const x = paddingX + (index / (history.length - 1)) * chartWidth;
      // Invert score since Y goes downwards in SVG (100 is top, 0 is bottom)
      const y = paddingY + chartHeight - (record.totalScore / 100) * chartHeight;
      const dateLabel = new Date(record.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      pointsCoords.push({ x, y, score: record.totalScore, label: dateLabel });
    });

    pointsString = pointsCoords.map(p => `${p.x},${p.y}`).join(" ");
    areaPointsString = `${paddingX},${paddingY + chartHeight} ${pointsString} ${paddingX + chartWidth},${paddingY + chartHeight}`;
  }

  // Calculate domain averages for widgets
  const domains = Array.from(new Set(history.map(h => h.domain)));
  const domainAverages = domains.map(d => {
    const records = history.filter(h => h.domain === d);
    const sum = records.reduce((acc, curr) => acc + curr.totalScore, 0);
    return {
      name: d.replace(/_/g, " ").toUpperCase(),
      score: Math.round(sum / records.length),
      count: records.length
    };
  });

  return (
    <div className="analytics-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      {/* Header */}
      <header className="analytics-header">
        <Link href="/dashboard" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <h1>Performance Analytics</h1>
        <p>Detailed performance index, trajectory graphs, and learning recommendations</p>
      </header>

      {/* Dashboard widgets */}
      <section className="stats-row">
        <div className="glass-card metric-widget">
          <Award className="widget-icon pri-col" size={20} />
          <div className="widget-info">
            <span className="widget-label">Overall Index</span>
            <span className="widget-value">{avgOverall}%</span>
          </div>
        </div>

        <div className="glass-card metric-widget">
          <Cpu className="widget-icon tech-col" size={20} />
          <div className="widget-info">
            <span className="widget-label">Technical Accuracy</span>
            <span className="widget-value">{avgTech}%</span>
          </div>
        </div>

        <div className="glass-card metric-widget">
          <BarChart2 className="widget-icon comm-col" size={20} />
          <div className="widget-info">
            <span className="widget-label">Communication</span>
            <span className="widget-value">{avgComm}%</span>
          </div>
        </div>

        <div className="glass-card metric-widget">
          <Flame className="widget-icon conf-col" size={20} />
          <div className="widget-info">
            <span className="widget-label">Confidence Rating</span>
            <span className="widget-value">{avgConfidence}%</span>
          </div>
        </div>
      </section>

      {/* Trajectory Graph & Domains Split */}
      <section className="analytics-split">
        {/* Trajectory Card */}
        <div className="glass-card graph-card">
          <div className="card-header">
            <Target size={18} className="pri-col" />
            <h3>Performance Trajectory</h3>
          </div>
          
          <div className="chart-wrapper">
            {history.length > 1 ? (
              <div className="svg-container">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
                  {/* Grid Lines */}
                  <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(15,23,42,0.06)" />
                  <line x1={paddingX} y1={paddingY + chartHeight / 2} x2={svgWidth - paddingX} y2={paddingY + chartHeight / 2} stroke="rgba(15,23,42,0.06)" />
                  <line x1={paddingX} y1={paddingY + chartHeight} x2={svgWidth - paddingX} y2={paddingY + chartHeight} stroke="rgba(15,23,42,0.1)" strokeWidth="1.5" />
                  
                  {/* Y Axis Labels */}
                  <text x={paddingX - 10} y={paddingY + 4} textAnchor="end" className="chart-label-text">100</text>
                  <text x={paddingX - 10} y={paddingY + chartHeight / 2 + 4} textAnchor="end" className="chart-label-text">50</text>
                  <text x={paddingX - 10} y={paddingY + chartHeight + 4} textAnchor="end" className="chart-label-text">0</text>

                  {/* Area Gradient */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area under the line */}
                  <polygon points={areaPointsString} fill="url(#chartGradient)" />

                  {/* Glow line */}
                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    points={pointsString}
                    style={{ filter: "drop-shadow(0 0 5px var(--primary-glow))" }}
                  />

                  {/* Marker Nodes */}
                  {pointsCoords.map((pt, i) => (
                    <g key={i} className="marker-group">
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="6"
                        fill="var(--bg-dark)"
                        stroke="var(--primary-hover)"
                        strokeWidth="2.5"
                        style={{ transition: "all 0.2s ease" }}
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="12"
                        fill="var(--primary)"
                        opacity="0"
                        className="hover-trigger-circle"
                      />
                      {/* X Axis Date */}
                      <text x={pt.x} y={svgHeight - 4} textAnchor="middle" className="chart-axis-date">{pt.label}</text>
                      {/* Score Value on Node */}
                      <text x={pt.x} y={pt.y - 12} textAnchor="middle" className="chart-node-val">{pt.score}%</text>
                    </g>
                  ))}
                </svg>
              </div>
            ) : history.length === 1 ? (
              <div className="insufficient-data">
                <div className="mock-single-node">
                  <span className="single-score-badge">{history[0].totalScore}%</span>
                </div>
                <p>Completed 1 interview. Complete another session to view your progress chart.</p>
              </div>
            ) : (
              <div className="insufficient-data">
                <p>No completed interviews recorded. Start a session to initialize charts.</p>
              </div>
            )}
          </div>
        </div>

        {/* Focus Domains Card */}
        <div className="glass-card domain-breakdown-card">
          <div className="card-header">
            <Star size={18} className="pri-col" />
            <h3>Performance by Domain</h3>
          </div>
          <p className="domain-subtext">Average score per specialized practice track</p>
          
          <div className="domain-widgets-stack">
            {domainAverages.length > 0 ? (
              domainAverages.map((dom, index) => (
                <div key={index} className="domain-progress-row">
                  <div className="dom-row-labels">
                    <span className="dom-name">{dom.name}</span>
                    <span className="dom-info">{dom.count} taken • <strong>{dom.score}%</strong></span>
                  </div>
                  <div className="progress-bar-track">
                    <div 
                      className="progress-bar-fill tech-fill" 
                      style={{ width: `${dom.score}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-domains">
                <p>Averages will generate once you complete mock sessions.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bullet Recommendations Section */}
      <section className="recommendations-block glass-card">
        <div className="card-header">
          <CheckCircle2 size={20} className="success-color" />
          <h3>Personalized AI Study Path</h3>
        </div>
        <p className="recs-intro">Actionable suggestions generated by Gemini based on your mock assessments:</p>
        
        <ul className="personalized-recs-list">
          {recommendations.map((rec: string, index: number) => (
            <li key={index} className="rec-bullet-item animate-fade-in" style={{ "--delay": `${index * 0.1}s` } as any}>
              <div className="rec-bullet-badge">{index + 1}</div>
              <p>{rec}</p>
            </li>
          ))}
        </ul>
      </section>

      <style jsx>{`
        .analytics-wrapper {
          padding-top: 30px;
          padding-bottom: 80px;
        }

        .analytics-header {
          margin-bottom: 36px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 16px;
          transition: color 0.2s ease;
        }

        .back-link:hover {
          color: var(--text-main);
        }

        .analytics-header h1 {
          font-size: 32px;
          margin-bottom: 6px;
        }

        /* Widgets */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 36px;
        }

        .metric-widget {
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .widget-icon {
          padding: 8px;
          border-radius: var(--radius-md);
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          flex-shrink: 0;
        }

        .pri-col { color: var(--primary); }
        .tech-col { color: var(--primary-hover); }
        .comm-col { color: var(--color-info); }
        .conf-col { color: var(--color-warning); }
        .success-color { color: var(--color-success); }

        .widget-info {
          display: flex;
          flex-direction: column;
        }

        .widget-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .widget-value {
          font-size: 24px;
          font-weight: 800;
          color: var(--text-main);
        }

        /* Split */
        .analytics-split {
          display: grid;
          grid-template-columns: 1.4fr 0.9fr;
          gap: 24px;
          margin-bottom: 36px;
        }

        @media (max-width: 900px) {
          .analytics-split {
            grid-template-columns: 1fr;
          }
        }

        .graph-card {
          padding: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .card-header h3 {
          font-size: 16px;
          font-weight: 700;
        }

        .chart-wrapper {
          width: 100%;
          min-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .svg-container {
          width: 100%;
          height: 100%;
        }

        .chart-label-text {
          fill: var(--text-dark);
          font-size: 10px;
          font-family: monospace;
        }

        .chart-axis-date {
          fill: var(--text-muted);
          font-size: 10px;
          font-weight: 500;
        }

        .chart-node-val {
          fill: var(--text-main);
          font-size: 10px;
          font-weight: 700;
          opacity: 0.8;
        }

        .marker-group:hover circle:first-child {
          r: 8px;
          fill: var(--primary-hover);
        }

        .insufficient-data {
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 40px;
        }

        .mock-single-node {
          width: 70px;
          height: 70px;
          border-radius: 9999px;
          background: var(--primary-glow-subtle);
          border: 2px solid var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px var(--primary-glow);
        }

        .single-score-badge {
          font-size: 18px;
          font-weight: 800;
          color: var(--primary-hover);
        }

        /* Domain breakdowns */
        .domain-breakdown-card {
          padding: 24px;
        }

        .domain-subtext {
          font-size: 13px;
          color: var(--text-dark);
          margin-bottom: 20px;
        }

        .domain-widgets-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .domain-progress-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dom-row-labels {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .dom-name {
          font-weight: 700;
          color: var(--text-main);
        }

        .dom-info {
          color: var(--text-muted);
        }

        .empty-domains, .empty-recs {
          padding: 20px 0;
          font-size: 13px;
          color: var(--text-dark);
          text-align: center;
        }

        /* Recommendations */
        .recommendations-block {
          padding: 30px;
        }

        .recs-intro {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 24px;
        }

        .personalized-recs-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          list-style: none;
        }

        .rec-bullet-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
          padding: 16px;
          background: rgba(15, 23, 42, 0.01);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          animation-delay: var(--delay);
        }

        .rec-bullet-item:hover {
          border-color: var(--border-hover);
          background: rgba(15, 23, 42, 0.02);
        }

        .rec-bullet-badge {
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--primary-hover);
          flex-shrink: 0;
        }

        .rec-bullet-item p {
          font-size: 14px;
          line-height: 1.5;
          color: var(--text-main);
        }

        .progress-bar-track {
          height: 6px;
          background: rgba(15, 23, 42, 0.05);
          border-radius: 9999px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 9999px;
        }

        .tech-fill {
          background: linear-gradient(to right, var(--primary), var(--primary-hover));
          box-shadow: 0 0 10px var(--primary-glow);
        }
      `}</style>
    </div>
  );
}
