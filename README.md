# SmartMuseum - Visitor Analytics System

Express API + vanilla HTML/CSS/JS frontend (Chart.js, D3) on a Neo4j AuraDB graph database.
The backend serves the frontend, so one web service runs everything.

## Features
Dashboard, visitors, galleries, artifacts (dynamic categories), exhibitions, events,
demo ticket counter and bookings, analytics charts, and a D3 graph relationship explorer.
All data comes from Neo4j through the backend API. Bookings are a demo; no real payments.

## Project structure
```text
backend/
  server.js          Express API + static frontend hosting
  seed.cypher        idempotent seed (only runs automatically on an empty database)
  package.json
  .env.example       placeholder configuration
frontend/
  index.html, app.js, styles.css, images/
scripts/download_unsplash_images.py
database.cypher      original schema / sample data
render.yaml          Render blueprint
```

## Run locally
```bash
cd backend
npm install
cp .env.example .env     # then fill in your Aura credentials
npm start                # http://localhost:3001
```

## Environment variables
| Variable | Description |
|---|---|
| `NEO4J_URI` | e.g. `neo4j+s://<id>.databases.neo4j.io` |
| `NEO4J_USERNAME` | Aura username |
| `NEO4J_PASSWORD` | Aura password |
| `NEO4J_DATABASE` | Aura database name (check the Aura console) |
| `PORT` | Set automatically by Render; defaults to 3001 locally |

Real `.env` files are git-ignored. Never commit credentials.

## Deploy on Render
1. Push the repository to GitHub.
2. In Render choose New > Blueprint (uses `render.yaml`) or a Web Service with
   Root Directory `backend`, Build `npm ci`, Start `node server.js`.
3. Add `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` in the dashboard.
4. Verify `https://<your-service>.onrender.com/api/health` returns `"connected": true`.
