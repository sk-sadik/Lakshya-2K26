import React, { useState, useEffect, useCallback } from 'react';
import { NotificationItem, User } from '../../types';
import { dbService } from '../../services/dbService';
import { SoundEngine } from '../AudioEngine';
import {
  Megaphone,
  GraduationCap,
  ClipboardList,
  Users,
  Send,
  Sparkles,
  Trash2,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Inbox
} from 'lucide-react';

interface AdminAnnouncementsSectionProps {
  currentUser: Omit<User, 'passwordHash'>;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type AnnouncementAudience = 'coordinators' | 'users' | 'both';

const AUDIENCE_META: Record<AnnouncementAudience, { label: string; icon: React.ReactNode; color: string }> = {
  coordinators: {
    label: 'Co-ordinators',
    icon: <ClipboardList className="w-5 h-5" />,
    color: 'cyan'
  },
  users: {
    label: 'Users (Participants)',
    icon: <GraduationCap className="w-5 h-5" />,
    color: 'pink'
  },
  both: {
    label: 'Both (Everyone)',
    icon: <Users className="w-5 h-5" />,
    color: 'emerald'
  }
};

export const AdminAnnouncementsSection: React.FC<AdminAnnouncementsSectionProps> = ({
  currentUser,
  showToast
}) => {
  const [audience, setAudience] = useState<AnnouncementAudience>('coordinators');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');
  const [isSending, setIsSending] = useState(false);
  const [announcements, setAnnouncements] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await dbService.getAdminAnnouncements();
      setAnnouncements(items);
    } catch {
      // keep existing list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Please enter both a heading and message.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const payload =
        audience === 'both'
          ? { targetRole: 'all', userId: 'all' }
          : audience === 'users'
          ? { targetRole: 'student', userId: 'students' }
          : { targetRole: 'coordinator', userId: 'coordinators' };

      await dbService.sendNotification({
        ...payload,
        title: title.trim(),
        message: message.trim(),
        type,
        senderName: currentUser.name || 'Central Administration',
        senderRole: 'admin',
        senderEmail: currentUser.email
      });

      SoundEngine.playSuccess();
      showToast(`Announcement dispatched to ${AUDIENCE_META[audience].label}!`, 'success');
      setTitle('');
      setMessage('');
      await loadAnnouncements();
    } catch (err: any) {
      showToast(err.message || 'Failed to send announcement.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    SoundEngine.playClick();
    try {
      await dbService.deleteNotification(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      showToast('Announcement removed.', 'success');
    } catch {
      showToast('Failed to delete announcement.', 'error');
    }
  };

  const audienceChip = (item: NotificationItem) => {
    if (item.targetRole === 'coordinator' || item.userId === 'coordinators') return 'Co-ordinators';
    if (item.targetRole === 'student' || item.userId === 'students') return 'Users';
    return 'Both / All';
  };

  const previewBg =
    type === 'alert'
      ? 'bg-red-950/30 border-red-500/40 text-red-200'
      : type === 'warning'
      ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
      : type === 'success'
      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
      : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2.5">
          <Megaphone className="w-7 h-7 text-cyan-400" />
          Announcements
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-1">
          Dispatch announcements to co-ordinators, participants (users), or both. Recipients see them instantly in their dashboards.
        </p>
      </div>

      {/* Step 1: Choose audience */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl">
        <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
          Step 1: Choose Recipients
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3">
          {(Object.keys(AUDIENCE_META) as AnnouncementAudience[]).map((key) => {
            const meta = AUDIENCE_META[key];
            const active = audience === key;
            const ringColor =
              key === 'coordinators'
                ? 'border-cyan-500/80 ring-cyan-500 shadow-cyan-500/20'
                : key === 'users'
                ? 'border-pink-500/80 ring-pink-500 shadow-pink-500/20'
                : 'border-emerald-500/80 ring-emerald-500 shadow-emerald-500/20';
            return (
              <button
                key={key}
                type="button"
                id={`announcement-audience-${key}`}
                onClick={() => { SoundEngine.playClick(); setAudience(key); }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  active
                    ? `bg-slate-900 ${ringColor} shadow-lg ring-1`
                    : 'bg-slate-900/50 border-purple-900/30 hover:border-purple-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    active
                      ? key === 'coordinators' ? 'bg-cyan-500 text-white'
                        : key === 'users' ? 'bg-pink-500 text-white'
                        : 'bg-emerald-500 text-white'
                      : 'bg-purple-950 text-purple-300'
                  }`}>
                    {meta.icon}
                  </div>
                  {active && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40">
                      Selected
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-white font-heading">{meta.label}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {key === 'coordinators'
                    ? 'Sent to every event co-ordinator account.'
                    : key === 'users'
                    ? 'Sent to every registered student / participant account.'
                    : 'Sent to co-ordinators and participants both.'}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Compose */}
      <form onSubmit={handleSend} className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-950 pb-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
            Step 2: Compose Announcement
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Type:</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-900/60 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="info">Information</option>
              <option value="success">Success / Congratulations</option>
              <option value="warning">Warning / Notice</option>
              <option value="alert">Urgent / Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
            Announcement Heading
          </label>
          <input
            id="announcement-title-input"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Schedule Update for the Grand Inauguration"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
            Announcement Message
          </label>
          <textarea
            id="announcement-message-input"
            required
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type the exact details, instructions, venue directions, or guidelines here..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
          />
        </div>

        {(title || message) && (
          <div className={`p-4 rounded-2xl border space-y-2 ${previewBg}`}>
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5" /> Live Preview
              </span>
              <span>
                Sending to: <strong className="uppercase">{AUDIENCE_META[audience].label}</strong>
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {type === 'alert' && <AlertCircle className="w-4 h-4 text-red-400" />}
                {type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                {type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {type === 'info' && <MessageSquare className="w-4 h-4 text-cyan-400" />}
              </div>
              <div className="overflow-hidden">
                <h5 className="text-xs font-bold text-white block truncate">
                  {title || 'Announcement heading'}
                </h5>
                <p className="text-[11px] text-slate-300 mt-0.5 whitespace-pre-wrap">
                  {message || 'Announcement message preview...'}
                </p>
                <span className="text-[10px] font-mono text-slate-400 block mt-1.5">
                  From: {currentUser.name} (Chief Administrator) • Just now
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setTitle(''); setMessage(''); }}
            className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Clear
          </button>
          <button
            type="submit"
            id="announcement-send-btn"
            disabled={isSending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-tech font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'Dispatching...' : `Send to ${AUDIENCE_META[audience].label}`}</span>
          </button>
        </div>
      </form>

      {/* History */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-purple-950 pb-3">
          <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            Dispatched Announcements ({announcements.length})
          </h3>
          <button
            onClick={() => { SoundEngine.playClick(); loadAnnouncements(); }}
            className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {announcements.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-mono space-y-2">
            <Inbox className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No announcements dispatched yet. Use the composer above to send your first one.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => {
              const sender = item.senderName || 'Central Administration';
              const audienceLabel = audienceChip(item);
              const audienceColor =
                item.targetRole === 'coordinator' || item.userId === 'coordinators'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : item.targetRole === 'student' || item.userId === 'students'
                  ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
              const typeColor =
                item.type === 'alert'
                  ? 'bg-red-500/20 text-red-300'
                  : item.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-300'
                  : item.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-blue-500/20 text-blue-300';
              return (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-purple-950 hover:border-purple-800 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${audienceColor}`}>
                        {audienceLabel}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${typeColor}`}>
                        {item.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(item.createdAt).toLocaleString()} • by {sender}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{item.message}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                    title="Delete announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};