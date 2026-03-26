# Quicklinks localStorage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rearchitect the app from hardcoded HTML links to localStorage-driven dynamic rendering with add/delete UI, rebrand to Quicklinks.

**Architecture:** `index.html` becomes a shell (no hardcoded links). `script.js` reads localStorage, dynamically generates carousel pages, wires Spotify link rewriting, carousel navigation, and delete handlers. A modal dialog handles adding new links. Delete uses swipe-left on touch and hover-X on desktop.

**Tech Stack:** Vanilla JS (ES5-compatible IIFE), CSS3, localStorage, no dependencies.

**Spec:** `docs/superpowers/specs/2026-03-26-quicklinks-localstorage-design.md`

---

### Task 1: Update `index.html` to shell

**Files:**
- Modify: `index.html`

- [ ] **Step 1:** Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#0d0d0d" />
  <link rel="icon" type="image/svg+xml" href="favicon.svg" />
  <link rel="icon" href="favicon.ico" sizes="any" />
  <link rel="apple-touch-icon" href="apple-touch-icon.png" />
  <title>Quicklinks</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="carousel"></main>

  <div class="indicators">
    <button class="arrow arrow-left" aria-label="Previous page">&#8249;</button>
    <div class="dots"></div>
    <button class="arrow arrow-right" aria-label="Next page">&#8250;</button>
  </div>

  <button class="fab" aria-label="Add link">+</button>

  <div class="dialog-backdrop hidden">
    <div class="dialog">
      <h2 class="dialog-title">Add Link</h2>
      <form id="add-link-form">
        <div class="form-group">
          <input type="text" id="link-category" list="category-list" placeholder="e.g. Playlists" required />
          <datalist id="category-list"></datalist>
        </div>
        <div class="form-group">
          <input type="text" id="link-name" placeholder="e.g. Current Tracks" required />
        </div>
        <div class="form-group">
          <input type="text" id="link-url" placeholder="e.g. spotify:playlist:abc123" required />
        </div>
        <div class="dialog-buttons">
          <button type="button" class="btn-cancel">Cancel</button>
          <button type="submit" class="btn-add">Add</button>
        </div>
      </form>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2:** Commit

```bash
git add index.html
git commit -m "feat: convert index.html to shell for dynamic rendering"
```

---

### Task 2: Update `style.css` with new styles

**Files:**
- Modify: `style.css`

- [ ] **Step 1:** Replace the entire file with:

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
}

body {
  background-color: #0d0d0d;
  color: rgba(255, 255, 255, 0.75);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* --- Carousel layout --- */

.carousel {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  height: 100vh;
  scrollbar-width: none;
}

.carousel::-webkit-scrollbar {
  display: none;
}

.page {
  flex: 0 0 100%;
  scroll-snap-align: center;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem 4rem;
  overflow-y: auto;
}

/* --- Typography --- */

.label {
  font-size: 0.8rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1.6rem;
}

nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
}

/* --- Link wrapper (for delete support) --- */

.link-wrapper {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.link-content {
  display: block;
  position: relative;
  z-index: 1;
  font-size: clamp(1.5rem, 6vw, 1.9rem);
  font-weight: 300;
  line-height: 2.2;
  color: #1DB954;
  text-decoration: none;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease;
  background-color: #0d0d0d;
}

.link-content:hover,
.link-content:focus-visible {
  color: #1ed760;
}

.link-content:active {
  color: rgba(29, 185, 84, 0.55);
}

/* --- Delete button --- */

.delete-btn {
  position: absolute;
  right: 0;
  top: 0;
  height: 100%;
  background: #e74c3c;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 400;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Touch devices: red "Delete" behind swipe */
@media (hover: none) {
  .delete-btn {
    width: 80px;
    padding: 0 1rem;
  }
}

/* Desktop: small X on hover */
@media (hover: hover) {
  .delete-btn {
    width: 2rem;
    background: transparent;
    color: rgba(255, 255, 255, 0.2);
    font-size: 1.1rem;
    opacity: 0;
    transition: opacity 0.15s ease, color 0.15s ease;
    z-index: 2;
  }

  .link-wrapper:hover .delete-btn {
    opacity: 1;
  }

  .delete-btn:hover {
    color: #e74c3c;
  }
}

/* --- Indicators --- */

.indicators {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  gap: 0.5rem;
  z-index: 10;
  pointer-events: none;
}

.dots {
  display: flex;
  gap: 8px;
  align-items: center;
  pointer-events: auto;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  padding: 0;
  cursor: pointer;
  transition: background 0.2s ease;
}

.dot.active {
  background: #1DB954;
}

.arrow {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  display: none;
  pointer-events: auto;
}

@media (hover: hover) {
  .arrow {
    display: block;
  }

  .arrow:hover {
    color: rgba(255, 255, 255, 0.6);
  }
}

/* --- Floating add button --- */

.fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #1DB954;
  color: white;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.fab:hover {
  background: #1ed760;
}

/* --- Dialog --- */

.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  padding: 1rem;
}

.dialog-backdrop.hidden {
  display: none;
}

.dialog {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 1.5rem;
  width: 90%;
  max-width: 360px;
}

.dialog-title {
  color: white;
  font-size: 1.1rem;
  font-weight: 400;
  margin-bottom: 1.2rem;
}

.form-group {
  margin-bottom: 0.8rem;
}

.form-group input {
  width: 100%;
  padding: 0.7rem 0.8rem;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s ease;
}

.form-group input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.form-group input:focus {
  border-color: #1DB954;
}

.dialog-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.8rem;
  margin-top: 1.2rem;
}

