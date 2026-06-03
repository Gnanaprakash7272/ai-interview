"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, BarChart3, LayoutDashboard, User, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show Navbar on mock interview screen to prevent distraction
  const isInterviewScreen = pathname.startsWith("/interviews/") && !pathname.endsWith("/feedback") && !pathname.endsWith("/new");

  if (isInterviewScreen) {
    return null;
  }

  const toggleMenu = () => setIsOpen(!isOpen);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="glass-navbar">
      <div className="container flex-between nav-container">
        <Link href="/" className="logo-container">
          <Image src="/logo.png" alt="Mockora.ai Logo" width={32} height={32} className="logo-image" />
          <span className="logo-text">Mockora<span className="logo-highlight">.ai</span></span>
        </Link>

        {/* Desktop Menu */}
        <div className="nav-links desktop-only">
          {session ? (
            <>
              <Link 
                href="/dashboard" 
                className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/analytics" 
                className={`nav-item ${isActive("/analytics") ? "active" : ""}`}
              >
                <BarChart3 size={18} />
                <span>Analytics</span>
              </Link>
              <div className="user-profile">
                <User size={16} />
                <span className="user-name">{session.user?.name}</span>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: "/login" })} 
                className="btn btn-secondary btn-sm"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-item">Login</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-toggle mobile-only" onClick={toggleMenu} aria-label="Toggle menu">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="mobile-menu mobile-only animate-fade-in">
          <div className="mobile-nav-links">
            {session ? (
              <>
                <Link 
                  href="/dashboard" 
                  className={`mobile-nav-item ${isActive("/dashboard") ? "active" : ""}`}
                  onClick={toggleMenu}
                >
                  <LayoutDashboard size={18} />
                  <span>Dashboard</span>
                </Link>
                <Link 
                  href="/analytics" 
                  className={`mobile-nav-item ${isActive("/analytics") ? "active" : ""}`}
                  onClick={toggleMenu}
                >
                  <BarChart3 size={18} />
                  <span>Analytics</span>
                </Link>
                <div className="mobile-user-profile">
                  <User size={18} />
                  <span>{session.user?.name}</span>
                </div>
                <button 
                  onClick={() => {
                    toggleMenu();
                    signOut({ callbackUrl: "/login" });
                  }} 
                  className="btn btn-secondary mobile-logout-btn"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="mobile-nav-item" onClick={toggleMenu}>Login</Link>
                <Link href="/register" className="btn btn-primary" onClick={toggleMenu}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .glass-navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          height: 70px;
          display: flex;
          align-items: center;
          transition: all 0.3s ease;
        }

        .nav-container {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }

        .logo-image {
          border-radius: 4px;
          object-fit: contain;
        }

        .logo-text {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--text-main);
        }

        .logo-highlight {
          color: var(--primary);
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 15px;
          font-weight: 500;
          transition: all 0.2s ease;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
        }

        .nav-item:hover, .nav-item.active {
          color: var(--text-main);
          background: rgba(15, 23, 42, 0.04);
        }

        .nav-item.active {
          color: var(--primary-hover);
          background: var(--primary-glow-subtle);
          border: 1px solid rgba(139, 92, 246, 0.15);
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.03);
          border: 1px solid var(--border);
          padding: 6px 12px;
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 14px;
          font-weight: 500;
        }

        .user-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .btn-sm {
          padding: 8px 16px;
          font-size: 14px;
        }

        .mobile-only {
          display: none;
        }

        .mobile-menu-toggle {
          background: none;
          border: none;
          color: var(--text-main);
          cursor: pointer;
        }

        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-only {
            display: block;
          }
          .mobile-menu-toggle {
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mobile-menu {
            position: absolute;
            top: 70px;
            left: 0;
            width: 100%;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
            padding: 24px;
            z-index: 49;
          }
          .mobile-nav-links {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .mobile-nav-item {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-muted);
            font-size: 16px;
            font-weight: 500;
            padding: 12px;
            border-radius: var(--radius-md);
            border: 1px solid transparent;
          }
          .mobile-nav-item.active {
            color: var(--primary-hover);
            background: var(--primary-glow-subtle);
            border-color: rgba(139, 92, 246, 0.15);
          }
          .mobile-user-profile {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px;
            color: var(--text-main);
            font-weight: 500;
            border-bottom: 1px solid var(--border);
          }
          .mobile-logout-btn {
            width: 100%;
            justify-content: center;
            margin-top: 8px;
          }
        }
      `}</style>
    </nav>
  );
}
