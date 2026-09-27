import React, { useState } from 'react';
import { NotificationItem, SupportReport, User } from '../../types';
import { dbService } from '../../services/dbService';
import { SoundEngine } from '../AudioEngine';
import { 
  Send, 
  Radio, 
  Megaphone, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  Inbox, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Reply, 
  Search, 
  Trash2, 
  RefreshCw, 
  X,
  Sparkles,
  Building2,
  Mail,
  Phone
} from 'lucide-react';

interface AdminMessagesSectionProps {
  currentUser: Omit<User, 'passwordHash'>;
  notifications: NotificationItem[];
  reports: SupportReport[];
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminMessagesSection: React.FC<AdminMessagesSectionProps> = ({
  currentUser,
  notifications,
  reports,
  onRefresh,
  showToast
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'broadcast' | 'inbox'>('broadcast');

  // Broadcast Composer State
  const [targetAudience, setTargetAudience] = useState<'students' | 'coordinators' | 'all'>('students');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');
  const [isSending, setIsSending] = useState(false);

  // Inbox & Reports State
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'coordinator'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'in_progress' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reply Modal State
  const [selectedReportForReply, setSelectedReportForReply] = useState<SupportReport | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchRole = roleFilter === 'all' || r.senderRole === roleFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || 
      r.senderName.toLowerCase().includes(q) ||
      r.senderEmail.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      r.message.toLowerCase().includes(q) ||
      (r.senderDepartment && r.senderDepartment.toLowerCase().includes(q)) ||
      (r.senderCollege && r.senderCollege.toLowerCase().includes(q));
    return matchRole && matchStatus && matchSearch;
  });

  const unreadReportsCount = reports.filter(r => r.status === 'unread').length;
  const participantReportsCount = reports.filter(r => r.senderRole === 'student').length;
  const coordinatorReportsCount = reports.filter(r => r.senderRole === 'coordinator').length;

