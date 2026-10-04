import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  MapPin, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink,
  Layers,
  GraduationCap,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Crown,
  Users,
  Landmark
} from 'lucide-react';
import { SoundEngine } from './AudioEngine';

const TRUST_MANAGEMENT = [
  {
    name: 'Late Sri Lakireddy Bali Reddy',
    role: 'Founder Chairman',
    photoSrc: '/assets/founder-bali-reddy.jpg',
  },
  {
    name: 'Sri Lakireddy Prasad Reddy',
    role: 'Chairman',
    photoSrc: '/assets/chairman-prasad-reddy.jpg',
  },
  {
    name: 'Sri Lakireddy Jayaprakash Reddy',
    role: 'Co-Founder & Honorary Chairman',
    photoSrc: '/assets/honorary-jayaprakash-reddy.jpg',
  },
  {
    name: 'Sri G. Srinivasa Reddy',
    role: 'President (LBRCE)',
    photoSrc: '/assets/president-srinivasa-reddy.jpg',
  },
];

const EXECUTIVE_LEADERSHIP = [
  {
    name: 'Dr. K. Appa Rao',
    role: 'Principal',
  },
  {
    name: 'Dr. B. Ramesh Reddy',
    role: 'Vice-Principal',
  },
];

const CAMPUS_IMAGE_STORAGE_KEY = 'lakshya_campus_image_v2';
const DEFAULT_CAMPUS_IMAGE = '/assets/lbrce-admin-block-real.jpg';

