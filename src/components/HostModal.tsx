import React, { useState } from 'react';
import { authenticateHost, setStoredHostToken } from '../utils/api';
import { Lock, Unlock, KeyRound, AlertCircle, Loader2, X, CheckCircle2 } from 'lucide-react';

interface HostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onHostStatusChanged: (isHost: boolean) => void;
}

export const HostModal: React.FC<HostModalProps> = ({
  isOpen,
  onClose,
  isHost,
  onHostStatusChanged,
}) => {
  const [password, setPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Please enter host password');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await authenticateHost(password);
      if (res.success && res.token) {
        onHostStatusChanged(true);
        setPassword('');
        onClose();
      } else {
        setError(res.error || 'Invalid password. (Default is: password)');
      }
    } catch {
      setError('Authentication failed. Check server connectivity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setStoredHostToken(null);
    onHostStatusChanged(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          id="close-host-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            {isHost ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-100">
              {isHost ? 'Host Mode Active' : 'Host Mode Access'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isHost
                ? 'You have master control over YouTube playback audio'
                : 'Enter password to unlock master playback controls'}
            </p>
          </div>
        </div>

        {isHost ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-950 border border-orange-500/30 text-orange-300 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <span>
                Host privileges enabled. Your browser runs the authoritative YouTube Iframe audio output driven by the state JSON.
              </span>
            </div>

            <button
              id="exit-host-mode-btn"
              type="button"
              onClick={handleLogout}
              className="w-full py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-sm font-medium border border-neutral-800 hover:border-neutral-700 transition-colors"
            >
              Exit Host Mode (Return to Guest View)
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Master Host Password
              </label>
              <div className="relative">
                <input
                  id="host-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter host password..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-neutral-950 border border-neutral-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 rounded-xl text-sm text-neutral-200 placeholder-neutral-500"
                />
                <KeyRound className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-neutral-500 pt-1 font-mono">
                Tip: Default password is <span className="text-orange-400 font-bold">password</span>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-neutral-950 border border-red-800 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                id="cancel-host-btn"
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-sm font-medium border border-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="submit-host-password-btn"
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 disabled:opacity-50 text-neutral-950 text-sm font-bold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-orange-600/20"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Host</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
