import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DEPARTMENTS } from '../data/lakshyaData';
import { DepartmentId, EventItem } from '../types';
import { SoundEngine } from './AudioEngine';
import { dbService } from '../services/dbService';
import { 
  Terminal, 
  Cpu, 
  Zap, 
  Wrench, 
  Building, 
  Send, 
  TrendingUp, 
  Sparkles, 
  Brain,
  Server,
  Database,
  ArrowRight,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Layers,
  LayoutGrid,
  RotateCw,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface DepartmentArenasProps {
  onSelectDepartment: (deptId: DepartmentId) => void;
}

interface SnowParticle {
  el: HTMLDivElement;
  x: number;
  y: number;
  speed: number;
  drift: number;
  swing: number;
  swingSpeed: number;
}

const CylinderSnowfall: React.FC<{ count?: number }> = ({ count = 55 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const particles: SnowParticle[] = Array.from({ length: count }, () => {
      const el = document.createElement('div');
      const depth = 0.35 + Math.random() * 0.65;
      const size = (2 + Math.random() * 3.2) * depth;
      el.style.position = 'absolute';
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = '50%';
      el.style.background = 'rgba(255,255,255,0.9)';
      el.style.boxShadow = '0 0 6px rgba(255,255,255,0.55)';
      el.style.opacity = String(0.35 + depth * 0.45);
      el.style.filter = `blur(${(1 - depth) * 1.3}px)`;
      container.appendChild(el);
      return {
        el,
        x: Math.random() * 100,
        y: Math.random() * 110 - 10,
        speed: 0.35 + Math.random() * 1.05,
        drift: (Math.random() - 0.5) * 0.4,
        swing: Math.random() * Math.PI * 2,
        swingSpeed: 0.6 + Math.random() * 1.4
      };
    });

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      for (const p of particles) {
        p.y += p.speed * dt;
        if (p.y > 105) {
          p.y = -6;
          p.x = Math.random() * 100;
        }
        p.swing += p.swingSpeed * dt * 0.02;
        p.x += Math.sin(p.swing) * p.drift * dt;
        p.el.style.left = `${p.x}%`;
        p.el.style.top = `${p.y}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      particles.forEach((p) => p.el.remove());
    };
  }, [count]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none z-[5]"
      aria-hidden="true"
    />
  );
};

export const DepartmentArenas: React.FC<DepartmentArenasProps> = ({ onSelectDepartment }) => {
  const [rotation, setRotation] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<'cylinder' | 'grid'>('cylinder');
  const [cylinderRadius, setCylinderRadius] = useState(320);
  const [hoveredCardIdx, setHoveredCardIdx] = useState<number | null>(null);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const [allEvents, setAllEvents] = useState<EventItem[]>(() => dbService.getPublicEvents());

  useEffect(() => {
    const handleEventsUpdate = () => {
      setAllEvents(dbService.getPublicEvents());
    };
    window.addEventListener('lakshya_events_updated', handleEventsUpdate);
    window.addEventListener('storage', handleEventsUpdate);
    handleEventsUpdate();
    return () => {
      window.removeEventListener('lakshya_events_updated', handleEventsUpdate);
      window.removeEventListener('storage', handleEventsUpdate);
    };
  }, []);

  const startXRef = useRef(0);
  const startRotRef = useRef(0);
  const dragDistRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalDepts = DEPARTMENTS.length;
  const angleStep = 360 / totalDepts;

  // Responsive radius calculation & mobile/tablet detection (< 1024px)
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const isMobile = width < 1024;
      setIsMobileOrTablet(isMobile);

      if (width < 640) {
        setCylinderRadius(200);
      } else if (width < 1024) {
        setCylinderRadius(280);
      } else {
        setCylinderRadius(350);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Sync active index based on rotation
  useEffect(() => {
    // Normalized angle between 0 and 360
    const normalized = ((-rotation % 360) + 360) % 360;
    const closestIndex = Math.round(normalized / angleStep) % totalDepts;
    setActiveIdx(closestIndex);
  }, [rotation, angleStep, totalDepts]);

  // Auto-orbit animation loop - disabled completely on mobile/tablet to save resources
  useEffect(() => {
    if (isMobileOrTablet || !autoOrbit || (isHovered && !isFullscreen) || isDragging || viewMode !== 'cylinder') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    let lastTime = performance.now();
    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;
      // Gentle orbit speed: ~6 degrees per second
      setRotation(prev => prev - (delta * 0.008));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [autoOrbit, isHovered, isDragging, viewMode, isFullscreen]);

  // Track fullscreen state of the cylinder stage
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    SoundEngine.playClick();
    if (!document.fullscreenElement) {
      setAutoOrbit(true);
      stageRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  // Navigate to specific department
  const rotateToDepartment = useCallback((idx: number) => {
    SoundEngine.playClick();
    const targetAngle = -idx * angleStep;
    // Find shortest rotational path
    const currentAngle = rotation;
    const diff = (targetAngle - currentAngle) % 360;
    let shortestDiff = diff;
    if (diff > 180) shortestDiff -= 360;
    if (diff < -180) shortestDiff += 360;

    setRotation(currentAngle + shortestDiff);
  }, [rotation, angleStep]);

  const handleNext = () => {
    SoundEngine.playClick();
    setRotation(prev => prev - angleStep);
  };

  const handlePrev = () => {
    SoundEngine.playClick();
    setRotation(prev => prev + angleStep);
  };

  // Drag interaction handlers
  const handlePointerDown = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    startRotRef.current = rotation;
    dragDistRef.current = 0;
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startXRef.current;
    dragDistRef.current = Math.abs(deltaX);
    // Sensitivity factor
    const rotSpeed = 0.28;
    setRotation(startRotRef.current + deltaX * rotSpeed);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to nearest facet after drag
    const normalized = ((-rotation % 360) + 360) % 360;
    const snapIdx = Math.round(normalized / angleStep) % totalDepts;
    const targetAngle = -snapIdx * angleStep;
    const diff = (targetAngle - rotation) % 360;
    let shortestDiff = diff;
    if (diff > 180) shortestDiff -= 360;
    if (diff < -180) shortestDiff += 360;
    setRotation(prev => prev + shortestDiff);
  };

  const getIcon = (name: string) => {
    switch (name) {
      case 'Terminal': return <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Brain': return <Brain className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Cpu': return <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Zap': return <Zap className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Wrench': return <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Building': return <Building className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Send': return <Send className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Server': return <Server className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'Database': return <Database className="w-5 h-5 sm:w-6 sm:h-6" />;
      case 'TrendingUp': return <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />;
      default: return <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />;
    }
  };

  const activeDepartment = DEPARTMENTS[activeIdx] || DEPARTMENTS[0];
  const activeDeptEvents = allEvents.filter((e: EventItem) => e.deptId === activeDepartment.id).slice(0, 3);

  return (
    <section id="arenas-section" className="py-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-cyber-grid opacity-15 pointer-events-none" />
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[140px] opacity-20 pointer-events-none transition-colors duration-700"
        style={{ backgroundColor: activeDepartment.accentColor }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/30 text-pink-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
            <Trophy className="w-3.5 h-3.5 text-pink-400" />
            LBRCE Technical Spectrum
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight mb-4">
            Department Arenas
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Seven specialized engineering departments featuring collegiate domains, AI labs, robotics challenges, and competitive prize pools.
            <span className="hidden lg:inline"> Rotate the interactive cylinder or switch views to inspect each collegiate domain.</span>
          </p>
        </div>

        {/* View Controls & Auto-Orbit Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-3 rounded-2xl bg-slate-950/80 border border-purple-950/60 backdrop-blur-xl">
          {/* Quick Sector Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full scrollbar-none">
            {DEPARTMENTS.map((dept, idx) => (
              <button
                key={dept.id}
                onClick={() => {
                  if (!isMobileOrTablet && viewMode === 'cylinder') {
                    rotateToDepartment(idx);
                  } else {
                    SoundEngine.playClick();
                    setActiveIdx(idx);
                    const el = document.getElementById(`arena-card-${dept.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }
                }}
                onMouseEnter={() => SoundEngine.playHover()}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeIdx === idx
                    ? 'bg-slate-800 text-white shadow-lg border'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                style={{
                  borderColor: activeIdx === idx ? dept.accentColor : 'transparent',
                  color: activeIdx === idx ? dept.accentColor : undefined
                }}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: dept.accentColor }} 
                />
                <span>{dept.code}</span>
              </button>
            ))}
          </div>

          {/* Mode & Auto Orbit Controls - Shown only on laptop/large screens where cylinder is present */}
          <div className="hidden lg:flex items-center gap-2 shrink-0 ml-auto">
            {viewMode === 'cylinder' && (
              <button
                id="btn-toggle-auto-orbit"
                onClick={() => {
                  SoundEngine.playClick();
                  setAutoOrbit(!autoOrbit);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase border transition-all flex items-center gap-1.5 cursor-pointer ${
                  autoOrbit 
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-purple-900/60 hover:text-white'
                }`}
                title={autoOrbit ? 'Pause automated cylinder orbit' : 'Resume automated cylinder orbit'}
              >
                {autoOrbit ? <Pause className="w-3.5 h-3.5 text-pink-400" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{autoOrbit ? 'Orbit Active' : 'Orbit Paused'}</span>
              </button>
            )}

            {/* View Switcher: Cylinder vs Grid */}
            <div className="flex items-center bg-slate-900 border border-purple-900/60 p-1 rounded-xl">
              <button
                id="btn-view-cylinder"
                onClick={() => {
                  SoundEngine.playClick();
                  setViewMode('cylinder');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'cylinder'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Cylinder</span>
              </button>
              <button
                id="btn-view-grid"
                onClick={() => {
                  SoundEngine.playClick();
                  setViewMode('grid');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-tech font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-pink-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= CYLINDRICAL ARENA STAGE (Desktop & Laptops only) ================= */}
        {!isMobileOrTablet && viewMode === 'cylinder' ? (
          <div className="hidden lg:block relative mb-14">
            {/* Cylinder Stage Wrapper - calibrated height */}
            <div
              ref={stageRef}
              className={`relative flex items-center justify-center select-none overflow-hidden rounded-3xl bg-gradient-to-b from-slate-950/90 via-[#050711] to-slate-950/95 border border-purple-900/40 shadow-2xl cursor-grab active:cursor-grabbing ${
                isFullscreen ? 'h-screen w-screen' : 'w-full h-[460px] sm:h-[510px]'
              }`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                setIsHovered(false);
                setHoveredCardIdx(null);
                handlePointerUp();
              }}
              onMouseDown={(e) => handlePointerDown(e.clientX)}
              onMouseMove={(e) => handlePointerMove(e.clientX)}
              onMouseUp={handlePointerUp}
              onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
              onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
              onTouchEnd={handlePointerUp}
            >
              {/* 3D Snowfall Ambience */}
              <CylinderSnowfall />

              {/* Fullscreen Toggle Button */}
              <button
                id="btn-fullscreen-cylinder"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleFullscreen();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseEnter={() => SoundEngine.playHover()}
                className="absolute top-4 right-4 z-50 w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center backdrop-blur-md shadow-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              {/* Perspective Container */}
              <div 
                className="relative z-10 w-full h-full flex items-center justify-center preserve-3d"
                style={{
                  perspective: '1000px',
                  perspectiveOrigin: '50% 46%'
                }}
              >
                {/* Rotating Cylinder Core Rig - compact & balanced format */}
                <div
                  className="relative preserve-3d transition-transform ease-out"
                  style={{
                    width: '250px',
                    height: '350px',
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(-8deg) rotateY(${rotation}deg)`,
                    transitionDuration: isDragging ? '0ms' : '450ms'
                  }}
                >
                  {/* 8 Cylindrical Facet Cards */}
                  {DEPARTMENTS.map((dept, idx) => {
                    const cardAngle = idx * angleStep;
                    // Compute angle relative to front
                    const relativeAngle = ((cardAngle + rotation) % 360 + 360) % 360;
                    const rad = (relativeAngle * Math.PI) / 180;
                    const cosVal = Math.cos(rad); // 1 = facing forward, -1 = back
                    const isFront = cosVal > 0.65;
                    const isHoveredCard = hoveredCardIdx === idx;
                    const opacity = Math.max(0.3, (cosVal + 1) / 2);
                    const baseScale = 0.86 + (cosVal + 1) * 0.07;
                    const finalScale = isHoveredCard ? baseScale * 1.07 : baseScale;

                    return (
                      <div
                        key={dept.id}
                        id={`cylinder-card-${dept.id}`}
                        onMouseEnter={() => {
                          setHoveredCardIdx(idx);
                          SoundEngine.playHover();
                        }}
                        onMouseLeave={() => setHoveredCardIdx(null)}
                        onClick={(e) => {
                          if (dragDistRef.current > 8) return;
                          e.stopPropagation();
                          if (!isFront) {
                            rotateToDepartment(idx);
                          } else {
                            SoundEngine.playWarp();
                            onSelectDepartment(dept.id);
                          }
                        }}
                        className={`absolute inset-0 rounded-3xl preserve-3d transition-all duration-300 flex flex-col justify-between p-5 sm:p-6 shadow-2xl cursor-pointer ${
                          isHoveredCard
                            ? 'border-2 shadow-[0_0_30px_rgba(0,240,255,0.7)]'
                            : isFront 
                            ? 'border-2 shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                            : 'border border-purple-900/40 opacity-40 blur-[0.3px]'
                        }`}
                        style={{
                          transform: `rotateY(${cardAngle}deg) translateZ(${cylinderRadius}px) scale(${finalScale})`,
                          borderColor: isHoveredCard 
                            ? '#00f0ff' 
                            : (isFront ? dept.accentColor : 'rgba(147, 51, 234, 0.3)'),
                          background: isHoveredCard
                            ? `linear-gradient(145deg, rgba(236, 72, 153, 0.35) 0%, rgba(147, 51, 234, 0.5) 50%, rgba(6, 182, 212, 0.35) 100%)`
                            : `linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(5, 7, 17, 0.98) 100%)`,
                          opacity: isHoveredCard ? 1 : opacity,
                          zIndex: isHoveredCard ? 100 : Math.round((cosVal + 1) * 50)
                        }}
                      >
                        {/* Cylindrical Rim Glow Bar - shifts color on hover */}
                        <div
                          className="absolute -top-1 left-5 right-5 h-1 rounded-full shadow-lg transition-all duration-300"
                          style={{
                            backgroundColor: isHoveredCard ? '#00f0ff' : dept.accentColor,
                            boxShadow: isHoveredCard 
                              ? '0 0 20px #00f0ff, 0 0 10px #ec4899'
                              : (isFront ? `0 0 16px ${dept.accentColor}` : 'none')
                          }}
                        />

                        {/* Card Header */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div
                              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300"
                              style={{
                                backgroundColor: isHoveredCard ? '#00f0ff' : `${dept.accentColor}25`,
                                color: isHoveredCard ? '#050711' : dept.accentColor,
                                border: isHoveredCard ? '1.5px solid #ffffff' : `1.5px solid ${dept.accentColor}50`,
                                transform: isHoveredCard ? 'scale(1.1) rotate(6deg)' : 'scale(1)'
                              }}
                            >
                              {getIcon(dept.iconName)}
                            </div>
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-900/90 text-slate-300 border border-purple-900/50">
                              {dept.badge}
                            </span>
                          </div>

                          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                            SECTOR {idx + 1 < 10 ? `0${idx + 1}` : idx + 1} • {dept.code}
                          </span>
                          <h3 
                            className="text-lg sm:text-xl font-black font-heading text-white mb-1 transition-colors line-clamp-1"
                            style={{ 
                              color: isHoveredCard ? '#00f0ff' : (isFront ? '#ffffff' : '#94a3b8'),
                              textShadow: isHoveredCard ? '0 0 12px rgba(0, 240, 255, 0.6)' : 'none'
                            }}
                          >
                            {dept.name}
                          </h3>
                          <p 
                            className="text-xs font-semibold uppercase tracking-wide mb-2 transition-colors"
                            style={{ color: isHoveredCard ? '#f472b6' : dept.accentColor }}
                          >
                            {dept.theme}
                          </p>
                          <p className="text-[11px] text-slate-300/90 leading-relaxed line-clamp-3 mb-2">
                            {dept.description}
                          </p>
                        </div>

                        {/* Card Footer: Prize & CTA */}
                        <div className="pt-3 border-t border-purple-900/40 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-mono uppercase text-slate-400 block">Prizes</span>
                            <span className="text-xs sm:text-sm font-tech font-bold text-amber-400">
                              {dept.totalPrizes}
                            </span>
                          </div>

                          <div 
                            className="flex items-center gap-1.5 text-[11px] font-tech font-bold uppercase tracking-wider transition-transform"
                            style={{ 
                              color: isHoveredCard ? '#00f0ff' : (isFront ? dept.accentColor : '#a855f7'),
                              transform: isHoveredCard ? 'translateX(3px)' : 'none'
                            }}
                          >
                            <span>{isFront ? 'Enter Arena' : 'Rotate Front'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Ambient Neon Flare */}
                        <div
                          className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl opacity-25 pointer-events-none transition-opacity duration-300"
                          style={{ 
                            backgroundColor: isHoveredCard ? '#00f0ff' : dept.accentColor,
                            opacity: isHoveredCard ? 0.5 : 0.2
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Cylindrical Hologram Pedestal Base */}
                <div 
                  className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[480px] sm:w-[580px] h-[140px] pointer-events-none preserve-3d"
                  style={{
                    transform: 'rotateX(80deg) translateZ(-140px)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Outer Glowing Stage Ring */}
                  <div 
                    className="absolute inset-0 rounded-full border-2 border-dashed opacity-40 transition-colors duration-500 animate-spin"
                    style={{ 
                      borderColor: activeDepartment.accentColor,
                      animationDuration: '30s'
                    }} 
                  />
                  {/* Inner Stage Ring */}
                  <div 
                    className="absolute inset-6 rounded-full border border-cyan-400/30 opacity-60"
                  />
                  {/* Central Glow Core */}
                  <div 
                    className="absolute inset-12 rounded-full blur-2xl opacity-30 transition-colors duration-500"
                    style={{ backgroundColor: activeDepartment.accentColor }}
                  />
                </div>
              </div>

              {/* Lateral Navigation Arrow Controls */}
              <button
                id="btn-cylinder-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center backdrop-blur-md shadow-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title="Previous Department"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                id="btn-cylinder-next"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 flex items-center justify-center backdrop-blur-md shadow-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                title="Next Department"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Bottom Drag Guide Pill */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/80 border border-purple-900/60 backdrop-blur-md text-[11px] font-mono text-slate-300 pointer-events-none">
                <RotateCw className="w-3.5 h-3.5 text-pink-400 animate-spin" style={{ animationDuration: '6s' }} />
                <span>Drag to spin cylinder • Click card to enter</span>
              </div>
            </div>

            {/* Active Department Spotlight Command Dock */}
            <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-purple-900/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: activeDepartment.accentColor }}
              />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left: Department Details */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider"
                      style={{
                        backgroundColor: `${activeDepartment.accentColor}20`,
                        color: activeDepartment.accentColor,
                        border: `1px solid ${activeDepartment.accentColor}40`
                      }}
                    >
                      SECTOR {activeIdx + 1} OF 8 • ACTIVE DOCK
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Branch: {activeDepartment.name}
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black font-heading text-white">
                    {activeDepartment.theme}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-sans">
                    {activeDepartment.description}
                  </p>

                  {/* Highlighted Events Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-xs font-mono uppercase text-slate-400 mr-1">Key Challenges:</span>
                    {activeDeptEvents.map((evt: EventItem) => (
                      <span 
                        key={evt.id}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono bg-slate-900 border border-purple-900/50 text-slate-300"
                      >
                        {evt.title}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Prize & Direct Entry CTA */}
                <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-800 lg:pl-8">
                  <div>
                    <span className="text-xs font-mono uppercase text-slate-400 block">Department Allocation</span>
                    <span className="text-2xl sm:text-3xl font-black font-tech text-pink-400">
                      {activeDepartment.totalPrizes}
                    </span>
                  </div>

                  <button
                    id="btn-dock-enter-arena"
                    onClick={() => {
                      SoundEngine.playWarp();
                      onSelectDepartment(activeDepartment.id);
                    }}
                    onMouseEnter={() => SoundEngine.playHover()}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-tech font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer text-white"
                    style={{
                      background: `linear-gradient(135deg, ${activeDepartment.accentColor}, #d946ef)`,
                      boxShadow: `0 8px 25px ${activeDepartment.accentColor}35`
                    }}
                  >
                    <span>Enter {activeDepartment.code} Arena</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================= EXPANDED GRID VIEW (ALTERNATIVE) ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {DEPARTMENTS.map((dept, idx) => {
              return (
                <div
                  key={dept.id}
                  id={`arena-card-${dept.id}`}
                  onClick={() => {
                    SoundEngine.playWarp();
                    onSelectDepartment(dept.id);
                  }}
                  onMouseEnter={() => SoundEngine.playHover()}
                  className="group relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-[#070b16] border border-purple-900/40 p-6 flex flex-col justify-between cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:border-cyan-400 hover:bg-gradient-to-b hover:from-slate-900 hover:to-purple-950/80 overflow-hidden"
                >
                  {/* Top Glow Highlight on hover */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5 group-hover:bg-cyan-400"
                    style={{ backgroundColor: dept.accentColor }}
                  />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-cyan-400 group-hover:text-slate-950 group-hover:border-cyan-300"
                        style={{
                          backgroundColor: `${dept.accentColor}20`,
                          color: dept.accentColor,
                          border: `1px solid ${dept.accentColor}40`
                        }}
                      >
                        {getIcon(dept.iconName)}
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-slate-800/90 text-slate-300 border border-purple-900/50">
                        {dept.badge}
                      </span>
                    </div>

                    <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">
                      SECTOR {idx + 1} • {dept.code}
                    </p>
                    <h3 className="text-xl font-bold font-tech text-white mb-2 group-hover:text-cyan-300 transition-colors">
                      {dept.name}
                    </h3>
                    <p className="text-xs font-medium mb-3 transition-colors group-hover:text-pink-400" style={{ color: dept.accentColor }}>
                      {dept.theme}
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 mb-6">
                      {dept.description}
                    </p>
                  </div>

                  <div className="relative z-10 pt-4 border-t border-purple-900/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">Prizes</span>
                      <span className="text-sm font-tech font-bold text-amber-400">{dept.totalPrizes}</span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-tech font-bold uppercase tracking-wider text-slate-300 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all">
                      <span>Enter Arena</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>

                  <div
                    className="absolute -right-12 -bottom-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-40 blur-2xl transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: dept.accentColor }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