export const CampusSpotlight: React.FC = () => {
  const [campusImage, setCampusImage] = useState<string>(() => {
    return localStorage.getItem(CAMPUS_IMAGE_STORAGE_KEY) || DEFAULT_CAMPUS_IMAGE;
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleImageUpdate = () => {
      const saved = localStorage.getItem(CAMPUS_IMAGE_STORAGE_KEY);
      setCampusImage(saved || DEFAULT_CAMPUS_IMAGE);
    };

    window.addEventListener('lakshya_campus_image_updated', handleImageUpdate);
    window.addEventListener('storage', handleImageUpdate);

    return () => {
      window.removeEventListener('lakshya_campus_image_updated', handleImageUpdate);
      window.removeEventListener('storage', handleImageUpdate);
    };
  }, []);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        try {
          localStorage.setItem(CAMPUS_IMAGE_STORAGE_KEY, result);
          setCampusImage(result);
          SoundEngine.playSuccess();
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3500);
          window.dispatchEvent(new CustomEvent('lakshya_campus_image_updated', { detail: result }));
          window.dispatchEvent(new Event('storage'));
        } catch (err) {
          console.error('Failed to store image in localStorage:', err);
        }
      }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  const handleResetImage = () => {
    SoundEngine.playClick();
    localStorage.removeItem(CAMPUS_IMAGE_STORAGE_KEY);
    setCampusImage(DEFAULT_CAMPUS_IMAGE);
    window.dispatchEvent(new CustomEvent('lakshya_campus_image_updated', { detail: DEFAULT_CAMPUS_IMAGE }));
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <section id="campus-section" className="py-20 relative bg-gradient-to-b from-[#060312] via-slate-950 to-[#04020a] overflow-hidden border-t border-purple-900/40">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-purple-900/15 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 text-pink-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
            <Building2 className="w-3.5 h-3.5 text-pink-400" />
            <span>Host Institution & Festival Arena</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight mb-4">
            Lakireddy Bali Reddy College of Engineering
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
            Home to Lakshya 2026. A premier autonomous engineering institution spanning a picturesque 65-acre campus in Mylavaram, blending classical architectural grandeur with next-generation research arenas.
          </p>
        </div>

        {/* Featured Campus Showcase Card */}
        <div className="rounded-3xl bg-slate-950/90 border border-purple-800/60 shadow-2xl shadow-purple-950/60 overflow-hidden backdrop-blur-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* College Photograph Container with Dynamic Upload Support */}
            <div 
              className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto min-h-[340px] overflow-hidden group"
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleImageUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <img
                src={campusImage}
                alt="Lakireddy Bali Reddy College of Engineering Main Administration Building"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-slate-950" />
              
              {/* Top Controls: Image floating pill & Change Picture button */}
              <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-purple-800/50 shadow-lg min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span className="text-xs font-mono font-bold text-white tracking-wide truncate">
                    Central Administration Block
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 hover:bg-purple-950/90 text-pink-300 hover:text-white backdrop-blur-md border border-purple-800/50 text-[11px] font-mono font-bold transition-all shadow-lg cursor-pointer"
                    title="Upload or replace the campus photograph"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Change Picture'}</span>
                  </button>

                  {campusImage !== DEFAULT_CAMPUS_IMAGE && (
                    <button
                      type="button"
                      onClick={handleResetImage}
                      className="p-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-400 hover:text-white backdrop-blur-md border border-purple-800/50 text-xs transition-colors cursor-pointer"
                      title="Reset to default college picture"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {uploadSuccess && (
                <div className="absolute top-16 left-4 z-20 px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 text-xs font-mono font-bold shadow-xl animate-in fade-in slide-in-from-top-2">
                  ✓ Campus picture updated and saved permanently!
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-300 z-10">
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-purple-900/50">
                  White Neoclassical Architecture
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-purple-900/50">
                  Oval Manicured Lawns
                </span>
              </div>
            </div>

            {/* Campus Info & Accreditations Column */}
            <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 text-pink-400 mb-2">
                  <Award className="w-4 h-4" />
                  <span className="text-xs font-mono uppercase font-bold tracking-wider">
                    Institutional Standing
                  </span>
                </div>
                <h3 className="text-2xl font-bold font-heading text-white mb-2">
                  Academic & Technical Distinction
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Established in 1998 by philanthropist Er. Lakireddy Bali Reddy, LBRCE has evolved into one of Andhra Pradesh's most respected technical campuses with an active student body of over 5,000 engineers.
                </p>

                {/* Key Campus Highlights List */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide">Autonomous & Permanently Affiliated</h4>
                      <p className="text-[11px] text-slate-300 font-mono">Approved by AICTE, Permanent Affiliation to JNTU Kakinada</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                    <Award className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide">NAAC 'A+' & NBA Tier-I Accredited</h4>
                      <p className="text-[11px] text-slate-300 font-mono">Recognized by UGC under Section 2(f) and 12(B)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-purple-900/40">
                    <Layers className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wide">65-Acre Sprawling Green Campus</h4>
                      <p className="text-[11px] text-slate-300 font-mono">10 department arena blocks including MBA & innovation center</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-purple-900/50 flex flex-wrap items-center gap-3">
                <a
                  href="https://lbrce.ac.in"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => SoundEngine.playClick()}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-200 text-xs font-tech font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <GraduationCap className="w-4 h-4 text-pink-400" />
                  <span>College Portal</span>
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                </a>

                <a
                  href="https://maps.google.com/?q=Lakireddy+Bali+Reddy+College+of+Engineering+Mylavaram"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => SoundEngine.playClick()}
                  className="flex-1 min-w-[140px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-tech font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-pink-600/25 transition-all cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-white" />
                  <span>Get Directions</span>
                </a>
              </div>

            </div>

          </div>
        </div>

        {/* Founder & Trust Management + Executive Leadership */}
        <div className="mt-10 rounded-3xl bg-slate-950/90 border border-purple-800/60 shadow-2xl shadow-purple-950/60 overflow-hidden backdrop-blur-xl p-6 sm:p-8 lg:p-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
              <Landmark className="w-3.5 h-3.5 text-amber-400" />
              <span>College Leadership</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Founder & Institution Leadership
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-sans">
              Guided by visionary founders and led by experienced academic executives.
            </p>
          </div>

          {/* Founder & Trust Management */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-mono uppercase font-bold tracking-widest text-amber-300">
                Founder & Trust Management
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRUST_MANAGEMENT.map((person) => (
                <div
                  key={person.name}
                  className="p-4 rounded-2xl bg-slate-900/80 border border-purple-900/40 hover:border-amber-500/50 transition-colors text-center"
                >
                  <div className="w-28 h-28 mx-auto mb-3 rounded-2xl overflow-hidden border-2 border-amber-500/60 shadow-lg shadow-amber-950/40 bg-slate-800 flex items-center justify-center">
                    <img
                      src={person.photoSrc}
                      alt={`${person.name} — ${person.role}`}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <h5 className="text-sm font-bold text-white font-heading leading-snug">
                    {person.name}
                  </h5>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-amber-300/90 mt-1">
                    {person.role}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* College Executive Leadership */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono uppercase font-bold tracking-widest text-cyan-300">
                College Executive Leadership
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {EXECUTIVE_LEADERSHIP.map((person) => (
                <div
                  key={person.name}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/80 border border-purple-900/40 hover:border-cyan-500/50 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-white font-heading">
                      {person.name}
                    </h5>
                    <p className="text-[11px] font-mono uppercase tracking-wider text-cyan-300/90">
                      {person.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
