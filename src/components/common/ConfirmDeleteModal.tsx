import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { SoundEngine } from '../AudioEngine';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  itemName,
  confirmText = 'Delete Permanently',
  cancelText = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-3xl bg-[#0e0824] border border-red-500/40 p-6 sm:p-7 shadow-2xl shadow-red-950/50 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        {/* Close icon */}
        <button
          type="button"
          onClick={() => {
            SoundEngine.playClick();
            onCancel();
          }}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warning Icon Badge */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-500/20">
            <Trash2 className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-tight">
              {title}
            </h3>
            <span className="text-[11px] font-mono uppercase text-red-400 font-bold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Destructive Action
            </span>
          </div>
        </div>

        {/* Message body */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-red-950/60 text-slate-300 text-xs sm:text-sm leading-relaxed space-y-2">
          <p>{message}</p>
          {itemName && (
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/40 font-mono text-xs text-red-200 break-words font-semibold">
              "{itemName}"
            </div>
          )}
          <p className="text-[11px] text-slate-400 font-mono">
            This operation cannot be reversed once confirmed.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              SoundEngine.playClick();
              onCancel();
            }}
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-900/50 text-slate-300 text-xs font-tech font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>

          <button
            id="btn-confirm-delete"
            type="button"
            disabled={loading}
            onClick={() => {
              SoundEngine.playClick();
              onConfirm();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-tech font-bold uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{loading ? 'Deleting...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
