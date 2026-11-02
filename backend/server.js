import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend assets if accessed directly
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

const {
  NEO4J_URI,
  NEO4J_USERNAME,
  NEO4J_PASSWORD,
  NEO4J_DATABASE,
  PORT = 3001
} = process.env;

let driver = null;
let connectionStatus = { connected: false, message: 'Not connected' };

function initDriver() {
  if (
    !NEO4J_URI ||
    !NEO4J_USERNAME ||
    !NEO4J_PASSWORD ||
    NEO4J_URI.includes('your-instance') ||
    NEO4J_URI.includes('xxxxxxxx')
  ) {
    connectionStatus = {
      connected: false,
      message: 'Neo4j environment variables are not configured with active credentials. Please update backend/.env'
    };
    return null;
  }

  try {
    driver = neo4j.driver(
      NEO4J_URI,
      neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
      { disableLosslessIntegers: true }
    );
    console.log(`[Neo4j]: Driver initialized for ${NEO4J_URI}`);
    return driver;
  } catch (err) {
    connectionStatus = { connected: false, message: err.message };
    console.error('[Neo4j Driver Error]:', err.message);
    return null;
  }
}

initDriver();

function unwrapValue(val) {
  if (val === null || val === undefined) return val;
  if (val instanceof neo4j.types.Node) {
    return { id: val.identity?.toNumber ? val.identity.toNumber() : val.identity, ...val.properties };
  }
  if (val instanceof neo4j.types.Relationship) {
    return { id: val.identity?.toNumber ? val.identity.toNumber() : val.identity, ...val.properties };
  }
  if (val && typeof val === 'object' && val.toNumber) {
    return val.toNumber();
  }
  if (Array.isArray(val)) {
    return val.map(unwrapValue);
  }
  if (typeof val === 'object') {
    const res = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = unwrapValue(v);
    }
    return res;
  }
  return val;
}

async function query(cypher, params = {}) {
  if (!driver) {
    initDriver();
    if (!driver) {
      throw new Error(connectionStatus.message || 'Neo4j driver is not configured.');
    }
  }

  const sessionConfig = NEO4J_DATABASE ? { database: NEO4J_DATABASE } : {};
  const session = driver.session(sessionConfig);
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      const row = {};
      record.keys.forEach(k => {
        row[k] = unwrapValue(record.get(k));
      });
      return row;
    });
  } finally {
    await session.close();
  }
}

async function autoSeedIfEmpty() {
  if (!driver) return;
  try {
    const check = await query('MATCH (n) RETURN count(n) AS cnt LIMIT 1');
    const count = check[0]?.cnt || 0;
    if (count === 0) {
      console.log('[Neo4j]: Database is empty. Seeding graph schema...');
      const seedFile = path.join(__dirname, 'seed.cypher');
      if (fs.existsSync(seedFile)) {
        const raw = fs.readFileSync(seedFile, 'utf8');
        const statements = raw
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('//'));

        for (const stmt of statements) {
          try {
            await query(stmt);
          } catch (err) {
            console.warn('[Seed warning]:', err.message);
          }
        }
        console.log('[Neo4j]: Database seeded successfully!');
      }
    }
  } catch (err) {
    console.error('[AutoSeed Check Error]:', err.message);
  }
}

setTimeout(autoSeedIfEmpty, 1200);

// API Health Check
app.get('/api/health', async (_req, res) => {
  if (!driver) {
    return res.status(200).json({
      ok: false,
      connected: false,
      database: 'Not connected (Neo4j credentials required in backend/.env)',
      details: connectionStatus.message
    });
  }
  try {
    await query('RETURN 1 AS connected');
    connectionStatus = { connected: true, message: 'Neo4j Aura connected' };
    res.json({
      ok: true,
      connected: true,
      database: 'Neo4j connected',
      uri: NEO4J_URI?.replace(/:[^:@]+@/, ':***@')
    });
  } catch (err) {
    connectionStatus = { connected: false, message: err.message };
    res.status(500).json({
      ok: false,
      connected: false,
      database: 'Neo4j connection error',
      error: err.message
    });
  }
});

