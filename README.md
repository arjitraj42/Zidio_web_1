# Project LOOP — Customer Feedback Intelligence Platform

> **"LOOP turns scattered customer feedback into a ranked, evidence-backed list of what to do next."**

Project LOOP is an enterprise-grade AI-powered Voice-of-Customer (VoC) platform. It consolidates unstructured customer feedback from multiple channels (Support Tickets, App Store Reviews, NPS Surveys, Sales Notes, Community Posts), automatically classifies sentiment and topic clusters using Anthropic Claude AI, performs vector-similarity RAG Q&A via **Ask LOOP**, and generates executive-ready strategic reports.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: JavaScript (Plain JS)
- **Database & ORM**: PostgreSQL & Prisma ORM (with pgvector support)
- **Authentication**: NextAuth.js (Auth.js) with JWT session strategy & RBAC (`ADMIN`, `ANALYST`, `VIEWER`)
- **AI & Grounded RAG**: Anthropic Claude API (`claude-sonnet-4-6`) & OpenAI `text-embedding-3-small` (1536-dim vector embeddings)
- **Styling**: Tailwind CSS & Lucide Icons
- **Data Visualization**: Recharts (Volume trends & sentiment distribution)
- **Validation**: Zod schema validation

---

## 🏗️ Architecture Summary

Project LOOP follows a clean 3-tier multi-tenant architecture with strict workspace isolation:

```
[ Web Browser / Client UI ] 
          │  (React Server & Client Components)
          ▼
[ Next.js 14 App Router API Routes ] 
    ├── Middleware (JWT Authentication & RBAC Enforcement)
    ├── Tenant Context & Workspace Isolation (`workspaceId`)
    └── Zod Request Validation
          │
          ├──► [ Prisma ORM ] ──► [ PostgreSQL Database ] (Feedback, Themes, Embeddings, Reports)
          │
          ├──► [ Anthropic Claude API ] (Sentiment & Theme Classification, Grounded Q&A, Reports)
          │
          └──► [ Embeddings Engine ] ──► [ pgvector / Cosine Similarity Search ]
```

---

## ✨ Key Features

### Core Management & Workspace Security
- **Multi-Tenant Isolation**: Strict workspace boundary enforcement across all database queries (`workspaceId`).
- **Role-Based Access Control (RBAC)**:
  - **`ADMIN`**: Full administrative rights (Manage workspace members, generate reports, delete feedback, merge duplicate themes).
  - **`ANALYST`**: Full read-write operational rights (Ingest feedback, trigger classification, run Ask LOOP, generate reports).
  - **`VIEWER`**: Read-only executive visibility (Browse inbox, view dashboard stats, inspect trends, ask questions, read saved reports).

### Feedback Ingestion & Filtering
- **Multi-Channel Ingestion**: Single-item form entry, CSV bulk file upload with field mapping, and simulated sandbox channel feeds.
- **Paginated & Filtered Inbox**: Real-time search, status management (`NEW`, `REVIEWED`, `ACTIONED`), channel filters, and sentiment badges.

### AI Intelligence & Executive Reporting
- **Automated AI Classification**: Calls Claude AI on ingest to extract sentiment scores (`POS`, `NEU`, `NEG`), assign themes, and generate high-confidence topic tags.
- **Theme Trends & Spike Detection**: Aggregates topic volume over time and automatically flags spiking customer themes (`>= 50%` period-over-period growth).
- **Ask LOOP Grounded RAG Q&A**: Semantic vector search retrieves top matching customer feedback context, allowing Claude AI to answer questions with verifiable quotes and direct citations while preventing hallucinations.
- **Voice-of-Customer Executive Reports**: One-click report synthesis combining pre-computed database stats with Claude executive narratives, top themes analysis, verbatim quotes, and recommended strategic actions. Exportable to PDF/Shareable views.

---

## 🔑 Demo Credentials

A pre-populated demo workspace (**Acme AI Intelligence Workspace**) is provided with 120+ seeded feedback items, topic clusters, and vector embeddings.

| Role | Email | Password | Allowed Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@acme.com` | `DemoAdmin123!` | Full admin privileges (Manage members, generate reports, merge themes, delete items) |
| **ANALYST** | `analyst@acme.com` | `DemoAnalyst123!` | Operational access (Ingest feedback, trigger classification, Ask LOOP, generate reports) |
| **VIEWER** | `viewer@acme.com` | `DemoViewer123!` | Read-only access (View dashboard, browse inbox, view trends, read saved reports) |

---

## 🚀 Local Setup & Installation

### Prerequisites
- Node.js (v18.x or v20.x)
- PostgreSQL database (with `pgvector` extension enabled, or standard Postgres)

### Step 1: Clone Repository & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/arjitraj42/Zidio_web_1.git
cd Zidio_web_1

# Install frontend dependencies
cd frontend
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the `frontend` directory:
```env
# Database Connections
DATABASE_URL="postgresql://user:password@localhost:5432/zidio_loop?schema=public"

# NextAuth Authentication
NEXTAUTH_SECRET="your-super-secret-nextauth-key-32-chars"
NEXTAUTH_URL="http://localhost:3000"

# AI Integrations
ANTHROPIC_API_KEY="sk-ant-api03-your-anthropic-api-key"
OPENAI_API_KEY="sk-proj-your-openai-api-key" # Optional (for embeddings)
```

### Step 3: Run Database Migrations & Seed Script
```bash
# Generate Prisma Client
npx prisma generate --schema=../backend/prisma/schema.prisma

# Run database migrations
npx prisma migrate dev --name init --schema=../backend/prisma/schema.prisma

# Seed 120+ feedback items, demo users, themes, and vector embeddings
node ../backend/prisma/seed.js
```

### Step 4: Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser and log in using one of the demo credentials above.

---

## 🌐 Live Deployment URL

- **Vercel Production App**: `https://zidio-web-1.vercel.app` (Placeholder / Update with your Vercel URL)

---

## 📸 Screenshots & Visual Walkthrough

> *(Include high-resolution screenshots when submitting your demo package)*

1. **Executive Dashboard (`/dashboard`)**: Volume over time charts, sentiment distribution, top themes ranking, and `% AI Classified` metric pill.
2. **Filtered Feedback Inbox (`/inbox`)**: Real-time text search, sentiment pills, status management, and channel icons.
3. **Theme Trends & Spike Alerts (`/themes`)**: Daily theme volume lines and automated AI spike detection banner.
4. **Ask LOOP Grounded Q&A (`/ask`)**: Conversational chat interface with verifiable source quote cards and channel badges.
5. **Executive VoC Report & Export View (`/reports`)**: Structured executive summary, sentiment shift analysis, verbatim quote blocks, and PDF export preview.

---

## 📌 Simulated Channels Note

Per Section 06 & 19 of the project specification, real third-party API integrations (e.g. live Slack bots, Zendesk Webhooks, App Store scrapers) are out of scope. Project LOOP implements a simulated sandbox feed (`/api/feedback/simulate-channel`) that generates realistic multi-channel customer payloads for testing automated AI classification and ingestion pipelines.
