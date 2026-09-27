import React, { useState } from 'react';
import { User, SupportReport } from '../../types';
import { dbService } from '../../services/dbService';
import { SoundEngine } from '../AudioEngine';
import { 
  Send, 
  HelpCircle, 
  Inbox, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Building2, 
  Mail,
  Phone,
  Sparkles
} from 'lucide-react';

interface StudentSupportSectionProps {
  currentUser: Omit<User, 'passwordHash'>;
  reports: SupportReport[];
  onRefresh: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const StudentSupportSection: React.FC<StudentSupportSectionProps> = ({
  currentUser,
  reports,
  onRefresh,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

  // Form state
  const [category, setCategory] = useState<'query' | 'issue' | 'feedback' | 'emergency'>('query');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactPhone, setContactPhone] = useState(currentUser.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student's own reports
  const myReports = reports.filter(
    r => r.senderId === currentUser.id || r.senderEmail.toLowerCase() === currentUser.email.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast('Please enter both a subject and question details.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      dbService.createReport({
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderEmail: currentUser.email,
        senderRole: 'student',
        senderPhone: contactPhone.trim() || undefined,
        senderCollege: currentUser.college,
        senderDepartment: currentUser.department,
        subject: subject.trim(),
        category,
        message: message.trim(),
        priority: category === 'emergency' ? 'urgent' : 'medium'
      });

      SoundEngine.playSuccess();
      showToast('Message transmitted to Lakshya 2026 Central Admin. You will be notified upon reply!', 'success');
      setSubject('');
      setMessage('');
      setActiveTab('history');
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit inquiry.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight flex items-center gap-2.5">
            <HelpCircle className="w-7 h-7 text-pink-400" />
            Participant Help Desk & Message Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Need assistance with event registration, gate passes, or technical requirements? Message the Central Fest Administration directly.
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-purple-900/50 self-start sm:self-auto">
          <button
            id="student-tab-submit-report"
            onClick={() => { SoundEngine.playClick(); setActiveTab('submit'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send Message</span>
          </button>

          <button
            id="student-tab-my-reports"
            onClick={() => { SoundEngine.playClick(); setActiveTab('history'); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer relative ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>My Messages ({myReports.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: SUBMIT NEW INQUIRY */}
      {activeTab === 'submit' && (
        <form onSubmit={handleSubmit} className="p-6 rounded-3xl bg-slate-950/80 border border-purple-900/40 shadow-xl space-y-4">
          <div className="border-b border-purple-950 pb-3">
            <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-pink-400" />
              Compose Message to Super Administration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Super Admin is automatically notified in real-time and your reply will appear in this tab.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Inquiry Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-xs font-mono focus:outline-none focus:border-pink-500"
              >
                <option value="query">General Event Rules / Timings Query</option>
                <option value="issue">Registration / Team Issue</option>
                <option value="feedback">Fest Feedback & Suggestion</option>
                <option value="emergency">Emergency / Urgent Assistance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
                Contact Phone / WhatsApp
              </label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Student profile info banner */}
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-900/30 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-mono text-pink-300">
            <span>Student: <strong className="text-white">{currentUser.name}</strong></span>
            <span>Roll: <strong className="text-white">{currentUser.rollNo || 'Delegate'}</strong></span>
            <span className="truncate max-w-xs">College: <strong className="text-white">{currentUser.college}</strong></span>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Subject
            </label>
            <input
              required
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Query regarding 24hr Hackathon food & overnight hostel accommodation"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-400 mb-1.5">
              Message & Question Details
            </label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question or issue in detail. If this is about an event, please include the event name..."
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-purple-900/60 text-white text-sm focus:outline-none focus:border-pink-500 placeholder:text-slate-600"
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
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white font-tech font-bold text-xs uppercase tracking-wider shadow-lg shadow-pink-600/30 hover:opacity-95 transition-opacity cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Sending...' : 'Send Message to Super Admin'}</span>
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 2: MY SUBMITTED INQUIRIES & ADMIN REPLIES */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {myReports.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-950/80 border border-purple-900/40 text-center space-y-2">
              <Inbox className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white font-heading">No messages sent yet</h4>
              <p className="text-xs text-slate-400">Any message or report you submit to central administration will appear here along with their reply.</p>
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
                          : 'bg-pink-500/20 text-pink-300 border border-pink-500/40 animate-pulse'
                      }`}>
                        {report.status === 'resolved' ? 'Answered by Admin' : report.status === 'in_progress' ? 'Review in Progress' : 'Pending Admin Response'}
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
                      <Clock className="w-3.5 h-3.5 text-pink-400 animate-spin" />
                      <span>Transmitted to Super Admin. You will see their official response here.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
