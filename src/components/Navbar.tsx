import React, { useState, useEffect } from 'react';
import { SoundEngine } from './AudioEngine';
import { 
  Volume2, 
  VolumeX, 
  Menu, 
  X, 
  Ticket, 
  Sparkles,
  Layers,
  LogIn,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  onOpenPass: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  currentUser?: Omit<User, 'passwordHash'> | null;
  onOpenDashboard?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenPass, 
  onOpenRegister, 
  onOpenLogin,
  currentUser,
  onOpenDashboard,
  onLogout
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    SoundEngine.setMuted(nextMuted);
    if (!nextMuted) {
      SoundEngine.playClick();
    }
  };

  const navLinks = [
    { label: 'Arenas', href: '#arenas-section' },
    { label: 'Events & Prizes', href: '#events-section' },
    { label: 'Delegate Pass', href: '#pass-section' },
    { label: 'Schedule', href: '#schedule-section' },
    { label: 'About LBRCE', href: '#about-section' }
  ];

  return (
    <header
      id="main-navigation-bar"
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#060314]/90 backdrop-blur-xl border-b border-purple-900/50 shadow-2xl py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 min-[400px]:px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <a
          href="#"
          onClick={() => SoundEngine.playClick()}
          className="flex items-center gap-2 min-[400px]:gap-3 group cursor-pointer min-w-0"
        >
          <div className="relative w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-600 to-cyan-400 flex items-center justify-center p-0.5 shadow-lg shadow-purple-600/30 group-hover:scale-105 transition-transform shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Layers className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            </div>
            {/* Pulsing indicator */}
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-400 animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-pink-400" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base min-[400px]:text-lg sm:text-xl font-extrabold font-heading tracking-wider text-white">
                LAKSHYA
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/40">
                2026
              </span>
            </div>
            <p className="text-[10px] font-mono text-purple-300/80 tracking-wider hidden sm:block">
              LBRCE AUTONOMOUS • MYLAVARAM
            </p>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => SoundEngine.playClick()}
              className="text-xs font-tech font-bold uppercase tracking-wider text-slate-400 hover:text-pink-400 transition-colors hover:scale-105"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Sound Toggle (hidden on very small screens to save navbar space) */}
          <button
            id="nav-sound-toggle"
            onClick={toggleSound}
            className="hidden min-[420px]:flex p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-purple-900/50 transition-colors cursor-pointer items-center justify-center"
            title={isMuted ? 'Unmute Audio FX' : 'Mute Audio FX'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Quick Pass Generator Button */}
          <button
            id="nav-btn-pass"
            onClick={() => {
              SoundEngine.playClick();
              onOpenPass();
            }}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-purple-900/60 hover:border-pink-500/50 hover:text-pink-300 text-xs font-tech font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Pass</span>
          </button>

          {/* Register CTA */}
          <button
            id="nav-btn-register-cta"
            onClick={() => {
              SoundEngine.playWarp();
              onOpenRegister();
            }}
            className="px-2.5 min-[400px]:px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-pink-600/25 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
          >
            <Ticket className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[400px]:inline">Register</span>
          </button>

          {/* Login or Dashboard + Logout CTAs */}
          {currentUser ? (
            <div className="flex items-center gap-1.5">
              <button
                id="nav-btn-dashboard-cta"
                onClick={() => {
                  SoundEngine.playClick();
                  if (onOpenDashboard) onOpenDashboard();
                }}
                className="px-3 sm:px-3.5 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900/80 text-purple-200 hover:text-white border border-purple-700/60 text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-purple-950"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">{currentUser.role.toUpperCase()} PORTAL</span>
                <span className="hidden min-[400px]:inline sm:hidden">Portal</span>
              </button>
              {onLogout && (
                <button
                  id="nav-btn-logout-cta"
                  onClick={() => {
                    SoundEngine.playClick();
                    onLogout();
                  }}
                  title="Logout / Switch Account"
                  className="p-2 sm:py-2 sm:px-2.5 rounded-xl bg-slate-900/80 hover:bg-red-950/60 border border-red-900/40 text-red-400 hover:text-red-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
            </div>
          ) : (
            <button
              id="nav-btn-login-cta"
              onClick={() => {
                SoundEngine.playClick();
                onOpenLogin();
              }}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-purple-200 hover:text-white border border-purple-700/60 hover:border-cyan-400/80 text-xs font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105 shadow-md shadow-purple-950"
            >
              <LogIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="hidden min-[400px]:inline">Login</span>
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            id="nav-mobile-burger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white border border-purple-900/50 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-purple-900/50 px-4 pt-3 pb-6 animate-in slide-in-from-top-2">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  SoundEngine.playClick();
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-tech font-bold uppercase tracking-wider text-slate-300 hover:text-pink-400 py-2 border-b border-purple-950/60"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  SoundEngine.playClick();
                  setMobileMenuOpen(false);
                  if (currentUser && onOpenDashboard) {
                    onOpenDashboard();
                  } else {
                    onOpenLogin();
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-purple-800 text-cyan-300 text-xs font-tech font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{currentUser ? `${currentUser.role.toUpperCase()} DASHBOARD` : 'Login (Student / Coord / Admin)'}</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
