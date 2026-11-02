'use strict';

// SmartMuseum frontend. Images are local files downloaded from Wikimedia Commons
// by scripts/download_museum_images.py. This file never substitutes one record's
// photograph for another record's photograph.
const API = 'http://localhost:3001/api';
const $ = (id) => document.getElementById(id);

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
  artifacts: [],
  galleries: [],
  exhibitions: [],
  events: [],
  loaded: { artifacts: false, galleries: false, exhibitions: false, events: false },
  searchTimer: null
};

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function valueOf(record, ...keys) {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return record[key];
    }
  }
  return '';
}

function recordId(record) {
  return String(valueOf(record, 'id', 'Artifact_ID', 'Gallery_ID', 'Exhibition_ID', 'Event_ID', 'artifact_id', 'gallery_id', 'exhibition_id', 'event_id'));
}

function recordImageUrl(record, category) {
  // Prefer an explicitly stored image property if a record already has one.
  const supplied = valueOf(record, 'imageUrl', 'image_url', 'Image_URL', 'ImageUrl', 'photoUrl', 'photo_url', 'Photo_URL', 'image', 'Image');
  if (typeof supplied === 'string') {
    const url = supplied.trim();
    if (/^https?:\/\//i.test(url) || (/^(?!\/\/)[a-z0-9_./-]+\.(jpg|jpeg|png|webp)(\?.*)?$/i.test(url))) return url;
  }
  return IMAGE_MANIFEST[category]?.[recordId(record)] || '';
}

function imageMarkup(record, category, title, extraClass = '') {
  const src = recordImageUrl(record, category);
  const alt = `${title} — SmartMuseum collection photograph`;
  const fallback = `<div class="image-fallback" role="img" aria-label="No photograph available for ${safe(title)}"><span>${safe(title)}</span><small>Photograph unavailable</small></div>`;
  if (!src) return `<div class="record-media ${safe(extraClass)}">${fallback}</div>`;
  return `<div class="record-media ${safe(extraClass)}">
    <img class="record-image" src="${safe(src)}" alt="${safe(alt)}" loading="lazy" decoding="async">
    <div class="image-fallback" role="img" aria-label="No photograph available for ${safe(title)}" hidden><span>${safe(title)}</span><small>Photograph unavailable</small></div>
  </div>`;
}

// One delegated handler handles all lazy-loaded image failures, including cards
// inserted after search/navigation. The fallback contains the record's name only.
document.addEventListener('error', (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains('record-image')) return;
  image.hidden = true;
  const fallback = image.parentElement?.querySelector('.image-fallback');
  if (fallback) fallback.hidden = false;
}, true);

