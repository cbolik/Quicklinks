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

  function updateLink(id, data) {
    var links = loadLinks();
    links = links.map(function (l) {
      return l.id === id ? { id: l.id, category: data.category, name: data.name, url: data.url } : l;
    });
    saveLinks(links);
  }

  function reorderLinks(category, orderedIds) {
    var links = loadLinks();
    // Extract links for this category in the new order
    var byId = {};
    links.forEach(function (l) { byId[l.id] = l; });
    var reordered = orderedIds.map(function (id) { return byId[id]; }).filter(Boolean);
    // Rebuild full array: links from other categories in their original positions,
    // with this category's links replaced by the reordered set
    var result = [];
    var categoryLinks = reordered.slice();
    links.forEach(function (l) {
      if (l.category === category) {
        result.push(categoryLinks.shift());
      } else {
        result.push(l);
      }
    });
    saveLinks(result);
  }

  // --- DOM references ---
  var carousel = document.querySelector('.carousel');
  var arrowLeft = document.querySelector('.arrow-left');
  var arrowRight = document.querySelector('.arrow-right');
  var fab = document.querySelector('.fab');
  var dialogBackdrop = document.querySelector('.dialog-backdrop');
  var dialogTitle = dialogBackdrop.querySelector('.dialog-title');
  var addForm = document.getElementById('add-link-form');
  var categoryInput = document.getElementById('link-category');
  var nameInput = document.getElementById('link-name');
  var urlInput = document.getElementById('link-url');
  var categoryList = document.getElementById('category-list');
  var cancelBtn = document.querySelector('.btn-cancel');
  var submitBtn = addForm.querySelector('.btn-add');
  var indicators = document.querySelector('.indicators');
  var pageHeader = document.querySelector('.page-header');
  var pageHeaderLabel = pageHeader.querySelector('.label');
  var pageHeaderDots = pageHeader.querySelector('.page-header-dots');
  var editBtn = pageHeader.querySelector('.edit-btn');

  // Edit mode state
  var editMode = false;
  var editingLinkId = null;

  // Track handlers so we can remove them on re-render
  var currentScrollHandler = null;
  var currentKeyHandler = null;
  var currentTouchStartHandler = null;
  var currentTouchMoveHandler = null;
  var currentTouchEndHandler = null;

  // --- Render pipeline ---
  function render() {
    var links = loadLinks();
    carousel.innerHTML = '';

    if (links.length === 0) {
      renderEmptyState();
      indicators.style.display = 'none';
      pageHeader.classList.add('hidden');
      return;
    }

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

    indicators.style.display = categories.length > 1 ? '' : 'none';

    pageHeader.classList.remove('hidden');

    // Render pages
    categories.forEach(function (cat) {
      var section = document.createElement('section');
      section.className = 'page';
      section.setAttribute('data-category', cat);

      var pageContent = document.createElement('div');
      pageContent.className = 'page-content';

      var nav = document.createElement('nav');
      nav.setAttribute('data-category', cat);
      grouped[cat].forEach(function (link) {
        var wrapper = document.createElement('div');
        wrapper.className = 'link-wrapper';
        wrapper.setAttribute('data-id', link.id);

        var handle = document.createElement('button');
        handle.className = 'drag-handle';
        handle.setAttribute('aria-label', 'Drag to reorder');
        handle.textContent = '\u2630';

        var a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.name;
        a.className = 'link-content';

        var editLinkBtn = document.createElement('button');
        editLinkBtn.className = 'edit-link-btn';
        editLinkBtn.setAttribute('aria-label', 'Edit ' + link.name);
        editLinkBtn.textContent = '\u270e';

        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.setAttribute('aria-label', 'Delete ' + link.name);
        delBtn.textContent = '\u00d7';

        wrapper.appendChild(handle);
        wrapper.appendChild(a);
        wrapper.appendChild(editLinkBtn);
        wrapper.appendChild(delBtn);
        nav.appendChild(wrapper);
      });

      pageContent.appendChild(nav);
      section.appendChild(pageContent);
      carousel.appendChild(section);
    });

    applySpotifyRewriting();
    initCarousel(categories);
    wireEditHandlers();
    if (editMode) {
      document.body.classList.add('edit-mode');
      editBtn.textContent = 'Done';
    }
  }

  function renderEmptyState() {
    pageHeader.classList.add('hidden');
    var section = document.createElement('section');
    section.className = 'page';

    var p = document.createElement('p');
    p.className = 'empty-message';
    p.textContent = 'Your links will appear here';
    section.appendChild(p);

    var btn = document.createElement('button');
    btn.className = 'empty-add-btn';
    btn.textContent = '+ Add Link';
    btn.addEventListener('click', function () { openDialog(); });
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
  function initCarousel(categories) {
    var pages = carousel.querySelectorAll('.page');

    // Clean up previous handlers
    if (currentScrollHandler) {
      carousel.removeEventListener('scroll', currentScrollHandler);
    }
    if (currentKeyHandler) {
      document.removeEventListener('keydown', currentKeyHandler);
    }
    if (currentTouchStartHandler) {
      carousel.removeEventListener('touchstart', currentTouchStartHandler);
      carousel.removeEventListener('touchmove', currentTouchMoveHandler);
      carousel.removeEventListener('touchend', currentTouchEndHandler);
    }

    // Populate fixed header with initial label and dots
    pageHeaderLabel.textContent = categories[0] || '';
    pageHeaderDots.innerHTML = '';

    if (pages.length <= 1) return;

    var total = pages.length;
    var wrapping = false;

    // Single set of dots in the fixed header
    var dots = [];
    for (var di = 0; di < total; di++) {
      (function (i) {
        var dot = document.createElement('button');
        dot.className = 'dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
        dot.addEventListener('click', function () {
          var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
          scrollToPage(i, i > cur ? 1 : -1);
        });
        pageHeaderDots.appendChild(dot);
        dots.push(dot);
      })(di);
    }

    function updateHeader() {
      if (wrapping) return;
      var index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      if (index < 0 || index >= total) return;
      pageHeaderLabel.textContent = categories[index];
      dots.forEach(function (dot, i) {
        dot.classList.toggle('active', i === index);
      });
    }

    currentScrollHandler = updateHeader;
    carousel.addEventListener('scroll', currentScrollHandler);

    // JS rAF animation: disables scroll-snap during wrap so browser can't fight the direction
    function smoothScroll(from, to, cb) {
      var duration = 350;
      var start = null;
      carousel.style.scrollSnapType = 'none';
      carousel.scrollLeft = from;
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var ease = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
        carousel.scrollLeft = from + (to - from) * ease;
        if (p < 1) {
          requestAnimationFrame(step);
        } else {
          carousel.scrollLeft = to;
          cb();
        }
      });
    }

    function wrapRight() {
      // Last → first: append clone of page 0, animate right, teleport back
      wrapping = true;
      var pageWidth = carousel.offsetWidth;
      var clone = pages[0].cloneNode(true);
      carousel.appendChild(clone);
      smoothScroll((total - 1) * pageWidth, total * pageWidth, function () {
        carousel.scrollLeft = 0;
        clone.remove();
        carousel.style.scrollSnapType = '';
        wrapping = false;
        updateHeader();
      });
    }

    function wrapLeft() {
      // First → last: prepend clone of last page, animate left, teleport to real last page
      wrapping = true;
      var pageWidth = carousel.offsetWidth;
      var clone = pages[total - 1].cloneNode(true);
      carousel.insertBefore(clone, pages[0]);
      smoothScroll(pageWidth, 0, function () {
        carousel.scrollLeft = total * pageWidth;
        clone.remove();
        carousel.scrollLeft = (total - 1) * pageWidth;
        carousel.style.scrollSnapType = '';
        wrapping = false;
        updateHeader();
      });
    }

    // dir: 1 = forward (right), -1 = backward (left)
    function scrollToPage(idx, dir) {
      if (wrapping) return;
      var pageWidth = carousel.offsetWidth;
      var cur = Math.round(carousel.scrollLeft / pageWidth);
      if (idx === cur) return;
      var forward = dir > 0;
      if (forward && cur === total - 1 && idx === 0) {
        wrapRight();
      } else if (!forward && cur === 0 && idx === total - 1) {
        wrapLeft();
      } else {
        carousel.scrollTo({ left: idx * pageWidth, behavior: 'smooth' });
      }
    }

    if (arrowLeft) {
      arrowLeft.onclick = function () {
        var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        scrollToPage((cur - 1 + total) % total, -1);
      };
    }
    if (arrowRight) {
      arrowRight.onclick = function () {
        var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        scrollToPage((cur + 1) % total, 1);
      };
    }

    currentKeyHandler = function (e) {
      if (!dialogBackdrop.classList.contains('hidden')) return;
      var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      if (e.key === 'ArrowLeft') {
        scrollToPage((cur - 1 + total) % total, -1);
      } else if (e.key === 'ArrowRight') {
        scrollToPage((cur + 1) % total, 1);
      }
    };
    document.addEventListener('keydown', currentKeyHandler);

    // Touch wrap: pre-place a clone before the swipe starts so there's real
    // content past the edge — the native scroll handles it smoothly, then we
    // teleport invisibly after the snap settles.
    var cloneRight = null;
    var cloneLeft = null;

    function afterSnap(fn) {
      var done = false;
      function run() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        carousel.removeEventListener('scrollend', run);
        fn();
      }
      var timer = setTimeout(run, 500);
      carousel.addEventListener('scrollend', run, { once: true });
    }

    var touchStartX = 0;
    var touchStartY = 0;
    var clonePlaced = false;

    currentTouchStartHandler = function (e) {
      if (wrapping || cloneRight || cloneLeft) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      clonePlaced = false;
    };

    currentTouchMoveHandler = function (e) {
      if (wrapping || clonePlaced || cloneRight || cloneLeft) return;
      var dx = e.touches[0].clientX - touchStartX;
      var dy = e.touches[0].clientY - touchStartY;
      // Only act on clear horizontal swipes (>8px horizontal, more horizontal than vertical)
      if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) return;
      var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      var pageWidth = carousel.offsetWidth;
      clonePlaced = true;

      if (dx < 0 && cur === total - 1) {
        // Swiping left on last page — append clone of first page
        cloneRight = pages[0].cloneNode(true);
        cloneRight.style.pointerEvents = 'none';
        carousel.appendChild(cloneRight);
      } else if (dx > 0 && cur === 0) {
        // Swiping right on first page — prepend clone of last page
        cloneLeft = pages[total - 1].cloneNode(true);
        cloneLeft.style.pointerEvents = 'none';
        carousel.insertBefore(cloneLeft, pages[0]);
        if (carousel.scrollLeft === 0) {
          carousel.scrollLeft = pageWidth;
        }
      }
    };

    currentTouchEndHandler = function () {
      if (wrapping) return;
      if (!cloneRight && !cloneLeft) return;

      afterSnap(function () {
        var pageWidth = carousel.offsetWidth;
        wrapping = true;

        if (cloneRight) {
          if (Math.round(carousel.scrollLeft / pageWidth) >= total) {
            // Reached clone → invisible teleport to real page 0
            carousel.style.scrollSnapType = 'none';
            carousel.scrollLeft = 0;
            cloneRight.remove();
            carousel.style.scrollSnapType = '';
          } else {
            cloneRight.remove();
          }
          cloneRight = null;
        }

        if (cloneLeft) {
          if (Math.round(carousel.scrollLeft / pageWidth) === 0) {
            // Reached clone → teleport to real last page
            carousel.style.scrollSnapType = 'none';
            carousel.scrollLeft = total * pageWidth;
            cloneLeft.remove();
            carousel.scrollLeft = (total - 1) * pageWidth;
            carousel.style.scrollSnapType = '';
          } else {
            // Stayed on same/other page — remove clone and correct position
            var realPage = Math.round(carousel.scrollLeft / pageWidth) - 1;
            carousel.style.scrollSnapType = 'none';
            cloneLeft.remove();
            carousel.scrollLeft = Math.max(0, realPage) * pageWidth;
            carousel.style.scrollSnapType = '';
          }
          cloneLeft = null;
        }

        wrapping = false;
        updateHeader();
      });
    };

    carousel.addEventListener('touchstart', currentTouchStartHandler, { passive: true });
    carousel.addEventListener('touchmove', currentTouchMoveHandler, { passive: true });
    carousel.addEventListener('touchend', currentTouchEndHandler, { passive: true });
  }

  // --- Edit mode toggle ---
  function enterEditMode() {
    editMode = true;
    document.body.classList.add('edit-mode');
    editBtn.textContent = 'Done';
  }

  function exitEditMode() {
    editMode = false;
    document.body.classList.remove('edit-mode');
    editBtn.textContent = 'Edit';
  }

  editBtn.addEventListener('click', function () {
    if (editMode) exitEditMode(); else enterEditMode();
  });

  // --- Edit handlers (delete, edit, drag-to-reorder) ---
  function wireEditHandlers() {
    var wrappers = document.querySelectorAll('.link-wrapper');

    wrappers.forEach(function (wrapper) {
      var id = wrapper.getAttribute('data-id');
      var delBtn = wrapper.querySelector('.delete-btn');
      var editLinkBtn = wrapper.querySelector('.edit-link-btn');
      var handle = wrapper.querySelector('.drag-handle');

      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteLink(id);
      });

      editLinkBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openDialog(id);
      });

      // Drag handle: touch + mouse
      handle.addEventListener('mousedown', function (e) {
        e.preventDefault();
        startDrag(wrapper, e.clientY);
      });

      handle.addEventListener('touchstart', function (e) {
        e.stopPropagation(); // don't trigger carousel swipe
        startDrag(wrapper, e.touches[0].clientY);
      }, { passive: true });
    });
  }

  function deleteLink(id) {
    var links = loadLinks();
    links = links.filter(function (l) { return l.id !== id; });
    saveLinks(links);
    render();
  }

  // --- Drag-to-reorder ---
  function startDrag(wrapper, startY) {
    var nav = wrapper.closest('nav');
    if (!nav) return;
    var category = nav.getAttribute('data-category');
    var currentY = startY;
    var over = null;

    wrapper.classList.add('dragging');

    function getSiblings() {
      return Array.prototype.slice.call(nav.querySelectorAll('.link-wrapper:not(.dragging)'));
    }

    function clearDropIndicators() {
      getSiblings().forEach(function (s) {
        s.classList.remove('drag-above', 'drag-below');
      });
    }

    function findDropTarget(y) {
      var siblings = getSiblings();
      for (var i = 0; i < siblings.length; i++) {
        var rect = siblings[i].getBoundingClientRect();
        var mid = rect.top + rect.height / 2;
        if (y < mid) {
          return { sibling: siblings[i], position: 'above' };
        }
      }
      // Below all siblings
      if (siblings.length > 0) {
        return { sibling: siblings[siblings.length - 1], position: 'below' };
      }
      return null;
    }

    function onMove(y) {
      currentY = y;
      clearDropIndicators();
      var target = findDropTarget(y);
      if (target) {
        over = target;
        target.sibling.classList.add(target.position === 'above' ? 'drag-above' : 'drag-below');
      } else {
        over = null;
      }
    }

    function onEnd() {
      document.removeEventListener('mousemove', mouseMove);
      document.removeEventListener('mouseup', mouseUp);
      document.removeEventListener('touchmove', touchMove);
      document.removeEventListener('touchend', touchEnd);

      wrapper.classList.remove('dragging');
      clearDropIndicators();

      // Commit DOM reorder
      if (over) {
        if (over.position === 'above') {
          nav.insertBefore(wrapper, over.sibling);
        } else {
          var next = over.sibling.nextSibling;
          nav.insertBefore(wrapper, next);
        }
      }

      // Persist new order
      var newIds = Array.prototype.slice.call(nav.querySelectorAll('.link-wrapper')).map(function (w) {
        return w.getAttribute('data-id');
      });
      reorderLinks(category, newIds);
    }

    function mouseMove(e) { onMove(e.clientY); }
    function mouseUp() { onEnd(); }
    function touchMove(e) { onMove(e.touches[0].clientY); }
    function touchEnd() { onEnd(); }

    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', mouseUp);
    document.addEventListener('touchmove', touchMove, { passive: true });
    document.addEventListener('touchend', touchEnd, { passive: true });
  }

  // --- Dialog handling ---
  function openDialog(linkId) {
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

    if (linkId) {
      editingLinkId = linkId;
      var link = links.filter(function (l) { return l.id === linkId; })[0];
      if (link) {
        categoryInput.value = link.category;
        nameInput.value = link.name;
        urlInput.value = link.url;
      }
      dialogTitle.textContent = 'Edit Link';
      submitBtn.textContent = 'Save';
    } else {
      editingLinkId = null;
      categoryInput.value = '';
      nameInput.value = '';
      urlInput.value = '';
      dialogTitle.textContent = 'Add Link';
      submitBtn.textContent = 'Add Link';
    }

    dialogBackdrop.classList.remove('hidden');
    nameInput.focus();
  }

  function closeDialog() {
    dialogBackdrop.classList.add('hidden');
    editingLinkId = null;
    dialogTitle.textContent = 'Add Link';
    submitBtn.textContent = 'Add Link';
  }

  fab.addEventListener('click', function () { openDialog(); });
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

    if (editingLinkId) {
      updateLink(editingLinkId, { category: category, name: name, url: url });
      closeDialog();
      render();
    } else {
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
