"use client";

import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, Award, Target, Activity, MessageSquare, Briefcase, ChevronRight, FileText } from "lucide-react";

export default function AnalyticsClient({ radarData, trendData, analytics, interviews }: any) {

  const handlePrint = () => {
    window.print();
  };

  const getLatestGuidance = () => {
    if (interviews && interviews.length > 0) {
      return interviews[0].careerGuidance;
    }
    return null;
  };

  const guidance = getLatestGuidance();

  return (
    <div className="analytics-client-container">
      
      <div className="print-controls no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Download size={16} />
          <span>Download PDF Report</span>
        </button>
      </div>

      {/* A4 Printable Report Header */}
      <div className="print-only report-header" style={{ display: 'none' }}>
        <h2>InterviewAI Performance Report</h2>
        <p>Generated on: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="analytics-grid">
        
        {/* Radar Chart Card */}
        <div className="glass-card chart-card radar-card">
          <div className="card-header">
            <Target size={20} className="primary-color" />
            <h3>Competency Radar</h3>
          </div>
          <p className="card-desc">Visual breakdown of your core interview skills.</p>
          <div className="chart-wrapper" style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Score" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Line Chart Card */}
        <div className="glass-card chart-card trend-card">
          <div className="card-header">
            <Activity size={20} className="success-color" />
            <h3>Performance Trend</h3>
          </div>
          <p className="card-desc">Your overall score progression over time.</p>
          <div className="chart-wrapper" style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} name="Total Score" />
                <Line type="monotone" dataKey="confidence" stroke="#3b82f6" strokeWidth={2} name="Confidence" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* AI Study Plan / Career Roadmap */}
      {guidance && (
        <div className="study-plan-section">
          <h2 className="section-title"><Briefcase size={22} className="primary-color" /> Your AI Study Roadmap</h2>
          
          <div className="study-grid">
            <div className="glass-card roadmap-card">
              <h3>Topics to Improve</h3>
              <ul className="guidance-list">
                {guidance.weakTopicsToImprove?.map((topic: string, i: number) => (
                  <li key={i}><AlertCircle size={14} className="warning-color" /> <span>{topic}</span></li>
                ))}
              </ul>
            </div>
            
            <div className="glass-card roadmap-card">
              <h3>Skills to Learn</h3>
              <ul className="guidance-list">
                {guidance.skillsToLearn?.map((skill: string, i: number) => (
                  <li key={i}><Target size={14} className="info-color" /> <span>{skill}</span></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="glass-card full-roadmap-card">
            <h3>Recommended Action Plan</h3>
            <div className="roadmap-timeline">
              {guidance.learningRoadmap?.map((step: string, i: number) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-marker">{i + 1}</div>
                  <div className="timeline-content">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for Analytics and Print */}
      <style dangerouslySetInnerHTML={{__html: `
        .analytics-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
          margin-bottom: 40px;
        }
        @media (max-width: 900px) {
          .analytics-grid {
            grid-template-columns: 1fr;
          }
        }
        .chart-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
        }
        .card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-main);
        }
        .card-desc {
          color: var(--text-muted);
          font-size: 13px;
          margin-bottom: 20px;
        }
        
        .study-plan-section {
          margin-top: 40px;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 24px;
          color: var(--text-main);
        }
        .study-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .roadmap-card {
          padding: 24px;
        }
        .roadmap-card h3 {
          font-size: 16px;
          margin-bottom: 16px;
          color: var(--text-dark);
          border-bottom: 1px solid var(--border);
          padding-bottom: 10px;
        }
        .guidance-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .guidance-list li {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 14px;
          color: var(--text-main);
          line-height: 1.5;
        }
        .guidance-list li svg {
          margin-top: 3px;
          flex-shrink: 0;
        }
        
        .full-roadmap-card {
          padding: 30px;
        }
        .full-roadmap-card h3 {
          font-size: 18px;
          margin-bottom: 24px;
          color: var(--text-dark);
        }
        .roadmap-timeline {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .timeline-item {
          display: flex;
          gap: 16px;
        }
        .timeline-marker {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary-glow-subtle);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        .timeline-content {
          padding-top: 6px;
          font-size: 15px;
          color: var(--text-main);
          line-height: 1.5;
        }

        /* PRINT STYLES - Crucial for "Download PDF" */
        @media print {
          @page { size: auto; margin: 15mm; }
          body { 
            background: white !important; 
            color: black !important; 
          }
          .app-bg-glow, .no-print, nav, footer {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .glass-card {
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            break-inside: avoid;
            page-break-inside: avoid;
            margin-bottom: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
          }
          .report-header h2 { margin: 0; font-size: 24px; color: #333; }
          .report-header p { color: #666; font-size: 12px; }
          
          /* Change recharts styling for print */
          .recharts-text { fill: #333 !important; }
          .recharts-cartesian-grid-horizontal line, 
          .recharts-cartesian-grid-vertical line { stroke: #eee !important; }
        }
      `}} />
    </div>
  );
}
