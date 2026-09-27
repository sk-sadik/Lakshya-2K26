import React, { useState, useEffect, useMemo } from 'react';
import { DEPARTMENTS } from '../data/lakshyaData';
import { DepartmentId, EventCategory, EventItem } from '../types';
import { SoundEngine } from './AudioEngine';
import { dbService } from '../services/dbService';
import { 
  Search, 
  Trophy, 
  Users, 
  MapPin, 
  Clock, 
  Filter, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface EventsExplorerProps {
  selectedDept: DepartmentId;
  onSelectDept: (dept: DepartmentId) => void;
  onSelectEvent: (event: EventItem) => void;
  onRegisterEvent: (event: EventItem) => void;
}

export const EventsExplorer: React.FC<EventsExplorerProps> = ({
  selectedDept,
  onSelectDept,
  onSelectEvent,
  onRegisterEvent
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');
  const [eventsList, setEventsList] = useState<EventItem[]>(() => dbService.getPublicEvents());

  useEffect(() => {
    const handleEventsUpdate = () => {
      setEventsList(dbService.getPublicEvents());
    };

    window.addEventListener('lakshya_events_updated', handleEventsUpdate);
    window.addEventListener('storage', handleEventsUpdate);

    // Refresh on mount to guarantee latest state
    handleEventsUpdate();

    return () => {
      window.removeEventListener('lakshya_events_updated', handleEventsUpdate);
      window.removeEventListener('storage', handleEventsUpdate);
    };
  }, []);

  const categories: { id: EventCategory; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'coding', label: 'Coding & Sprints' },
    { id: 'technical', label: 'Core Technical' },
    { id: 'robotics', label: 'Robotics & Control' }
  ];

  const filteredEvents = useMemo(() => {
    return eventsList.filter((event) => {
      // Department filter
      const matchesDept = selectedDept === 'all' || event.deptId === selectedDept;
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;

      // Search query
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = 
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.tagline.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query);

      return matchesDept && matchesCategory && matchesSearch;
    });
  }, [eventsList, selectedDept, selectedCategory, searchQuery]);

  return (
    <section id="events-section" className="py-20 relative bg-slate-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/30 text-pink-300 text-xs font-mono font-bold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Flagship Competitions
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white tracking-tight mb-4">
            Interactive Events Explorer
          </h2>
          <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
            Discover challenges across software engineering, AI model crafting, robotics, mechanical teardown, drone flights, and structural trusses.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="mb-10 space-y-4">
          {/* Top Row: Search Input */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              id="event-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event title, keyword (e.g. Hackathon, Valorant, Circuit, Bridge)..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-900/90 border border-purple-950/60 text-white placeholder-slate-500 font-medium focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 backdrop-blur-md shadow-xl transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Department Filter Pills */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              id="filter-dept-all"
              onClick={() => {
                SoundEngine.playClick();
                onSelectDept('all');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider whitespace-nowrap border transition-all cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-pink-400 shadow-lg shadow-pink-600/30'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-purple-800 hover:text-slate-200'
              }`}
            >
              All Branches
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.id}
                id={`filter-dept-${dept.id}`}
                onClick={() => {
                  SoundEngine.playClick();
                  onSelectDept(dept.id);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-tech font-bold uppercase tracking-wider whitespace-nowrap border transition-all cursor-pointer ${
                  selectedDept === dept.id
                    ? 'bg-slate-800 text-white shadow-lg'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-purple-800 hover:text-slate-200'
                }`}
                style={
                  selectedDept === dept.id
                    ? { borderColor: dept.accentColor, color: dept.accentColor }
                    : undefined
                }
              >
                {dept.code.split('-')[0]}
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1 pl-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`filter-cat-${cat.id}`}
                onClick={() => {
                  SoundEngine.playClick();
                  setSelectedCategory(cat.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between mb-6 text-xs font-mono text-slate-400">
          <span>Showing {filteredEvents.length} Events</span>
          {selectedDept !== 'all' && (
            <span className="text-pink-400">
              Filtering by: {DEPARTMENTS.find(d => d.id === selectedDept)?.name}
            </span>
          )}
        </div>

        {/* Events Cards Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <p className="text-slate-400 text-lg font-tech mb-3">No events match your current filters.</p>
            <button
              onClick={() => {
                onSelectDept('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-tech font-bold uppercase tracking-wider"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              return (
                <div
                  key={event.id}
                  id={`event-card-${event.id}`}
                  className="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#080d1e] border border-slate-800 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:border-slate-700"
                >
                  {/* Top Edge Accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                    style={{ backgroundColor: event.accentColor }}
                  />

                  <div>
                    {/* Header: Dept & Category Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-purple-950/40 text-purple-300 border border-purple-800/50">
                        {event.deptId.toUpperCase()}
                      </span>
                      {event.featured && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase font-bold tracking-wider bg-pink-500/20 text-pink-300 border border-pink-500/40 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Flagship
                        </span>
                      )}
                    </div>

                    {/* Title & Tagline */}
                    <h3 className="text-xl font-bold font-tech text-white mb-1.5 group-hover:text-pink-300 transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-xs text-slate-300 mb-4 leading-relaxed line-clamp-2">
                      {event.tagline}
                    </p>

                    {/* Key Metrics Chips */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-purple-950/60 text-[11px] text-slate-300">
                        <Trophy className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span className="truncate font-semibold text-pink-300">{event.prizes.first}</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-purple-950/60 text-[11px] text-slate-300">
                        <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{event.teamSize}</span>
                      </div>
                    </div>

                    {/* Logistics */}
                    <div className="space-y-1.5 text-xs text-slate-400 mb-6 font-sans">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{event.timing}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-4 border-t border-purple-950/60 flex items-center justify-between gap-3">
                    <button
                      id={`btn-view-rules-${event.id}`}
                      onClick={() => {
                        SoundEngine.playClick();
                        onSelectEvent(event);
                      }}
                      onMouseEnter={() => SoundEngine.playHover()}
                      className="text-xs font-tech font-bold uppercase tracking-wider text-slate-300 hover:text-pink-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-all cursor-pointer"
                    >
                      <span>View Rulebook</span>
                      <ChevronRight className="w-4 h-4 text-cyan-400" />
                    </button>

                    <button
                      id={`btn-quick-register-${event.id}`}
                      onClick={() => {
                        SoundEngine.playSuccess();
                        onRegisterEvent(event);
                      }}
                      onMouseEnter={() => SoundEngine.playHover()}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600 hover:to-pink-600 hover:text-white text-pink-300 border border-pink-500/40 text-xs font-tech font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow-pink-500/30"
                    >
                      Register ({event.entryFee.split('/')[0].trim()})
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
