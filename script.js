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
  var pageHeader = document.querySelector('.page-header');
  var pageHeaderLabel = pageHeader.querySelector('.label');
  var pageHeaderDots = pageHeader.querySelector('.page-header-dots');

  // Track handlers so we can remove them on re-render
  var currentScrollHandler = null;
  var currentKeyHandler = null;
  var currentTouchStartHandler = null;
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

      pageContent.appendChild(nav);
      section.appendChild(pageContent);
      carousel.appendChild(section);
    });

    applySpotifyRewriting();
    initCarousel(categories);
    wireDeleteHandlers();
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

    currentTouchStartHandler = function (e) {
      if (wrapping || cloneRight || cloneLeft) return;
      var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      var pageWidth = carousel.offsetWidth;

      if (cur === total - 1) {
        // Append clone of first page — user can now swipe left to it naturally
        cloneRight = pages[0].cloneNode(true);
        cloneRight.style.pointerEvents = 'none';
        carousel.appendChild(cloneRight);
      } else if (cur === 0) {
        // Prepend clone of last page — scroll anchoring keeps page 0 in view
        cloneLeft = pages[total - 1].cloneNode(true);
        cloneLeft.style.pointerEvents = 'none';
        carousel.insertBefore(cloneLeft, pages[0]);
        // Fallback if scroll anchoring didn't adjust position
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
    carousel.addEventListener('touchend', currentTouchEndHandler, { passive: true });
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
