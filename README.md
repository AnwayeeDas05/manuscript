# AI-Powered Manuscript Intelligence Platform
## Editorial Consistency & Review System (MVP)

An advanced full-stack platform designed to automate the initial editorial review of fiction manuscripts. Authentic users can upload PDF or DOCX manuscripts, run NLP named entity extractions using spaCy, trigger a multi-agent LangGraph review workflow powered by Google Gemini, and inspect results via a high-fidelity dark-themed Next.js dashboard.

---

## ── System Architecture & Workflow ──────────────────────────────────────────

```
                     ┌──────────────────┐
                     │  Manuscript file │
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │ Document Parser  │ (PyMuPDF & python-docx)
                     └────────┬─────────┘
                              ▼
                     ┌──────────────────┐
                     │ Entity Extractor │ (spaCy PERSON, GPE, DATE, EVENT)
                     └────────┬─────────┘
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │  Multi-Agent LangGraph Editorial Workflow  │ (Powered by Gemini)
        │                                           │
        │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
        │  │Character │  │   Plot   │  │ Timeline │ │ (Parallel agent pipelines)
        │  │  Agent   │  │  Agent   │  │  Agent   │ │
        │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
        │       │             │             │       │
        │       └─────────────┼─────────────┘       │
        │                     ▼                     │
        │             ┌──────────────┐              │
        │             │Dialogue Agent│              │
        │             └──────┬───────┘              │
        │                    ▼                      │
        │             ┌──────────────┐              │
        │             │ Chief Editor │              │ (Synthesises, dedupes,
        │             │    Agent     │              │  and scores report)
        │             └──────┬───────┘              │
        └────────────────────┼──────────────────────┘
                             ▼
                    ┌─────────────────┐
                    │Editorial Report │ (Standardised JSON format)
                    └─────────────────┘
```

---

## ── Technology Stack ────────────────────────────────────────────────────────

* **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS (v4)
* **Backend**: FastAPI, Python 3.11
* **Database**: PostgreSQL (SQLAlchemy ORM with asyncpg), SQLite option for fast local testing (using aiosqlite)
* **NLP**: spaCy (`en_core_web_sm`)
* **AI & Agent Pipeline**: LangGraph, LangChain, Google Gemini API (`gemini-1.5-flash`)
* **Doc Processing**: PyMuPDF (PDF parsing), python-docx (DOCX parsing)
* **Authentication**: JWT tokens, bcrypt password hashing

---

## ── Project Structure ────────────────────────────────────────────────────────

```
manuscript-intel/
├── backend/
│   ├── agents/          # LangGraph agents (state, reviewer nodes, graph builder)
│   ├── api/             # FastAPI routers (auth, manuscripts, reports, dashboard)
│   ├── models/          # SQLAlchemy ORM models (Users, Manuscripts, Reports, etc.)
│   ├── prompts/         # Structured JSON templates for each reviewer agent
│   ├── repositories/    # Database query layer (Repository pattern)
│   ├── schemas/         # Pydantic validation schemas
│   ├── services/        # Logic services (document parser, entity extractor, auth)
│   ├── utils/           # Utilities (logger, security, file storage)
│   ├── config.py        # Pydantic-settings environment loading
│   ├── database.py      # SQLAlchemy async session factory
│   ├── main.py          # App entrypoint
│   └── requirements.txt # Python package requirements
├── frontend/
│   ├── app/             # Next.js pages (dashboard, reports, upload, login, register)
│   ├── components/      # UI components (Layout, Toast notification, AuthContext)
│   ├── lib/             # API client, TypeScript interfaces, and utilities
│   └── public/          # Static assets
├── docker-compose.yml
└── README.md
```

---

## ── Local Development Setup ────────────────────────────────────────────────

### 1. Prerequisites
* **Python**: Version 3.10 or 3.11 installed
* **Node.js**: Version 18 or newer (with npm)
* **Google Gemini API Key**: Get one from Google AI Studio.

---

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install requirements:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Install the spaCy NLP language model:
   ```bash
   python -m spacy download en_core_web_sm
   ```

5. Copy the environment template and set your **Google Gemini API Key**:
   ```bash
   cp .env.example .env
   ```
   *Edit the `.env` file and input your `GOOGLE_API_KEY`.*

6. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The Swagger interactive API docs will be available at `http://localhost:8000/docs`.*

---

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node packages:
   ```bash
   npm install
   ```

3. Copy the environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   *(Ensure `NEXT_PUBLIC_API_URL` is set to `http://localhost:8000/api/v1`)*

4. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   *Open `http://localhost:3000` in your browser.*

---

## ── Running with Docker Compose ─────────────────────────────────────────────

To run the complete production-ready stack (including a PostgreSQL database service) instantly:

1. Configure your environment variable:
   ```bash
   export GOOGLE_API_KEY="your-gemini-api-key-here"
   ```

2. Boot the services:
   ```bash
   docker-compose up --build
   ```

* The frontend will be live at `http://localhost:3000`
* The backend will be live at `http://localhost:8000`
