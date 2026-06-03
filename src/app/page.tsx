import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ArrowRight, Bot, ShieldCheck, TrendingUp, Speech, Terminal } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <div className="home-wrapper">
      <div className="app-bg-glow"></div>
      <div className="bg-grid-pattern"></div>

      {/* Hero Section */}
      <section className="hero container animate-fade-in">
        <div className="hero-badge">
          <Terminal size={14} className="badge-icon" />
          <span>Powered by Gemini 2.5 Pro Architecture</span>
        </div>
        
        <h1 className="hero-title">
          Master Technical Interviews <br />
          With <span className="text-gradient">Real-Time AI Guidance</span>
        </h1>
        
        <p className="hero-description">
          Experience hyper-realistic mock interviews with our conversational AI. Get evaluated on system design, algorithmic efficiency, and communication clarity with line-by-line feedback.
        </p>

        <div className="hero-ctas">
          {session ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              <span>Go to Dashboard</span>
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link href="/register" className="btn btn-primary btn-lg">
              <span>Start Free Practice</span>
              <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section className="features container">
        <div className="section-header">
          <h2>Enterprise-Grade Preparation Suite</h2>
          <p>Everything you need to confidently clear FAANG-level engineering interviews.</p>
        </div>

        <div className="grid-3">
          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <Bot size={22} className="feature-icon" />
            </div>
            <h3>Generative Mock Panel</h3>
            <p>
              Our AI dynamically generates bespoke technical questions calibrated precisely for your target role—from Entry-Level Frontend to Principal Backend Architect.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <Speech size={22} className="feature-icon" />
            </div>
            <h3>Live Interactive Room</h3>
            <p>
              Engage in high-fidelity vocal interviews with WebRTC integration. Speak naturally while our AI transcribes, analyzes, and responds in real-time.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon-box">
              <ShieldCheck size={22} className="feature-icon" />
            </div>
            <h3>Comprehensive Evaluation</h3>
            <p>
              Receive instant, granular metrics on Big-O complexity, code cleanliness, and soft skills, alongside AI-generated optimal solution pathways.
            </p>
          </div>
        </div>
      </section>

      {/* Analytics Hook Section */}
      <section className="analytics-hook container">
        <div className="glass-card hook-banner">
          <div className="hook-content">
            <div className="hook-badge">
              <TrendingUp size={18} />
              <span>Advanced Analytics Engine</span>
            </div>
            <h2>Track Your Trajectory Over Time</h2>
            <p>
              Our proprietary dashboard aggregates your interview data to build a holistic profile of your engineering capabilities. Spot trends in your communication latency, identify syntax blindspots, and execute curated practice sets tailored to your weakest domains.
            </p>
            <div className="hook-cta">
              <Link href={session ? "/dashboard" : "/register"} className="btn btn-primary">
                <span>Access Your Analytics</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="hook-visual">
            <div className="mock-graph">
              <div className="graph-grid">
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
                <div className="grid-line"></div>
              </div>
              <div className="mock-bar-container">
                <div className="mock-bar" style={{ height: "40%", "--delay": "0.1s" } as any}></div>
                <div className="mock-bar" style={{ height: "60%", "--delay": "0.2s" } as any}></div>
                <div className="mock-bar highlight" style={{ height: "85%", "--delay": "0.3s" } as any}>
                  <div className="bar-glow-dot"></div>
                </div>
                <div className="mock-bar" style={{ height: "70%", "--delay": "0.4s" } as any}></div>
                <div className="mock-bar highlight" style={{ height: "95%", "--delay": "0.5s" } as any}>
                  <div className="bar-glow-dot"></div>
                </div>
              </div>
              <div className="floating-tooltip">
                <div className="tooltip-dot"></div>
                <span>Performance +24%</span>
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
