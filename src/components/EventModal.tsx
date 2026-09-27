import React, { useEffect } from 'react';
import { EventItem } from '../types';
import { SoundEngine } from './AudioEngine';
import { 
  X, 
  Trophy, 
  Users, 
  MapPin, 
  Clock, 
  Phone, 
  FileText, 
  CheckCircle, 
  Sparkles,
  Ticket
} from 'lucide-react';

interface EventModalProps {
  event: EventItem | null;
  onClose: () => void;
  onRegister: (event: EventItem) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onClose, onRegister }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!event) return null;

  return (
    <div
      id="event-detail-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          SoundEngine.playClick();
          onClose();
        }
      }}
    >
      <div
        id="event-detail-modal-container"
        className="relative w-full max-w-3xl rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-[#070b16] border border-purple-900/60 shadow-2xl overflow-hidden my-8"
      >
        {/* Accent strip */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: event.accentColor }}
        />

        {/* Modal Header */}
        <div className="p-6 sm:p-8 border-b border-purple-900/60 relative">
          <button
            id="btn-close-event-modal"
            onClick={() => {
              SoundEngine.playClick();
              onClose();
            }}
            className="absolute right-5 top-5 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono uppercase tracking-wider bg-purple-500/20 text-pink-300 border border-purple-500/40">
              {event.deptId.toUpperCase()} ARENA
            </span>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono uppercase tracking-wider bg-slate-800 text-slate-300 border border-purple-900/50">
              {event.category.toUpperCase()}
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold font-heading text-white mb-2">
            {event.title}
          </h2>
          <p className="text-sm sm:text-base text-pink-200/80 font-medium">
            {event.tagline}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Overview */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400/90 mb-2">
              Event Overview
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Prize Pool Breakdown */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-pink-500/40">
            <div className="flex items-center gap-2 text-pink-400 font-tech font-bold text-sm uppercase mb-3">
              <Trophy className="w-4 h-4 text-cyan-400" />
              <span>Prize Pool & Honors</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
                <span className="text-[10px] font-mono uppercase text-pink-400 block font-semibold">1st Prize</span>
                <span className="text-lg font-tech font-bold text-white">{event.prizes.first}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">2nd Prize</span>
                <span className="text-lg font-tech font-bold text-slate-200">{event.prizes.second}</span>
              </div>
              {event.prizes.third && (
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">3rd Prize</span>
                  <span className="text-lg font-tech font-bold text-slate-200">{event.prizes.third}</span>
                </div>
              )}
            </div>
          </div>

          {/* Event Rounds */}
          {event.rounds && event.rounds.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400/90 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Competition Format & Rounds
              </h4>
              <div className="space-y-3">
                {event.rounds.map((round, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/60 border border-purple-900/40">
                    <span className="text-xs font-tech font-bold text-pink-300 block mb-1">
                      {round.name}
                    </span>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">
                      {round.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Rules */}
          {event.rules && event.rules.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400/90 mb-3 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Guidelines & Regulations
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {event.rules.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-900/40 border border-purple-900/40">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Team Size</span>
                <span className="text-xs font-semibold text-slate-200">{event.teamSize}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-pink-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Venue</span>
                <span className="text-xs font-semibold text-slate-200">{event.venue}</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Schedule</span>
                <span className="text-xs font-semibold text-slate-200">{event.timing}</span>
              </div>
            </div>
          </div>

          {/* Coordinators Contact */}
          {event.coordinators && event.coordinators.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400/90 mb-2">
                Event Coordinators
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {event.coordinators.map((coord, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950/80 border border-purple-900/50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{coord.name}</p>
                      <p className="text-[11px] text-slate-400">{coord.role}</p>
                    </div>
                    <a
                      href={`tel:${coord.phone}`}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{coord.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 sm:p-8 bg-slate-950/80 border-t border-purple-900/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-slate-400 block">Registration Fee</span>
            <span className="text-xl font-tech font-bold text-white">{event.entryFee}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-tech font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              id="btn-modal-register-cta"
              onClick={() => {
                SoundEngine.playSuccess();
                onRegister(event);
                onClose();
              }}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-400 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-pink-500/25 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Ticket className="w-4 h-4" />
              Register Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
