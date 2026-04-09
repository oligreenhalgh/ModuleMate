<div align="center">
  <img src="Module_mate_logo.png" alt="ModuleMate" width="220" />

  <h1>ModuleMate</h1>

  <p><strong>A conversational AI advisor that generates personalised degree pathways from natural language prompts.</strong></p>

  <p>
    <em>Winner — Best Student Focused Project, Google AI Agentic Hackathon 2026</em>
  </p>
</div>

---

## About

ModuleMate is a full-stack web app that helps undergraduates plan their degree. Students chat with an AI advisor in plain English ("I want to specialise in machine learning but keep my options open for a fintech placement") and ModuleMate responds with a semester-by-semester roadmap drawn from real university modules, respecting prerequisite chains, credit requirements and scheduling conflicts.

It was built for the **Google AI Agentic Hackathon 2026** and won **Best Student Focused Project** against teams of undergraduates through to PhD researchers. The system was pitched and defended live to a panel including a lead Google Cloud engineer.

## Features

- **Conversational advisor** — chat-first interface for degree planning, powered by Gemini 2.5 Flash with function calling
- **AI roadmap generation** — produces personalised 4-year pathways constrained to real modules from the database
- **Prerequisite graph** — interactive dependency graph with pan/zoom, per-module unlocks, and live prerequisite status (completed / available / locked)
- **Degree explorer** — browse majors, preview AI-generated pathways, and drop modules into a planner
- **Module comparison** — side-by-side comparison with AI-generated recommendations on which module to pick
- **Schedule view** — semester-grouped planner with live conflict detection
- **Transcripts** — upload transcripts to hydrate your completed-modules list
- **Settings** — manage your API key and reset user state

## Architecture

ModuleMate is structured as an agentic system rather than a single-prompt chatbot. The frontend sends natural-language intents to the backend, which orchestrates tool calls against a structured module graph and returns grounded responses.

```
┌──────────────┐    /api    ┌─────────────────┐   tool calls    ┌──────────────┐
│ React + Vite │ ─────────▶│ Express (TS)    │ ───────────────▶│ Gemini 2.5   │
│  (frontend)  │           │  - routes       │                 │   Flash      │
└──────────────┘           │  - services     │◀───────────────│ (function    │
                           │  - SQLite graph │   structured    │  calling)    │
                           └─────────────────┘   JSON          └──────────────┘
                                   │
                                   ▼
                           ┌─────────────────┐
                           │ SQLite (WAL)    │
                           │ modules, majors,│
                           │ prereqs, users, │
                           │ schedule, chats │
                           └─────────────────┘
```

**Agentic design choices**

- **Gemini 2.5 Flash function calling** drives the conversation loop. The advisor has access to tools for module lookup, prerequisite traversal, conflict checking and roadmap generation, and decides which to call based on the student's prompt.
- **Grounded retrieval** — the model is constrained to only emit real module codes/names from the database; invented modules are rejected at the service layer.
- **Prerequisite graph traversal** happens deterministically in `server/src/services/prerequisites.ts` (computing `completed / available / locked` state) so the LLM never has to reason about the graph itself.
- **Conflict detection** for schedules lives in `server/src/services/conflicts.ts`, again keeping scheduling logic out of the model.
- **Containerised full stack** — single Docker image runs the frontend (nginx), Express API and SQLite, configured via `docker-compose.yml`.

> The hackathon submission used Vertex AI Search for semantic module retrieval and BigQuery for prerequisite graph traversal. This open-source reference implementation swaps those managed services for SQLite so the project is easy to run locally without a GCP account — the agentic structure is identical.

## Tech stack

**Frontend**
- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- React Router, Recharts, Lucide, Sonner, Motion

**Backend**
- Node.js + Express + TypeScript
- `better-sqlite3` (WAL-mode SQLite) for the module/prereq/schedule graph
- `@google/genai` (Gemini 2.5 Flash) for the agent
- `express-session` for single-user sessions, `multer` for transcript uploads
- Vitest + Supertest for API tests

**Infrastructure**
- Multi-stage Dockerfile (frontend build → backend build → nginx + node runtime)
- `docker-compose.yml` for one-command local deploys
- nginx reverse-proxies `/api` to the Express server

## Project structure

```
ModuleMate/
├── src/                      # React frontend
│   ├── views/                # HomeView, ExplorerView, GraphView, ScheduleView, …
│   ├── components/           # Sidebar, TopBar
│   ├── services/api.ts       # Typed API client
│   └── constants.ts
├── server/                   # Express backend
│   ├── src/
│   │   ├── index.ts          # App entry, middleware, route mounting
│   │   ├── db.ts             # SQLite schema + connection
│   │   ├── seed.ts           # Initial module/major data
│   │   ├── routes/           # modules, majors, schedule, chat, user, transcripts, settings
│   │   └── services/
│   │       ├── gemini.ts     # Gemini wrapper: chat, roadmap, comparison
│   │       ├── prerequisites.ts
│   │       └── conflicts.ts
│   └── tests/                # Vitest + Supertest suites
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── vite.config.ts
```

## Getting started

### Prerequisites
- Node.js 20+
- A Gemini API key

### 1. Clone and install

```bash
git clone https://github.com/oligreenhalgh/ModuleMate.git
cd ModuleMate
npm install
cd server && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
# open .env and set GEMINI_API_KEY
```

### 3. Seed the database

```bash
cd server
npm run seed
cd ..
```

### 4. Run in dev

In two terminals:

```bash
# terminal 1 — backend API on :3001
cd server && npm run dev

# terminal 2 — frontend on :3000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run the test suite

```bash
cd server
npm test
```

## Running with Docker

A single `docker-compose` command builds and runs the full stack:

```bash
cp .env.example .env
# set GEMINI_API_KEY in .env

docker compose up --build
```

The app is served at [http://localhost:8080](http://localhost:8080). SQLite data and uploads are persisted to named volumes (`modulemate-data`, `modulemate-uploads`).

## API overview

| Method | Path                          | Purpose                              |
| ------ | ----------------------------- | ------------------------------------ |
| GET    | `/api/health`                 | Health check                          |
| GET    | `/api/modules`                | List modules with prerequisite status |
| GET    | `/api/modules/:code`          | Single module                         |
| GET    | `/api/majors`                 | List majors                           |
| GET    | `/api/majors/:id/path`        | AI-generated degree pathway           |
| POST   | `/api/chat`                   | Chat with the agent                   |
| GET    | `/api/schedule`               | User's schedule                       |
| POST   | `/api/schedule`               | Add module(s) to schedule             |
| GET    | `/api/schedule/conflicts`     | Detect scheduling conflicts           |
| POST   | `/api/transcripts`            | Upload a transcript                   |
| GET    | `/api/user/profile`           | User profile + stats                  |

## License

MIT — see [LICENSE](LICENSE).
