import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export function Toast({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let bgClass = 'bg-zinc-900 border-zinc-800 text-zinc-100';
        let Icon = Info;
        let iconColor = 'text-blue-400';

        if (toast.type === 'success') {
          bgClass = 'bg-zinc-900/95 border-emerald-500/30 text-zinc-100';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (toast.type === 'error') {
          bgClass = 'bg-zinc-900/95 border-red-500/30 text-zinc-100';
          Icon = AlertCircle;
          iconColor = 'text-red-400';
        } else if (toast.type === 'warning') {
          bgClass = 'bg-zinc-900/95 border-amber-500/30 text-zinc-100';
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl shadow-black/40 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${bgClass}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
              <p className="text-sm font-medium leading-snug truncate">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
