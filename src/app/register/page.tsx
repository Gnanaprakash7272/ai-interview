"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, Lock, User, Loader2, ArrowRight } from "lucide-react";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!formData.name || !formData.email || !formData.password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper animate-fade-in">
      <div className="app-bg-glow"></div>
      
      <div className="auth-card glass-card">
        <div className="auth-header">
          <img src="/mockora-logo.png" alt="Mockora Logo" width={140} height={120} style={{ margin: "0 auto 16px auto", display: "block", objectFit: "contain" }} />
          <h1>Create Account</h1>
          <p>Begin your AI-powered interview prep today</p>
        </div>

        {error && (
          <div className="auth-error animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Full Name</label>
            <div className="input-with-icon">
              <User size={18} className="input-icon" />
              <input
                id="name"
                type="text"
                className="form-input text-input"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="input-icon" />
              <input
                id="email"
                type="email"
                className="form-input text-input"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="input-icon" />
              <input
                id="password"
                type="password"
                className="form-input text-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary auth-submit-btn" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <button
          className="google-btn"
          onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
          type="button"
        >
          <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="auth-footer">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="auth-link">
              Log In
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 70px);
          padding: 40px 20px;
          position: relative;
        }

        .auth-card {
          width: 100%;
          max-width: 460px;
          padding: 40px;
          border-radius: var(--radius-lg);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .auth-logo-badge {
          width: 56px;
          height: 56px;
          border-radius: var(--radius-md);
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px auto;
          box-shadow: var(--shadow-sm);
        }

        .auth-header h1 {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-main);
          margin-bottom: 8px;
        }

        .auth-header p {
          font-size: 14px;
          color: var(--text-muted);
        }

        .auth-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          color: #ef4444;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          text-align: center;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 14px;
          color: var(--text-dark);
          pointer-events: none;
          transition: color 0.2s ease;
        }

        .text-input {
          padding-left: 44px !important;
          width: 100%;
        }

        .form-input:focus + .input-icon {
          color: var(--primary);
        }

        .auth-submit-btn {
          width: 100%;
          height: 48px;
          margin-top: 10px;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0 0 0;
          color: var(--text-dark);
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        .google-btn {
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 16px;
          padding: 0 20px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .google-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }

        .google-btn:active {
          transform: translateY(0);
        }

        .google-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .auth-footer {
          margin-top: 24px;
          text-align: center;
        }

        .auth-footer p {
          font-size: 14px;
        }

        .auth-link {
          color: var(--primary-hover);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .auth-link:hover {
          color: var(--primary);
          text-decoration: underline;
        }

        .animate-spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
