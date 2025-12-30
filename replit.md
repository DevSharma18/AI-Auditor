# AI Auditor Dashboard

A comprehensive monitoring and auditing platform for AI models. The application tracks PII leaks, model drift, bias detection, hallucinations, and compliance across multiple AI systems.

## Overview

AI Auditor provides enterprise-grade tools for:
- **Dashboard**: Main overview with metrics cards and trend charts for PII, Drift, Bias, and Hallucination monitoring
- **Model Manager**: Manage custom AI models with full CRUD operations and view 32 pre-configured system models
- **Audits**: Both Model Auditing (active testing) and Log Auditing (passive analysis) with configurable categories
- **Analytics Pages**: Detailed views for Drift, Bias, Hallucination, PII, and Compliance monitoring
- **Settings**: Configure notifications, audit thresholds, and model integrations

## Project Architecture

### Frontend (`client/`)
- **Framework**: React with TypeScript
- **Routing**: wouter
- **State Management**: TanStack Query for server state
- **UI Components**: Shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS with dark/light theme support
- **Charts**: Recharts (PieChart, BarChart with time range selection)

### Node.js Proxy (`server/`)
- **Framework**: Express.js
- **Function**: Proxies `/api` requests to Python backend on port 8000
- **Features**: Spawns Python backend as child process with auto-restart

### Python Backend (`backend/`)
- **Framework**: FastAPI with uvicorn
- **Database**: SQLite with SQLAlchemy ORM
- **Scheduler**: APScheduler for automated audits (hourly checks, daily/weekly/monthly execution)
- **Audit Engine**: Real audit logic with passive (baseline comparison) and active (security rules) audits
- **API Endpoints**:
  - `GET/POST /api/models` - AI model management
  - `GET/PATCH/DELETE /api/models/:id` - Single model operations
  - `GET /api/audits` - Audit history with filtering
  - `POST /api/audits/trigger/:model_id` - Manual audit trigger
  - `GET /api/findings` - Audit findings with severity filtering
  - `GET /api/dashboard/overview` - Dashboard metrics summary

### Database Models
- **AIModel**: AI model definitions with connection type and audit frequency
- **EvidenceSource**: Data sources for each model
- **AuditPolicy**: Audit thresholds and configuration
- **AuditRun**: Individual audit execution records
- **AuditSummary**: Aggregated audit results per model
- **AuditFinding**: Specific issues found during audits

## Key Files

- `client/src/App.tsx` - Main app with routing and layout
- `client/src/components/app-sidebar.tsx` - Collapsible navigation sidebar
- `client/src/components/theme-provider.tsx` - Dark/light theme support
- `client/src/pages/dashboard.tsx` - Main metrics dashboard
- `client/src/pages/model-manager.tsx` - Custom and system model management
- `client/src/pages/audits.tsx` - Model and log auditing interface
- `client/src/pages/settings.tsx` - Notifications, thresholds, integrations
- `client/src/pages/analytics/*.tsx` - Drift, Bias, Hallucination, PII, Compliance pages
- `server/routes.ts` - API endpoints
- `server/storage.ts` - In-memory storage implementation
- `backend/main.py` - FastAPI application entry point
- `backend/models.py` - SQLAlchemy ORM models
- `backend/routes.py` - Python API endpoints
- `backend/audit_engine.py` - Passive and active audit logic
- `backend/scheduler.py` - APScheduler configuration
- `backend/seed_data.py` - Initial seed data for models

## Design System

- **Typography**: Inter font family
- **Theme**: Material Design with Linear influences
- **Colors**: Professional color scheme with semantic tokens
- **Components**: Shadcn/ui components with custom elevation utilities

## User Preferences

- Dark mode support via theme toggle in header
- Collapsible sidebar with nested Dashboard navigation
- Time range toggles (1M, 6M, 1Y) on trend charts

## Running the Project

The application runs on port 5000 using `npm run dev` which starts both the Express backend and Vite frontend.
