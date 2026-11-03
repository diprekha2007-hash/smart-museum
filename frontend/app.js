'use strict';

// SmartMuseum Complete Full-Stack Frontend Controller
// Connects to Node.js backend which interfaces with Neo4j AuraDB

const API = window.location.origin.includes(':3001') || window.location.origin.includes('onrender.com')
  ? `${window.location.origin}/api`
  : (window.location.port === '3000' || window.location.port === '5500' || window.location.protocol === 'file:')
    ? 'http://localhost:3001/api'
    : '/api';

const $ = (id) => document.getElementById(id);

// ==================== IMAGE MANIFEST ====================
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

// ==================== STATE ====================
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
  charts: {},
  bookings: [],
  ticketActiveType: 'EVENT',
  bookingModalData: { quantity: 1, unitPrice: 0, ticketPrices: {} },
  searchTimer: null
};

// ==================== UTILITIES ====================
function safe(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function showToast(msg, duration = 3500) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
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

// ==================== API FETCHERS ====================
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

async function apiPost(endpoint, body) {
  try {
    const res = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API POST Error [${endpoint}]:`, err);
    throw err;
  }
}

async function apiDelete(endpoint) {
  try {
    const res = await fetch(`${API}${endpoint}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    console.error(`API DELETE Error [${endpoint}]:`, err);
    throw err;
  }
}

// ==================== 1. CONNECTION HEALTH ====================
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

// ==================== 2. DASHBOARD OVERVIEW ====================
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
  $('stat-bookings').textContent = s.totalBookings ?? '0';

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

// ==================== 3. DASHBOARD CHARTS ====================
function renderDashboardCharts(galleries, exhibitions) {
  if (typeof Chart === 'undefined') return;

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

// ==================== 4. VISITORS ====================
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
      <label>Visitor ID &amp; Classification</label>
      <span>${safe(p.id)} · ${safe(p.visitorType || 'General')} (${safe(p.gender || 'Not specified')})</span>
    </div>
    <div class="detail-item">
      <label>Contact Details</label>
      <span>${safe(p.email || 'No email')} · ${safe(p.phone || 'No phone')}</span>
    </div>
    <div class="detail-item">
      <label>RFID Card &amp; Ticket</label>
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

// ==================== 5. GALLERIES ====================
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
            <b>Included Artifacts:</b> ${safe(g.artifacts.map(a => a.title).filter(Boolean).join(', '))}
          </div>
        ` : ''}
        <div style="margin-top: 12px;">
          <button class="book-btn" onclick="openBookingModal('GALLERY', '${safe(g.id)}', '${safe(g.name)}', 'galleries', '${safe(g.id)}')">🎟 Get Access Pass</button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 6. ARTIFACTS (with dynamic category tabs) ====================
async function loadArtifactCategories() {
  const data = await apiGet('/artifact-categories');
  const tabsContainer = $('artifact-category-tabs');
  if (!tabsContainer) return;

  // Keep the "All Categories" tab, remove old static ones
  tabsContainer.innerHTML = `<button class="tab-btn active" data-category="All">All Categories</button>`;

  const categories = data?.categories || [];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    tabsContainer.appendChild(btn);
  });
}

async function loadArtifacts() {
  const search = encodeURIComponent($('artifact-search')?.value.trim() || '');
  const category = encodeURIComponent(state.selectedCategory === 'All' ? '' : state.selectedCategory);
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
        ${a.historicalDetails && a.historicalDetails !== a.description ? `
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
        <div style="margin-top: 12px;">
          <button class="book-btn" onclick="openBookingModal('ARTIFACT', '${safe(a.id)}', '${safe(a.title)}', 'artifacts', '${safe(a.id)}')">🎟 Get Viewing Pass</button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 7. EXHIBITIONS ====================
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
            <b>Featured Objects:</b> ${safe(e.artifacts.map(a => a.title).filter(Boolean).join(', '))}
          </div>
        ` : ''}
        <div style="margin-top: 12px;">
          <button class="book-btn" onclick="openBookingModal('EXHIBITION', '${safe(e.id)}', '${safe(e.name)}', 'exhibitions', '${safe(e.id)}')">🎟 Book Tickets</button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 8. EVENTS ====================
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
        <div style="margin-top: 12px;">
          <button class="book-btn" onclick="openBookingModal('EVENT', '${safe(ev.id)}', '${safe(ev.name)}', 'events', '${safe(ev.id)}')">🎟 Book Tickets</button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 9. TICKET COUNTER PAGE ====================
const TICKET_PRICES = {
  EVENT:      { Standard: 200, VIP: 500, Student: 100, Child: 75 },
  EXHIBITION: { Adult: 150, Student: 75, Child: 50, Family: 350 },
  GALLERY:    { 'Access Pass': 100, Student: 60, Child: 40 },
  ARTIFACT:   { 'Viewing Pass': 50, Student: 30, Guided: 120 }
};

async function loadTickets(itemType) {
  state.ticketActiveType = itemType || state.ticketActiveType;
  const type = state.ticketActiveType;

  // Render pricing banner
  const prices = TICKET_PRICES[type] || {};
  $('pricing-list').innerHTML = Object.entries(prices).map(([t, p]) =>
    `<div class="pricing-item"><span>${t}</span><strong>${formatCurrency(p)}</strong></div>`
  ).join('');

  const list = $('tickets-item-list');
  list.innerHTML = `<div class="loading-state">Loading ${type.toLowerCase()}s…</div>`;

  let items = [];
  if (type === 'EVENT') {
    const data = await apiGet('/events');
    items = (data?.events || []).map(e => ({
      id: e.id, name: e.name, imageCategory: 'events',
      meta: `${e.date || 'TBA'} · ${e.venue || 'Auditorium'}`,
      info: `Capacity: ${e.capacity || 50} | Registered: ${e.registrationCount || 0}`,
      desc: e.description
    }));
  } else if (type === 'EXHIBITION') {
    const data = await apiGet('/exhibitions');
    items = (data?.exhibitions || []).map(e => ({
      id: e.id, name: e.name, imageCategory: 'exhibitions',
      meta: `${e.startDate || 'Current'} — ${e.endDate || 'Ongoing'} · ${e.venue || 'Main Hall'}`,
      info: `Artifacts Featured: ${e.artifactCount || 0}`,
      desc: e.description
    }));
  } else if (type === 'GALLERY') {
    const data = await apiGet('/galleries');
    items = (data?.galleries || []).map(g => ({
      id: g.id, name: g.name, imageCategory: 'galleries',
      meta: `Floor ${g.floor || 'G'} · ${g.location || 'Wing A'}`,
      info: `Artifacts: ${g.artifactCount || 0} | Capacity: ${g.capacity || 50}`,
      desc: g.description
    }));
  } else if (type === 'ARTIFACT') {
    const data = await apiGet('/artifacts');
    items = (data?.artifacts || []).map(a => ({
      id: a.id, name: a.title, imageCategory: 'artifacts',
      meta: `${a.category || 'Artifact'} · ${a.origin || 'Unknown'} · ${a.period || 'Historical'}`,
      info: `Status: ${a.status || 'On Display'}`,
      desc: a.description
    }));
  }

  if (items.length === 0) {
    list.innerHTML = `<div class="empty-state">No ${type.toLowerCase()}s found in Neo4j.</div>`;
    return;
  }

  list.innerHTML = items.map(item => `
    <article class="record-card">
      <div class="record-media">${buildImageTag({ id: item.id }, item.imageCategory, item.name)}</div>
      <div class="card-content">
        <span class="tag category">${safe(type)}</span>
        <h3>${safe(item.name)}</h3>
        <p>${safe(item.meta)}</p>
        <p style="font-size: 11px; color: var(--muted); margin-top: 4px;">${safe(item.info)}</p>
        ${item.desc ? `<p style="font-size: 11.5px; margin-top: 6px;">${safe(item.desc)}</p>` : ''}
        <div style="margin-top: 14px;">
          <button class="book-btn" onclick="openBookingModal('${safe(type)}', '${safe(item.id)}', '${safe(item.name)}', '${item.imageCategory}', '${safe(item.id)}')">
            🎟 ${type === 'GALLERY' || type === 'ARTIFACT' ? 'Get Access Pass' : 'Book Tickets'}
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

// ==================== 10. BOOKINGS PAGE ====================
async function loadBookings() {
  const search = encodeURIComponent($('booking-search')?.value.trim() || '');
  const status = encodeURIComponent($('booking-status-filter')?.value || '');
  const itemType = encodeURIComponent($('booking-type-filter')?.value || '');

  const data = await apiGet(`/bookings?search=${search}&status=${status}&itemType=${itemType}`);
  if (!data) return;

  state.bookings = data.bookings || [];
  const stats = data.stats || {};

  // Stats row
  $('bk-total').textContent = stats.total ?? 0;
  $('bk-confirmed').textContent = stats.confirmed ?? 0;
  $('bk-cancelled').textContent = stats.cancelled ?? 0;
  $('bk-revenue').textContent = formatCurrency(stats.totalRevenue);

  renderBookingsTable();
}

function renderBookingsTable() {
  const tbody = $('bookings-table-body');
  const list = state.bookings;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No bookings found. Use the Ticket Counter to create demo bookings.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => `
    <tr class="${b.status === 'CANCELLED' ? 'row-cancelled' : ''}">
      <td><code style="font-size: 10px; color: var(--muted);">${safe(b.bookingId)}</code></td>
      <td>
        <strong style="color: var(--green-dark);">${safe(b.visitorName)}</strong>
        <div style="font-size: 11px; color: var(--muted);">${safe(b.visitorEmail || '')}</div>
      </td>
      <td>${safe(b.itemName || b.itemId)}</td>
      <td><span class="tag">${safe(b.itemType)}</span></td>
      <td>${safe(b.ticketType)}</td>
      <td><strong>${safe(b.quantity)}</strong></td>
      <td><strong style="color: var(--gold);">${formatCurrency(b.totalAmount)}</strong></td>
      <td style="font-size: 11px;">${formatDate(b.bookingDate)}</td>
      <td>
        <span class="booking-status-badge booking-status-${(b.status || '').toLowerCase()}">
          ${safe(b.status || 'CONFIRMED')}
        </span>
      </td>
      <td>
        ${b.status !== 'CANCELLED' ? `
          <button class="danger-btn" style="padding: 4px 9px; font-size: 11px;"
            onclick="cancelBooking('${safe(b.bookingId)}')">Cancel</button>
        ` : '<span style="font-size:11px; color:var(--muted);">—</span>'}
      </td>
    </tr>
  `).join('');
}

window.cancelBooking = async function(bookingId) {
  if (!confirm(`Cancel booking ${bookingId}? This cannot be undone.`)) return;
  try {
    await apiDelete(`/bookings/${bookingId}`);
    showToast('Booking cancelled successfully');
    loadBookings();
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
};

// Export CSV
function exportBookingsCSV() {
  const list = state.bookings;
  if (!list.length) { showToast('No bookings to export'); return; }
  const headers = ['Booking ID','Visitor','Email','Item','Type','Ticket','Qty','Amount','Date','Status'];
  const rows = list.map(b => [
    b.bookingId, b.visitorName, b.visitorEmail, b.itemName, b.itemType,
    b.ticketType, b.quantity, b.totalAmount, b.bookingDate, b.status
  ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'smartmuseum_bookings.csv';
  a.click(); URL.revokeObjectURL(url);
}

// ==================== 11. ANALYTICS ====================
async function loadAnalytics() {
  const data = await apiGet('/analytics');
  if (!data) return;
  state.analytics = data;

  if (typeof Chart === 'undefined') return;

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

  const pCtx = $('analytics-pref-chart')?.getContext('2d');
  if (pCtx) {
    if (state.charts.analyticsPref) state.charts.analyticsPref.destroy();
    const prefData = data.preferences.filter(p => p.preference);
    state.charts.analyticsPref = new Chart(pCtx, {
      type: 'pie',
      data: {
        labels: prefData.map(p => p.preference),
        datasets: [{
          data: prefData.map(p => p.count),
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

  const cCtx = $('analytics-category-chart')?.getContext('2d');
  if (cCtx) {
    if (state.charts.analyticsCategory) state.charts.analyticsCategory.destroy();
    const catData = data.artifactCategories.filter(c => c.category);
    state.charts.analyticsCategory = new Chart(cCtx, {
      type: 'doughnut',
      data: {
        labels: catData.map(c => c.category),
        datasets: [{
          data: catData.map(c => c.count),
          backgroundColor: ['#406c50', '#b38947', '#2980b9', '#884ea0', '#d35400', '#16a085', '#c0392b', '#27ae60']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
      }
    });
  }

  const bCtx = $('analytics-bookings-chart')?.getContext('2d');
  if (bCtx) {
    if (state.charts.analyticsBookings) state.charts.analyticsBookings.destroy();
    const bkData = data.bookingStats || [];
    state.charts.analyticsBookings = new Chart(bCtx, {
      type: 'bar',
      data: {
        labels: bkData.map(b => b.itemType),
        datasets: [{
          label: 'Bookings',
          data: bkData.map(b => b.count),
          backgroundColor: ['#244130', '#406c50', '#b38947', '#7b8e7e'],
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
}

// ==================== 12. GRAPH EXPLORER ====================
let graphSimulation = null;

async function loadGraphExplorer() {
  const container = $('graph-container');
  const loading = $('graph-loading');
  if (loading) loading.classList.remove('hidden');

  const filter = document.querySelector('#graph-filter-row .graph-filter-btn.active')?.dataset.gfilter || 'ALL';
  const data = await apiGet(`/graph?limit=150&filter=${filter}`);

  if (loading) loading.classList.add('hidden');

  if (!data || !data.nodes || data.nodes.length === 0) {
    const svg = document.querySelector('#graph-svg');
    if (svg) {
      svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" font-size="14" fill="#aaa" dominant-baseline="middle">No graph data returned from Neo4j</text>`;
    }
    return;
  }

  state.graphData = data;

  const infoBar = $('graph-info-bar');
  if (infoBar) {
    infoBar.textContent = `${data.totalNodes || data.nodes.length} nodes · ${data.totalLinks || data.links.length} relationships`;
  }

  // Slight delay to ensure SVG is rendered and has dimensions
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      renderForceGraph(data);
    });
  });
}

function renderForceGraph(graph) {
  if (typeof d3 === 'undefined') {
    console.error('D3 not loaded');
    return;
  }

  const svgEl = document.getElementById('graph-svg');
  if (!svgEl) return;

  const svg = d3.select('#graph-svg');
  svg.selectAll('*').remove();

  // Get actual rendered dimensions from the container
  const container = document.getElementById('graph-container');
  const rect = container.getBoundingClientRect();
  const width = Math.max(rect.width || container.offsetWidth || 900, 600);
  const height = Math.max(rect.height || container.offsetHeight || 580, 400);

  // Set explicit SVG dimensions
  svg.attr('width', width).attr('height', height);

  const colorMap = {
    VISITOR:    '#2b6cb0',
    GALLERY:    '#2e7d32',
    ARTIFACT:   '#d97706',
    EXHIBITION: '#805ad5',
    EVENT:      '#dd6b20',
    VISIT:      '#718096',
    STAFF:      '#c53030',
    FEEDBACK:   '#2c7a7b',
    CONSERVATION: '#744210'
  };

  const g = svg.append('g').attr('class', 'graph-root');

  // Arrow marker definition
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 22)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#b0bec5')
    .style('stroke', 'none');

  // Zoom behaviour
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });
  svg.call(zoom);

  // Force simulation
  if (graphSimulation) graphSimulation.stop();
  graphSimulation = d3.forceSimulation(graph.nodes)
    .force('link', d3.forceLink(graph.links).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-280))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(30));

  // Links
  const link = g.append('g')
    .attr('class', 'links')
    .selectAll('line')
    .data(graph.links)
    .enter().append('line')
    .attr('stroke', '#b0bec5')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.7)
    .attr('marker-end', 'url(#arrowhead)');

  // Link labels (shown only when count is manageable)
  const showLinkLabels = graph.links.length < 80;
  const linkText = showLinkLabels ? g.append('g')
    .attr('class', 'link-labels')
    .selectAll('text')
    .data(graph.links)
    .enter().append('text')
    .attr('font-size', '8px')
    .attr('fill', '#9aaeb0')
    .attr('text-anchor', 'middle')
    .text(d => d.type) : null;

  // Node groups
  const nodeGroup = g.append('g')
    .attr('class', 'nodes')
    .selectAll('g')
    .data(graph.nodes)
    .enter().append('g')
    .style('cursor', 'pointer')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );

  // Circle per node (selected-type nodes are larger, ringed in gold; neighbours are slightly dimmed)
  const filterActive = graph.nodes.some(n => n.selected);
  nodeGroup.append('circle')
    .attr('r', d => {
      const base = (d.type === 'GALLERY' || d.type === 'EXHIBITION') ? 18 : (d.type === 'VISITOR' ? 16 : 13);
      return d.selected ? base + 4 : base;
    })
    .attr('fill', d => colorMap[d.type] || '#607d8b')
    .attr('fill-opacity', d => (filterActive && !d.selected) ? 0.55 : 1)
    .attr('stroke', d => d.selected ? '#b38947' : '#fff')
    .attr('stroke-width', d => d.selected ? 4 : 2.5);

  // Node labels
  nodeGroup.append('text')
    .attr('font-size', '10px')
    .attr('font-weight', '600')
    .attr('dx', d => (d.type === 'GALLERY' || d.type === 'EXHIBITION' ? 22 : 18))
    .attr('dy', 4)
    .attr('fill', '#2d3748')
    .text(d => {
      const lbl = d.label || '';
      return lbl.length > 18 ? lbl.substring(0, 16) + '…' : lbl;
    });

  // Tooltip
  const tooltip = $('graph-tooltip');
  nodeGroup.on('mouseover', (event, d) => {
    tooltip.innerHTML = `
      <strong>${safe(d.label)}</strong>
      <div style="font-size: 10px; margin-top: 3px; color: #a0aec0;">
        Type: ${safe(d.type)} &nbsp;|&nbsp; ID: ${safe(d.code)}
      </div>
    `;
    tooltip.classList.remove('hidden');
  }).on('mousemove', (event) => {
    const cRect = container.getBoundingClientRect();
    const tx = event.clientX - cRect.left + 14;
    const ty = event.clientY - cRect.top + 14;
    tooltip.style.left = `${Math.min(tx, width - 200)}px`;
    tooltip.style.top = `${Math.min(ty, height - 80)}px`;
  }).on('mouseout', () => {
    tooltip.classList.add('hidden');
  });

  // Tick handler
  graphSimulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);

    if (linkText) {
      linkText
        .attr('x', d => (d.source.x + d.target.x) / 2)
        .attr('y', d => (d.source.y + d.target.y) / 2);
    }

    nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
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

// ==================== 13. BOOKING MODAL ====================
const TICKET_PRICES_FE = {
  EVENT:      { Standard: 200, VIP: 500, Student: 100, Child: 75 },
  EXHIBITION: { Adult: 150, Student: 75, Child: 50, Family: 350 },
  GALLERY:    { 'Access Pass': 100, Student: 60, Child: 40 },
  ARTIFACT:   { 'Viewing Pass': 50, Student: 30, Guided: 120 }
};

window.openBookingModal = function(itemType, itemId, itemName, imageCategory, imageId) {
  const modal = $('booking-modal');
  const typeUpper = String(itemType).toUpperCase();
  const prices = TICKET_PRICES_FE[typeUpper] || TICKET_PRICES_FE.EVENT;

  // Populate hidden fields
  $('bk-item-id').value = itemId;
  $('bk-item-type').value = typeUpper;
  $('bk-item-name').value = itemName;

  // Header
  $('booking-modal-title').textContent = `Book Tickets — ${itemName}`;
  $('booking-item-name').textContent = itemName;
  $('booking-item-type-label').textContent = typeUpper;
  $('booking-item-meta').textContent = itemId;

  // Image
  const imgWrap = $('booking-item-image-wrap');
  const imgSrc = IMAGE_MANIFEST[imageCategory]?.[imageId] || '';
  imgWrap.innerHTML = imgSrc
    ? `<img src="${safe(imgSrc)}" alt="${safe(itemName)}" style="width:80px;height:70px;object-fit:cover;border-radius:8px;" onerror="this.parentNode.innerHTML='<div class=image-fallback style=width:80px;height:70px;border-radius:8px;font-size:10px>${safe(itemName)}</div>'">`
    : `<div class="image-fallback" style="width:80px;height:70px;border-radius:8px;font-size:10px;">${safe(itemName)}</div>`;

  // Ticket type dropdown
  const select = $('bk-ticket-type');
  select.innerHTML = Object.entries(prices).map(([type, price]) =>
    `<option value="${safe(type)}">${type} — ${formatCurrency(price)}</option>`
  ).join('');

  // Reset quantity and state
  state.bookingModalData.quantity = 1;
  state.bookingModalData.ticketPrices = prices;
  $('qty-display').textContent = '1';
  updateBookingTotal();

  // Reset form
  $('bk-visitor-name').value = '';
  $('bk-visitor-email').value = '';

  modal.classList.remove('hidden');
};

function updateBookingTotal() {
  const select = $('bk-ticket-type');
  const typeKey = select?.value;
  const prices = state.bookingModalData.ticketPrices;
  const price = prices[typeKey] || 0;
  state.bookingModalData.unitPrice = price;
  const total = price * state.bookingModalData.quantity;
  $('booking-total-display').textContent = formatCurrency(total);
}

// ==================== 14. NAVIGATION ROUTER ====================
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
    tickets: 'Ticket Counter',
    bookings: 'Booking Management',
    analytics: 'Visitor & Collection Analytics',
    explorer: 'Neo4j Graph Relationship Explorer'
  };
  $('page-title').textContent = titles[pageId] || 'SmartMuseum';

  if (pageId === 'overview') loadOverview();
  else if (pageId === 'visitors') loadVisitors();
  else if (pageId === 'galleries') loadGalleries();
  else if (pageId === 'artifacts') { loadArtifactCategories().then(() => loadArtifacts()); }
  else if (pageId === 'exhibitions') loadExhibitions();
  else if (pageId === 'events') loadEvents();
  else if (pageId === 'tickets') loadTickets();
  else if (pageId === 'bookings') loadBookings();
  else if (pageId === 'analytics') loadAnalytics();
  else if (pageId === 'explorer') loadGraphExplorer();
}

// ==================== 15. EVENT LISTENERS ====================
function initEvents() {
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => navigateTo(link.dataset.page));
  });

  // Jump buttons
  document.querySelectorAll('[data-go]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.go));
  });

  // Refresh
  $('refresh-btn')?.addEventListener('click', async () => {
    showToast('Syncing with Neo4j AuraDB…');
    await checkHealth();
    navigateTo(state.activePage);
  });

  // Artifact search & category tabs
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

  // Visitor search & filter
  $('visitor-search')?.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadVisitors, 300);
  });
  $('visitor-type-filter')?.addEventListener('change', renderVisitorsTable);
  $('visitor-sort')?.addEventListener('change', renderVisitorsTable);

  // Close visitor profile panel
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
      const data = await apiPost('/visitors', payload);
      showToast(`Visitor ${payload.name} registered successfully!`);
      $('add-visitor-modal').classList.add('hidden');
      $('add-visitor-form').reset();
      loadVisitors();
      loadOverview();
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  });

  // Ticket type tabs
  $('ticket-type-tabs')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('tab-btn')) {
      document.querySelectorAll('#ticket-type-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadTickets(e.target.dataset.ttype);
    }
  });

  // Booking modal events
  $('close-booking-modal-btn')?.addEventListener('click', () => $('booking-modal').classList.add('hidden'));
  $('cancel-booking-btn')?.addEventListener('click', () => $('booking-modal').classList.add('hidden'));

  $('bk-ticket-type')?.addEventListener('change', updateBookingTotal);

  $('qty-minus')?.addEventListener('click', () => {
    if (state.bookingModalData.quantity > 1) {
      state.bookingModalData.quantity--;
      $('qty-display').textContent = state.bookingModalData.quantity;
      updateBookingTotal();
    }
  });

  $('qty-plus')?.addEventListener('click', () => {
    if (state.bookingModalData.quantity < 10) {
      state.bookingModalData.quantity++;
      $('qty-display').textContent = state.bookingModalData.quantity;
      updateBookingTotal();
    }
  });

  $('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('confirm-booking-btn');
    btn.disabled = true;
    btn.textContent = 'Processing…';

    const payload = {
      visitorName: $('bk-visitor-name').value.trim(),
      visitorEmail: $('bk-visitor-email').value.trim(),
      itemId: $('bk-item-id').value,
      itemType: $('bk-item-type').value,
      itemName: $('bk-item-name').value,
      ticketType: $('bk-ticket-type').value,
      quantity: state.bookingModalData.quantity
    };

    try {
      const data = await apiPost('/bookings', payload);
      $('booking-modal').classList.add('hidden');
      showTicketConfirmation(data.booking);
      showToast('Booking confirmed!');
    } catch (err) {
      showToast(`Booking failed: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm Booking →';
    }
  });

  // Confirmation modal close
  $('close-confirm-modal-btn')?.addEventListener('click', () => {
    $('ticket-confirmation-modal').classList.add('hidden');
  });

  // Graph filter buttons
  $('graph-filter-row')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('graph-filter-btn')) {
      document.querySelectorAll('#graph-filter-row .graph-filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadGraphExplorer();
    }
  });

  // Reset graph
  $('reset-graph-btn')?.addEventListener('click', () => {
    if (graphSimulation) {
      graphSimulation.alpha(1).restart();
      showToast('Graph simulation restarted');
    }
  });

  // Booking search & filters
  $('booking-search')?.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(loadBookings, 300);
  });
  $('booking-status-filter')?.addEventListener('change', loadBookings);
  $('booking-type-filter')?.addEventListener('change', loadBookings);

  // Export CSV
  $('export-bookings-btn')?.addEventListener('click', exportBookingsCSV);
}

// ==================== 16. TICKET CONFIRMATION MODAL ====================
function showTicketConfirmation(booking) {
  if (!booking) return;
  const modal = $('ticket-confirmation-modal');
  const body = $('ticket-confirm-body');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=SMARTMUSEUM-${encodeURIComponent(booking.bookingId)}`;

  body.innerHTML = `
    <div class="ticket-confirm-detail-row">
      <div>
        <div class="ticket-field"><label>Booking ID</label><span class="ticket-bid">${safe(booking.bookingId)}</span></div>
        <div class="ticket-field"><label>Visitor</label><span>${safe(booking.visitorName)}</span></div>
        <div class="ticket-field"><label>Item</label><span>${safe(booking.itemName || booking.itemId)}</span></div>
        <div class="ticket-field"><label>Ticket Type</label><span>${safe(booking.ticketType)}</span></div>
        <div class="ticket-field"><label>Quantity</label><span>${safe(booking.quantity)} × ${formatCurrency(booking.unitPrice)}</span></div>
        <div class="ticket-field"><label>Total Paid</label><strong style="font-size:18px; color: var(--green-dark);">${formatCurrency(booking.totalAmount)}</strong></div>
        <div class="ticket-field"><label>Date</label><span>${formatDate(booking.bookingDate)}</span></div>
        <div class="ticket-field"><label>Status</label><span class="booking-status-badge booking-status-confirmed">CONFIRMED</span></div>
      </div>
      <div class="ticket-qr-wrap">
        <img src="${qrUrl}" alt="QR Code" style="width:130px;height:130px;border-radius:8px;border:1px solid var(--line);"
             onerror="this.style.display='none'">
        <small style="display:block; text-align:center; margin-top:6px; color:var(--muted); font-size:10px;">Scan at Museum Gate</small>
      </div>
    </div>
    <p style="font-size: 11px; color: var(--muted); margin-top: 12px; text-align: center;">
      ⚠ This is a demo booking. No real payment has been processed.
    </p>
  `;

  modal.classList.remove('hidden');
}

// ==================== 17. INITIAL BOOT ====================
window.addEventListener('DOMContentLoaded', async () => {
  initEvents();
  await checkHealth();
  navigateTo('overview');
});
