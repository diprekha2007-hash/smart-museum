'use strict';

// SmartMuseum Complete Full-Stack Frontend Controller
// Connects to Node.js backend which interfaces with Neo4j AuraDB

// Dynamic API URL: Automatically points to same origin in production (Render) or localhost:3001 in local dev
const API = window.location.origin.includes(':3001') || window.location.origin.includes('onrender.com') || window.location.pathname.startsWith('/api')
  ? `${window.location.origin}/api`
  : (window.location.port === '3000' || window.location.port === '5500' || window.location.protocol === 'file:')
    ? 'http://localhost:3001/api'
    : '/api';
const $ = (id) => document.getElementById(id);

// Stable local image reference manifest
const IMAGE_MANIFEST = {
  artifacts: {
    A001: 'images/artifacts/artifact_A001.jpg',
    A002: 'images/artifacts/artifact_A002.jpg',
    A003: 'images/artifacts/artifact_A003.jpg',
    A004: 'images/artifacts/artifact_A004.jpg',
    A005: 'images/artifacts/artifact_A005.jpg',
    A006: 'images/artifacts/artifact_A006.jpg',
    A007: 'images/artifacts/artifact_A007.jpg',
    A008: 'images/artifacts/artifact_A008.jpg',
    A009: 'images/artifacts/artifact_A009.jpg',
    A010: 'images/artifacts/artifact_A010.jpg',
    A011: 'images/artifacts/artifact_A011.jpg',
    A012: 'images/artifacts/artifact_A012.jpg'
  },
  galleries: {
    G001: 'images/galleries/gallery_G001.jpg',
    G002: 'images/galleries/gallery_G002.jpg',
    G003: 'images/galleries/gallery_G003.jpg',
    G004: 'images/galleries/gallery_G004.jpg',
    G005: 'images/galleries/gallery_G005.jpg',
    G006: 'images/galleries/gallery_G006.jpg',
    G007: 'images/galleries/gallery_G007.jpg',
    G008: 'images/galleries/gallery_G008.jpg',
    G009: 'images/galleries/gallery_G009.jpg',
    G010: 'images/galleries/gallery_G010.jpg'
  },
  exhibitions: {
    EX001: 'images/exhibitions/exhibition_EX001.jpg',
    EX002: 'images/exhibitions/exhibition_EX002.jpg',
    EX003: 'images/exhibitions/exhibition_EX003.jpg',
    EX004: 'images/exhibitions/exhibition_EX004.jpg',
    EX005: 'images/exhibitions/exhibition_EX005.jpg',
    EX006: 'images/exhibitions/exhibition_EX006.jpg'
  },
  events: {
    EV001: 'images/events/event_EV001.jpg',
    EV002: 'images/events/event_EV002.jpg',
    EV003: 'images/events/event_EV003.jpg',
    EV004: 'images/events/event_EV004.jpg',
    EV005: 'images/events/event_EV005.jpg',
    EV006: 'images/events/event_EV006.jpg',
    EV007: 'images/events/event_EV007.jpg',
    EV008: 'images/events/event_EV008.jpg'
  }
};

const state = {
  activePage: 'overview',
  stats: null,
  visitors: [],
  artifacts: [],
  galleries: [],
  exhibitions: [],
  events: [],
  analytics: null,
  graphData: null,
  selectedCategory: 'All',
  searchQuery: '',
  charts: {}
};

// Utilities
function safe(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function showToast(msg, duration = 3000) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

function getRecordId(item, defaultPrefix = '') {
  return String(item?.id || item?.Artifact_ID || item?.Gallery_ID || item?.Exhibition_ID || item?.Event_ID || item?.Visitor_ID || defaultPrefix);
}

function getImageUrl(item, category) {
  const custom = item?.imageUrl || item?.Image_URL || item?.photoUrl;
  if (custom && typeof custom === 'string' && custom.length > 5) return custom;
  const id = getRecordId(item);
  return IMAGE_MANIFEST[category]?.[id] || '';
}

function buildImageTag(item, category, title) {
  const src = getImageUrl(item, category);
  const safeTitle = safe(title || 'Item');
  if (!src) {
    return `<div class="image-fallback"><span>${safeTitle}</span><small>SmartMuseum Collection</small></div>`;
  }
  return `
    <img class="record-image" src="${safe(src)}" alt="${safeTitle}"
         loading="lazy"
         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
    <div class="image-fallback" style="display: none;"><span>${safeTitle}</span><small>Photograph Offline</small></div>
  `;
}

// ================= API FETCHERS =================
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    return null;
  }
}

