# Crowd-Q: Let the Crowd Run the Queue

![Screenshot](/../main/screenshot-crowdq.png?raw=true "Crowd-Q Screenshot")

**Crowd-Q** is a modern, lightweight web app for creating a **collaborative YouTube Music queue**.  
Inspired by Spotify’s *Jam* feature — but built for YouTube — it lets everyone in the room add songs to one shared queue while **playback stays centralized** on the host device.

> 🎵 One playback. One room. Everyone in control.

---

## ⚡ Upcoming: v2.0.0 Architecture Overhaul

> **Built with Google AI Studio**: The original vanilla JS/PHP architecture worked wonderfully, but **v2.0.0 is an upcoming major overhaul** re-engineered entirely with Google AI Studio for a modern full-stack developer experience.

### 🌟 Key Upgrades (v1.x Vanilla ➔ v2.0.0 Modern)
- **Frontend**: Upgraded to **React 19 + TypeScript + Tailwind CSS v4** with Lucide Icons and reactive state.
- **Backend API**: Refactored to a **PSR-4 PHP 8+ service layer** (`QueueService`, `ConfigService`) with clean `/api/*` REST routing.
- **Concurrency**: Concurrency-safe atomic writes via `flock(LOCK_EX)` preventing race conditions.
- **Dev Tooling**: Modern **Vite + pnpm workflow**, built-in proxying, and zero-config **Laravel Herd / Valet** support (`LocalValetDriver.php`).
- **Resilience**: Hybrid YouTube metadata resolver with automatic public oEmbed fallback.

---

## 🚀 Key Features

- **Collaborative Queue** — Anyone on the local network can add YouTube/YouTube Music links.
- **Centralized Host Playback** — Audio plays solely on the host device connected to speakers.
- **Real-Time Sync** — Resilient smart polling with tab visibility detection.
- **Host Controls** — Password-protected host mode for playback management (`Play`, `Pause`, `Skip`, `Clear`).
- **Zero Database Setup** — Fast, self-contained JSON storage with atomic locks.

---

## ⚙️ Quick Start (Development)

### Prerequisites
- Node.js (v18+) & [pnpm](https://pnpm.io/)
- PHP (v8.0+) or [Laravel Herd](https://herd.laravel.com/)

```bash
# 1. Clone & install
git clone https://github.com/tsdiokno/crowd-q.git
cd crowd-q
pnpm install

# 2. Start Vite Dev Server (proxies API requests to Laravel Herd)
pnpm run dev
```

### Production Build
```bash
pnpm run build
```
Compiled static assets and PHP backend files will be assembled in `dist/`.

---

## 🎚️ How It Works

1. **Host**: Open the app on the device connected to speakers. Click **Host Login** (default: `12345`) to unlock playback controls.
2. **Guests**: Open the URL on phones/laptops, paste any YouTube link, and hit **Add to Queue**.

---

## 🧾 License & Credits

- **License**: [Mozilla Public License 2.0 (MPL-2.0)](LICENSE)
- **Created by**: **@tsdiokno** — reworked with **Google AI Studio**
