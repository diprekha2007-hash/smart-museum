import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend assets
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
      message: 'Neo4j environment variables are not configured. Please update backend/.env'
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

// ===================== API HEALTH CHECK =====================
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

// ===================== SEED ENDPOINT =====================
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

// ===================== 1. DASHBOARD STATS =====================
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
        count { MATCH (n) WHERE n:Visit OR n:VISIT } AS totalVisits,
        count { MATCH (n) WHERE n:Booking } AS totalBookings
    `).catch(async () => {
      const v = await query('MATCH (n) WHERE n:Visitor OR n:VISITOR RETURN count(n) AS cnt');
      const a = await query('MATCH (n) WHERE n:Artifact OR n:ARTIFACT RETURN count(n) AS cnt');
      const g = await query('MATCH (n) WHERE n:Gallery OR n:GALLERY RETURN count(n) AS cnt');
      const e = await query('MATCH (n) WHERE n:Exhibition OR n:EXHIBITION RETURN count(n) AS cnt');
      const ev = await query('MATCH (n) WHERE n:Event OR n:EVENT RETURN count(n) AS cnt');
      const reg = await query('MATCH ()-[r:REGISTERED_FOR]->() RETURN count(r) AS cnt');
      const vis = await query('MATCH (n) WHERE n:Visit OR n:VISIT RETURN count(n) AS cnt');
      const bk = await query('MATCH (n:Booking) RETURN count(n) AS cnt');
      return [{
        totalVisitors: v[0]?.cnt || 0,
        totalArtifacts: a[0]?.cnt || 0,
        totalGalleries: g[0]?.cnt || 0,
        totalExhibitions: e[0]?.cnt || 0,
        totalEvents: ev[0]?.cnt || 0,
        totalRegistrations: reg[0]?.cnt || 0,
        totalVisits: vis[0]?.cnt || 0,
        totalBookings: bk[0]?.cnt || 0
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

// ===================== 2. VISITORS =====================
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

    res.json({ profile: profile[0], journey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// ===================== 3. ARTIFACTS =====================
// GET distinct categories from actual DB classifications
app.get('/api/artifact-categories', async (_req, res) => {
  try {
    const rows = await query(`
      MATCH (a)-[:CLASSIFIED_AS]->(t)
      WHERE (a:Artifact OR a:ARTIFACT)
        AND (t:ARTIFACT_TYPE OR t:ArtifactType OR t:Type)
        AND t.Type_Name IS NOT NULL
        AND trim(t.Type_Name) <> ''
      RETURN DISTINCT trim(t.Type_Name) AS category
      ORDER BY category ASC
    `);
    const categories = rows.map(r => r.category).filter(Boolean);
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message, categories: [] });
  }
});

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
           collect(DISTINCT trim(coalesce(t.Type_Name, ''))) AS rawTypes,
           $search AS search,
           $category AS category
      WITH a, galleryNames,
           [tn IN rawTypes WHERE tn <> ''] AS typeNames,
           search, category
      WITH a, galleryNames, typeNames,
           coalesce(head(typeNames), a.Category, 'Historical Artifact') AS primaryCategory,
           search, category
      WHERE (
        search = ''
        OR toLower(coalesce(a.Title, a.name, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Origin, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Period, a.period, '')) CONTAINS toLower(search)
        OR toLower(coalesce(a.Historical_Information, a.Description, '')) CONTAINS toLower(search)
        OR any(tn IN typeNames WHERE toLower(tn) CONTAINS toLower(search))
      )
      AND (
        category = ''
        OR category = 'All'
        OR any(tn IN typeNames WHERE toLower(tn) = toLower(category))
        OR toLower(coalesce(a.Category, '')) = toLower(category)
      )
      RETURN coalesce(a.Artifact_ID, a.artifactId, toString(id(a))) AS id,
             coalesce(a.Title, a.name, 'Unnamed Artifact') AS title,
             primaryCategory AS category,
             typeNames AS allCategories,
             coalesce(a.Description, a.Historical_Information, '') AS description,
             a.Historical_Information AS historicalDetails,
             coalesce(a.Origin, '') AS origin,
             coalesce(a.Period, a.period, '') AS period,
             coalesce(a.Current_Status, 'On Display') AS status,
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

// ===================== 4. GALLERIES =====================
app.get('/api/galleries', async (_req, res) => {
  try {
    const rows = await query(`
      MATCH (g)
      WHERE g:Gallery OR g:GALLERY
      OPTIONAL MATCH (g)-[:CONTAINS|CONTAINS_ARTIFACT]->(a)
      OPTIONAL MATCH (vis)-[:VISITED|INCLUDED|VISITED_GALLERY]->(g)
      WITH g,
           collect(DISTINCT { id: coalesce(a.Artifact_ID,''), title: coalesce(a.Title,a.name,''), category: coalesce(a.Category,'') }) AS artifactsList,
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