  // Broadcast History (only broadcasts sent by admin or system)
  const broadcastHistory = notifications.filter(n => 
    n.targetRole === 'student' || 
    n.targetRole === 'coordinator' || 
    n.userId === 'students' || 
    n.userId === 'coordinators' ||
    n.targetRole === 'all' ||
    n.userId === 'all'
  );

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      showToast('Please enter both a title and message content.', 'error');
      return;
    }

    setIsSending(true);
    try {
      dbService.sendNotification({
        targetRole: targetAudience === 'all' ? 'all' : targetAudience === 'students' ? 'student' : 'coordinator',
        userId: targetAudience === 'all' ? 'all' : targetAudience === 'students' ? 'students' : 'coordinators',
        title: broadcastTitle.trim(),
        message: broadcastMessage.trim(),
        type: broadcastType,
        senderName: currentUser.name || 'Central Administration',
        senderRole: 'admin',
        senderEmail: currentUser.email
      });

      SoundEngine.playSuccess();
      const audienceLabel = targetAudience === 'students' ? 'all Participants (Students)' : targetAudience === 'coordinators' ? 'all Co-ordinators' : 'all Users';
      showToast(`Broadcast notification dispatched successfully to ${audienceLabel}!`, 'success');
      
      setBroadcastTitle('');
      setBroadcastMessage('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch broadcast.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteNotification = (id: string) => {
    SoundEngine.playClick();
    dbService.deleteNotification(id);
    showToast('Broadcast notification removed from log.', 'success');
    onRefresh();
  };

  const handleStatusChange = (reportId: string, status: 'unread' | 'in_progress' | 'resolved') => {
    SoundEngine.playClick();
    dbService.updateReportStatus(reportId, status);
    showToast(`Status updated to "${status.replace('_', ' ')}".`, 'success');
    onRefresh();
  };

  const handleOpenReplyModal = (report: SupportReport) => {
    SoundEngine.playClick();
    setSelectedReportForReply(report);
    setReplyMessage(report.adminReply || '');
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportForReply) return;
    if (!replyMessage.trim()) {
      showToast('Please enter a response message.', 'error');
      return;
    }

    setIsSubmittingReply(true);
    try {
      dbService.replyToReport(selectedReportForReply.id, replyMessage.trim());
      SoundEngine.playSuccess();
      showToast(`Reply sent directly to ${selectedReportForReply.senderName} (${selectedReportForReply.senderRole})!`, 'success');
      setSelectedReportForReply(null);
      setReplyMessage('');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to send reply.', 'error');
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    SoundEngine.playClick();
    dbService.deleteReport(reportId);
    showToast('Report deleted.', 'success');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & Section Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2.5">
              <Megaphone className="w-7 h-7 text-cyan-400" />
              Communication & Message Center
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Dispatch announcements to participants and co-ordinators, and respond to incoming inquiries and support reports.
          </p>
        </div>

        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-950 border border-purple-900/50 self-start sm:self-auto">
          <button
            id="admin-tab-broadcast"
            onClick={() => { SoundEngine.playClick(); setActiveSubTab('broadcast'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeSubTab === 'broadcast'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Send Broadcast</span>
          </button>

          <button
            id="admin-tab-inbox"
            onClick={() => { SoundEngine.playClick(); setActiveSubTab('inbox'); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer relative ${
              activeSubTab === 'inbox'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Incoming Reports & Queries</span>
            {unreadReportsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[10px] font-bold">
                {unreadReportsCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUBTAB 1: BROADCAST SENDER */}
      {activeSubTab === 'broadcast' && (
        <div className="space-y-6">
          {/* Target Audience Quick Selector Cards */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold block mb-1">
                Step 1: Choose Target Recipient Audience
              </span>
              <p className="text-xs text-slate-300">
                Send targeted announcements specifically to student delegates or faculty/student co-ordinators.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Option 1: Participants */}
              <button
                type="button"
                id="target-participants-btn"
                onClick={() => { SoundEngine.playClick(); setTargetAudience('students'); }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  targetAudience === 'students'
                    ? 'bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-slate-900 border-pink-500/80 shadow-lg shadow-pink-500/20 ring-1 ring-pink-500'
                    : 'bg-slate-900/50 border-purple-900/30 hover:border-purple-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    targetAudience === 'students' ? 'bg-pink-500 text-white' : 'bg-purple-950 text-purple-300'
                  }`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  {targetAudience === 'students' && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-mono text-[10px] font-bold border border-pink-500/40">
                      Active Target
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Participants (Students)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Broadcasts directly to all registered students, team leaders, and delegate portals.
                  </p>
                </div>
              </button>

              {/* Option 2: Co-ordinators */}
              <button
                type="button"
                id="target-coordinators-btn"
                onClick={() => { SoundEngine.playClick(); setTargetAudience('coordinators'); }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  targetAudience === 'coordinators'
                    ? 'bg-gradient-to-br from-cyan-950/40 via-blue-950/30 to-slate-900 border-cyan-500/80 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-500'
                    : 'bg-slate-900/50 border-purple-900/30 hover:border-purple-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    targetAudience === 'coordinators' ? 'bg-cyan-500 text-white' : 'bg-purple-950 text-purple-300'
                  }`}>
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  {targetAudience === 'coordinators' && (
                    <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold border border-cyan-500/40">
                      Active Target
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">Co-ordinators</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Dispatches notices to faculty organizers, student heads, and departmental desk leads.
                  </p>
                </div>
              </button>

              {/* Option 3: All Users */}
              <button
                type="button"
                id="target-all-btn"
                onClick={() => { SoundEngine.playClick(); setTargetAudience('all'); }}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  targetAudience === 'all'
                    ? 'bg-gradient-to-br from-emerald-950/40 via-teal-950/30 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                    : 'bg-slate-900/50 border-purple-900/30 hover:border-purple-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    targetAudience === 'all' ? 'bg-emerald-500 text-white' : 'bg-purple-950 text-purple-300'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  {targetAudience === 'all' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                      Active Target
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-heading">All Users (System-Wide)</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    General announcements sent across all participants, co-ordinators, and public bulletins.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Broadcast Composer Form */}
          <form onSubmit={handleSendBroadcast} className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-950 pb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Step 2: Compose Broadcast Details
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Alert Priority:</span>
                <select
                  value={broadcastType}
                  onChange={(e) => setBroadcastType(e.target.value as any)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-purple-900/60 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success / Congratulations (Green)</option>
                  <option value="warning">Warning / Notice (Amber)</option>
                  <option value="alert">Urgent / Critical Alert (Red)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Broadcast Headline / Title
              </label>
              <input
                id="broadcast-title-input"
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder={
                  targetAudience === 'students'
                    ? 'e.g., Reporting Time for Hackathon Prelims & Turnstile Verification'
                    : targetAudience === 'coordinators'
                    ? 'e.g., Mandatory Co-ordinator Briefing at Admin Auditorium at 04:00 PM'
                    : 'e.g., Grand Inauguration Schedule & Dignitary Arrival'
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Announcement Body
              </label>
              <textarea
                id="broadcast-message-input"
                required
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type the exact announcement details, venue directions, guidelines, or instructions..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
              />
            </div>

            {/* Live Preview Card */}
            {(broadcastTitle || broadcastMessage) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-800/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> Live Notification Preview
                  </span>
                  <span>Target: <strong className="text-white uppercase">{targetAudience}</strong></span>
                </div>
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                  broadcastType === 'alert' 
                    ? 'bg-red-950/30 border-red-500/40 text-red-200' 
                    : broadcastType === 'warning'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : broadcastType === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                }`}>
                  <div className="mt-0.5 shrink-0">
                    {broadcastType === 'alert' && <AlertCircle className="w-4 h-4 text-red-400" />}
                    {broadcastType === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    {broadcastType === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {broadcastType === 'info' && <MessageSquare className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-xs font-bold text-white block truncate">
                      {broadcastTitle || 'Announcement Title'}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5 whitespace-pre-wrap">
                      {broadcastMessage || 'Announcement message preview...'}
                    </p>
                    <span className="text-[10px] font-mono text-slate-400 block mt-1.5">
                      From: {currentUser.name} (Central Admin) • Just now
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setBroadcastTitle(''); setBroadcastMessage(''); }}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>

              <button
                type="submit"
                id="dispatch-broadcast-btn"
                disabled={isSending}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-tech font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSending ? 'Sending Notification...' : `Dispatch to ${targetAudience === 'students' ? 'Participants' : targetAudience === 'coordinators' ? 'Co-ordinators' : 'All'}`}</span>
              </button>
            </div>
          </form>

          {/* Broadcast History */}
          <div className="p-5 sm:p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-purple-950 pb-3">
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Previous Broadcast Dispatches ({broadcastHistory.length})
              </h3>
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Refresh history"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {broadcastHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-mono">
                No previous broadcast messages recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {broadcastHistory.map((item) => {
                  const isParticipantTarget = item.targetRole === 'student' || item.userId === 'students';
                  const isCoordinatorTarget = item.targetRole === 'coordinator' || item.userId === 'coordinators';
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl bg-slate-900/70 border border-purple-950 hover:border-purple-800 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            isParticipantTarget
                              ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                              : isCoordinatorTarget
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {isParticipantTarget ? 'Target: Participants' : isCoordinatorTarget ? 'Target: Co-ordinators' : 'Target: All'}
                          </span>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            item.type === 'alert'
                              ? 'bg-red-500/20 text-red-300'
                              : item.type === 'warning'
                              ? 'bg-amber-500/20 text-amber-300'
                              : item.type === 'success'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}>
                            {item.type}
                          </span>

                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white font-sans">{item.title}</h4>
                        <p className="text-xs text-slate-300 font-sans leading-relaxed">{item.message}</p>
                      </div>

                      <button
                        onClick={() => handleDeleteNotification(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                        title="Delete notification"
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
      )}

      {/* SUBTAB 2: INCOMING REPORTS & QUERIES */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6">
          {/* Metrics bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40">
              <span className="text-xs font-mono text-slate-400 block mb-1">Total Inquiries Received</span>
              <span className="text-2xl font-bold font-mono text-white">{reports.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-pink-900/40">
              <span className="text-xs font-mono text-pink-400 block mb-1">From Participants (Students)</span>
              <span className="text-2xl font-bold font-mono text-pink-300">{participantReportsCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-900/40">
              <span className="text-xs font-mono text-cyan-400 block mb-1">From Co-ordinators</span>
              <span className="text-2xl font-bold font-mono text-cyan-300">{coordinatorReportsCount}</span>
            </div>
          </div>

          {/* Filters & Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-purple-950 self-stretch md:self-auto overflow-x-auto">
              <button
                onClick={() => { SoundEngine.playClick(); setRoleFilter('all'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  roleFilter === 'all' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All Sources ({reports.length})
              </button>
              <button
                id="filter-participant-reports-btn"
                onClick={() => { SoundEngine.playClick(); setRoleFilter('student'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  roleFilter === 'student' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Participants ({participantReportsCount})</span>
              </button>
              <button
                id="filter-coordinator-reports-btn"
                onClick={() => { SoundEngine.playClick(); setRoleFilter('coordinator'); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  roleFilter === 'coordinator' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Co-ordinators ({coordinatorReportsCount})</span>
              </button>
            </div>

            {/* Status Filter & Search */}
            <div className="flex items-center gap-2 self-stretch md:self-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-purple-900/60 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Statuses</option>
                <option value="unread">Unread / New</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>

              <div className="relative flex-1 md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search inquiries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-purple-900/60 text-xs text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Reports List */}
          {filteredReports.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-950/80 border border-purple-900/40 text-center space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white font-heading">No messages matching criteria</h4>
              <p className="text-xs text-slate-400">Try clearing filters or check back later for incoming student and coordinator inquiries.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className={`p-5 rounded-3xl border transition-all space-y-4 ${
                    report.status === 'unread'
                      ? 'bg-slate-950 border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/70 border-purple-900/40'
                  }`}
                >
                  {/* Top metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-950 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        report.senderRole === 'coordinator'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                      }`}>
                        {report.senderRole === 'coordinator' ? 'Co-ordinator' : 'Participant'}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        report.category === 'emergency'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : report.category === 'requisition'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                          : report.category === 'issue'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        Category: {report.category}
                      </span>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : report.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-pink-500/20 text-pink-300 border border-pink-500/40 animate-pulse'
                      }`}>
                        {report.status.replace('_', ' ')}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Sender profile summary */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-300">
                    <span className="font-bold text-white text-sm">{report.senderName}</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" /> {report.senderEmail}
                    </span>
                    {report.senderPhone && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" /> {report.senderPhone}
                      </span>
                    )}
                    {report.senderCollege && (
                      <span className="flex items-center gap-1 text-slate-400 truncate max-w-xs">
                        <Building2 className="w-3.5 h-3.5 text-pink-400 shrink-0" /> {report.senderCollege}
                      </span>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-purple-950 space-y-1.5">
                    <h5 className="font-bold text-white text-sm font-heading">{report.subject}</h5>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{report.message}</p>
                  </div>

                  {/* Admin official reply box if replied */}
                  {report.adminReply && (
                    <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Official Central Admin Reply
                        </span>
                        {report.repliedAt && <span>{new Date(report.repliedAt).toLocaleString()}</span>}
                      </div>
                      <p className="text-xs text-emerald-100 font-sans leading-relaxed">{report.adminReply}</p>
                    </div>
                  )}

                  {/* Bottom Action Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStatusChange(report.id, report.status === 'resolved' ? 'unread' : 'resolved')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer ${
                          report.status === 'resolved'
                            ? 'bg-slate-900 text-slate-400 hover:text-white'
                            : 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60'
                        }`}
                      >
                        {report.status === 'resolved' ? 'Mark as Unresolved' : 'Mark as Resolved'}
                      </button>

                      {report.status !== 'in_progress' && report.status !== 'resolved' && (
                        <button
                          onClick={() => handleStatusChange(report.id, 'in_progress')}
                          className="px-3 py-1.5 rounded-xl text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/40 transition-colors cursor-pointer"
                        >
                          Mark In-Progress
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReplyModal(report)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-bold text-xs shadow-md shadow-cyan-600/30 hover:opacity-95 transition-opacity cursor-pointer"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>{report.adminReply ? 'Update Reply' : 'Reply to Sender'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reply Modal */}
      {selectedReportForReply && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-slate-950 border border-cyan-500/50 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-purple-950 pb-3">
              <div>
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <Reply className="w-4 h-4 text-cyan-400" />
                  Reply to {selectedReportForReply.senderName} ({selectedReportForReply.senderRole})
                </h3>
                <span className="text-xs font-mono text-slate-400 block mt-0.5">
                  Subject: {selectedReportForReply.subject}
                </span>
              </div>
              <button
                onClick={() => setSelectedReportForReply(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-purple-950 text-xs text-slate-300 font-sans">
              <strong className="text-slate-400 font-mono block mb-1">Their Message:</strong>
              <p className="line-clamp-3">{selectedReportForReply.message}</p>
            </div>

            <form onSubmit={handleSubmitReply} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Central Admin Official Response
                </label>
                <textarea
                  required
                  rows={4}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type clear resolution, guidelines, or confirmation for the student or coordinator..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                />
                <span className="text-[11px] font-mono text-slate-500 block mt-1">
                  * Upon submitting, this inquiry will be marked as Resolved and the sender will immediately receive a notification in their dashboard.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReportForReply(null)}
                  className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingReply}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingReply ? 'Sending...' : 'Send Official Response'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
