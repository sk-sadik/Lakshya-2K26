/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ThreeHeroCore } from './components/ThreeHeroCore';
import { DepartmentArenas } from './components/DepartmentArenas';
import { EventsExplorer } from './components/EventsExplorer';
import { PassGenerator3D } from './components/PassGenerator3D';
import { TimelineSchedule } from './components/TimelineSchedule';
import { EventModal } from './components/EventModal';
import { RegistrationModal } from './components/RegistrationModal';
import { LoginModal } from './components/auth/LoginModal';
import { StudentDashboard } from './components/dashboard/StudentDashboard';
import { CoordinatorDashboard } from './components/dashboard/CoordinatorDashboard';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { Footer } from './components/Footer';
import { CampusSpotlight } from './components/CampusSpotlight';
import { DepartmentId, EventItem, User, UserRole } from './types';
import { FEST_METRICS } from './data/lakshyaData';
import { Trophy, Users, Calendar, Sparkles, Cpu, LogIn, ArrowRight } from 'lucide-react';
import { SoundEngine } from './components/AudioEngine';
import { dbService, SESSION_INVALIDATED_EVENT } from './services/dbService';

export default function App() {
  const [selectedDept, setSelectedDept] = useState<DepartmentId>('all');
  const [activeModalEvent, setActiveModalEvent] = useState<EventItem | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerEventTarget, setRegisterEventTarget] = useState<EventItem | null>(null);
  // When a logged-out user hits Register: stash the target (event or general),
  // force account creation/login first, then resume exactly where they left off.
  const [pendingRegTarget, setPendingRegTarget] = useState<EventItem | null | undefined>(undefined);
  const [authFlow, setAuthFlow] = useState<'login' | 'register'>('login');

  // Role-Based Auth & View State
  const [currentUser, setCurrentUser] = useState<Omit<User, 'passwordHash'> | null>(() => {
    return dbService.getCurrentUser();
  });
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'dashboard'>('main');

  const [activeDashboardRole, setActiveDashboardRole] = useState<UserRole>(() => {
    const user = dbService.getCurrentUser();
    return user?.role || 'student';
  });

  // Sync session on mount
  useEffect(() => {
    const user = dbService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setActiveDashboardRole(user.role || (user.roles?.[0]) || 'student');
    }
  }, []);

  // Auto sign-out site-wide when the backend reports a stale/invalid session token
  useEffect(() => {
    const handleSessionInvalidated = () => {
      setCurrentUser(null);
      setCurrentView('main');
      setIsLoginOpen(true);
      SoundEngine.playClick();
    };
    window.addEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, handleSessionInvalidated);
  }, []);

  // Smooth scroll to events section when clicking on arena
  const handleSelectDepartment = (deptId: DepartmentId) => {
    setSelectedDept(deptId);
    const eventsSection = document.getElementById('events-section');
    if (eventsSection) {
      eventsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenRegisterForEvent = (event: EventItem) => {
    if (currentUser) {
      setRegisterEventTarget(event);
      setIsRegisterOpen(true);
    } else {
      // Not authenticated: stash the event, require account first.
      setPendingRegTarget(event);
      setAuthFlow('register');
      setIsLoginOpen(true);
    }
  };

  const handleOpenGeneralRegister = () => {
    if (currentUser) {
      setRegisterEventTarget(null);
      setIsRegisterOpen(true);
    } else {
      setPendingRegTarget(null);
      setAuthFlow('register');
      setIsLoginOpen(true);
    }
  };

  const handleScrollToSection = (sectionId: string) => {
    setCurrentView('main');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
  };

  const handleLoginSuccess = (user: Omit<User, 'passwordHash'>) => {
    setCurrentUser(user);
    setActiveDashboardRole(user.role || (user.roles?.[0]) || 'student');
    setIsLoginOpen(false);
    if (pendingRegTarget !== undefined) {
      // Resume the exact registration the user started before authenticating.
      setRegisterEventTarget(pendingRegTarget);
      setPendingRegTarget(undefined);
      setIsRegisterOpen(true);
    } else {
      // Direct redirect to dedicated dashboard as requested
      setCurrentView('dashboard');
    }
  };

  const handleSwitchRole = (role: UserRole) => {
    SoundEngine.playClick();
    const updated = dbService.switchActiveRole(role);
    if (updated) {
      setCurrentUser(updated);
    }
    setActiveDashboardRole(role);
  };

  const handleLogout = () => {
    dbService.logout();
    setCurrentUser(null);
    setCurrentView('main');
    SoundEngine.playClick();
  };

  const userRoles: UserRole[] = currentUser?.roles && Array.isArray(currentUser.roles) && currentUser.roles.length > 0
    ? currentUser.roles
    : (currentUser ? [currentUser.role] : []);

  const effectiveRole: UserRole = userRoles.includes(activeDashboardRole) 
    ? activeDashboardRole 
    : (currentUser?.role || userRoles[0] || 'student');

  // If in dashboard view and user is authenticated, render role-specific dashboard
  if (currentView === 'dashboard' && currentUser) {
    if (effectiveRole === 'student') {
      return (
        <StudentDashboard
          user={{ ...currentUser, role: 'student' }}
          onLogout={handleLogout}
          onBackToWebsite={() => setCurrentView('main')}
          onOpenPassView={() => handleScrollToSection('pass-section')}
          onUserUpdate={(updated) => setCurrentUser(updated)}
          onSwitchRole={handleSwitchRole}
          availableRoles={userRoles}
        />
      );
    }

    if (effectiveRole === 'coordinator') {
      return (
        <CoordinatorDashboard
          user={{ ...currentUser, role: 'coordinator' }}
          onLogout={handleLogout}
          onBackToWebsite={() => setCurrentView('main')}
          onUserUpdate={(updated) => setCurrentUser(updated)}
          onSwitchRole={handleSwitchRole}
          availableRoles={userRoles}
        />
      );
    }

    if (effectiveRole === 'admin') {
      return (
        <AdminDashboard
          user={{ ...currentUser, role: 'admin' }}
          onLogout={handleLogout}
          onBackToWebsite={() => setCurrentView('main')}
          onUserUpdate={(updated) => setCurrentUser(updated)}
          onSwitchRole={handleSwitchRole}
          availableRoles={userRoles}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#060312] text-slate-100 relative selection:bg-pink-500 selection:text-white">
      {/* Global Navigation with Login and Register CTA buttons */}
      <Navbar
        onOpenPass={() => handleScrollToSection('pass-section')}
        onOpenRegister={handleOpenGeneralRegister}
        onOpenLogin={() => {
          setPendingRegTarget(undefined);
          setAuthFlow('login');
          setIsLoginOpen(true);
        }}
        currentUser={currentUser}
        onOpenDashboard={() => setCurrentView('dashboard')}
        onLogout={handleLogout}
      />

      {/* Logged in notification banner if viewing website */}
      {currentUser && (
        <div className="relative z-30 pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-800/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-slate-300">
                  Signed in as <strong className="text-white">{currentUser.name}</strong>
                </span>
                <div className="flex items-center gap-1">
                  {userRoles.map((r) => (
                    <span
                      key={r}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                        r === 'admin' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' :
                        r === 'coordinator' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                        'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                      }`}
                    >
                      {r === 'admin' ? 'Admin' : r === 'coordinator' ? 'Coordinator' : 'Student'}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* If user has multiple roles, allow 1-click launch to each dashboard */}
              {userRoles.length > 1 ? (
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-purple-950/40 border border-purple-800/40">
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-1">Open:</span>
                  {userRoles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        handleSwitchRole(r);
                        setCurrentView('dashboard');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-tech font-bold uppercase transition-all cursor-pointer ${
                        effectiveRole === r
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-md'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => {
                    SoundEngine.playClick();
                    setCurrentView('dashboard');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-tech font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/30"
                >
                  <span>Go to {currentUser.role} Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={handleLogout}
                className="text-red-400 hover:text-red-300 font-mono text-[11px] underline cursor-pointer ml-1"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Interactive Three.js Core */}
      <ThreeHeroCore
        onExploreEvents={() => handleScrollToSection('events-section')}
        onOpenPass={() => handleScrollToSection('pass-section')}
      />

      {/* Floating Fast-Metrics Ticker */}
      <section className="relative z-20 -mt-6 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 sm:p-6 rounded-2xl bg-slate-900/90 border border-purple-900/60 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 min-[400px]:gap-3 p-1 min-[400px]:p-2 min-w-0">
            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base min-[400px]:text-lg sm:text-2xl font-black font-tech text-white block leading-tight">
                {FEST_METRICS.prizePool}
              </span>
              <span className="text-[11px] font-mono text-purple-300/80 uppercase">Cash & Awards</span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-[400px]:gap-3 p-1 min-[400px]:p-2 min-w-0">
            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base min-[400px]:text-lg sm:text-2xl font-black font-tech text-white block leading-tight">
                {FEST_METRICS.eventsCount}
              </span>
              <span className="text-[11px] font-mono text-purple-300/80 uppercase">Technical Events</span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-[400px]:gap-3 p-1 min-[400px]:p-2 min-w-0">
            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base min-[400px]:text-lg sm:text-2xl font-black font-tech text-white block leading-tight">
                {FEST_METRICS.expectedFootfall}
              </span>
              <span className="text-[11px] font-mono text-purple-300/80 uppercase">Annual Footfall</span>
            </div>
          </div>

          <div className="flex items-center gap-2 min-[400px]:gap-3 p-1 min-[400px]:p-2 min-w-0">
            <div className="w-8 h-8 min-[400px]:w-10 min-[400px]:h-10 rounded-xl bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0 border border-pink-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base min-[400px]:text-lg sm:text-2xl font-black font-tech text-white block leading-tight">
                1 Mega Day
              </span>
              <span className="text-[11px] font-mono text-pink-400/80 uppercase font-semibold">NATIONAL SYMPOSIUM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Cylindrical Department Arenas Section */}
      <DepartmentArenas onSelectDepartment={handleSelectDepartment} />

      {/* Interactive Events Explorer Section */}
      <EventsExplorer
        selectedDept={selectedDept}
        onSelectDept={setSelectedDept}
        onSelectEvent={(event) => {
          SoundEngine.playClick();
          setActiveModalEvent(event);
        }}
        onRegisterEvent={handleOpenRegisterForEvent}
      />

      {/* Holographic Pass Generator Section */}
      <section id="pass-section" className="py-20 relative bg-gradient-to-b from-[#060312] via-slate-950 to-[#060312]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/30 text-pink-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Interactive Credential
            </div>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight mb-4">
              Holographic Delegate Pass
            </h2>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
              Generate, tilt, inspect, and export your digital credential for the LBRCE Lakshya 2027 festival.
            </p>
          </div>

          <PassGenerator3D
            initialName={currentUser?.name}
            initialCollege={currentUser?.college}
            initialDepartment={currentUser?.department}
          />
        </div>
      </section>

      {/* Synchronized Festival Schedule */}
      <TimelineSchedule />

      {/* Campus Spotlight Feature */}
      <CampusSpotlight />

      {/* Institutional Credits & Footer */}
      <Footer />

      {/* Event Details Rulebook Modal */}
      {activeModalEvent && (
        <EventModal
          event={activeModalEvent}
          onClose={() => setActiveModalEvent(null)}
          onRegister={handleOpenRegisterForEvent}
        />
      )}

      {/* Registration Modal Flow */}
      {isRegisterOpen && (
        <RegistrationModal
          initialEvent={registerEventTarget}
          onClose={() => {
            setIsRegisterOpen(false);
            setRegisterEventTarget(null);
          }}
          onGoToPass={() => handleScrollToSection('pass-section')}
        />
      )}

      {/* Role-Based Login & Auth Modal (fresh state per open; starts in
          account-creation mode when the user arrived via Register) */}
      <LoginModal
        key={`${isLoginOpen}-${authFlow}`}
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        initialRegisterMode={authFlow === 'register'}
      />
    </div>
  );
}