async function get(path) {
  const response = await fetch(`${API}${path}`, { headers: { Accept: 'application/json' } });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`The API returned an invalid response (${response.status}).`);
  }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function showError(containerId, message) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><strong>Could not load this section.</strong><p>${safe(message)}</p><small>Check the backend terminal and Neo4j Aura connection.</small></div>`;
}

function showEmpty(containerId, message) {
  const container = $(containerId);
  if (container) container.innerHTML = `<div class="empty-state"><strong>${safe(message)}</strong></div>`;
}

function renderStats(counts) {
  const normalized = Object.fromEntries((counts || []).map((item) => [String(item.label || '').toUpperCase(), Number(item.total) || 0]));
  const labels = [
    ['Artifacts', normalized.ARTIFACT || 0],
    ['Galleries', normalized.GALLERY || 0],
    ['Exhibitions', normalized.EXHIBITION || 0],
    ['Events', normalized.EVENT || 0]
  ];
  $('stats').innerHTML = labels.map(([label, total]) => `
    <article class="stat-card"><span>${safe(label)}</span><strong>${total}</strong></article>
  `).join('');
}

function artifactCard(artifact) {
  const title = valueOf(artifact, 'title', 'Title', 'name', 'Name') || 'Untitled artifact';
  const origin = valueOf(artifact, 'origin', 'Origin') || 'Origin not recorded';
  const period = valueOf(artifact, 'period', 'Period');
  const type = valueOf(artifact, 'type', 'Type_Name', 'category') || 'Museum artifact';
  const galleryNames = Array.isArray(artifact.galleries) ? artifact.galleries.filter(Boolean) : [];
  const gallery = galleryNames.length ? galleryNames.join(', ') : valueOf(artifact, 'gallery', 'Gallery_Name');
  return `<article class="record-card artifact-card">
    ${imageMarkup(artifact, 'artifacts', title)}
    <div class="card-content">
      <span class="tag">${safe(type)}</span>
      <h3>${safe(title)}</h3>
      <p>${safe(valueOf(artifact, 'description', 'Description') || 'Description not recorded in the database.')}</p>
      <div class="metadata-row"><span>${safe(origin)}</span>${period ? `<span>${safe(period)}</span>` : ''}</div>
      ${gallery ? `<div class="detail-line"><span>Gallery</span><strong>${safe(gallery)}</strong></div>` : ''}
      ${valueOf(artifact, 'status', 'Current_Status') ? `<div class="detail-line"><span>Status</span><strong>${safe(valueOf(artifact, 'status', 'Current_Status'))}</strong></div>` : ''}
    </div>
  </article>`;
}

function galleryCard(gallery) {
  const title = valueOf(gallery, 'name', 'Gallery_Name') || 'Untitled gallery';
  const floor = valueOf(gallery, 'floor', 'Floor');
  const location = valueOf(gallery, 'location', 'Location');
  const count = valueOf(gallery, 'artifactCount', 'artifact_count');
  const capacity = valueOf(gallery, 'capacity', 'Capacity');
  return `<article class="record-card tile-card">
    ${imageMarkup(gallery, 'galleries', title)}
    <div class="card-content"><p class="eyebrow">MUSEUM SPACE</p><h3>${safe(title)}</h3>
      <p>${safe(valueOf(gallery, 'description', 'Description') || 'Gallery details are not recorded.')}</p>
      <div class="metadata-row">${floor ? `<span>${safe(floor)}</span>` : ''}${location ? `<span>${safe(location)}</span>` : ''}</div>
      <div class="detail-line"><span>Connected artifacts</span><strong>${count === '' ? 'Not recorded' : safe(count)}</strong></div>
      ${capacity !== '' ? `<div class="detail-line"><span>Visitor capacity</span><strong>${safe(capacity)}</strong></div>` : ''}
    </div>
  </article>`;
}

function exhibitionCard(exhibition) {
  const title = valueOf(exhibition, 'name', 'Exhibition_Name') || 'Untitled exhibition';
  const artifacts = Array.isArray(exhibition.artifacts) ? exhibition.artifacts.filter(Boolean) : [];
  return `<article class="record-card tile-card">
    ${imageMarkup(exhibition, 'exhibitions', title)}
    <div class="card-content"><p class="eyebrow">CURATED STORY</p><h3>${safe(title)}</h3>
      <p>${safe(valueOf(exhibition, 'description', 'Description') || valueOf(exhibition, 'theme', 'Theme') || 'Exhibition details are not recorded.')}</p>
      ${valueOf(exhibition, 'theme', 'Theme') ? `<div class="detail-line"><span>Theme</span><strong>${safe(valueOf(exhibition, 'theme', 'Theme'))}</strong></div>` : ''}
      <div class="metadata-row"><span>${safe(valueOf(exhibition, 'startDate', 'Start_Date') || 'Start date not set')}</span><span>${safe(valueOf(exhibition, 'endDate', 'End_Date') || 'End date not set')}</span></div>
      ${valueOf(exhibition, 'venue', 'Venue') ? `<div class="detail-line"><span>Venue</span><strong>${safe(valueOf(exhibition, 'venue', 'Venue'))}</strong></div>` : ''}
      ${artifacts.length ? `<div class="detail-line stacked"><span>Connected artifacts</span><strong>${safe(artifacts.join(', '))}</strong></div>` : ''}
    </div>
  </article>`;
}

function eventCard(event) {
  const title = valueOf(event, 'name', 'Event_Name') || 'Untitled event';
  const date = valueOf(event, 'date', 'Event_Date');
  const startTime = valueOf(event, 'startTime', 'Start_Time');
  const endTime = valueOf(event, 'endTime', 'End_Time');
  const capacity = valueOf(event, 'capacity', 'Capacity');
  return `<article class="record-card tile-card">
    ${imageMarkup(event, 'events', title)}
    <div class="card-content"><p class="eyebrow">MUSEUM PROGRAMME</p><h3>${safe(title)}</h3>
      <p>${safe(valueOf(event, 'description', 'Description') || 'Event details are not recorded.')}</p>
      <div class="metadata-row">${date ? `<span>${safe(date)}</span>` : ''}${startTime || endTime ? `<span>${safe(startTime)}${startTime && endTime ? ' – ' : ''}${safe(endTime)}</span>` : ''}</div>
      ${valueOf(event, 'venue', 'Venue') ? `<div class="detail-line"><span>Venue</span><strong>${safe(valueOf(event, 'venue', 'Venue'))}</strong></div>` : ''}
      ${capacity !== '' ? `<div class="detail-line"><span>Capacity</span><strong>${safe(capacity)} people</strong></div>` : ''}
    </div>
  </article>`;
}

function dedupeById(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const id = recordId(item);
    if (!id || id === 'undefined') return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

async function loadStats() {
  try {
    const data = await get('/stats');
    renderStats(data.counts || []);
  } catch (error) {
    console.error('Stats request failed:', error);
    $('stats').innerHTML = `<div class="empty-state"><strong>Live counts unavailable</strong><p>${safe(error.message)}</p></div>`;
  }
}

async function loadArtifacts(search = '') {
  const container = $('artifacts-list');
  if (container) container.innerHTML = '<div class="loading-state">Loading artifacts from Neo4j…</div>';
  try {
    const data = await get(`/artifacts?search=${encodeURIComponent(search)}`);
    const items = dedupeById(data.artifacts || []);
    state.artifacts = items;
    state.loaded.artifacts = true;
    if (container) {
      container.innerHTML = items.length ? items.map(artifactCard).join('') : '';
      if (!items.length) showEmpty('artifacts-list', 'No artifacts match your search.');
    }
    $('featured-artifacts').innerHTML = items.length ? items.slice(0, 3).map(artifactCard).join('') : '';
    if (!items.length) showEmpty('featured-artifacts', search ? 'No artifacts match your search.' : 'No artifacts were returned by Neo4j.');
  } catch (error) {
    console.error('Artifact request failed:', error);
    if (container) showError('artifacts-list', error.message);
    $('featured-artifacts').innerHTML = `<div class="empty-state"><strong>Featured artifacts unavailable</strong><p>${safe(error.message)}</p></div>`;
  }
}

async function loadGalleries() {
  $('galleries-list').innerHTML = '<div class="loading-state">Loading galleries from Neo4j…</div>';
  try {
    const data = await get('/galleries');
    state.galleries = dedupeById(data.galleries || []);
    state.loaded.galleries = true;
    $('galleries-list').innerHTML = state.galleries.length ? state.galleries.map(galleryCard).join('') : '';
    if (!state.galleries.length) showEmpty('galleries-list', 'No galleries were returned by Neo4j.');
  } catch (error) { console.error('Gallery request failed:', error); showError('galleries-list', error.message); }
}

async function loadExhibitions() {
  $('exhibitions-list').innerHTML = '<div class="loading-state">Loading exhibitions from Neo4j…</div>';
  try {
    const data = await get('/exhibitions');
    state.exhibitions = dedupeById(data.exhibitions || []);
    state.loaded.exhibitions = true;
    $('exhibitions-list').innerHTML = state.exhibitions.length ? state.exhibitions.map(exhibitionCard).join('') : '';
    if (!state.exhibitions.length) showEmpty('exhibitions-list', 'No exhibitions were returned by Neo4j.');
  } catch (error) { console.error('Exhibition request failed:', error); showError('exhibitions-list', error.message); }
}

async function loadEvents() {
  $('events-list').innerHTML = '<div class="loading-state">Loading events from Neo4j…</div>';
  try {
    const data = await get('/events');
    state.events = dedupeById(data.events || []);
    state.loaded.events = true;
    $('events-list').innerHTML = state.events.length ? state.events.map(eventCard).join('') : '';
    if (!state.events.length) showEmpty('events-list', 'No events were returned by Neo4j.');
  } catch (error) { console.error('Event request failed:', error); showError('events-list', error.message); }
}

async function checkConnection() {
  try {
    const data = await get('/health');
    $('connection-label').textContent = data.database || 'Neo4j connected';
    $('connection-label').parentElement?.classList.add('is-connected');
  } catch (error) {
    $('connection-label').textContent = 'Database not connected';
    $('connection-label').parentElement?.classList.remove('is-connected');
    console.error('Health check failed:', error);
  }
}

function showPage(page) {
  const target = $(`${page}-page`);
  if (!target) return;
  document.querySelectorAll('.page').forEach((section) => section.classList.add('hidden'));
  target.classList.remove('hidden');
  document.querySelectorAll('.nav-link').forEach((button) => button.classList.toggle('active', button.dataset.page === page));
  $('page-title').textContent = ({
    overview: 'Museum overview', artifacts: 'Explore artifacts', galleries: 'Museum galleries',
    exhibitions: 'Current exhibitions', events: 'Museum events'
  })[page] || 'SmartMuseum';

  if (page === 'artifacts' && !state.loaded.artifacts) loadArtifacts($('artifact-search')?.value || '');
  if (page === 'galleries' && !state.loaded.galleries) loadGalleries();
  if (page === 'exhibitions' && !state.loaded.exhibitions) loadExhibitions();
  if (page === 'events' && !state.loaded.events) loadEvents();
}

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});
document.querySelectorAll('[data-go]').forEach((button) => {
  button.addEventListener('click', () => showPage(button.dataset.go));
});
const searchInput = $('artifact-search');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(() => loadArtifacts(searchInput.value), 250);
  });
}

checkConnection();
loadStats();
// Load all four categories independently: one failed endpoint must not hide others.
loadArtifacts('');
loadGalleries();
loadExhibitions();
loadEvents();