// 1. Connection Health Check
async function checkHealth() {
  const data = await apiGet('/health');
  const label = $('connection-label');
  const topStatus = $('top-status-indicator');
  const sidebarStatus = $('sidebar-db-status');
  const sidebarDot = $('sidebar-dot');
  const banner = $('connection-banner');

  if (data && data.ok) {
    label.textContent = 'Neo4j Aura Connected';
    topStatus.className = 'top-status is-connected';
    sidebarStatus.textContent = 'Connected & Active';
    sidebarDot.className = 'dot connected';
    banner.classList.add('hidden');
  } else {
    label.textContent = 'Neo4j Disconnected';
    topStatus.className = 'top-status is-error';
    sidebarStatus.textContent = 'Missing/Pending .env';
    sidebarDot.className = 'dot error';
    banner.classList.remove('hidden');
  }
}

// 2. Load Dashboard Overview
async function loadOverview() {
  const data = await apiGet('/stats');
  if (!data) return;
  state.stats = data;

  const s = data.summary || {};
  $('stat-visitors').textContent = s.totalVisitors ?? '—';
  $('stat-artifacts').textContent = s.totalArtifacts ?? '—';
  $('stat-galleries').textContent = s.totalGalleries ?? '—';
  $('stat-exhibitions').textContent = s.totalExhibitions ?? '—';
  $('stat-events').textContent = s.totalEvents ?? '—';
  $('stat-registrations').textContent = s.totalRegistrations ?? '—';

  // Render Dashboard Mini Charts
  renderDashboardCharts(data.popularGalleries || [], data.popularExhibitions || []);

  // Featured Artifacts (Top 3)
  const artifactsData = await apiGet('/artifacts');
  if (artifactsData && artifactsData.artifacts) {
    state.artifacts = artifactsData.artifacts;
    const featured = artifactsData.artifacts.slice(0, 3);
    const container = $('featured-artifacts');
    if (featured.length === 0) {
      container.innerHTML = `<div class="empty-state">No artifacts catalogued in Neo4j yet.</div>`;
    } else {
      container.innerHTML = featured.map(a => `
        <article class="record-card">
          <div class="record-media">${buildImageTag(a, 'artifacts', a.title)}</div>
          <div class="card-content">
            <span class="tag category">${safe(a.category || a.type || 'Artifact')}</span>
            <h3>${safe(a.title)}</h3>
            <p>${safe(a.description || 'Museum specimen of cultural significance.')}</p>
            <div class="metadata-row">
              <span class="metadata-pill">📍 ${safe(a.gallery || 'Main Wing')}</span>
              <span class="metadata-pill">⏳ ${safe(a.period || 'Historical')}</span>
            </div>
          </div>
        </article>
      `).join('');
    }
  }
}

