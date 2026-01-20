Feedback Analyzer — Cloudflare Workers + Workers AI + D1
A serverless feedback intelligence system that ingests customer feedback, analyzes it using Workers AI, stores structured results in D1, and provides both an interactive UI and a dashboard for reviewing insights.

Live Prototype:  
https://feedback-analyzer-divya.feedback-analyzer-divya.workers.dev/

GitHub Repository:  
https://github.com/Divya-Makanaboina/cloudflare-feedback-ai

Overview
Product teams receive feedback from many scattered sources — support tickets, Discord, GitHub issues, email, and more. This prototype consolidates that feedback into a single pipeline that:

Accepts raw feedback

Analyzes it using AI

Stores structured results

Displays insights in a clean dashboard

The goal is to help PMs quickly understand themes, sentiment, and urgency across large volumes of feedback.

Architecture
This system uses three Cloudflare Developer Platform products:

1. Cloudflare Workers
Handles routing, AI calls, database operations, and UI rendering.
Chosen for its global performance, low latency, and seamless integration with other Cloudflare services.

2. Workers AI
Runs Llama‑3 models to generate structured JSON containing:

Summary

Sentiment

Urgency

Chosen for its serverless inference, low latency, and zero external dependencies.

3. D1 Database
Stores:

Raw feedback

AI‑generated summary

Sentiment

Urgency

Timestamp

Chosen for its SQL interface, serverless design, and tight Worker integration.

System Flow
Code
User → Analyze UI (/) → POST /analyze → Workers AI → D1 → Dashboard (/dashboard)
Endpoints
POST /ingest
Stores raw feedback text in D1.

GET /summary
Aggregates recent feedback and generates a high‑level summary using Workers AI.

POST /analyze
Analyzes a single piece of feedback and stores:

text

summary

sentiment

urgency

created_at

GET /list
Returns all stored feedback entries.

GET /dashboard
Displays all feedback in a structured HTML table.

GET /
Interactive UI for analyzing individual feedback items.

How to Run Locally
1. Start the Worker
Code
npx wrangler dev
2. Create the local D1 schema
Create schema.sql:

sql
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT,
  summary TEXT,
  sentiment TEXT,
  urgency TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
Apply it locally:
Code
npx wrangler d1 execute feedback_db --file=schema.sql

3. Verify the table
Code
npx wrangler d1 execute feedback_db --command "SELECT name FROM sqlite_master;"

4. Test the UI
Analyze UI: http://localhost:8787/

Dashboard: http://localhost:8787/dashboard

Deployment
Deploy the Worker:
Code
npx wrangler deploy

Friction Log (Cloudflare Product Insights)
1. D1 Database Binding & Account Mismatch
Problem: Incorrect account IDs and bindings caused D1 connection failures.
Suggestion: Add automated binding validation and a “Fix Binding” button in the dashboard.

2. Route Execution Blocked by Missing Braces
Problem: Missing braces in /analyze prevented /summary from executing.
Suggestion: Wrangler lint rule to detect unreachable routes.

3. UI Block Placed Outside Worker
Problem: HTML UI placed outside fetch() caused Worker crashes.
Suggestion: Warning when code appears outside the exported handler.

4. Local vs Remote Mode Confusion
Problem: Workers AI unavailable in local mode; required --remote.
Suggestion: Terminal message explaining when AI bindings are unavailable.

5. PowerShell Breaking curl Commands
Problem: PowerShell aliases curl to Invoke-WebRequest, breaking flags.
Suggestion: Add Windows‑specific testing guidance in docs.

6. Worker Restarting Mid‑Request
Problem: Remote preview restarts caused mid‑request failures.
Suggestion: Add a “Worker restarting…” indicator.

7. /summary Route Not Triggering
Problem: Earlier returns prevented route execution.
Suggestion: Debug mode showing route evaluation order.

8. Unclear Testing Workflow
Problem: Needed clarity on how to test each endpoint.
Suggestion: Provide a “Testing Your Worker” section with examples.

9. HTML UI Not Rendering
Problem: UI placed outside Worker caused crashes.
Suggestion: Warning when HTML appears outside handler.

10. AI Model Binding Differences
Problem: Different models required different input formats.
Suggestion: Add a comparison table in Workers AI docs.

Vibe‑Coding Context
Used Claude Code and Microsoft Copilot to accelerate development.
Prompts included:

“Generate a Cloudflare Worker that analyzes text using Workers AI and stores results in D1.”

“Fix JSON parsing errors from Workers AI and enforce strict JSON output.”

“Create a dashboard UI that fetches data from a /list endpoint.”

These tools significantly reduced development time and improved debugging efficiency.

Project Structure
Code
feedback-analyzer-divya/
│
├── src/
│   └── index.ts
├── schema.sql
├── wrangler.toml
├── README.md
└── package.json
Summary
This project demonstrates an end‑to‑end feedback analysis pipeline using Cloudflare’s developer platform. It showcases:

AI‑powered text analysis

Serverless data storage

Real‑time UI rendering

Clean routing and API design

The system is deployed, functional, and ready for review.
