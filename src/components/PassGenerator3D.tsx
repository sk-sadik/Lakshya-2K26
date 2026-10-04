import React, { useState, useRef } from 'react';
import { Download, RefreshCw, QrCode, Sparkles, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SoundEngine } from './AudioEngine';

interface PassGenerator3DProps {
  onClose?: () => void;
  initialName?: string;
  initialCollege?: string;
  initialDepartment?: string;
}

export const PassGenerator3D: React.FC<PassGenerator3DProps> = ({
  initialName = '',
  initialCollege = '',
  initialDepartment = ''
}) => {
  const [name, setName] = useState(initialName);
  const [college, setCollege] = useState(initialCollege);
  const [department, setDepartment] = useState(initialDepartment);
  const [role] = useState<'Participant'>('Participant');
  const [passId] = useState(() => `LK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(100 + Math.random() * 900)}`);
  
  // 3D Card tilt state
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalise from -1 to 1
    const normX = (x / rect.width) * 2 - 1;
    const normY = (y / rect.height) * 2 - 1;

    setRotY(normX * 18);
    setRotX(-normY * 18);
    setGlarePos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      opacity: 0.35
    });
  };

  const handleMouseLeave = () => {
    setRotX(0);
    setRotY(0);
    setGlarePos(prev => ({ ...prev, opacity: 0 }));
  };

  const toggleFlip = () => {
    SoundEngine.playClick();
    setIsFlipped(!isFlipped);
  };

  // Download pass as an image using HTML5 canvas
  const handleDownload = () => {
    SoundEngine.playSuccess();
    setIsDownloading(true);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1200;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      const grad = ctx.createLinearGradient(0, 0, 800, 1200);
      grad.addColorStop(0, '#0a0f1d');
      grad.addColorStop(0.5, '#050711');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 800, 1200);

      // Cyber borders
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 6;
      ctx.strokeRect(30, 30, 740, 1140);

      // Top banner
      const bannerGrad = ctx.createLinearGradient(30, 30, 770, 210);
      bannerGrad.addColorStop(0, '#9333ea');
      bannerGrad.addColorStop(0.5, '#ec4899');
      bannerGrad.addColorStop(1, '#06b6d4');
      ctx.fillStyle = bannerGrad;
      ctx.fillRect(30, 30, 740, 180);

      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 52px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LAKSHYA 2026', 400, 110);

      ctx.fillStyle = '#fce7f3';
      ctx.font = '24px Rajdhani, sans-serif';
      ctx.fillText('LBRCE NATIONAL LEVEL TECH FEST • 2026', 400, 160);

      // Pass Type Badge (Participant tier only)
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(200, 260, 400, 60);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px Rajdhani, sans-serif';
      ctx.fillText(role.toUpperCase(), 400, 302);

      // Delegate Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 46px Rajdhani, sans-serif';
      ctx.fillText(name || 'DELEGATE', 400, 420);

      // College & Dept
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '28px sans-serif';
      ctx.fillText(college, 400, 480);
      ctx.fillText(department, 400, 530);

      // Divider line
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(100, 600);
      ctx.lineTo(700, 600);
      ctx.stroke();

      // Pass ID & QR Simulation
      ctx.fillStyle = '#06b6d4';
      ctx.font = 'bold 36px monospace';
      ctx.fillText(`ID: ${passId}`, 400, 670);

      // Mock QR Box
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(275, 730, 250, 250);
      ctx.fillStyle = '#000000';
      // simple pattern
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          if ((i + j) % 2 === 0 || i === 0 || j === 0 || i === 6 || j === 6) {
            ctx.fillRect(295 + i * 30, 750 + j * 30, 25, 25);
          }
        }
      }

      // Security watermark
      ctx.fillStyle = '#64748b';
      ctx.font = '20px monospace';
      ctx.fillText('OFFICIAL DIGITAL ENTRANCE PASS • LBRCE MYLAVARAM', 400, 1080);
      ctx.fillText('VALID FOR ALL WORKSHOPS, HACKATHONS & DJ NIGHT', 400, 1120);

      // Trigger download
      const link = document.createElement('a');
      link.download = `Lakshya_Pass_${passId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  const getRoleColors = () => {
    return {
      glow: 'from-purple-500/30 via-pink-500/20 to-cyan-500/30',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
      accent: 'text-pink-400'
    };
  };

  const roleStyles = getRoleColors();

  return (
    <div id="pass-generator-section" className="relative max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Form: Customize Details */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-purple-900/60 p-6 sm:p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-2 mb-2 text-pink-400">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-mono tracking-widest uppercase font-semibold">
              Smart Credentials
            </span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold font-heading text-white mb-2">
            Claim Your Delegate Pass
          </h3>
          <p className="text-sm text-slate-300 mb-6">
            Enter your registration info to customize your digital pass. Tilt and interact with it, flip to see safety credentials, and download to your device.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Full Name / Team Lead
              </label>
              <input
                id="pass-input-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white font-medium focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  College / Institution
                </label>
                <input
                  id="pass-input-college"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. LBRCE, JNTUK, VRSEC"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white font-medium focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Branch / Department
                </label>
                <select
                  id="pass-select-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950/80 border border-purple-900/60 text-white font-medium focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/40 transition-colors"
                >
                  <option value="Computer Science & Engg">Computer Science & Engineering (CSE)</option>
                  <option value="Information Technology">Information Technology (IT)</option>
                  <option value="AI & Data Science">AI & Data Science (AI&DS)</option>
                  <option value="AI & Machine Learning">AI & Machine Learning (AIML)</option>
                  <option value="Electronics & Comm. Engg">ECE (Robotics)</option>
                  <option value="Electrical & Electronics">EEE (Tesla Core)</option>
                  <option value="Mechanical Engineering">Mechanical (CAD/Engines)</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Aerospace Engineering">Aerospace Engineering</option>
                  <option value="Management Studies">Management Studies (MBA)</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-wrap gap-3">
              <button
                id="btn-download-pass"
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-tech font-bold text-base uppercase tracking-wider shadow-lg shadow-pink-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isDownloading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {isDownloading ? 'Rendering Pass...' : 'Download Digital Pass'}
              </button>

              <button
                id="btn-flip-pass"
                type="button"
                onClick={toggleFlip}
                className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-purple-900/60 flex items-center gap-2 text-sm font-tech font-bold uppercase tracking-wider cursor-pointer hover:border-pink-500/50"
                title="Flip between front and back of pass"
              >
                <RefreshCw className="w-4 h-4 text-pink-400" />
                Flip Card
              </button>
            </div>

            {/* Campus Authorization Footer */}
            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-purple-600/40">
                <img
                  src="/assets/lbrce_campus.jpg"
                  alt="LBRCE Campus"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="overflow-hidden text-left">
                <span className="text-[10px] font-mono uppercase text-pink-400 font-bold block">
                  Official Festival Credential
                </span>
                <span className="text-xs font-bold text-white block truncate">
                  Lakireddy Bali Reddy College of Engineering
                </span>
                <span className="text-[10px] text-slate-400 font-mono block">
                  Authorized Venue • Mylavaram, AP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Interactive Card Showcase */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="text-center mb-3">
            <span className="text-xs font-mono text-slate-400 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              Hover & Drag to Tilt • Click to Flip
            </span>
          </div>

          {/* Perspective Container */}
          <div
            className="perspective-1000 w-full max-w-[340px] sm:max-w-[360px] h-[520px] cursor-pointer select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={toggleFlip}
          >
            {/* Flippable Card Object */}
            <div
              ref={cardRef}
              className="relative w-full h-full preserve-3d transition-transform duration-200 ease-out"
              style={{
                transform: `rotateX(${rotX}deg) rotateY(${rotY + (isFlipped ? 180 : 0)}deg)`
              }}
            >
              {/* Lanyard Top Ring Hole */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 w-12 h-6 bg-slate-800 border-2 border-purple-500/60 rounded-t-lg flex items-center justify-center shadow-lg">
                <div className="w-4 h-2 rounded-full bg-slate-950 border border-pink-500/50" />
              </div>

              {/* CARD FRONT */}
              <div className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-[#0c071e] via-slate-950 to-[#070b19] border-2 border-pink-500/40 p-6 flex flex-col justify-between shadow-2xl shadow-purple-950/40 overflow-hidden">
                {/* Campus Watermark on Front */}
                <div className="absolute inset-0 opacity-[0.08] pointer-events-none overflow-hidden">
                  <img
                    src="/assets/lbrce_campus.jpg"
                    alt="Campus Watermark"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Dynamic Specular Glare Layer */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-150"
                  style={{
                    background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(236,72,153,0.25) 0%, transparent 60%)`,
                    opacity: glarePos.opacity
                  }}
                />

                {/* Ambient Glow Background Accent */}
                <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full bg-gradient-to-br ${roleStyles.glow} blur-3xl pointer-events-none`} />

                {/* Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
                    <div>
                      <p className="text-[10px] font-mono text-purple-300/80 uppercase tracking-widest">
                        LBRCE FEST 2026
                      </p>
                      <h4 className="text-xl font-black font-heading tracking-wider text-white">
                        LAKSHYA 2026
                      </h4>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-tech font-bold uppercase tracking-wider border ${roleStyles.badge}`}>
                      {role}
                    </span>
                  </div>

                  {/* Holographic Security Strip */}
                  <div className="h-2 w-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 opacity-80 mb-4 animate-pulse" />

                  {/* Attendee Identity */}
                  <div className="space-y-1 mb-6">
                    <p className="text-xs font-mono uppercase text-slate-400">Delegate Name</p>
                    <h5 className="text-2xl font-bold font-tech text-white tracking-wide truncate">
                      {name || 'DELEGATE NAME'}
                    </h5>
                    <p className="text-xs text-pink-300 font-medium truncate">
                      {college || 'LBRCE Mylavaram'}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {department}
                    </p>
                  </div>
                </div>

                {/* Middle Holographic Stamp */}
                <div className="my-auto py-3 px-4 rounded-xl bg-slate-950/60 border border-purple-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Pass Serial</span>
                    <span className="font-mono text-sm font-bold text-cyan-400">{passId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">Access</span>
                    <span className="font-tech text-xs font-bold text-pink-400">1-DAY ALL-ACCESS</span>
                  </div>
                </div>

                {/* Footer Barcode & QR code */}
                <div className="pt-4 border-t border-purple-900/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white text-slate-950">
                      <QrCode className="w-10 h-10" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">GATE CODE</span>
                      <span className="font-mono text-xs text-pink-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" /> VERIFIED
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-slate-500 block leading-tight">
                      LAKSHYA 2026<br />SYMPOSIUM
                    </span>
                  </div>
                </div>
              </div>

              {/* CARD BACK */}
              <div
                className="absolute inset-0 backface-hidden rounded-2xl bg-gradient-to-br from-[#120722] to-slate-950 border-2 border-purple-800/60 p-6 flex flex-col justify-between shadow-2xl"
                style={{ transform: 'rotateY(180deg)' }}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-purple-900/50 pb-3 mb-4">
                    <h5 className="font-tech text-sm font-bold tracking-wider text-slate-300 uppercase">
                      DELEGATE INSTRUCTIONS
                    </h5>
                    <span className="text-[10px] font-mono text-pink-400/80">LBRCE-RULES</span>
                  </div>

                  <ul className="text-xs text-slate-300 space-y-2.5 leading-relaxed font-sans">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 font-bold">•</span>
                      <span>Wear digital or printed pass visibly across all department venues.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 font-bold">•</span>
                      <span>Grants admission to 35+ technical events, exhibitions, and central food stalls.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 font-bold">•</span>
                      <span>Includes direct entry to the Grand Valedictory and Arena Demonstrations.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-400 font-bold">•</span>
                      <span>Certificates of Participation will be issued digitally to this Pass ID.</span>
                    </li>
                  </ul>
                </div>

                {/* Campus Photo Venue Banner on Card Back */}
                <div className="rounded-xl overflow-hidden border border-purple-900/60 my-1 relative h-16 group">
                  <img
                    src="/assets/lbrce_campus.jpg"
                    alt="LBRCE Campus"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  <span className="absolute bottom-1 left-2 text-[9px] font-mono font-bold text-white tracking-wider">
                    LBRCE MAIN CAMPUS • HOST VENUE
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-900/60 text-center">
                  <p className="text-[11px] font-mono text-cyan-400 font-bold uppercase mb-1">
                    LAKSHYA CENTRAL HELPDESK
                  </p>
                  <p className="text-[10px] text-slate-300 font-mono">
                    Emergency: +91 86592 22933 | info@lbrce.ac.in
                  </p>
                  <p className="text-[9px] text-slate-500 mt-2">
                    Mylavaram, NTR District, AP • 521230
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
