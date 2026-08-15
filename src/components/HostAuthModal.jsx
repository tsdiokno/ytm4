import React, { useState } from 'react';
import { Lock, X, KeyRound, ShieldAlert } from 'lucide-react';

export function HostAuthModal({ isOpen, onClose, onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;

    const success = onLogin(password);
    if (!success) {
      setError(true);
    } else {
      setPassword('');
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl shadow-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-100">Host Authentication</h3>
            <p className="text-xs text-zinc-400">Enter host password to control centralized playback.</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(false);
                }}
                placeholder="Enter password..."
                autoFocus
                className={`w-full bg-zinc-950 text-zinc-100 placeholder-zinc-600 text-sm px-4 py-3 rounded-xl border ${
                  error ? 'border-red-500/80 focus:ring-red-500/20' : 'border-zinc-800 focus:border-amber-500/80 focus:ring-amber-500/20'
                } focus:ring-2 focus:outline-none transition-all`}
              />
              <KeyRound className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Incorrect password. Please try again.
              </p>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium text-sm transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm transition-all shadow-lg shadow-amber-500/10 active:scale-95"
            >
              Unlock Host Mode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
