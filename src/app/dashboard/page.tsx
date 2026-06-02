import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Interview from "@/models/Interview";
import Analytics from "@/models/Analytics";
import { Plus, Play, ChevronRight, Award, BarChart3, HelpCircle, Calendar, ShieldCheck, AlertCircle } from "lucide-react";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;
  await dbConnect();

  // Fetch interviews
  const interviews = await Interview.find({ userId }).sort({ createdAt: -1 });

  // Fetch analytics summary
  const analytics = await Analytics.findOne({ userId });

  const completedCount = interviews.filter((item) => item.status === "completed").length;
  const inProgressCount = interviews.filter((item) => item.status === "pending").length;

  return (
    <div className="dashboard-wrapper container animate-fade-in">
      <div className="app-bg-glow"></div>

      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Candidate Dashboard</h1>
          <p>Track your technical interview readiness and improve daily</p>
        </div>
        <Link href="/interviews/new" className="btn btn-primary">
          <Plus size={18} />
          <span>New Interview</span>
        </Link>
      </header>

      {/* Overview Cards Grid */}
      <section className="dashboard-grid">
        <div className="glass-card stat-card">
          <div className="stat-header">
            <Award className="stat-icon primary-color" size={24} />
            <h3>Average Score</h3>
          </div>
          <div className="stat-value-box">
            <span className="stat-value">{analytics ? `${analytics.avgScore}%` : "0%"}</span>
            <span className="stat-subtext">Overall performance</span>
          </div>
          <div className="stat-progress-bg">
            <div 
              className="stat-progress-bar" 
              style={{ width: `${analytics ? analytics.avgScore : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-header">
            <BarChart3 className="stat-icon success-color" size={24} />
            <h3>Activity Summary</h3>
          </div>
          <div className="stat-stats-row">
            <div className="sub-stat">
              <span className="sub-stat-num">{completedCount}</span>
              <span className="sub-stat-lbl">Completed</span>
            </div>
            <div className="sub-stat">
              <span className="sub-stat-num warning-color">{inProgressCount}</span>
              <span className="sub-stat-lbl">Pending</span>
            </div>
          </div>
          <div className="stat-footer-text">
            Total {interviews.length} practice session(s)
          </div>
        </div>

        <div className="glass-card stat-card full-row-mobile">
          <div className="stat-header">
            <ShieldCheck className="stat-icon info-color" size={24} />
            <h3>AI Focus Recommendations</h3>
          </div>
          <ul className="rec-list">
            {analytics && analytics.recommendations && analytics.recommendations.length > 0 ? (
              analytics.recommendations.slice(0, 2).map((rec: string, index: number) => (
                <li key={index}>
                  <ChevronRight size={14} className="bullet-icon" />
                  <span>{rec}</span>
                </li>
              ))
            ) : (
              <>
                <li>
                  <ChevronRight size={14} className="bullet-icon" />
                  <span>Complete a mock interview to get tailored learning advice.</span>
                </li>
                <li>
                  <ChevronRight size={14} className="bullet-icon" />
                  <span>Select from Frontend, Backend, or Fullstack practice roles.</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </section>

      {/* Recent Interviews */}
      <section className="recent-section">
        <div className="section-header-row">
          <h2>Recent Mock Sessions</h2>
          {completedCount > 0 && (
            <Link href="/analytics" className="view-analytics-link">
              <span>View Detailed Analytics</span>
              <ChevronRight size={16} />
            </Link>
          )}
        </div>

        <div className="interviews-list-container">
          {interviews.length > 0 ? (
            <div className="interviews-table glass-card">
              <div className="table-header table-row-layout">
                <div>Domain Role</div>
                <div>Difficulty</div>
                <div>Status</div>
                <div>AI Grade</div>
                <div>Date</div>
                <div style={{ textAlign: "right" }}>Actions</div>
              </div>
              
              <div className="table-body">
                {interviews.map((item) => (
                  <div key={item._id.toString()} className="table-row table-row-layout">
                    <div className="cell-domain">{item.domain.replace(/_/g, " ").toUpperCase()}</div>
                    <div>
                      <span className="difficulty-label">{item.difficulty}</span>
                    </div>
                    <div>
                      {item.status === "completed" ? (
                        <span className="badge badge-success">Completed</span>
                      ) : (
                        <span className="badge badge-warning">Pending</span>
                      )}
                    </div>
                    <div className="cell-score">
                      {item.status === "completed" ? (
                        <span className="score-number">{item.totalScore}%</span>
                      ) : (
                        <span className="score-placeholder">—</span>
                      )}
                    </div>
                    <div className="cell-date">
                      <Calendar size={14} />
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="cell-actions">
                      {item.status === "completed" ? (
                        <Link 
                          href={`/interviews/${item._id}/feedback`} 
                          className="btn btn-secondary btn-xs action-btn"
                        >
                          <span>Feedback</span>
                          <ChevronRight size={14} />
                        </Link>
                      ) : (
                        <Link 
                          href={`/interviews/${item._id}`} 
                          className="btn btn-primary btn-xs action-btn animate-pulse-glow"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Resume</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="empty-state glass-card">
              <AlertCircle size={40} className="empty-icon" />
              <h3>No Mock Interviews Found</h3>
              <p>You haven&apos;t started any mock technical sessions yet. Generate your first one now!</p>
              <Link href="/interviews/new" className="btn btn-primary">
                <Plus size={18} />
                <span>Start Your First Interview</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
