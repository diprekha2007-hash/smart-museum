import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD, PORT = 3001 } = process.env;
let driver;
try {
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) throw new Error('Missing Neo4j environment variables. Copy .env.example to .env and fill it in.');
  driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD));
} catch (e) { console.error('Neo4j configuration:', e.message); }

async function query(cypher, params = {}) {
  if (!driver) throw new Error('Neo4j is not configured. Check backend/.env.');
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => Object.fromEntries(record.keys.map(key => [key, record.get(key) instanceof neo4j.types.Node ? record.get(key).properties : record.get(key)])));
  } finally { await session.close(); }
}
app.get('/api/health', async (_req, res) => {
  try { await query('RETURN 1 AS connected'); res.json({ ok: true, database: 'Neo4j connected' }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.get('/api/stats', async (_req, res) => {
  try {
    const rows = await query('MATCH (n) UNWIND labels(n) AS label RETURN label, count(*) AS total ORDER BY label');
    res.json({ counts: rows.map(r => ({ label: r.label, total: r.total.toNumber ? r.total.toNumber() : r.total })) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/artifacts', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    // Aggregate connected galleries/types so one artifact is returned once,
    // even when the graph links it to more than one gallery or type.
    const rows = await query(`
      MATCH (a:ARTIFACT)
      OPTIONAL MATCH (g:GALLERY)-[:CONTAINS_ARTIFACT]->(a)
      OPTIONAL MATCH (a)-[:CLASSIFIED_AS]->(t:ARTIFACT_TYPE)
      WITH a, collect(DISTINCT g.Gallery_Name) AS galleryNames,
           collect(DISTINCT t.Type_Name) AS typeNames, $search AS search
      WHERE search = ''
         OR toLower(coalesce(a.Title, '')) CONTAINS toLower(search)
         OR toLower(coalesce(a.Origin, '')) CONTAINS toLower(search)
         OR any(typeName IN typeNames WHERE toLower(typeName) CONTAINS toLower(search))
      RETURN a.Artifact_ID AS id,
             a.Title AS title,
             a.Description AS description,
             a.Origin AS origin,
             a.Period AS period,
             a.Current_Status AS status,
             head(galleryNames) AS gallery,
             galleryNames AS galleries,
             head(typeNames) AS type
      ORDER BY title
    `, { search });
    res.json({ artifacts: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/galleries', async (_req, res) => {
  try { res.json({ galleries: await query('MATCH (g:GALLERY) OPTIONAL MATCH (g)-[:CONTAINS_ARTIFACT]->(a:ARTIFACT) RETURN g.Gallery_ID AS id, g.Gallery_Name AS name, g.Floor AS floor, g.Location AS location, g.Capacity AS capacity, g.Description AS description, count(a) AS artifactCount ORDER BY name') }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/exhibitions', async (_req, res) => {
  try { res.json({ exhibitions: await query('MATCH (e:EXHIBITION) OPTIONAL MATCH (e)-[:HAS_EXHIBITION_ARTIFACT]->(:EXHIBITION_ARTIFACT)-[:REFERS_TO_ARTIFACT]->(a:ARTIFACT) RETURN e.Exhibition_ID AS id, e.Exhibition_Name AS name, e.Theme AS theme, e.Start_Date AS startDate, e.End_Date AS endDate, e.Description AS description, e.Venue AS venue, collect(a.Title) AS artifacts ORDER BY startDate') }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/events', async (_req, res) => {
  try { res.json({ events: await query('MATCH (e:EVENT) RETURN e.Event_ID AS id, e.Event_Name AS name, e.Event_Date AS date, e.Start_Time AS startTime, e.End_Time AS endTime, e.Venue AS venue, e.Description AS description, e.Capacity AS capacity ORDER BY date') }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/visitors/:id/journey', async (req, res) => {
  try { res.json({ journey: await query('MATCH (v:VISITOR {Visitor_ID:$id})-[:MADE_VISIT]->(visit:VISIT)-[:VISITED_GALLERY]->(g:GALLERY) OPTIONAL MATCH (g)-[:CONTAINS_ARTIFACT]->(a:ARTIFACT) RETURN v.Name AS visitor, visit.Visit_Date AS date, g.Gallery_Name AS gallery, collect(a.Title) AS artifacts ORDER BY date', { id: req.params.id }) }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.listen(Number(PORT), () => console.log(`SmartMuseum API running at http://localhost:${PORT}`));
process.on('SIGINT', async () => { if (driver) await driver.close(); process.exit(0); });
