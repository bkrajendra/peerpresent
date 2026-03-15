# PeerPresent

**PeerPresent** is a Progressive Web App for running **interactive presentations** over the network. The presenter shares slides in real time with the team via **WebRTC** (PeerJS). Viewers stay in sync with the presenter and can **interact**—answer quizzes, respond to exercises, and participate in hands-on sections.

[![pages-build-deployment](https://github.com/bkrajendra/peerpresent/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/bkrajendra/peerpresent/actions/workflows/pages/pages-build-deployment)

<p align="center">
  <img src="https://img.shields.io/badge/90%25%20Vibe%20Coded-purple?style=for-the-badge&logo=github" />
</p>

Demo: https://peerpresent.rajendrakhope.com?mode=presenter

## Features

- **Real-time sync** — Slides and navigation stay in sync for all viewers (WebRTC via PeerJS).
- **Presenter / viewer roles** — One presenter controls the deck; others join with a 4-digit room code.
- **Interactive elements** — Quizzes, exercises, and responses from the audience.
- **PWA** — Installable on desktop and mobile; works offline once loaded (where supported) - TODO
- **No backend required** — Signaling uses PeerJS cloud; media is peer-to-peer.

## Quick start: use the demo

No setup needed. Use the hosted instance:

- **Demo:** [https://peerpresent.rajendrakhope.com](https://peerpresent.rajendrakhope.com)

1. **Presenter:** Open the link http://localhost:8080?mode=presenter → choose **Start as Presenter** → note the **4-digit room code**.
2. **Team:** Open the same link http://localhost:8080 on their devices → enter the **room code** → **Join Session**.
3. Presenter advances slides; everyone sees the same slide and can respond to quizzes/exercises.

> Note: For Cloud Instance.
> Presenter: https://peerpresent.rajendrakhope.com?mode=presenter
> Clients: https://peerpresent.rajendrakhope.com

---

## Run locally

You need a local HTTP server (the app is static HTML/CSS/JS). Use either of the options below.

### Option 1: Node (http-server)

**Prerequisites:** [Node.js](https://nodejs.org/) and npm.

```bash
# From the project root
cd /path/to/peerpresent

# One-time: install http-server (or use npx and skip install)
npm install -g http-server
# OR just use npx (no global install):
# npx http-server

# Start server (serves on http://localhost:8080 by default)
http-server -p 8080
# If using npx:
# npx http-server -p 8080
```

Then open **http://localhost:8080** in your browser.

### Option 2: Python

**Prerequisites:** Python 3.

```bash
# From the project root
cd /path/to/peerpresent

# Python 3
python3 -m http.server 8080
# Or, if python points to Python 3:
python -m http.server 8080
```

Then open **http://localhost:8080** in your browser.

---

## How to present

1. **Presenter**
   - Open the app (demo or your local URL with ?mode=presenter).
   - Click **Start as Presenter**.
   - Share the **4-digit room code** (e.g. on screen or in chat).

2. **Viewers (team)**
   - Open the same app URL on their device (without ?mode=presenter).
   - Enter the **4-digit code** and click **Join Session**.
   - They will sync to the current slide and stay in sync.

3. **During the session**
   - Use **arrow keys** or on-screen controls to move slides (presenter only).
   - On quiz/exercise slides, viewers can submit answers; results can be shown to the group.

---

## Requirements

- **Browser:** Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge).
- **Network:** Presenter and viewers must be able to reach the PeerJS signaling server (`0.peerjs.com`) and each other (NAT/firewall may affect some networks).
- **HTTPS:** For full PWA install and service worker, use HTTPS. Local development is fine over **http://localhost**.

---

## Tech stack

- **Frontend:** HTML, CSS, JavaScript (vanilla).
- **Real-time:** [PeerJS](https://peerjs.com/) (WebRTC abstraction).
- **Hosting:** Static files only; no app backend. Demo hosted at [peerpresent.rajendrakhope.com](https://peerpresent.rajendrakhope.com).

---

## Project structure

```
peerpresent/
├── index.html   # Slides + UI
├── main.js      # PeerJS logic, sync, quizzes
├── style.css    # Styles
└── README.md    # This file
```

---

## License

See repository or author for license details.
