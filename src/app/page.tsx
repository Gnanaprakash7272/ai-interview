import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ArrowRight, Bot, ShieldCheck, BarChart4, Speech, Terminal } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="home-wrapper">
      <div className="app-bg-glow"></div>

      {/* Hero Section */}
      <section className="hero container animate-fade-in">
        <div className="hero-badge">
          <Terminal size={14} className="badge-icon" />
          <span>Supercharged by Gemini 2.5 Flash</span>
        </div>
        
        <h1 className="hero-title">
          Master Technical Interviews <br />
          With <span className="text-gradient">Real-Time AI Guidance</span>
        </h1>
        
        <p className="hero-description">
          Practice technical and communication skills with tailored mock interviews. 
          Get instant, line-by-line AI grading, weaknesses breakdowns, and target recommendations.
        </p>

        <div className="hero-ctas">
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              <span>Go to Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary btn-lg">
                <span>Start Free Practice</span>
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                <span>Log In</span>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="features container">
        <div className="section-header">
          <h2>Fully Featured Preparation Suite</h2>
          <p>Everything you need to level up and land your dream software job</p>
        </div>

        <div className="grid-3">
          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <Bot size={22} className="feature-icon" />
            </div>
            <h3>Generative Mock Panel</h3>
            <p>
              Instantly generate technical questions calibrated for Frontend, Backend, or Fullstack developers 
              across Entry, Mid, and Senior difficulty settings.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <Speech size={22} className="feature-icon" />
            </div>
            <h3>Interactive Room</h3>
            <p>
              Simulate high-fidelity interviews. Toggle audio read-out to hear interviewer questions, 
              write structures, and manage session timers.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <ShieldCheck size={22} className="feature-icon" />
            </div>
            <h3>Detailed AI Evaluation</h3>
            <p>
              Understand your performance immediately. Obtain metrics on Technical Accuracy, Communication, 
              Strengths, and read AI-generated ideal code solutions.
            </p>
          </div>
        </div>
      </section>

      {/* Analytics Hook Section */}
      <section className="analytics-hook container">
        <div className="glass-card hook-banner">
          <div className="hook-content">
            <div className="hook-badge">
              <BarChart4 size={18} />
              <span>Metrics & Insights</span>
            </div>
            <h2>Track Your Growth Over Time</h2>
            <p>
              Our dashboard maps your performance trends, communication metrics, technical accuracy scores, 
              and recommends curated focus directories to study next.
            </p>
            <div className="hook-cta">
              <Link href={session ? "/dashboard" : "/register"} className="btn btn-primary">
                <span>See Analytics Dashboard</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hook-visual">
            <div className="mock-graph">
              <div className="mock-bar-container">
                <div className="mock-bar" style={{ height: "40%", "--delay": "0.1s" } as any}></div>
                <div className="mock-bar" style={{ height: "60%", "--delay": "0.2s" } as any}></div>
                <div className="mock-bar highlight" style={{ height: "85%", "--delay": "0.3s" } as any}></div>
                <div className="mock-bar" style={{ height: "70%", "--delay": "0.4s" } as any}></div>
                <div className="mock-bar highlight" style={{ height: "95%", "--delay": "0.5s" } as any}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer container">
        <p>© {new Date().getFullYear()} Mockora.ai. Designed for developers. Built with Google Gemini.</p>
      </footer>
    </div>
  );
}
