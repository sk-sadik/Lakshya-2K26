import React, { useState, useEffect, useMemo } from 'react';
import { User, SupportReport, NotificationItem, ManagedEvent } from '../../types';
import { dbService } from '../../services/dbService';
import { SoundEngine } from '../AudioEngine';
import { 
  Send, 
  MessageSquare, 
  Inbox, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Building2, 
  Sparkles,
  HelpCircle,
  Megaphone,
  Users,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface CoordinatorMessagesSectionProps {
  currentUser: Omit<User, 'passwordHash'>;
  notifications: NotificationItem[];
  reports: SupportReport[];
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const CoordinatorMessagesSection: React.FC<CoordinatorMessagesSectionProps> = ({
  currentUser,
  notifications,
  reports,
  onRefresh,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history' | 'notifications' | 'announce'>('submit');

  // Form state
  const [category, setCategory] = useState<'requisition' | 'issue' | 'query' | 'emergency'>('requisition');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coordinator's own reports
  const myReports = reports.filter(
    r => r.senderId === currentUser.id || r.senderEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  // Notifications relevant to coordinators
  const coordinatorNotifications = notifications.filter(
    n => n.targetRole === 'coordinator' || n.userId === 'coordinators' || n.targetRole === 'all' || n.userId === 'all' || n.userId === currentUser.id
  );

  // ---- Announce to own event registrants ONLY ----
  const [eventsTick, setEventsTick] = useState(0);
  const [announceEventId, setAnnounceEventId] = useState('');
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMessage, setAnnounceMessage] = useState('');
  const [announceType, setAnnounceType] = useState<'info' | 'success' | 'warning' | 'alert'>('info');
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [recipientEventName, setRecipientEventName] = useState('');
  const [sentHistory, setSentHistory] = useState<NotificationItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ownEvents: ManagedEvent[] = useMemo(() => {
    const all = dbService.getEvents();
    const mine = all.filter(
      (e) =>
        (e as any).coordinator === currentUser.id ||
        (e.coordinatorEmail || '').toLowerCase() === currentUser.email.toLowerCase()
    );
    return mine;
  }, [currentUser.id, currentUser.email, eventsTick]);

  useEffect(() => {
    if (activeTab !== 'announce') return;
    let cancelled = false;
    (async () => {
      try {
        await dbService.syncEvents();
      } catch {}
      if (!cancelled) setEventsTick((t) => t + 1);
      try {
        setHistoryLoading(true);
        const h = await dbService.getCoordinatorAnnouncements();
        if (!cancelled) setSentHistory(h);
      } catch {
        // keep existing
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  useEffect(() => {
    if (!announceEventId) {
      setRecipientCount(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await dbService.getEventRecipientCount(announceEventId);
        if (!cancelled) {
          setRecipientCount(r.count);
          setRecipientEventName(r.eventName);
        }
      } catch {
        if (!cancelled) setRecipientCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [announceEventId]);

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceEventId) {
      showToast('Please select one of your events first.', 'error');
      return;
    }
    if (!announceTitle.trim() || !announceMessage.trim()) {
      showToast('Please enter both a title and message.', 'error');
      return;
    }
    setIsAnnouncing(true);
    try {
      const res = await dbService.sendCoordinatorAnnouncement({
        eventId: announceEventId,
        title: announceTitle.trim(),
        message: announceMessage.trim(),
        type: announceType,
      });
      SoundEngine.playSuccess();
      showToast(`Announcement sent to ${res.count} registered student(s) of ${res.eventName}. No one else can see it.`, 'success');
      setAnnounceTitle('');
      setAnnounceMessage('');
      const h = await dbService.getCoordinatorAnnouncements();
      setSentHistory(h);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to send announcement.', 'error');
    } finally {
      setIsAnnouncing(false);
    }
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please provide both a subject and report details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      dbService.createReport({
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderEmail: currentUser.email,
        senderRole: 'coordinator',
        senderPhone: currentUser.phone,
        senderCollege: currentUser.college,
        senderDepartment: currentUser.department,
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority
      });

      SoundEngine.playSuccess();
      showToast('Official report submitted to Central Administration. Admin has been notified!', 'success');
      setSubject('');
      setMessage('');
      setActiveTab('history');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-purple-400" />
            Co-ordinator Support & Admin Desk
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Submit departmental requisitions, schedule escalations, and communicate directly with Central Administration.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-purple-900/50 self-start sm:self-auto">
          <button
            id="coord-tab-submit-report"
            onClick={() => { SoundEngine.playClick(); setActiveTab('submit'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>New Report</span>
          </button>

          <button
            id="coord-tab-my-reports"
            onClick={() => { SoundEngine.playClick(); setActiveTab('history'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer relative ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>My Inquiries ({myReports.length})</span>
          </button>

          <button
            id="coord-tab-admin-notifs"
            onClick={() => { SoundEngine.playClick(); setActiveTab('notifications'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'notifications'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Admin Notices ({coordinatorNotifications.length})</span>
          </button>

          <button
            id="coord-tab-announce"
            onClick={() => { SoundEngine.playClick(); setActiveTab('announce'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'announce'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Announce to My Event</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SUBMIT NEW REPORT TO ADMIN */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmitReport} className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
          <div className="border-b border-purple-950 pb-3">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-400" />
              Submit Official Report to Administration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Super Admin will receive an instant notification in the central dashboard upon submission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="requisition">Resource & Logistics Requisition (Wi-Fi, Mementos, Lab Kits)</option>
                <option value="issue">Operational / Technical Issue (Software, Venue power)</option>
                <option value="query">Schedule / Rule Clarification</option>
                <option value="emergency">Emergency / Critical Escalation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Urgency / Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="low">Standard / Low</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent / Immediate Action Required</option>
              </select>
            </div>
          </div>

          {/* Coordinator metadata info box */}
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-900/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono text-purple-300">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Department: <strong className="text-white uppercase">{currentUser.department || 'CSE'}</strong>
            </span>
            <span>Sender: <strong className="text-white">{currentUser.name}</strong></span>
            <span>Email: <strong className="text-white">{currentUser.email}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Report Subject
            </label>
            <input
              required
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Requisition for 10 Extra Mementos & High-Speed Wi-Fi Tokens for Lab 3"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Detailed Description & Requirements
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide exact event context, items required, quantities, venue timing, or specific questions for the central committee..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-purple-500 placeholder:text-slate-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setSubject(''); setMessage(''); }}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-tech font-bold text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Transmitting to Admin...' : 'Transmit Report to Super Admin'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MY SUBMITTED REPORTS & ADMIN REPLIES */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {myReports.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-950/80 border border-purple-900/40 text-center space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white font-heading">No reports submitted yet</h4>
              <p className="text-xs text-slate-400">Any requisition or inquiry you send to central administration will appear here along with their replies.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myReports.map((report) => (
                <div
                  key={report.id}
                  className="p-5 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-950 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        report.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : report.status === 'in_progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                      }`}>
                        {report.status === 'resolved' ? 'Resolved / Replied' : report.status === 'in_progress' ? 'Under Review' : 'Pending Admin Review'}
                      </span>

                      <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-mono uppercase border border-purple-900/60">
                        {report.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(report.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-heading font-bold text-white text-base">{report.subject}</h4>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed whitespace-pre-wrap">{report.message}</p>
                  </div>

                  {/* Admin official reply if available */}
                  {report.adminReply ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/50 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Central Administration Response
                        </span>
                        {report.repliedAt && <span>{new Date(report.repliedAt).toLocaleString()}</span>}
                      </div>
                      <p className="text-xs text-emerald-100 font-sans leading-relaxed">{report.adminReply}</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-900/30 text-[11px] font-mono text-slate-400 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                      <span>Notification dispatched to Super Admin. Waiting for committee action / reply.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ADMIN BROADCAST NOTICES */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          {coordinatorNotifications.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-950/80 border border-purple-900/40 text-center space-y-2">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white font-heading">No coordinator notices</h4>
              <p className="text-xs text-slate-400">Broadcasts and instructions from central administration will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {coordinatorNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-1.5 hover:border-purple-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        notif.type === 'alert'
                          ? 'bg-red-500/20 text-red-300'
                          : notif.type === 'warning'
                          ? 'bg-amber-500/20 text-amber-300'
                          : notif.type === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {notif.type}
                      </span>
                      <span className="text-[10px] font-mono text-purple-300">
                        {notif.targetRole === 'coordinator' ? 'Co-ordinator Broadcast' : 'Fest Broadcast'}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h5 className="font-bold text-white text-sm">{notif.title}</h5>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* TAB 4: ANNOUNCE TO OWN EVENT REGISTRANTS ONLY */}
      {activeTab === 'announce' && (
        <div className="space-y-4">
          <form onSubmit={handleSendAnnouncement} className="p-6 rounded-3xl bg-slate-950/80 border border-emerald-900/40 shadow-xl space-y-4">
            <div className="border-b border-purple-950 pb-3">
              <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                Announce to My Event Participants
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Goes ONLY to students registered for the selected event. No other participant can see it — admin cannot send on your behalf here.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Select Your Event *
              </label>
              <select
                value={announceEventId}
                onChange={(e) => setAnnounceEventId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose event --</option>
                {ownEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.eventName} ({ev.department.toUpperCase()} • {ev.entryFee})
                  </option>
                ))}
              </select>
              {ownEvents.length === 0 && (
                <p className="text-[11px] font-mono text-amber-300 mt-1.5">
                  No events assigned to you yet. Create one from the Add Event tab first.
                </p>
              )}
            </div>

            {announceEventId && (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/40 text-xs font-mono text-emerald-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {recipientCount === null
                    ? 'Counting registered students...'
                    : `${recipientCount} registered student(s) will receive this${recipientEventName ? ` for ${recipientEventName}` : ''}.`}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Announcement Title *
                </label>
                <input
                  required
                  type="text"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  placeholder="e.g., Reporting at CSE Lab 3 by 09:00 AM"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                  Priority
                </label>
                <select
                  value={announceType}
                  onChange={(e) => setAnnounceType(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="info">Information (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="alert">Urgent (Red)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Message *
              </label>
              <textarea
                required
                rows={4}
                value={announceMessage}
                onChange={(e) => setAnnounceMessage(e.target.value)}
                placeholder="Venue, timing, what to bring, rule change..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setAnnounceTitle(''); setAnnounceMessage(''); }}
                className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={isAnnouncing || !announceEventId}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-tech font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isAnnouncing ? 'Sending...' : 'Send to Registrants Only'}</span>
              </button>
            </div>
          </form>

          <div className="p-5 rounded-3xl bg-slate-950/80 border border-purple-900/40 space-y-3">
            <div className="flex items-center justify-between border-b border-purple-950 pb-2">
              <h4 className="font-heading font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                My Sent Announcements ({sentHistory.length})
              </h4>
              <button
                type="button"
                onClick={async () => {
                  setHistoryLoading(true);
                  try {
                    setSentHistory(await dbService.getCoordinatorAnnouncements());
                  } finally {
                    setHistoryLoading(false);
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
                title="Refresh history"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {sentHistory.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 text-center py-4">
                {historyLoading ? 'Loading...' : 'No announcements sent yet.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {sentHistory.map((n) => (
                  <div key={n.id} className="p-3.5 rounded-2xl bg-slate-900/70 border border-purple-950">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        n.type === 'alert' ? 'bg-red-500/20 text-red-300'
                        : n.type === 'warning' ? 'bg-amber-500/20 text-amber-300'
                        : n.type === 'success' ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {n.type}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white">{n.title}</h5>
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Each announcement is delivered as a private inbox item per registered student.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
