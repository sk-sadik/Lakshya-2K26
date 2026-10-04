import React from 'react';
import { FEST_METRICS, LEGACY_STATS } from '../data/lakshyaData';
import { 
  Award, 
  MapPin, 
  Mail, 
  Phone, 
  ExternalLink, 
  Layers,
  Heart
} from 'lucide-react';
import { SoundEngine } from './AudioEngine';

export const Footer: React.FC = () => {
  return (
    <footer id="about-section" className="bg-[#04020a] border-t border-purple-900/60 pt-16 pb-12 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Legacy Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-slate-950/80 border border-purple-900/60 backdrop-blur-xl mb-16 shadow-2xl">
          {LEGACY_STATS.map((stat, idx) => (
            <div key={idx} className="text-center p-2">
              <span className="text-2xl sm:text-4xl font-black font-tech text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-300">
                {stat.value}
              </span>
              <span className="text-xs font-mono uppercase tracking-wider text-purple-300/80 block mt-1">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* 3-Column Footer Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-purple-900/60">
          {/* Col 1: LBRCE & Fest Overview */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-pink-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold font-heading text-white">
                  LAKSHYA 2026
                </h3>
                <p className="text-[11px] font-mono text-pink-400 uppercase tracking-wider">
                  National Symposium
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              Lakshya is the premier national-level technical symposium hosted annually by <span className="text-slate-100 font-medium">Lakireddy Bali Reddy College of Engineering (Autonomous)</span>. Fostering engineering excellence, innovation, robotic combat, and national competitive programming since 2005.
            </p>

            <div className="flex items-center gap-2 text-xs font-mono text-purple-300/80">
              <Award className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{FEST_METRICS.accreditation}</span>
            </div>
          </div>

          {/* Col 2: Institutional Leadership & Patronage */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
              Founder & Trust Management
            </h4>
            <div className="space-y-2 text-xs text-slate-300 font-sans">
              <p><strong className="text-white">Founder Chairman:</strong> Late Sri Lakireddy Bali Reddy</p>
              <p><strong className="text-white">Chairman:</strong> Sri Lakireddy Prasad Reddy</p>
              <p><strong className="text-white">Co-Founder & Honorary Chairman:</strong> Sri Lakireddy Jayaprakash Reddy</p>
              <p><strong className="text-white">President (LBRCE):</strong> Sri G. Srinivasa Reddy</p>
            </div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold pt-2">
              College Executive Leadership
            </h4>
            <div className="space-y-2 text-xs text-slate-300 font-sans">
              <p><strong className="text-white">Principal:</strong> Dr. K. Appa Rao</p>
              <p><strong className="text-white">Vice-Principal:</strong> Dr. B. Ramesh Reddy</p>
              <p><strong className="text-white">Student Core:</strong> All-Department Technical Associations & IEEE/CSI/ISTE Chapters</p>
            </div>
          </div>

          {/* Col 3: Contact & Venue */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-bold">
              Fest Secretariat
            </h4>
            <div className="space-y-2 text-xs text-slate-300 font-sans">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                <span>LBRCE Campus, Mylavaram, NTR District, Andhra Pradesh - 521230</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-pink-400 shrink-0" />
                <span>+91 86592 22933 / 22934</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>lakshya@lbrce.ac.in</span>
              </div>
            </div>

            <div className="pt-2">
              <a
                href="https://lbrce.ac.in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => SoundEngine.playClick()}
                className="inline-flex items-center gap-1.5 text-xs font-tech font-bold uppercase text-pink-400 hover:text-pink-300 transition-colors"
              >
                <span>Visit Official LBRCE Website</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500">
          <p>
            © 2026 Lakireddy Bali Reddy College of Engineering. All Rights Reserved.
          </p>
          <div className="flex items-center gap-2">
            <span>Crafted for Lakshya 2026 with</span>
            <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
            <span className="text-purple-300/80">by Brights of F-Section</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