// Seed endpoint
app.post('/api/seed', async (_req, res) => {
  try {
    const seedFile = path.join(__dirname, 'seed.cypher');
    if (!fs.existsSync(seedFile)) return res.status(404).json({ error: 'seed.cypher not found' });
    const raw = fs.readFileSync(seedFile, 'utf8');
    const statements = raw.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('//'));
    for (const stmt of statements) {
      await query(stmt);
    }
    res.json({ success: true, message: 'Database successfully seeded.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. Dashboard Stats
app.get('/api/stats', async (_req, res) => {
  try {
    const counts = await query(`
      RETURN
        1 AS placeholder,
        count { MATCH (n) WHERE n:Visitor OR n:VISITOR } AS totalVisitors,
        count { MATCH (n) WHERE n:Artifact OR n:ARTIFACT } AS totalArtifacts,
        count { MATCH (n) WHERE n:Gallery OR n:GALLERY } AS totalGalleries,
        count { MATCH (n) WHERE n:Exhibition OR n:EXHIBITION } AS totalExhibitions,
        count { MATCH (n) WHERE n:Event OR n:EVENT } AS totalEvents,
        count { MATCH ()-[r:REGISTERED_FOR]->() } AS totalRegistrations,
        count { MATCH (n) WHERE n:Visit OR n:VISIT } AS totalVisits
    `).catch(async () => {
      const v = await query('MATCH (n) WHERE n:Visitor OR n:VISITOR RETURN count(n) AS cnt');
      const a = await query('MATCH (n) WHERE n:Artifact OR n:ARTIFACT RETURN count(n) AS cnt');
      const g = await query('MATCH (n) WHERE n:Gallery OR n:GALLERY RETURN count(n) AS cnt');
      const e = await query('MATCH (n) WHERE n:Exhibition OR n:EXHIBITION RETURN count(n) AS cnt');
      const ev = await query('MATCH (n) WHERE n:Event OR n:EVENT RETURN count(n) AS cnt');
      const reg = await query('MATCH ()-[r:REGISTERED_FOR]->() RETURN count(r) AS cnt');
      const vis = await query('MATCH (n) WHERE n:Visit OR n:VISIT RETURN count(n) AS cnt');
      return [{
        totalVisitors: v[0]?.cnt || 0,
        totalArtifacts: a[0]?.cnt || 0,
        totalGalleries: g[0]?.cnt || 0,
        totalExhibitions: e[0]?.cnt || 0,
        totalEvents: ev[0]?.cnt || 0,
        totalRegistrations: reg[0]?.cnt || 0,
        totalVisits: vis[0]?.cnt || 0
      }];
    });

    const popularGalleries = await query(`
      MATCH (g)
      WHERE g:Gallery OR g:GALLERY
      OPTIONAL MATCH (v)-[:VISITED|INCLUDED|VISITED_GALLERY]->(g)
      WITH g, count(DISTINCT v) AS visitCount
      RETURN coalesce(g.Gallery_ID, toString(id(g))) AS id, g.Gallery_Name AS name, visitCount
      ORDER BY visitCount DESC, name ASC
      LIMIT 6
    `);

    const popularExhibitions = await query(`
      MATCH (ex)
      WHERE ex:Exhibition OR ex:EXHIBITION
      OPTIONAL MATCH (ex)-[:FEATURES|FEATURES_ARTIFACT|HAS_EXHIBITION_ARTIFACT*1..2]-(a)
      WHERE a:Artifact OR a:ARTIFACT
      RETURN coalesce(ex.Exhibition_ID, toString(id(ex))) AS id, ex.Exhibition_Name AS name, count(DISTINCT a) AS artifactCount
      ORDER BY artifactCount DESC, name ASC
      LIMIT 6
    `);

    res.json({
      summary: counts[0] || {},
      popularGalleries,
      popularExhibitions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Visitors Management (Accommodates direct Neo4j entries)
app.get('/api/visitors', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const rows = await query(`
      MATCH (v)
      WHERE v:Visitor OR v:VISITOR
      OPTIONAL MATCH (v)-[:MADE|MADE_VISIT]->(vis)
      OPTIONAL MATCH (vis)-[:INCLUDED|VISITED_GALLERY]->(g)
      OPTIONAL MATCH (v)-[:VISITED]->(directG)
      OPTIONAL MATCH (v)-[:PREFERENCE_OF|HAS_PREFERENCE]-(pref)
      OPTIONAL MATCH (v)-[:REGISTERED_FOR]->(ev)
      OPTIONAL MATCH (v)-[:PROVIDED]->(fb)
      WITH v,
           count(DISTINCT vis) + count(DISTINCT directG) AS visitCount,
           collect(DISTINCT coalesce(g.Gallery_Name, directG.Gallery_Name)) AS visitedGalleries,
           collect(DISTINCT pref.Preference_Value) AS preferences,
           collect(DISTINCT ev.Event_Name) AS registeredEvents,
           collect(DISTINCT fb.Comment) AS feedbackList,
           $search AS search
      WHERE search = ''
         OR toLower(coalesce(v.Name, '')) CONTAINS toLower(search)
         OR toLower(coalesce(v.Visitor_ID, '')) CONTAINS toLower(search)
         OR toLower(coalesce(v.Email, '')) CONTAINS toLower(search)
         OR toLower(coalesce(v.Visitor_Type, '')) CONTAINS toLower(search)
      RETURN coalesce(v.Visitor_ID, 'V' + toString(id(v))) AS id,
             v.Name AS name,
             v.Email AS email,
             v.Phone AS phone,
             v.Gender AS gender,
             v.Visitor_Type AS visitorType,
             v.Registration_Date AS registrationDate,
             visitCount,
             visitedGalleries,
             preferences,
             registeredEvents,
             feedbackList
      ORDER BY name ASC
    `, { search });
    res.json({ visitors: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single visitor profile & journey details
app.get('/api/visitors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await query(`
      MATCH (v)
      WHERE (v:Visitor OR v:VISITOR) AND (v.Visitor_ID = $id OR toString(id(v)) = $id)
      OPTIONAL MATCH (v)-[:HAS_RFID_CARD]->(c)
      OPTIONAL MATCH (v)-[:PURCHASED]->(t)
      OPTIONAL MATCH (v)-[:PREFERENCE_OF|HAS_PREFERENCE]-(p)
      OPTIONAL MATCH (v)-[:REGISTERED_FOR]->(ev)
      OPTIONAL MATCH (v)-[:PROVIDED]->(fb)
      RETURN coalesce(v.Visitor_ID, toString(id(v))) AS id,
             v.Name AS name,
             v.Email AS email,
             v.Phone AS phone,
             v.Gender AS gender,
             v.Visitor_Type AS visitorType,
             v.Registration_Date AS registrationDate,
             c.Card_ID AS rfidCard,
             t.Ticket_Type AS ticketType,
             t.Price AS ticketPrice,
             collect(DISTINCT p.Preference_Value) AS preferences,
             collect(DISTINCT { id: ev.Event_ID, name: ev.Event_Name, date: ev.Event_Date }) AS events,
             collect(DISTINCT { rating: fb.Rating, comment: fb.Comment, date: fb.Date }) AS feedback
    `, { id });

    if (!profile.length) return res.status(404).json({ error: 'Visitor not found' });

    const journey = await query(`
      MATCH (v)
      WHERE (v:Visitor OR v:VISITOR) AND (v.Visitor_ID = $id OR toString(id(v)) = $id)
      OPTIONAL MATCH (v)-[:MADE|MADE_VISIT]->(visit)
      OPTIONAL MATCH (visit)-[:INCLUDED|VISITED_GALLERY]->(g)
      OPTIONAL MATCH (g)-[:CONTAINS|CONTAINS_ARTIFACT]->(a)
      RETURN coalesce(visit.Visit_ID, 'VIS-LOG') AS visitId,
             coalesce(visit.Visit_Date, 'Recent') AS date,
             visit.Entry_Time AS entryTime,
             visit.Exit_Time AS exitTime,
             coalesce(g.Gallery_Name, 'Main Gallery') AS gallery,
             collect(DISTINCT a.Title) AS artifacts
      ORDER BY date DESC
    `, { id });

    res.json({
      profile: profile[0],
      journey
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create visitor
app.post('/api/visitors', async (req, res) => {
  try {
    const { name, email, phone, gender, visitorType = 'General' } = req.body;
    if (!name) return res.status(400).json({ error: 'Visitor name is required' });

    const countRes = await query('MATCH (v) WHERE v:Visitor OR v:VISITOR RETURN count(v) AS cnt');
    const nextNum = (countRes[0]?.cnt || 0) + 1;
    const newId = req.body.id || `V${String(nextNum).padStart(3, '0')}`;
    const today = new Date().toISOString().slice(0, 10);

    const created = await query(`
      MERGE (v:Visitor:VISITOR {Visitor_ID: $newId})
      SET v.Name = $name,
          v.Email = $email,
          v.Phone = $phone,
          v.Gender = $gender,
          v.Visitor_Type = $visitorType,
          v.Registration_Date = $today
      RETURN v.Visitor_ID AS id, v.Name AS name, v.Email AS email
    `, { newId, name, email: email || '', phone: phone || '', gender: gender || 'Other', visitorType, today });

    res.status(201).json({ success: true, visitor: created[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Artifacts Management
app.get('/api/artifacts', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();

    const rows = await query(`
      MATCH (a)
      WHERE a:Artifact OR a:ARTIFACT
      OPTIONAL MATCH (g)-[:CONTAINS|CONTAINS_ARTIFACT]->(a)
      OPTIONAL MATCH (a)-[:CLASSIFIED_AS]->(t)
      WITH a,
           collect(DISTINCT g.Gallery_Name) AS galleryNames,
           collect(DISTINCT coalesce(t.Type_Name, a.Category)) AS typeNames,
           $search AS search,
           $category AS category
      WHERE (
        search = ''
        OR toLower(coalesce(a.Title, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Origin, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Period, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Historical_Information, '')) CONTAINS toLower(search)
        OR any(tn IN typeNames WHERE toLower(tn) CONTAINS toLower(search))
      )
      AND (
        category = ''
        OR category = 'All'
        OR toLower(coalesce(a.Category, '')) = toLower(category)
        OR any(tn IN typeNames WHERE toLower(tn) = toLower(category))
      )
      RETURN coalesce(a.Artifact_ID, toString(id(a))) AS id,
             a.Title AS title,
             coalesce(a.Category, head(typeNames), 'Historical Artifacts') AS category,
             a.Description AS description,
             a.Historical_Information AS historicalDetails,
             a.Origin AS origin,
             a.Period AS period,
             a.Current_Status AS status,
             a.Acquisition_Date AS acquisitionDate,
             head(galleryNames) AS gallery,
             galleryNames AS galleries
      ORDER BY title ASC
    `, { search, category });

    res.json({ artifacts: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Galleries Management
app.get('/api/galleries', async (_req, res) => {
  try {
    const rows = await query(`
      MATCH (g)
      WHERE g:Gallery OR g:GALLERY
      OPTIONAL MATCH (g)-[:CONTAINS|CONTAINS_ARTIFACT]->(a)
      OPTIONAL MATCH (vis)-[:VISITED|INCLUDED|VISITED_GALLERY]->(g)
      WITH g,
           collect(DISTINCT { id: a.Artifact_ID, title: a.Title, category: a.Category }) AS artifactsList,
           count(DISTINCT a) AS artifactCount,
           count(DISTINCT vis) AS visitorActivityCount
      RETURN coalesce(g.Gallery_ID, toString(id(g))) AS id,
             g.Gallery_Name AS name,
             g.Floor AS floor,
             g.Location AS location,
             g.Capacity AS capacity,
             g.Description AS description,
             artifactCount,
             artifactsList AS artifacts,
             visitorActivityCount
      ORDER BY name ASC
    `);
    res.json({ galleries: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Exhibitions Management
app.get('/api/exhibitions', async (_req, res) => {
  try {
    const rows = await query(`
      MATCH (e)
      WHERE e:Exhibition OR e:EXHIBITION
      OPTIONAL MATCH (e)-[:FEATURES|FEATURES_ARTIFACT|HAS_EXHIBITION_ARTIFACT*1..2]-(a)
      WITH e, collect(DISTINCT { id: a.Artifact_ID, title: a.Title, category: a.Category }) AS artifactDetails
      RETURN coalesce(e.Exhibition_ID, toString(id(e))) AS id,
             e.Exhibition_Name AS name,
             e.Theme AS theme,
             e.Start_Date AS startDate,
             e.End_Date AS endDate,
             e.Description AS description,
             e.Venue AS venue,
             size(artifactDetails) AS artifactCount,
             artifactDetails AS artifacts
      ORDER BY startDate DESC
    `);
    res.json({ exhibitions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Events Management
app.get('/api/events', async (_req, res) => {
  try {
    const rows = await query(`
      MATCH (e)
      WHERE e:Event OR e:EVENT
      OPTIONAL MATCH (v)-[:REGISTERED_FOR]->(e)
      WITH e,
           count(DISTINCT v) AS registrationCount,
           collect(DISTINCT { id: v.Visitor_ID, name: v.Name, email: v.Email }) AS attendees
      RETURN coalesce(e.Event_ID, toString(id(e))) AS id,
             e.Event_Name AS name,
             e.Event_Date AS date,
             e.Start_Time AS startTime,
             e.End_Time AS endTime,
             e.Venue AS venue,
             e.Description AS description,
             e.Capacity AS capacity,
             registrationCount,
             attendees
      ORDER BY date ASC
    `);
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Analytics Data
app.get('/api/analytics', async (_req, res) => {
  try {
    const visitorTrends = await query(`
      MATCH (v)
      WHERE (v:Visit OR v:VISIT) AND v.Visit_Date IS NOT NULL
      RETURN v.Visit_Date AS date, count(v) AS visits
      ORDER BY date ASC
    `);

    const galleryVisits = await query(`
      MATCH (g)
      WHERE g:Gallery OR g:GALLERY
      OPTIONAL MATCH (v)-[:VISITED|INCLUDED|VISITED_GALLERY]->(g)
      RETURN g.Gallery_Name AS gallery, count(v) AS count
      ORDER BY count DESC
      LIMIT 8
    `);

    const preferences = await query(`
      MATCH (p)
      WHERE p:Preference OR p:VISITOR_PREFERENCE
      RETURN p.Preference_Value AS preference, count(p) AS count
      ORDER BY count DESC
    `);

    const artifactCategories = await query(`
      MATCH (a)
      WHERE a:Artifact OR a:ARTIFACT
      OPTIONAL MATCH (a)-[:CLASSIFIED_AS]->(t)
      WITH coalesce(a.Category, t.Type_Name, 'Historical Artifacts') AS cat
      RETURN cat AS category, count(*) AS count
      ORDER BY count DESC
    `);

    res.json({
      visitorTrends,
      galleryVisits,
      preferences,
      artifactCategories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Graph Explorer
app.get('/api/graph', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '140', 10);
    const graphData = await query(`
      MATCH (a)-[r]->(b)
      WHERE any(l IN labels(a) WHERE toUpper(l) IN ['VISITOR', 'VISIT', 'GALLERY', 'ARTIFACT', 'EXHIBITION', 'EVENT', 'FEEDBACK', 'STAFF', 'CONSERVATION'])
        AND any(l IN labels(b) WHERE toUpper(l) IN ['VISITOR', 'VISIT', 'GALLERY', 'ARTIFACT', 'EXHIBITION', 'EVENT', 'FEEDBACK', 'STAFF', 'CONSERVATION'])
      RETURN DISTINCT
        id(a) AS sourceId,
        labels(a)[0] AS sourceLabel,
        coalesce(a.Name, a.Title, a.Gallery_Name, a.Exhibition_Name, a.Event_Name, a.Visit_ID, 'Node') AS sourceName,
        coalesce(a.Visitor_ID, a.Artifact_ID, a.Gallery_ID, a.Exhibition_ID, a.Event_ID, a.Visit_ID, toString(id(a))) AS sourceCode,
        type(r) AS relType,
        id(b) AS targetId,
        labels(b)[0] AS targetLabel,
        coalesce(b.Name, b.Title, b.Gallery_Name, b.Exhibition_Name, b.Event_Name, b.Visit_ID, 'Node') AS targetName,
        coalesce(b.Visitor_ID, b.Artifact_ID, b.Gallery_ID, b.Exhibition_ID, b.Event_ID, b.Visit_ID, toString(id(b))) AS targetCode
      LIMIT $limit
    `, { limit });

    const nodesMap = new Map();
    const links = [];

    for (const row of graphData) {
      if (!nodesMap.has(row.sourceId)) {
        nodesMap.set(row.sourceId, {
          id: String(row.sourceId),
          code: row.sourceCode,
          label: row.sourceName,
          type: String(row.sourceLabel).toUpperCase()
        });
      }
      if (!nodesMap.has(row.targetId)) {
        nodesMap.set(row.targetId, {
          id: String(row.targetId),
          code: row.targetCode,
          label: row.targetName,
          type: String(row.targetLabel).toUpperCase()
        });
      }
      links.push({
        source: String(row.sourceId),
        target: String(row.targetId),
        type: row.relType
      });
    }

    res.json({
      nodes: Array.from(nodesMap.values()),
      links
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(Number(PORT), () => {
  console.log(`=========================================`);
  console.log(` SmartMuseum API & Frontend live on port ${PORT}`);
  console.log(` Neo4j Status: ${driver ? 'Configured' : 'Awaiting credentials'}`);
  console.log(`=========================================`);
});

process.on('SIGINT', async () => {
  if (driver) await driver.close();
  process.exit(0);
});