.btn-cancel {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-family: inherit;
}

.btn-cancel:hover {
  color: rgba(255, 255, 255, 0.6);
}

.btn-add {
  background: #1DB954;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.5rem 1.2rem;
  font-family: inherit;
  transition: background 0.15s ease;
}

.btn-add:hover {
  background: #1ed760;
}

/* --- Empty state --- */

.empty-message {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.05em;
  margin-bottom: 1.5rem;
}

.empty-add-btn {
  background: none;
  border: 1px solid #1DB954;
  color: #1DB954;
  border-radius: 8px;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.6rem 1.4rem;
  font-family: inherit;
  transition: background 0.15s ease, color 0.15s ease;
}

.empty-add-btn:hover {
  background: #1DB954;
  color: white;
}

/* --- Utility --- */

.hidden {
  display: none !important;
}
```

- [ ] **Step 2:** Commit

```bash
git add style.css
git commit -m "feat: add styles for dialog, fab, delete, and empty state"
```

---

### Task 3: Rewrite `script.js`

**Files:**
- Modify: `script.js`

- [ ] **Step 1:** Replace the entire file with:

```javascript
(function () {
  // --- Platform detection ---
  var ua = navigator.userAgent;
  var isIOS = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isMac = /Macintosh/.test(ua) && !isIOS;
  var isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  var SPOTIFY_TYPES = ['playlist', 'track', 'album', 'artist', 'show', 'episode'];

  function deriveHttpsUrl(uri) {
    var parts = uri.split(':');
    if (parts.length !== 3) return null;
    if (SPOTIFY_TYPES.indexOf(parts[1]) === -1) return null;
    return 'https://open.spotify.com/' + parts[1] + '/' + parts[2];
  }

  // --- localStorage helpers ---
  var STORAGE_KEY = 'quicklinks';

  function loadLinks() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }

  function generateId() {
    var hex = '';
    for (var i = 0; i < 8; i++) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex;
  }

  // --- DOM references ---
  var carousel = document.querySelector('.carousel');
  var dotsContainer = document.querySelector('.dots');
  var arrowLeft = document.querySelector('.arrow-left');
  var arrowRight = document.querySelector('.arrow-right');
  var fab = document.querySelector('.fab');
  var dialogBackdrop = document.querySelector('.dialog-backdrop');
  var addForm = document.getElementById('add-link-form');
  var categoryInput = document.getElementById('link-category');
  var nameInput = document.getElementById('link-name');
  var urlInput = document.getElementById('link-url');
  var categoryList = document.getElementById('category-list');
  var cancelBtn = document.querySelector('.btn-cancel');
  var indicators = document.querySelector('.indicators');

  // Track scroll handler so we can remove it on re-render
  var currentScrollHandler = null;
  var currentKeyHandler = null;

  // --- Render pipeline ---
  function render() {
    var links = loadLinks();
    carousel.innerHTML = '';
    dotsContainer.innerHTML = '';

    if (links.length === 0) {
      renderEmptyState();
      indicators.style.display = 'none';
      return;
    }

    indicators.style.display = '';

    // Group by category, preserving first-seen order
    var categories = [];
    var grouped = {};
    links.forEach(function (link) {
      if (!grouped[link.category]) {
        grouped[link.category] = [];
        categories.push(link.category);
      }
      grouped[link.category].push(link);
    });

    // Render pages
    categories.forEach(function (cat) {
      var section = document.createElement('section');
      section.className = 'page';

      var h1 = document.createElement('h1');
      h1.className = 'label';
      h1.textContent = cat;
      section.appendChild(h1);

      var nav = document.createElement('nav');
      grouped[cat].forEach(function (link) {
        var wrapper = document.createElement('div');
        wrapper.className = 'link-wrapper';
        wrapper.setAttribute('data-id', link.id);

        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.setAttribute('aria-label', 'Delete ' + link.name);
        delBtn.textContent = isTouch ? 'Delete' : '\u00d7';

        var a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.name;
        a.className = 'link-content';

        wrapper.appendChild(delBtn);
        wrapper.appendChild(a);
        nav.appendChild(wrapper);
      });

      section.appendChild(nav);
      carousel.appendChild(section);
    });

    applySpotifyRewriting();
    initCarousel();
    wireDeleteHandlers();
  }

  function renderEmptyState() {
    var section = document.createElement('section');
    section.className = 'page';

    var p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = 'Your links will appear here';
    section.appendChild(p);

    var btn = document.createElement('button');
    btn.className = 'empty-add-btn';
    btn.textContent = '+ Add Link';
    btn.addEventListener('click', openDialog);
    section.appendChild(btn);

    carousel.appendChild(section);
  }

  // --- Spotify link rewriting ---
  function applySpotifyRewriting() {
    var spotifyLinks = carousel.querySelectorAll('a[href^="spotify:"]');
    if (!isMac) {
      spotifyLinks.forEach(function (a) {
        var url = deriveHttpsUrl(a.getAttribute('href'));
        if (url) a.setAttribute('href', url);
      });
    } else {
      spotifyLinks.forEach(function (a) {
        a.addEventListener('click', function (e) {
          var uri = a.getAttribute('href');
          var url = deriveHttpsUrl(uri);
          if (!url) return;
          e.preventDefault();
          var timer = setTimeout(function () { window.location.href = url; }, 800);
          window.addEventListener('blur', function () { clearTimeout(timer); }, { once: true });
          window.location.href = uri;
        });
      });
    }
  }

  // --- Carousel navigation ---
  function initCarousel() {
    var pages = carousel.querySelectorAll('.page');
    dotsContainer.innerHTML = '';

    // Clean up previous handlers
    if (currentScrollHandler) {
      carousel.removeEventListener('scroll', currentScrollHandler);
    }
    if (currentKeyHandler) {
      document.removeEventListener('keydown', currentKeyHandler);
    }

    if (pages.length <= 1) return;

    pages.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
      dot.addEventListener('click', function () {
        carousel.scrollTo({ left: i * carousel.offsetWidth, behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);
    });

    var dots = dotsContainer.querySelectorAll('.dot');

    currentScrollHandler = function () {
      var index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === index);
      });
    };
    carousel.addEventListener('scroll', currentScrollHandler);

    if (arrowLeft) {
      arrowLeft.onclick = function () {
        carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
      };
    }
    if (arrowRight) {
      arrowRight.onclick = function () {
        carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
      };
    }

    currentKeyHandler = function (e) {
      if (!dialogBackdrop.classList.contains('hidden')) return;
      if (e.key === 'ArrowLeft') {
        carousel.scrollBy({ left: -carousel.offsetWidth, behavior: 'smooth' });
      } else if (e.key === 'ArrowRight') {
        carousel.scrollBy({ left: carousel.offsetWidth, behavior: 'smooth' });
      }
    };
    document.addEventListener('keydown', currentKeyHandler);
  }

  // --- Delete handling ---
  function wireDeleteHandlers() {
    var wrappers = document.querySelectorAll('.link-wrapper');

    wrappers.forEach(function (wrapper) {
      var delBtn = wrapper.querySelector('.delete-btn');
      var linkContent = wrapper.querySelector('.link-content');
      var id = wrapper.getAttribute('data-id');

      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteLink(id);
      });

      if (isTouch) {
        var startX = 0;
        var currentX = 0;
        var swiping = false;

        linkContent.addEventListener('touchstart', function (e) {
          startX = e.touches[0].clientX;
          currentX = startX;
          swiping = true;
          linkContent.style.transition = 'none';

          // Close any other open swipes
          document.querySelectorAll('.link-content.swiped').forEach(function (el) {
            if (el !== linkContent) {
              el.classList.remove('swiped');
              el.style.transform = '';
              el.style.transition = '';
            }
          });
        }, { passive: true });

        linkContent.addEventListener('touchmove', function (e) {
          if (!swiping) return;
          currentX = e.touches[0].clientX;
          var dx = currentX - startX;
          if (dx > 0) dx = 0;
          linkContent.style.transform = 'translateX(' + dx + 'px)';
        }, { passive: true });

        linkContent.addEventListener('touchend', function () {
          swiping = false;
          var dx = currentX - startX;
          linkContent.style.transition = 'transform 0.2s ease';
          if (dx < -80) {
            linkContent.classList.add('swiped');
            linkContent.style.transform = 'translateX(-80px)';
          } else {
            linkContent.classList.remove('swiped');
            linkContent.style.transform = '';
          }
        });
      }
    });
  }

  function deleteLink(id) {
    var links = loadLinks();
    links = links.filter(function (l) { return l.id !== id; });
    saveLinks(links);
    render();
  }

  // --- Dialog handling ---
  function openDialog() {
    var links = loadLinks();
    var cats = [];
    links.forEach(function (l) {
      if (cats.indexOf(l.category) === -1) cats.push(l.category);
    });
    categoryList.innerHTML = '';
    cats.forEach(function (cat) {
      var option = document.createElement('option');
      option.value = cat;
      categoryList.appendChild(option);
    });

    categoryInput.value = '';
    nameInput.value = '';
    urlInput.value = '';
    dialogBackdrop.classList.remove('hidden');
    categoryInput.focus();
  }

  function closeDialog() {
    dialogBackdrop.classList.add('hidden');
  }

  fab.addEventListener('click', openDialog);
  cancelBtn.addEventListener('click', closeDialog);

  dialogBackdrop.addEventListener('click', function (e) {
    if (e.target === dialogBackdrop) closeDialog();
  });

  addForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var category = categoryInput.value.trim();
    var name = nameInput.value.trim();
    var url = urlInput.value.trim();

    if (!category || !name || !url) return;

    var links = loadLinks();
    links.push({
      id: generateId(),
      category: category,
      name: name,
      url: url
    });
    saveLinks(links);
    closeDialog();
    render();

    // Navigate to the page containing the new link
    var allLinks = loadLinks();
    var cats = [];
    allLinks.forEach(function (l) {
      if (cats.indexOf(l.category) === -1) cats.push(l.category);
    });
    var pageIndex = cats.indexOf(category);
    if (pageIndex >= 0) {
      setTimeout(function () {
        carousel.scrollTo({ left: pageIndex * carousel.offsetWidth, behavior: 'smooth' });
      }, 100);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !dialogBackdrop.classList.contains('hidden')) {
      closeDialog();
    }
  });

  // --- Initial render ---
  render();
})();
```

- [ ] **Step 2:** Verify `deriveHttpsUrl` logic still works

```bash
node -e "
var SPOTIFY_TYPES = ['playlist','track','album','artist','show','episode'];
function deriveHttpsUrl(uri) {
  var parts = uri.split(':');
  if (parts.length !== 3) return null;
  if (SPOTIFY_TYPES.indexOf(parts[1]) === -1) return null;
  return 'https://open.spotify.com/' + parts[1] + '/' + parts[2];
}
console.assert(deriveHttpsUrl('spotify:playlist:ABC') === 'https://open.spotify.com/playlist/ABC');
console.assert(deriveHttpsUrl('spotify:track:XYZ') === 'https://open.spotify.com/track/XYZ');
console.assert(deriveHttpsUrl('spotify:user:bad') === null);
console.assert(deriveHttpsUrl('notspotify') === null);
console.log('All assertions passed');
"
```

Expected: `All assertions passed`

- [ ] **Step 3:** Commit

```bash
git add script.js
git commit -m "feat: rewrite script.js for localStorage-driven rendering"
```

---

### Task 4: Verify and push

- [ ] **Step 1:** Start the dev server and take a screenshot to verify the empty state renders (empty carousel with "Your links will appear here" message and "+ Add Link" button).

- [ ] **Step 2:** Use the preview to click "+ Add Link", fill in a test link, verify it appears on the page.

- [ ] **Step 3:** Push

```bash
git push
```

---
