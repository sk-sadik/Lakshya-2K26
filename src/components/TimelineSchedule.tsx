import React, { useState, useEffect, useMemo } from 'react';
import { FEST_SCHEDULE } from '../data/lakshyaData';
import { SoundEngine } from './AudioEngine';
import { Clock, MapPin, Sparkles, Filter } from 'lucide-react';
import { dbService } from '../services/dbService';
import { EventItem, ScheduleItem } from '../types';

export const TimelineSchedule: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [dynamicEvents, setDynamicEvents] = useState<EventItem[]>(() => dbService.getPublicEvents());

  useEffect(() => {
    const handleEventsUpdate = () => {
      setDynamicEvents(dbService.getPublicEvents());
    };
    window.addEventListener('lakshya_events_updated', handleEventsUpdate);
    window.addEventListener('storage', handleEventsUpdate);
    return () => {
      window.removeEventListener('lakshya_events_updated', handleEventsUpdate);
      window.removeEventListener('storage', handleEventsUpdate);
    };
  }, []);

  const categories = ['All', 'Keynote', 'Coding', 'Robotics', 'Technical', 'Award'];

  const allScheduleItems: ScheduleItem[] = useMemo(() => {
    const customItems: ScheduleItem[] = dynamicEvents
      .filter(e => !FEST_SCHEDULE.some(fs => fs.title.toLowerCase() === e.title.toLowerCase()))
      .map(e => ({
        time: e.timing || '10:00 AM',
        title: e.title,
        department: e.deptId.toUpperCase(),
        venue: e.venue || 'LBRCE Campus',
        category: e.category === 'coding' ? 'Coding' : e.category === 'robotics' ? 'Robotics' : 'Technical'
      }));
    return [...FEST_SCHEDULE, ...customItems];
  }, [dynamicEvents]);

  const filteredEvents = selectedCategory === 'All'
    ? allScheduleItems
    : allScheduleItems.filter((item) => item.category.toLowerCase() === selectedCategory.toLowerCase());

  return (
    <section id="schedule-section" className="py-20 relative bg-slate-950/60">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/30 text-pink-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            1-Day Festival Itinerary
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight mb-4">
            Interactive Festival Schedule
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Follow the complete chronological agenda across an intensive day of hackathons, AI sprints, robotics wars, paper presentations, and the grand prize valedictory.
          </p>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {categories.map((cat) => (
              <button
                key={cat}
                id={`schedule-filter-${cat.toLowerCase()}`}
                onClick={() => {
                  SoundEngine.playClick();
                  setSelectedCategory(cat);
                }}
                className={`px-4 py-2 rounded-xl font-tech text-xs sm:text-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-pink-600/30 scale-105 border border-pink-400/50'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-purple-900/40 hover:border-purple-600/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Itinerary List */}
        <div className="relative border-l-2 border-purple-900/60 ml-4 sm:ml-32 space-y-8 py-4">
          {filteredEvents.map((item, index) => {
            const isHighlight = item.category === 'Keynote' || item.category === 'Hackathon' || item.category === 'Award';
            return (
              <div key={index} className="relative pl-6 sm:pl-10 group">
                {/* Time Indicator on Left (Desktop) */}
                <div className="hidden sm:block absolute -left-32 top-2 text-right w-24">
                  <span className="font-mono text-xs font-bold text-cyan-400 block">{item.time}</span>
                  <span className="text-[10px] font-mono text-purple-300/80 uppercase">{item.category}</span>
                </div>

                {/* Pulsing Node */}
                <div
                  className={`absolute -left-[9px] top-3.5 w-4 h-4 rounded-full border-2 transition-transform group-hover:scale-125 ${
                    isHighlight
                      ? 'bg-pink-400 border-white shadow-[0_0_12px_rgba(236,72,153,0.8)]'
                      : 'bg-slate-900 border-purple-400'
                  }`}
                />

                {/* Event Card */}
                <div
                  className={`p-5 sm:p-6 rounded-2xl border transition-all duration-200 hover:-translate-y-1 ${
                    isHighlight
                      ? 'bg-gradient-to-r from-slate-900 via-slate-900/90 to-purple-950/40 border-pink-500/40 shadow-xl'
                      : 'bg-slate-900/60 border-purple-900/40 hover:border-purple-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="sm:hidden font-mono text-xs font-bold text-cyan-400">
                      {item.time} • {item.category}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-slate-800 text-slate-300 border border-purple-900/50">
                      {item.department}
                    </span>
                    {isHighlight && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> High Priority
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold font-tech text-white mb-2 group-hover:text-pink-300 transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-sans">
                    <MapPin className="w-3.5 h-3.5 text-pink-400" />
                    <span>{item.venue}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
