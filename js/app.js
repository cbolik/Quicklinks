import { loadLinks, saveLinks } from './storage.js';
import { initCarousel } from './carousel.js';
import { initDialog, openDialog } from './dialog.js';
import { isEditMode, enterEditMode, initMenu, wireEditHandlers } from './edit.js';

// --- Platform detection ---
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isMac = /Macintosh/.test(ua) && !isIOS;

// --- Spotify link handling ---
const SPOTIFY_TYPES = new Set(['playlist', 'track', 'album', 'artist', 'show', 'episode']);

const deriveHttpsUrl = (uri) => {
  const [scheme, type, id] = uri.split(':');
  return (scheme === 'spotify' && SPOTIFY_TYPES.has(type) && id)
    ? `https://open.spotify.com/${type}/${id}`
    : null;
};

const applySpotifyRewriting = () => {
  carousel.querySelectorAll('a[href^="spotify:"]').forEach(a => {
    if (!isMac) {
      const url = deriveHttpsUrl(a.getAttribute('href'));
      if (url) a.setAttribute('href', url);
    } else {
      a.addEventListener('click', (e) => {
        const uri = a.getAttribute('href');
        const url = deriveHttpsUrl(uri);
        if (!url) return;
        e.preventDefault();
        const timer = setTimeout(() => { window.location.href = url; }, 800);
        window.addEventListener('blur', () => clearTimeout(timer), { once: true });
        window.location.href = uri;
      });
    }
  });
};

// --- DOM references ---
const carousel       = document.querySelector('.carousel');
const arrowLeft      = document.querySelector('.arrow-left');
const arrowRight     = document.querySelector('.arrow-right');
const fab            = document.querySelector('.fab');
const indicators     = document.querySelector('.indicators');
const pageHeader     = document.querySelector('.page-header');
const pageHeaderLabel = pageHeader.querySelector('.label');
const pageHeaderDots  = pageHeader.querySelector('.page-header-dots');
const menuBtn        = pageHeader.querySelector('.menu-btn');
const menuDropdown   = pageHeader.querySelector('.menu-dropdown');
const importFileInput = document.getElementById('import-file');
const dialogBackdrop = document.querySelector('.dialog-backdrop');

// --- Render pipeline ---
const render = () => {
  const links = loadLinks();
  carousel.innerHTML = '';

  if (links.length === 0) {
    renderEmptyState();
    indicators.style.display = 'none';
    pageHeader.classList.add('hidden');
    return;
  }

  // Group by category, preserving insertion order
  const categories = [];
  const grouped = {};
  for (const link of links) {
    if (!grouped[link.category]) {
      grouped[link.category] = [];
      categories.push(link.category);
    }
    grouped[link.category].push(link);
  }

  indicators.style.display = categories.length > 1 ? '' : 'none';
  pageHeader.classList.remove('hidden');

  for (const cat of categories) {
    const section = document.createElement('section');
    section.className = 'page';
    section.dataset.category = cat;

    const pageContent = document.createElement('div');
    pageContent.className = 'page-content';

    const nav = document.createElement('nav');
    nav.dataset.category = cat;

    for (const link of grouped[cat]) {
      const wrapper = document.createElement('div');
      wrapper.className = 'link-wrapper';
      wrapper.dataset.id = link.id;

      const handle = Object.assign(document.createElement('button'), {
        className: 'drag-handle', textContent: '☰',
      });
      handle.setAttribute('aria-label', 'Drag to reorder');

      const a = Object.assign(document.createElement('a'), {
        href: link.url, textContent: link.name, className: 'link-content',
      });

      const editBtn = Object.assign(document.createElement('button'), {
        className: 'edit-link-btn', textContent: '✎',
      });
      editBtn.setAttribute('aria-label', `Edit ${link.name}`);

      const delBtn = Object.assign(document.createElement('button'), {
        className: 'delete-btn', textContent: '×',
      });
      delBtn.setAttribute('aria-label', `Delete ${link.name}`);

      wrapper.append(handle, a, editBtn, delBtn);
      nav.appendChild(wrapper);
    }

    pageContent.appendChild(nav);
    section.appendChild(pageContent);
    carousel.appendChild(section);
  }

  applySpotifyRewriting();
  initCarousel(carousel, categories, { dialogBackdrop, arrowLeft, arrowRight, pageHeaderLabel, pageHeaderDots });
  wireEditHandlers(carousel, { openDialog, onRender: render });

  if (isEditMode()) {
    document.body.classList.add('edit-mode');
    menuBtn.textContent = 'Done';
  }
};

const renderEmptyState = () => {
  pageHeader.classList.add('hidden');
  const section = document.createElement('section');
  section.className = 'page';

  const p = Object.assign(document.createElement('p'), {
    className: 'empty-message', textContent: 'Your links will appear here',
  });

  const btn = Object.assign(document.createElement('button'), {
    className: 'empty-add-btn', textContent: '+ Add Link',
  });
  btn.addEventListener('click', () => openDialog());

  section.append(p, btn);
  carousel.appendChild(section);
};

// --- One-time wiring ---
fab.addEventListener('click', () => openDialog());

initDialog(
  { dialogBackdrop,
    dialogTitle: dialogBackdrop.querySelector('.dialog-title'),
    addForm: document.getElementById('add-link-form'),
    categoryInput: document.getElementById('link-category'),
    nameInput: document.getElementById('link-name'),
    urlInput: document.getElementById('link-url'),
    categoryList: document.getElementById('category-list'),
    submitBtn: document.querySelector('.btn-add'),
    cancelBtn: document.querySelector('.btn-cancel'),
    carousel },
  render
);

initMenu({ menuBtn, menuDropdown, importFileInput }, { openDialog, onRender: render });

// --- Boot ---
render();
