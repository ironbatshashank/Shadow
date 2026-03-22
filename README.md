# Shadow — Privacy-First AI Assistant

> Built at ARM BioHackathon · Node.js + OpenAI GPT-4o + Whisper

Shadow is a mobile-first, single-page AI assistant with two modes: **RegBot** (regulatory pathway analyser for UK biotech) and **Meeting Shadow** (live meeting transcription and action-item extractor). All processing respects user privacy — API keys stay in the browser, audio is never stored, and only the final scrubbed output is sent to any external service.

---

## Features

### RegBot — Regulatory Pathway Analyser
- Capture a whiteboard/diagram with your device camera or upload an image
- GPT-4o Vision analyses the biological system depicted and maps it to the correct **UK regulatory pathway** (food enzyme, QPS host, GMM, precision breeding, novel food, etc.)
- Returns a structured result: system name, description, step-by-step pathway with timelines, key risks, and regulatory tags
- Covers the full UK framework: EC 1332/2008 (retained), FSA authorisation, QPS status, Precision Bred Organisms Act, Novel Food Regulation 2015/2283
- Demo mode renders a realistic sample (levansucrase packed-bed reactor) with no API key needed

### Meeting Shadow — Live Meeting Transcription
- Records microphone audio and sends 5-second rolling chunks to **OpenAI Whisper** for live transcription
- Displays a live transcript preview in the browser as the meeting progresses
- **Off-the-record mode**: press the button (or say "off the record") to suppress audio capture; suppressed sections are marked `[OFF THE RECORD]` and excluded from the final transcript sent to the AI
- After the meeting, GPT-4o extracts structured action items: task name, assignee, due date, priority (high/medium/low), and suggested platform (Todoist or GitHub Issues)
- Push-to-platform stubs for Todoist and GitHub Issues integration
- Demo mode simulates a realistic Q3 engineering sync with sample transcript and tasks

---

## Architecture

```
Shadow/
├── server.js          # Express proxy server (3 routes)
├── public/
│   └── index.html     # Full single-page app (HTML + CSS + JS)
└── package.json
```

The server acts as a **CORS proxy** so the browser can securely forward API keys to OpenAI/Anthropic without exposing them in cross-origin requests:

| Route | Upstream | Purpose |
|---|---|---|
| `POST /api/chat` | `https://api.openai.com/v1/chat/completions` | GPT-4o for RegBot analysis and meeting task extraction |
| `POST /api/whisper` | `https://api.openai.com/v1/audio/transcriptions` | Whisper live transcription |
| `POST /api/anthropic` | `https://api.anthropic.com/v1/messages` | Anthropic Claude (reserved, not yet used by frontend) |

The frontend is a single self-contained HTML file — no build step, no framework, no bundler.

---

## Privacy Model

| Data | What happens |
|---|---|
| API keys | Typed into the browser; sent only to the local proxy on `localhost:3000`; never stored |
| Camera / images | Captured in-browser; base64-encoded and sent only when you click Analyse |
| Meeting audio | Captured in-browser; streamed to Whisper in 5-second blobs; blobs discarded after transcription |
| Off-the-record audio | Discarded client-side before chunking; never sent anywhere |
| Raw transcript | Stays in the browser; only the scrubbed task list is displayed |

---

## Prerequisites

- **Node.js** v16 or later
- An **OpenAI API key** (`sk-...`) with access to `gpt-4o` and `whisper-1`
- A modern browser (Chrome recommended for `MediaRecorder` + `getUserMedia` support)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Start the proxy server

```bash
node server.js
```

The server starts on `http://localhost:3000`.

### 3. Open the app

Navigate to `http://localhost:3000` in Chrome. The app loads immediately — no login required.

---

## Usage

### RegBot

1. Paste your OpenAI API key into the **OpenAI API Key** field (or leave blank for demo mode).
2. Tap **Camera** to open your device camera, point it at a whiteboard or diagram, and tap **Capture** — or tap the upload zone to pick an image file.
3. Tap **Analyse Regulatory Pathway**.
4. Results render below: system summary, colour-coded regulatory steps with timelines, key risks, and a collapsible raw analysis section.

### Meeting Shadow

1. Switch to the **Meeting** tab.
2. Paste your OpenAI API key (or leave blank for demo mode with a sample Q3 sync transcript).
3. Tap the microphone button to start recording. A live transcript appears as audio is processed.
4. To suppress a sensitive section, tap **Off the record** — audio capture pauses and the section is marked `[OFF THE RECORD]`. Tap **Back on record** to resume.
5. When done, tap **Extract Action Items**. GPT-4o analyses the scrubbed transcript and returns a structured task list.
6. Use the **Push to Todoist** / **Push to GitHub** buttons to export tasks (production integration required — see [Extending](#extending)).

---

## Demo Mode

Both modes work without an API key:

- **RegBot demo**: renders a pre-built levansucrase packed-bed reactor pathway (QPS host, UK Food Enzyme Regulation, FSA submission, 12–18 month timeline).
- **Meeting demo**: replays a sample Q3 engineering sync transcript and extracts 5 pre-built action items.

---

## Extending

### Push to Todoist
Replace the `pushTasks('todoist')` stub in `index.html` with a call to the [Todoist REST API](https://developer.todoist.com/rest/v2/) using the user's Todoist token.

### Push to GitHub Issues
Replace the `pushTasks('github')` stub with calls to the [GitHub Issues API](https://docs.github.com/en/rest/issues) using a personal access token.

### Using Anthropic Claude
The `/api/anthropic` proxy route is wired up on the server. To switch RegBot or Meeting Shadow to Claude, change the `fetch('/api/chat', ...)` calls in `index.html` to `fetch('/api/anthropic', ...)` and update the request body to use the [Anthropic Messages API format](https://docs.anthropic.com/en/api/messages).

### Deploying
The proxy must run server-side (it holds the forwarded API keys in transit). To deploy:
- Host `server.js` on any Node.js platform (Railway, Render, Fly.io, etc.)
- Serve `public/index.html` via `express.static` (already configured)
- Set `PORT` environment variable if needed (defaults to `3000`)

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `express` | ^4.18.0 | HTTP server and static file serving |
| `cors` | ^2.8.5 | CORS headers for local development |
| `node-fetch` | ^2.7.0 | Server-side HTTP requests to AI APIs |
| `multer` | 1.4.4-lts.1 | Multipart audio upload handling for Whisper |
| `form-data` | ^4.0.5 | Rebuilds multipart form for Whisper upstream |

---

## UK Regulatory Context

RegBot has been prompted with the following UK biotech regulatory framework:

- **Self-cloning / QPS host** — essentially immediate, minimal notification
- **Foreign gene in QPS host (food enzyme)** — EC 1332/2008 retained in UK law; FSA submission; 12–18 months
- **Precision Bred Organisms** — Precision Breeding Act 2023; 1–2 years
- **Standard GMM** — full contained use / deliberate release regime; 2–3 years
- **Novel enzyme (non-QPS)** — extensive safety dossier; 3+ years
- **Novel Food** — Regulation 2015/2283 retained; separate track if product ingredient is non-traditional
- **GRAS / food processing aid** — fastest pathway if enzyme is fully inactivated before consumption

---

## License

See [LICENSE](./LICENSE).