// ===================== 5. EXHIBITIONS =====================
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
             coalesce(e.Capacity, 100) AS capacity,
             size(artifactDetails) AS artifactCount,
             artifactDetails AS artifacts
      ORDER BY startDate DESC
    `);
    res.json({ exhibitions: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== 6. EVENTS =====================
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
             coalesce(e.Capacity, 50) AS capacity,
             registrationCount,
             attendees
      ORDER BY date ASC
    `);
    res.json({ events: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== 7. ANALYTICS =====================
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

    // Use actual CLASSIFIED_AS relationships for correct category counts
    const artifactCategories = await query(`
      MATCH (a)-[:CLASSIFIED_AS]->(t)
      WHERE (a:Artifact OR a:ARTIFACT)
        AND (t:ARTIFACT_TYPE OR t:ArtifactType OR t:Type)
        AND t.Type_Name IS NOT NULL
      RETURN trim(t.Type_Name) AS category, count(DISTINCT a) AS count
      ORDER BY count DESC
    `);

    // Booking stats
    const bookingStats = await query(`
      MATCH (b:Booking)
      RETURN b.Item_Type AS itemType, count(b) AS count, sum(b.Total_Amount) AS revenue
      ORDER BY count DESC
    `).catch(() => []);

    res.json({
      visitorTrends,
      galleryVisits,
      preferences,
      artifactCategories,
      bookingStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== 8. GRAPH EXPLORER =====================
app.get('/api/graph', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '140', 10);
    const filter = String(req.query.filter || '').toUpperCase();

    const allowedTypes = ['VISITOR', 'VISIT', 'GALLERY', 'ARTIFACT', 'EXHIBITION', 'EVENT', 'FEEDBACK', 'STAFF', 'CONSERVATION'];
    // Types the user explicitly selected (empty = "All Nodes" view)
    const selectedTypes = filter && filter !== 'ALL'
      ? filter.split(',').map(f => f.trim()).filter(f => allowedTypes.includes(f))
      : [];
    const filtered = selectedTypes.length > 0;
    const filterTypes = allowedTypes; // neighbours may be of any supported museum type

    // All Nodes: both endpoints must be supported types.
    // Filtered: at least ONE endpoint must be a selected type; the other end is its neighbour.
    const graphData = await query(`
      MATCH (a)-[r]->(b)
      WHERE (
          NOT $filtered
          AND any(l IN labels(a) WHERE toUpper(l) IN $filterTypes)
          AND any(l IN labels(b) WHERE toUpper(l) IN $filterTypes)
        )
        OR (
          $filtered
          AND (
            any(l IN labels(a) WHERE toUpper(l) IN $selectedTypes)
            OR any(l IN labels(b) WHERE toUpper(l) IN $selectedTypes)
          )
        )
      RETURN DISTINCT
        id(a) AS sourceId,
        labels(a)[0] AS sourceLabel,
        coalesce(a.Name, a.Title, a.Gallery_Name, a.Exhibition_Name, a.Event_Name, a.name, a.Visit_ID, labels(a)[0]) AS sourceName,
        coalesce(a.Visitor_ID, a.Artifact_ID, a.Gallery_ID, a.Exhibition_ID, a.Event_ID, a.Visit_ID, a.artifactId, toString(id(a))) AS sourceCode,
        type(r) AS relType,
        id(b) AS targetId,
        labels(b)[0] AS targetLabel,
        coalesce(b.Name, b.Title, b.Gallery_Name, b.Exhibition_Name, b.Event_Name, b.name, b.Visit_ID, labels(b)[0]) AS targetName,
        coalesce(b.Visitor_ID, b.Artifact_ID, b.Gallery_ID, b.Exhibition_ID, b.Event_ID, b.Visit_ID, b.artifactId, toString(id(b))) AS targetCode
      LIMIT $limit
    `, {
      filterTypes,
      selectedTypes,
      filtered,
      limit: neo4j.int(Number.isFinite(limit) ? limit : 140)
    });

    const nodesMap = new Map();
    const links = [];

    // In filtered mode, also include selected-type nodes that have no relationships
    if (filtered) {
      const selectedNodes = await query(`
        MATCH (n)
        WHERE any(l IN labels(n) WHERE toUpper(l) IN $selectedTypes)
        RETURN id(n) AS nodeId,
               labels(n)[0] AS nodeLabel,
               coalesce(n.Name, n.Title, n.Gallery_Name, n.Exhibition_Name, n.Event_Name, n.name, n.Visit_ID, 'Node') AS nodeName,
               coalesce(n.Visitor_ID, n.Artifact_ID, n.Gallery_ID, n.Exhibition_ID, n.Event_ID, n.Visit_ID, n.artifactId, toString(id(n))) AS nodeCode
        LIMIT $limit
      `, { selectedTypes, limit: neo4j.int(Number.isFinite(limit) ? limit : 140) });
      for (const row of selectedNodes) {
        nodesMap.set(String(row.nodeId), {
          id: String(row.nodeId),
          code: row.nodeCode,
          label: row.nodeName || String(row.nodeId),
          type: String(row.nodeLabel || 'NODE').toUpperCase()
        });
      }
    }

    for (const row of graphData) {
      const sId = String(row.sourceId);
      const tId = String(row.targetId);

      if (!nodesMap.has(sId)) {
        nodesMap.set(sId, {
          id: sId,
          code: row.sourceCode,
          label: row.sourceName || sId,
          type: String(row.sourceLabel || 'NODE').toUpperCase()
        });
      }
      if (!nodesMap.has(tId)) {
        nodesMap.set(tId, {
          id: tId,
          code: row.targetCode,
          label: row.targetName || tId,
          type: String(row.targetLabel || 'NODE').toUpperCase()
        });
      }
      links.push({
        source: sId,
        target: tId,
        type: row.relType
      });
    }

    // Flag nodes belonging to the selected type(s) so the UI can highlight them.
    // A dual-labelled node (e.g. Visitor:VISITOR) is matched via its uppercased primary label.
    const nodes = Array.from(nodesMap.values()).map(n => ({
      ...n,
      selected: filtered && selectedTypes.includes(n.type)
    }));

    res.json({
      nodes,
      links,
      filter: filtered ? selectedTypes : 'ALL',
      totalNodes: nodes.length,
      totalLinks: links.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== 9. TICKET BOOKING SYSTEM =====================

// Pricing configuration
const TICKET_PRICES = {
  EVENT: { Standard: 200, VIP: 500, Student: 100, Child: 75 },
  EXHIBITION: { Adult: 150, Student: 75, Child: 50, Family: 350 },
  GALLERY: { 'Access Pass': 100, Student: 60, Child: 40 },
  ARTIFACT: { 'Viewing Pass': 50, Student: 30, Guided: 120 }
};

// GET ticket types (pricing info) for a given item type
app.get('/api/ticket-types', async (req, res) => {
  try {
    const itemType = String(req.query.itemType || 'EVENT').toUpperCase();
    const prices = TICKET_PRICES[itemType] || TICKET_PRICES.EVENT;
    const ticketTypes = Object.entries(prices).map(([type, price]) => ({ type, price }));
    res.json({ ticketTypes, currency: 'INR' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || '').trim();
    const itemType = String(req.query.itemType || '').trim().toUpperCase();

    const rows = await query(`
      MATCH (b:Booking)
      WHERE ($search = '' OR
             toLower(coalesce(b.Visitor_Name, '')) CONTAINS toLower($search) OR
             toLower(coalesce(b.Booking_ID, '')) CONTAINS toLower($search) OR
             toLower(coalesce(b.Item_Name, '')) CONTAINS toLower($search) OR
             toLower(coalesce(b.Visitor_Email, '')) CONTAINS toLower($search))
        AND ($status = '' OR b.Status = $status)
        AND ($itemType = '' OR b.Item_Type = $itemType)
      RETURN b.Booking_ID AS bookingId,
             b.Visitor_Name AS visitorName,
             b.Visitor_Email AS visitorEmail,
             b.Item_ID AS itemId,
             b.Item_Type AS itemType,
             b.Item_Name AS itemName,
             b.Ticket_Type AS ticketType,
             b.Quantity AS quantity,
             b.Unit_Price AS unitPrice,
             b.Total_Amount AS totalAmount,
             b.Booking_Date AS bookingDate,
             b.Status AS status
      ORDER BY b.Booking_Date DESC
      LIMIT 200
    `, { search, status, itemType });

    // Summary stats
    const stats = await query(`
      MATCH (b:Booking)
      RETURN count(b) AS total,
             sum(b.Total_Amount) AS totalRevenue,
             count(CASE WHEN b.Status = 'CONFIRMED' THEN 1 END) AS confirmed,
             count(CASE WHEN b.Status = 'CANCELLED' THEN 1 END) AS cancelled
    `).catch(() => [{ total: 0, totalRevenue: 0, confirmed: 0, cancelled: 0 }]);

    res.json({ bookings: rows, stats: stats[0] || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single booking
app.get('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const rows = await query(`
      MATCH (b:Booking {Booking_ID: $bookingId})
      RETURN b.Booking_ID AS bookingId,
             b.Visitor_Name AS visitorName,
             b.Visitor_Email AS visitorEmail,
             b.Item_ID AS itemId,
             b.Item_Type AS itemType,
             b.Item_Name AS itemName,
             b.Ticket_Type AS ticketType,
             b.Quantity AS quantity,
             b.Unit_Price AS unitPrice,
             b.Total_Amount AS totalAmount,
             b.Booking_Date AS bookingDate,
             b.Status AS status
    `, { bookingId });

    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json({ booking: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create booking
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      visitorName,
      visitorEmail,
      itemId,
      itemType,
      itemName,
      ticketType,
      quantity = 1
    } = req.body;

    if (!visitorName || !visitorName.trim()) return res.status(400).json({ error: 'Visitor name is required' });
    if (!itemId) return res.status(400).json({ error: 'Item ID is required' });
    if (!itemType) return res.status(400).json({ error: 'Item type is required' });
    if (!ticketType) return res.status(400).json({ error: 'Ticket type is required' });

    const qty = Math.max(1, Math.min(10, parseInt(quantity, 10) || 1));
    const upperType = String(itemType).toUpperCase();
    const prices = TICKET_PRICES[upperType] || TICKET_PRICES.EVENT;
    const unitPrice = prices[ticketType];
    if (!unitPrice) return res.status(400).json({ error: `Invalid ticket type "${ticketType}" for ${upperType}` });

    // Capacity check for events
    if (upperType === 'EVENT') {
      const capCheck = await query(`
        MATCH (e)
        WHERE (e:Event OR e:EVENT) AND (e.Event_ID = $itemId OR toString(id(e)) = $itemId)
        OPTIONAL MATCH (b:Booking {Item_ID: $itemId, Status: 'CONFIRMED'})
        WITH coalesce(e.Capacity, 50) AS cap,
             sum(coalesce(b.Quantity, 0)) AS booked
        RETURN (cap - booked) AS remaining
      `, { itemId });
      const remaining = capCheck[0]?.remaining ?? 50;
      if (remaining < qty) {
        return res.status(409).json({ error: `Only ${remaining} seats remaining for this event` });
      }
    }

    const bookingId = `BK-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const totalAmount = unitPrice * qty;
    const bookingDate = new Date().toISOString();

    await query(`
      CREATE (b:Booking {
        Booking_ID: $bookingId,
        Visitor_Name: $visitorName,
        Visitor_Email: $visitorEmail,
        Item_ID: $itemId,
        Item_Type: $upperType,
        Item_Name: $itemName,
        Ticket_Type: $ticketType,
        Quantity: $qty,
        Unit_Price: $unitPrice,
        Total_Amount: $totalAmount,
        Booking_Date: $bookingDate,
        Status: 'CONFIRMED'
      })
    `, {
      bookingId,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail || '',
      itemId,
      upperType,
      itemName: itemName || '',
      ticketType,
      qty,
      unitPrice,
      totalAmount,
      bookingDate
    });

    res.status(201).json({
      success: true,
      booking: {
        bookingId,
        visitorName: visitorName.trim(),
        visitorEmail: visitorEmail || '',
        itemId,
        itemType: upperType,
        itemName: itemName || '',
        ticketType,
        quantity: qty,
        unitPrice,
        totalAmount,
        bookingDate,
        status: 'CONFIRMED'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (cancel) booking
app.delete('/api/bookings/:bookingId', async (req, res) => {
  try {
    const { bookingId } = req.params;
    const check = await query(`
      MATCH (b:Booking {Booking_ID: $bookingId})
      RETURN b.Status AS status
    `, { bookingId });

    if (!check.length) return res.status(404).json({ error: 'Booking not found' });
    if (check[0].status === 'CANCELLED') return res.status(400).json({ error: 'Booking is already cancelled' });

    await query(`
      MATCH (b:Booking {Booking_ID: $bookingId})
      SET b.Status = 'CANCELLED'
    `, { bookingId });

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== FALLBACK =====================
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` SmartMuseum API & Frontend live on port ${PORT}`);
  console.log(` Neo4j Status: ${driver ? 'Configured' : 'Awaiting credentials'}`);
  console.log(`=========================================`);
});

process.on('SIGINT', async () => {
  if (driver) await driver.close();
  process.exit(0);
});
