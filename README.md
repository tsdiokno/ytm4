# Crowd-Q: Let the Crowd Run the Queue

![image](/../main/screenshot-crowdq.png?raw=true "Screenshot")

**Crowd-Q** is a modern, lightweight web app for creating a **collaborative YouTube Music queue**.  
Inspired by Spotify’s *Jam* feature — but built for YouTube — it lets everyone in the room add songs to one shared queue while **playback stays centralized** on the host device.

> 🎵 One playback. One room. Everyone in control.

---

## 🚀 Features

- **Collaborative Queue** — Anyone connected can add YouTube and YouTube Music links to the shared queue.  
- **Centralized Playback** — Playback happens on a single host device; no synchronization required.  
- **Real-Time Queue Updates** — Smart polling with browser tab visibility detection.  
- **Modern UI** — Built with **React 19**, **Tailwind CSS**, and **Lucide Icons** in a dark-mode theme.  
- **Password Protection** — Host mode unlocks central playback controls (`Play`, `Pause`, `Skip`, `Clear`).  
- **Resilient Video Info** — Supports YouTube Data API with automatic public oEmbed fallback for track titles.  
- **Modern PHP Backend** — Concurrency-safe atomic writes (`flock`), PSR-4 autoloading, and clean RESTful API routing.

---

## 🎧 What Makes Crowd-Q Different?

Unlike other “watch-together” or “sync” apps, **Crowd-Q** is focused on **collaborative queueing**, not synchronized playback.  
It’s designed for *same-room experiences* — a crowd-powered DJ setup, not a remote watch party.

### Comparison

| App / Feature               | Core Purpose                                      | Playback Type                     | Collaboration Style               | Environment Focus       | Unique Differentiator                                 |
|-----------------------------|---------------------------------------------------|-----------------------------------|-----------------------------------|-------------------------|-------------------------------------------------------|
| **Crowd-Q**                 | Remote **collaborative queue** for YouTube Music  | Single central playback (no sync) | Shared queue management (same room) | Local / same-room setup | Acts as an *automatic, crowdsourced DJ* experience     |
| **SyncTube / YouTube Sync** | Watch YouTube videos **in sync** across devices   | Fully synchronized playback       | Host-led shared viewing           | Remote / multi-device   | Focused on *synchronized watching*, not shared control |
| **Spotify Jam**             | Group listening via Spotify app                   | Fully synchronized playback       | Invite-only group session         | Local or remote         | Similar to SyncTube but *natively integrated* in Spotify |

---

## ⚙️ Modern Development Workflow (pnpm + PHP)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/) (v9+)
- [PHP](https://www.php.net/) (v8.0+)
- *(Optional)* [Composer](https://getcomposer.org/)

### 🛠️ Quick Start (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/tsdiokno/ytm4.git
   cd crowd-q
   ```

2. **Install frontend dependencies with pnpm**:
   ```bash
   pnpm install
   ```

3. **(Optional) Configure YouTube Data API**:
   Copy the example configuration:
   ```bash
   cp config.json.example config.json
   ```
   Add your API key inside `config.json`.

4. **Run Full-Stack Dev Environment**:
   ```bash
   # Starts both Vite frontend (with HMR & proxy) and PHP backend
   pnpm run dev:all
   ```
   Or start them individually in separate terminals:
   ```bash
   # Terminal 1: PHP Backend API (port 8000)
   pnpm run dev:php

   # Terminal 2: Vite React Frontend (port 5173)
   pnpm run dev
   ```

5. **Build for Production**:
   ```bash
   pnpm run build
   ```
   The compiled static assets will be in the `dist/` directory.

---

## 🎚️ Usage

### Host
1. Open the app in your browser on the host device connected to speakers.
2. Click **Host Login** (top right) and enter the password (default: `12345`).
3. Control centralized playback (`Play`, `Pause`, `Skip`, `Clear`).

### Guest
1. Connect to the same local network or URL.
2. Paste any YouTube or YouTube Music track/short URL into the search bar and click **Add to Queue**.

---

## 🧠 Architecture Overview

* **Frontend:** React 19, Vite, Tailwind CSS, Lucide Icons, YouTube IFrame API, **pnpm package manager**.
* **Backend:** Modern PHP 8+ with PSR-4 autoloading (`src/php/QueueService.php`, `src/php/ConfigService.php`, `src/php/Response.php`).
* **API Routing:** `api/index.php` RESTful router (`/api/queue`, `/api/queue/next`, `/api/queue/clear`, `/api/config`).
* **Data Storage:** `queue.json` with exclusive file-locking (`flock(LOCK_EX)`).

---

## 🧾 License

This project is licensed under the **Mozilla Public License 2.0 (MPL-2.0)**.  
See the [LICENSE](LICENSE) file for full details.

---

## 🙏 Acknowledgments

Built by **@tsdiokno** with design-first simplicity.  
> “Let the crowd run the queue.” 🎶
