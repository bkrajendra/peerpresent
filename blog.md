# Building an Interactive Workshop Tool (No Backend Required)

I had to run a 40-minute hands-on Git session for my team-one of those Friday fun-learning things. The problem was simple: I didn't want it to feel like a typical one-way presentation. You know the drill-someone shares their screen, talks for an hour, and everyone zones out. I wanted something different.


GitHub Repository: https://github.com/bkrajendra/peerpresent.git


## The Real Requirements

A few things were clear from the start:

1. **Web-based**:
   - No PowerPoint, no PDF. Something people could open in a browser.
2. **No screen sharing**:
   - When I show a long command or a step they need to try, they shouldn't have to squint at my shared screen and type it manually. Everyone should see it on their own laptop.
3. **Interactive**:
   - Not just watch-and-listen. I wanted people to actually do things and get feedback.

So the idea was: one person controls the slides (the presenter), and everyone else sees the same slide on their own screen, in sync. When I click Next, their view updates. No screen share. No copying from a tiny Zoom window.

## The Journey: WebSockets, Then WebRTC

I started by looking at WebSockets. The idea was straightforward: a server keeps connections open, the presenter sends "go to slide 5," and the server broadcasts that to all connected clients. But that meant running a backend. A Node server, or something similar. For a Saturday workshop, that felt like overkill. I'd need to deploy it somewhere, or ask people to run it locally. Friction.

Then I looked at WebRTC. Peer-to-peer connections between browsers. No server in the middle for the actual data-just a way for peers to find each other and exchange connection details (the "signaling" step). That got me thinking: what if the only server we need is a minimal signaling service, and everything else happens directly between browsers?

I found **[PeerJS](https://peerjs.com/)**. It's a thin wrapper around WebRTC that handles the messy parts. You get a simple API: create a peer with an ID, connect to another peer by ID, send data. Under the hood, it uses a free cloud signaling server (or you can host your own) just to introduce peers. Once they're connected, data flows directly between them. No backend of your own. No database. Just static HTML, CSS, and JavaScript.

## How It Works (In Plain Terms)

1. **Presenter**:
   - opens the page with `?mode=presenter`, clicks "Start as Presenter." The app creates a "room" with a 4-digit code (e.g. 3847).
2. **Participants**:
   - open the same page, enter the code, click "Join Session."
3. PeerJS does the handshake:
   - it uses its signaling server to help the presenter and each participant find each other. After that, slide changes are sent directly from the presenter's browser to each participant's browser over WebRTC data channels.
4. Everything runs on the LAN:
   - No cloud backend. No auth. Just a room code and a direct connection.

The whole thing is a few hundred lines of JavaScript. No server to maintain. You can host it on any static file server-GitHub Pages, S3, or on laptop with a simple `python -m http.server`-and it works.

## From Idea to Tool

What began as "let me try something for this one workshop" turned into a real tool. I kept adding features because they were useful, not because they were planned.

**Flashcard-style slides** - Each section, scenario, or exercise is its own slide. Clean, minimal, one thing at a time. No clutter.

**Presenter vs. audience** - Only the presenter sees Next/Back. Everyone else just follows. The presenter bar shows the room code and how many people are connected.

**Interactive quizzes** - Each exercise slide has multiple-choice questions. Participants submit answers from their own screens. The presenter stores results (in localStorage, keyed by a persistent client ID) and at the end we show a leaderboard. We even added a small speed bonus-earlier submissions get a few extra points. It made the session feel like a light competition, and people actually engaged.

**No backend** - The presenter's browser is the "server" for that session. It receives quiz answers over the same WebRTC connections, aggregates them, and shows the leaderboard. When the tab closes, that session's data is gone-which is fine for a one-off workshop.

## What I'd Do Next

- **Self-hosted signaling** - PeerJS's free cloud server works, but for a controlled environment, running your own PeerJS server would be more reliable.
- **Quiz improvements** - More question types, partial credit, maybe a "reveal answers" mode.
- **Persistence** - Optionally save session data (e.g. to a simple backend or export) for follow-up or analytics.
- **Mobile tweaks** - The UI works on phones, but touch and layout could be refined.
- **No grades** - I dont liked the idea of haivng a leader board with marks at the end although I added it at the beginging. Instead I would prefer having just group the participents into inspiring Classes instead of grades, such as:
  - Git Confused
Review fundamentals
  - Git Going
Solid foundation
  - Git Good
Team-ready
  - Git Wizard
Teach others!
- **A generic Tool** - Convert this into a genric presentation tool.

## The Vibe Coding Part

About 95% of this was vibe coded. I didn't start with a formal spec. I had a rough idea, tried WebSockets, hit the "need a backend" wall, switched to WebRTC, found PeerJS, and iterated. The tech choices-PeerJS, static files, localStorage for quiz results, the message protocol for slides and quiz answers-came from experimenting and solving one problem at a time. No architecture doc. No design review. Just "this would be useful" and "let me try that."

That's the part I'm most happy about. A simple Saturday activity turned into something I can reuse, and the path there was messy and exploratory, not planned and polished.

## Takeaway

If you have a small, concrete problem-a boring presentation, a manual process, something that wastes a few minutes every week-it's worth trying to fix it. You don't need a big project or a perfect plan. Start with the smallest version that could work, see what breaks, and improve from there. The best tools often come from solving your own annoyances, one step at a time.