// 3. Render Dashboard Charts
function renderDashboardCharts(galleries, exhibitions) {
  if (typeof Chart === 'undefined') return;

  // Gallery chart
  const gCtx = $('dash-galleries-chart')?.getContext('2d');
  if (gCtx) {
    if (state.charts.dashGalleries) state.charts.dashGalleries.destroy();
    state.charts.dashGalleries = new Chart(gCtx, {
      type: 'bar',
      data: {
        labels: galleries.map(g => g.name),
        datasets: [{
          label: 'Visits Recorded',
          data: galleries.map(g => g.visitCount),
          backgroundColor: '#406c50',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // Exhibitions chart
  const eCtx = $('dash-exhibitions-chart')?.getContext('2d');
  if (eCtx) {
    if (state.charts.dashExhibitions) state.charts.dashExhibitions.destroy();
    state.charts.dashExhibitions = new Chart(eCtx, {
      type: 'doughnut',
      data: {
        labels: exhibitions.map(e => e.name),
        datasets: [{
          data: exhibitions.map(e => e.artifactCount || 1),
          backgroundColor: ['#406c50', '#b38947', '#244130', '#c9d9c6', '#884ea0', '#2980b9']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } }
      }
    });
  }
}

// 4. Visitors Management Module
async function loadVisitors() {
  const search = encodeURIComponent($('visitor-search')?.value.trim() || '');
  const data = await apiGet(`/visitors?search=${search}`);
  if (!data) return;
  state.visitors = data.visitors || [];
  renderVisitorsTable();
}

function renderVisitorsTable() {
  const tbody = $('visitors-table-body');
  const typeFilter = $('visitor-type-filter')?.value || 'All';
  const sort = $('visitor-sort')?.value || 'name-asc';

  let list = [...state.visitors];
  if (typeFilter !== 'All') {
    list = list.filter(v => (v.visitorType || '').toLowerCase() === typeFilter.toLowerCase());
  }

  list.sort((a, b) => {
    if (sort === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    if (sort === 'name-desc') return (b.name || '').localeCompare(a.name || '');
    if (sort === 'visits-desc') return (b.visitCount || 0) - (a.visitCount || 0);
    return 0;
  });

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No visitors found matching filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(v => `
    <tr>
      <td><strong>${safe(v.id)}</strong></td>
      <td>
        <span style="font-weight: 600; color: var(--green-dark);">${safe(v.name)}</span>
        <div style="font-size: 11px; color: var(--muted);">${safe(v.email || 'No email')}</div>
      </td>
      <td><span class="tag">${safe(v.visitorType || 'General')}</span></td>
      <td><strong style="color: var(--gold);">${safe(v.visitCount || 0)}</strong> visits</td>
      <td>
        ${(v.preferences || []).length ? v.preferences.map(p => `<span class="metadata-pill" style="font-size:10px;">${safe(p)}</span>`).join(' ') : '<span style="color:var(--muted); font-size:11px;">None</span>'}
      </td>
      <td>
        ${(v.registeredEvents || []).length ? v.registeredEvents.map(e => `<span class="metadata-pill" style="font-size:10px;">🎟 ${safe(e)}</span>`).join(' ') : '<span style="color:var(--muted); font-size:11px;">None</span>'}
      </td>
      <td>
        <button class="secondary-btn" style="padding: 5px 10px; font-size: 11px;" onclick="viewVisitorProfile('${safe(v.id)}')">View Journey</button>
      </td>
    </tr>
  `).join('');
}

window.viewVisitorProfile = async function(visitorId) {
  const data = await apiGet(`/visitors/${visitorId}`);
  if (!data || !data.profile) {
    showToast('Could not load visitor details');
    return;
  }

  const p = data.profile;
  const journey = data.journey || [];
  const panel = $('visitor-profile-panel');
  const details = $('vp-details');
  $('vp-name').textContent = p.name || 'Visitor Details';

  details.innerHTML = `
    <div class="detail-item">
      <label>Visitor ID & Classification</label>
      <span>${safe(p.id)} · ${safe(p.visitorType || 'General')} (${safe(p.gender || 'Not specified')})</span>
    </div>
    <div class="detail-item">
      <label>Contact Details</label>
      <span>${safe(p.email || 'No email')} · ${safe(p.phone || 'No phone')}</span>
    </div>
    <div class="detail-item">
      <label>RFID Card & Ticket</label>
      <span>RFID: <b>${safe(p.rfidCard || 'Assigned at Gate')}</b> | Ticket: <b>${safe(p.ticketType || 'Standard')}</b> (₹${safe(p.ticketPrice || 100)})</span>
    </div>
    <div class="detail-item">
      <label>Expressed Preferences</label>
      <span>${(p.preferences || []).join(', ') || 'No recorded preferences'}</span>
    </div>
    <div class="journey-timeline">
      <h4 style="margin: 0 0 10px; font-size: 13px;">Gallery Visit History (${journey.length})</h4>
      ${journey.length === 0 ? '<p class="muted" style="font-size: 12px;">No logged gallery visits yet.</p>' : journey.map(j => `
        <div class="journey-entry">
          <strong>🗓 ${safe(j.date)}</strong> (${safe(j.entryTime || '10:00')} - ${safe(j.exitTime || '12:00')})
          <div style="margin-top: 4px;">Visited: <b>${safe(j.gallery || 'Main Exhibition')}</b></div>
          ${(j.artifacts || []).length ? `<small style="color: var(--muted); display:block; margin-top:3px;">Viewed artifacts: ${safe(j.artifacts.slice(0, 3).join(', '))}</small>` : ''}
        </div>
      `).join('')}
    </div>
  `;

  panel.classList.remove('hidden');
  $('visitors-page').querySelector('.visitors-layout').classList.add('has-panel');
};

// 5. Galleries Management Module
async function loadGalleries() {
  const data = await apiGet('/galleries');
  const list = $('galleries-list');
  if (!data || !data.galleries) return;
  state.galleries = data.galleries;

  if (data.galleries.length === 0) {
    list.innerHTML = `<div class="empty-state">No galleries registered in Neo4j.</div>`;
    return;
  }

  list.innerHTML = data.galleries.map(g => `
    <article class="record-card">
      <div class="record-media">${buildImageTag(g, 'galleries', g.name)}</div>
      <div class="card-content">
        <span class="tag">Floor: ${safe(g.floor || 'Ground')}</span>
        <h3>${safe(g.name)}</h3>
        <p>${safe(g.description || 'Museum gallery hall showcasing curated historical selections.')}</p>
        <div class="metadata-row">
          <span class="metadata-pill">📍 ${safe(g.location || 'Wing A')}</span>
          <span class="metadata-pill">🏺 ${safe(g.artifactCount || 0)} Artifacts</span>
          <span class="metadata-pill">👥 Cap: ${safe(g.capacity || 50)}</span>
          <span class="metadata-pill" style="color: var(--green-dark); font-weight: 700;">👣 ${safe(g.visitorActivityCount || 0)} Visits</span>
        </div>
        ${(g.artifacts || []).length ? `
          <div style="margin-top: 10px; font-size: 11px; color: var(--muted);">
            <b>Included Artifacts:</b> ${safe(g.artifacts.map(a => a.title).join(', '))}
          </div>
        ` : ''}
      </div>
    </article>
  `).join('');
}

// 6. Artifacts Management Module
async function loadArtifacts() {
  const search = encodeURIComponent($('artifact-search')?.value.trim() || '');
  const category = encodeURIComponent(state.selectedCategory);
  const data = await apiGet(`/artifacts?search=${search}&category=${category}`);
  const list = $('artifacts-list');
  if (!data || !data.artifacts) return;
  state.artifacts = data.artifacts;

  if (data.artifacts.length === 0) {
    list.innerHTML = `<div class="empty-state">No artifacts found matching this search / category.</div>`;
    return;
  }

  list.innerHTML = data.artifacts.map(a => `
    <article class="record-card">
      <div class="record-media">${buildImageTag(a, 'artifacts', a.title)}</div>
      <div class="card-content">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="tag category">${safe(a.category || a.type || 'Relic')}</span>
          <small style="color: var(--muted); font-weight: 600;">${safe(a.id)}</small>
        </div>
        <h3>${safe(a.title)}</h3>
        <p>${safe(a.description || 'Historic piece of high artistic and cultural value.')}</p>
        ${a.historicalDetails ? `
          <div style="margin-top: 8px; font-size: 11.5px; color: #536356; background: #fafaf5; padding: 6px 10px; border-radius: 6px; border-left: 2px solid var(--gold);">
            <b>Historical Context:</b> ${safe(a.historicalDetails)}
          </div>
        ` : ''}
        <div class="metadata-row">
          <span class="metadata-pill">🏛️ ${safe(a.gallery || 'Central Wing')}</span>
          <span class="metadata-pill">🌍 ${safe(a.origin || 'Unknown')}</span>
          <span class="metadata-pill">⏳ ${safe(a.period || 'Ancient')}</span>
          <span class="metadata-pill" style="color: var(--green);">● ${safe(a.status || 'On Display')}</span>
        </div>
      </div>
    </article>
  `).join('');
}

// 7. Exhibitions Management Module
async function loadExhibitions() {
  const data = await apiGet('/exhibitions');
  const list = $('exhibitions-list');
  if (!data || !data.exhibitions) return;
  state.exhibitions = data.exhibitions;

  if (data.exhibitions.length === 0) {
    list.innerHTML = `<div class="empty-state">No exhibitions curated in Neo4j.</div>`;
    return;
  }

  list.innerHTML = data.exhibitions.map(e => `
    <article class="record-card">
      <div class="record-media">${buildImageTag(e, 'exhibitions', e.name)}</div>
      <div class="card-content">
        <span class="tag" style="background: var(--gold-light); color: var(--gold);">${safe(e.theme || 'Thematic Showcase')}</span>
        <h3>${safe(e.name)}</h3>
        <p>${safe(e.description || 'Special exhibition highlighting selected historic works.')}</p>
        <div class="metadata-row">
          <span class="metadata-pill">📍 Venue: ${safe(e.venue || 'Main Hall')}</span>
          <span class="metadata-pill">🗓️ ${safe(e.startDate || 'Current')} — ${safe(e.endDate || 'Ongoing')}</span>
          <span class="metadata-pill">🏺 ${safe(e.artifactCount || 0)} Items</span>
        </div>
        ${(e.artifacts || []).length ? `
          <div style="margin-top: 10px; font-size: 11px; color: var(--muted);">
            <b>Featured Objects:</b> ${safe(e.artifacts.map(a => a.title).join(', '))}
          </div>
        ` : ''}
      </div>
    </article>
  `).join('');
}

// 8. Events Management Module
async function loadEvents() {
  const data = await apiGet('/events');
  const list = $('events-list');
  if (!data || !data.events) return;
  state.events = data.events;

  if (data.events.length === 0) {
    list.innerHTML = `<div class="empty-state">No museum events scheduled.</div>`;
    return;
  }

  list.innerHTML = data.events.map(ev => `
    <article class="record-card">
      <div class="record-media">${buildImageTag(ev, 'events', ev.name)}</div>
      <div class="card-content">
        <span class="tag">Event ID: ${safe(ev.id)}</span>
        <h3>${safe(ev.name)}</h3>
        <p>${safe(ev.description || 'Educational and cultural activity for museum visitors.')}</p>
        <div class="metadata-row">
          <span class="metadata-pill">🗓️ ${safe(ev.date || 'TBA')}</span>
          <span class="metadata-pill">⏰ ${safe(ev.startTime || '10:00')} - ${safe(ev.endTime || '12:00')}</span>
          <span class="metadata-pill">📍 ${safe(ev.venue || 'Auditorium')}</span>
          <span class="metadata-pill" style="color: var(--green-dark); font-weight:700;">🎟️ ${safe(ev.registrationCount || 0)} / ${safe(ev.capacity || 50)} Registered</span>
        </div>
        ${(ev.attendees || []).length ? `
          <div style="margin-top: 10px; font-size: 11px; color: var(--muted);">
            <b>Registered Participants:</b> ${safe(ev.attendees.map(a => a.name).join(', '))}
          </div>
        ` : ''}
      </div>
    </article>
  `).join('');
}

// 9. Analytics Module
async function loadAnalytics() {
  const data = await apiGet('/analytics');
  if (!data) return;
  state.analytics = data;

  if (typeof Chart === 'undefined') return;

  // Trend visits chart
  const tCtx = $('trend-visits-chart')?.getContext('2d');
  if (tCtx) {
    if (state.charts.trendVisits) state.charts.trendVisits.destroy();
    state.charts.trendVisits = new Chart(tCtx, {
      type: 'line',
      data: {
        labels: data.visitorTrends.map(t => t.date),
        datasets: [{
          label: 'Visitor Visits',
          data: data.visitorTrends.map(t => t.visits),
          borderColor: '#406c50',
          backgroundColor: 'rgba(64, 108, 80, 0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#244130',
          pointRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // Gallery footfall ranking
  const gCtx = $('analytics-galleries-chart')?.getContext('2d');
  if (gCtx) {
    if (state.charts.analyticsGalleries) state.charts.analyticsGalleries.destroy();
    state.charts.analyticsGalleries = new Chart(gCtx, {
      type: 'bar',
      data: {
        labels: data.galleryVisits.map(g => g.gallery),
        datasets: [{
          label: 'Total Visits',
          data: data.galleryVisits.map(g => g.count),
          backgroundColor: '#b38947',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // Visitor Interest & Preferences
  const pCtx = $('analytics-pref-chart')?.getContext('2d');
  if (pCtx) {
    if (state.charts.analyticsPref) state.charts.analyticsPref.destroy();
    state.charts.analyticsPref = new Chart(pCtx, {
      type: 'pie',
      data: {
        labels: data.preferences.map(p => p.preference),
        datasets: [{
          data: data.preferences.map(p => p.count),
          backgroundColor: ['#244130', '#406c50', '#b38947', '#7b8e7e', '#884ea0', '#2e86c1']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
      }
    });
  }

  // Artifact Categories
  const cCtx = $('analytics-category-chart')?.getContext('2d');
  if (cCtx) {
    if (state.charts.analyticsCategory) state.charts.analyticsCategory.destroy();
    state.charts.analyticsCategory = new Chart(cCtx, {
      type: 'doughnut',
      data: {
        labels: data.artifactCategories.map(c => c.category),
        datasets: [{
          data: data.artifactCategories.map(c => c.count),
          backgroundColor: ['#406c50', '#b38947', '#2980b9', '#884ea0', '#d35400', '#16a085']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
      }
    });
  }
}

// 10. Graph Relationship Explorer (D3 Force-Directed)
let graphSimulation = null;
async function loadGraphExplorer() {
  const data = await apiGet('/graph?limit=150');
  if (!data || !data.nodes || !data.links) return;
  state.graphData = data;
  renderForceGraph(data);
}

function renderForceGraph(graph) {
  if (typeof d3 === 'undefined') return;

  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();

  const container = document.querySelector('.graph-explorer-container');
  const width = container.clientWidth || 900;
  const height = container.clientHeight || 640;

  const colorMap = {
    VISITOR: '#2b6cb0',
    GALLERY: '#2e7d32',
    ARTIFACT: '#d97706',
    EXHIBITION: '#805ad5',
    EVENT: '#dd6b20',
    VISIT: '#718096'
  };

  const g = svg.append('g');

  // Zoom behaviour
  svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (event) => {
    g.attr('transform', event.transform);
  }));

  // Force simulation
  graphSimulation = d3.forceSimulation(graph.nodes)
    .force('link', d3.forceLink(graph.links).id(d => d.id).distance(90))
    .force('charge', d3.forceManyBody().strength(-240))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(28));

  // Links
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(graph.links)
    .enter().append('line')
    .attr('stroke', '#cbd5e0')
    .attr('stroke-width', 1.6)
    .attr('stroke-opacity', 0.8);

  // Link labels
  const linkText = g.append('g')
    .attr('class', 'link-labels')
    .selectAll('text')
    .data(graph.links)
    .enter().append('text')
    .attr('font-size', '8.5px')
    .attr('fill', '#8899a6')
    .attr('text-anchor', 'middle')
    .text(d => d.type);

  // Nodes
  const node = g.append('g')
    .attr('class', 'nodes')
    .selectAll('circle')
    .data(graph.nodes)
    .enter().append('circle')
    .attr('r', d => d.type === 'GALLERY' || d.type === 'EXHIBITION' ? 18 : 14)
    .attr('fill', d => colorMap[d.type] || '#555')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2.5)
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );

  // Node Labels
  const label = g.append('g')
    .attr('class', 'node-labels')
    .selectAll('text')
    .data(graph.nodes)
    .enter().append('text')
    .attr('font-size', '10px')
    .attr('font-weight', '600')
    .attr('dx', 18)
    .attr('dy', 4)
    .attr('fill', '#2d3748')
    .text(d => d.label.length > 20 ? d.label.substring(0, 18) + '…' : d.label);

  // Tooltip
  const tooltip = $('graph-tooltip');
  node.on('mouseover', (event, d) => {
    tooltip.innerHTML = `
      <strong>${safe(d.label)}</strong>
      <div style="font-size: 11px; margin-top: 3px; color: #cbd5e0;">Label: ${safe(d.type)} | Code: ${safe(d.code)}</div>
    `;
    tooltip.classList.remove('hidden');
  }).on('mousemove', (event) => {
    const rect = container.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - rect.left + 15}px`;
    tooltip.style.top = `${event.clientY - rect.top + 15}px`;
  }).on('mouseout', () => {
    tooltip.classList.add('hidden');
  });

  graphSimulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    linkText
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2);

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
  });

  function dragstarted(event, d) {
    if (!event.active) graphSimulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }
  function dragended(event, d) {
    if (!event.active) graphSimulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

// Navigation router
function navigateTo(pageId) {
  state.activePage = pageId;
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const activeSection = $(`${pageId}-page`);
  if (activeSection) activeSection.classList.remove('hidden');

  const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
  if (activeLink) activeLink.classList.add('active');

  const titles = {
    overview: 'Museum Dashboard',
    visitors: 'Visitor Management',
    galleries: 'Gallery Management',
    artifacts: 'Artifact Catalogue',
    exhibitions: 'Exhibitions Management',
    events: 'Events & Schedules',
    analytics: 'Visitor & Collection Analytics',
    explorer: 'Neo4j Graph Relationship Explorer'
  };
  $('page-title').textContent = titles[pageId] || 'SmartMuseum';

  // Load relevant data
  if (pageId === 'overview') loadOverview();
  else if (pageId === 'visitors') loadVisitors();
  else if (pageId === 'galleries') loadGalleries();
  else if (pageId === 'artifacts') loadArtifacts();
  else if (pageId === 'exhibitions') loadExhibitions();
  else if (pageId === 'events') loadEvents();
  else if (pageId === 'analytics') loadAnalytics();
  else if (pageId === 'explorer') loadGraphExplorer();
}

// Event Listeners Initialization
function initEvents() {
  // Navigation Links
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Action jumps
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.go));
  });

  // Refresh Button
  $('refresh-btn')?.addEventListener('click', async () => {
    showToast('Syncing with Neo4j AuraDB…');
    await checkHealth();
    navigateTo(state.activePage);
  });

  // Artifact Search & Category Tabs
  $('artifact-search')?.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadArtifacts, 300);
  });

  $('artifact-category-tabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      document.querySelectorAll('#artifact-category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      state.selectedCategory = e.target.dataset.category;
      loadArtifacts();
    }
  });

  // Visitor Search & Filter
  $('visitor-search')?.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadVisitors, 300);
  });
  $('visitor-type-filter')?.addEventListener('change', renderVisitorsTable);
  $('visitor-sort')?.addEventListener('change', renderVisitorsTable);

  // Close profile panel
  $('close-profile-btn')?.addEventListener('click', () => {
    $('visitor-profile-panel').classList.add('hidden');
    $('visitors-page').querySelector('.visitors-layout').classList.remove('has-panel');
  });

  // Add Visitor Modal
  $('open-add-visitor-btn')?.addEventListener('click', () => {
    $('add-visitor-modal').classList.remove('hidden');
  });
  $('close-modal-btn')?.addEventListener('click', () => $('add-visitor-modal').classList.add('hidden'));
  $('cancel-modal-btn')?.addEventListener('click', () => $('add-visitor-modal').classList.add('hidden'));

  $('add-visitor-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: $('v-name').value.trim(),
      email: $('v-email').value.trim(),
      phone: $('v-phone').value.trim(),
      gender: $('v-gender').value,
      visitorType: $('v-type').value
    };

    try {
      const res = await fetch(`${API}/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Visitor ${payload.name} created successfully!`);
        $('add-visitor-modal').classList.add('hidden');
        $('add-visitor-form').reset();
        loadVisitors();
        loadOverview();
      } else {
        showToast(`Error: ${data.error || 'Failed to save visitor'}`);
      }
    } catch (err) {
      showToast('Network error while registering visitor');
    }
  });

  // Reset graph
  $('reset-graph-btn')?.addEventListener('click', () => {
    if (graphSimulation) {
      graphSimulation.alpha(1).restart();
      showToast('Graph simulation restarted');
    }
  });
}

// Initial Boot
window.addEventListener('DOMContentLoaded', async () => {
  initEvents();
  await checkHealth();
  navigateTo('overview');
});
