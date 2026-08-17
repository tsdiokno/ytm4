import React, { useState } from 'react';
import { Server, Check, Copy, X, Cpu, Database, ShieldCheck } from 'lucide-react';

interface PhpDeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhpDeploymentModal: React.FC<PhpDeploymentModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const htaccessCode = `<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    RewriteRule ^api/ - [L]
    RewriteRule ^data/ - [F,L]
    RewriteCond %{REQUEST_FILENAME} -f [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^ - [L]
    RewriteRule ^ index.html [L]
</IfModule>`;

  const stateSample = `{
  "status": "playing",
  "currentTrack": {
    "id": "jfKfPfyJRdk",
    "title": "lofi hip hop radio",
    "duration": 3600
  },
  "referenceTime": 42.5,
  "epochTimestamp": 1723790442,
  "playbackRate": 1.0,
  "version": 104,
  "updatedAt": 1723790442
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-y-auto">
        <button
          id="close-deploy-modal-btn"
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-neutral-100">PHP / Laravel Herd / Apache Architecture</h3>
            <p className="text-xs text-neutral-400">
              Zero-database, authoritative JSON state polling ready for Laravel Herd, Nginx, or cPanel Apache (PHP 7.4+)
            </p>
          </div>
        </div>

        {/* Overview Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold">
              <Cpu className="w-4 h-4" />
              <span>Authoritative Polling</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Clean, deterministic state synchronization with ETag HTTP 304 caching.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold">
              <Database className="w-4 h-4" />
              <span>Atomic JSON flock()</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              `state.json` and `playlist.json` use exclusive locking to prevent race conditions without SQL.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Stripped Headless IFrame</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Host runs YouTube IFrame with `controls: 0`, shielded by overlay, driven purely by state JSON.
            </p>
          </div>
        </div>

        {/* Tooling Architecture */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Development & Production Workflows
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="font-semibold text-orange-400 block font-mono">Laravel Herd + Vite</span>
              <p className="text-[11px] text-neutral-400">Fast local dev with Herd-hosted PHP API and Vite HMR frontend.</p>
              <code className="text-[11px] bg-neutral-900 px-2 py-1 rounded block text-neutral-300 font-mono">pnpm dev</code>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-1.5">
              <span className="font-semibold text-orange-400 block font-mono">Production Build</span>
              <p className="text-[11px] text-neutral-400">Generates dist/ with .htaccess, LocalValetDriver.php, and PHP front controller.</p>
              <code className="text-[11px] bg-neutral-900 px-2 py-1 rounded block text-neutral-300 font-mono">pnpm build</code>
            </div>
          </div>
        </div>

        {/* Directory Structure */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
            Production Build Output Structure (`dist/` or `public_html/`)
          </h4>
          <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-xs overflow-x-auto">
{`public_html/ (or dist/)
├── index.html            # Compiled React SPA
├── .htaccess             # Apache rewrite rules & JSON protection
├── LocalValetDriver.php  # Laravel Herd / Valet driver
├── assets/               # Bundled JS / CSS
├── data/
│   ├── .htaccess         # "Require all denied" (Blocks direct JSON reads)
│   ├── state.json        # Atomic epoch playback state
│   └── playlist.json     # Dynamic crowd queue & history
└── api/
    └── index.php         # Unified front controller with atomic flock()`}
          </pre>
        </div>

        {/* Sample state format */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Sample Immutable Reference Vector (`data/state.json`)
            </h4>
            <button
              type="button"
              onClick={() => copyToClipboard(stateSample, 'state')}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1"
            >
              {copiedSection === 'state' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'state' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-xs overflow-x-auto">
            {stateSample}
          </pre>
        </div>

        {/* .htaccess configuration */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
              Apache `.htaccess` Configuration
            </h4>
            <button
              type="button"
              onClick={() => copyToClipboard(htaccessCode, 'htaccess')}
              className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1"
            >
              {copiedSection === 'htaccess' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection === 'htaccess' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-300 font-mono text-xs overflow-x-auto">
            {htaccessCode}
          </pre>
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
