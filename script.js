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

    // Render pages
    categories.forEach(function (cat) {
      var section = document.createElement('section');
      section.className = 'page';

      var pageContent = document.createElement('div');
      pageContent.className = 'page-content';

      var h1 = document.createElement('h1');
      h1.className = 'label';
      h1.textContent = cat;
      pageContent.appendChild(h1);

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

    if (pages.length <= 1) return;

    var total = pages.length;
    var wrapping = false;

    // Create a dots row inside each page, below the label
    var allDotSets = [];
    pages.forEach(function (page) {
      var dotsEl = document.createElement('div');
      dotsEl.className = 'page-dots';
      var dotSet = [];
      for (var i = 0; i < total; i++) {
        (function (i) {
          var dot = document.createElement('button');
          dot.className = 'dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Go to page ' + (i + 1));
          dot.addEventListener('click', function () {
            scrollToPage(i);
          });
          dotsEl.appendChild(dot);
          dotSet.push(dot);
        })(i);
      }
      allDotSets.push(dotSet);
      var label = page.querySelector('.label');
      if (label) {
        label.parentNode.insertBefore(dotsEl, label.nextSibling);
      }
    });

    function updateDots() {
      if (wrapping) return;
      var index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      if (index < 0 || index >= total) return;
      allDotSets.forEach(function (dotSet) {
        dotSet.forEach(function (dot, i) {
          dot.classList.toggle('active', i === index);
        });
      });
    }

    currentScrollHandler = updateDots;
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
        updateDots();
      });
    }

    function wrapLeft() {
      // First → last: prepend clone of last page, animate left, teleport to real last page
      wrapping = true;
      var pageWidth = carousel.offsetWidth;
      var clone = pages[total - 1].cloneNode(true);
      carousel.insertBefore(clone, pages[0]);
      // smoothScroll sets scrollLeft = pageWidth first, keeping pages[0] in view
      smoothScroll(pageWidth, 0, function () {
        carousel.scrollLeft = total * pageWidth; // real last page (clone still present)
        clone.remove();
        carousel.scrollLeft = (total - 1) * pageWidth; // correct after removal
        carousel.style.scrollSnapType = '';
        wrapping = false;
        updateDots();
      });
    }

    function scrollToPage(idx) {
      if (wrapping) return;
      var pageWidth = carousel.offsetWidth;
      var cur = Math.round(carousel.scrollLeft / pageWidth);
      if (idx === cur) return;
      if (cur === total - 1 && idx === 0) {
        wrapRight();
      } else if (cur === 0 && idx === total - 1) {
        wrapLeft();
      } else {
        carousel.scrollTo({ left: idx * pageWidth, behavior: 'smooth' });
      }
    }

    if (arrowLeft) {
      arrowLeft.onclick = function () {
        var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        scrollToPage((cur - 1 + total) % total);
      };
    }
    if (arrowRight) {
      arrowRight.onclick = function () {
        var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
        scrollToPage((cur + 1) % total);
      };
    }

    currentKeyHandler = function (e) {
      if (!dialogBackdrop.classList.contains('hidden')) return;
      var cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      if (e.key === 'ArrowLeft') {
        scrollToPage((cur - 1 + total) % total);
      } else if (e.key === 'ArrowRight') {
        scrollToPage((cur + 1) % total);
      }
    };
    document.addEventListener('keydown', currentKeyHandler);

    // Touch swipe wrap: detect swipe past edge on first/last page
    var touchStartX = 0;
    var touchStartPage = 0;
    currentTouchStartHandler = function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartPage = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    };
    currentTouchEndHandler = function (e) {
      if (wrapping) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) < 30) return;
      if (dx < 0 && touchStartPage === total - 1) {
        wrapRight();
      } else if (dx > 0 && touchStartPage === 0) {
        wrapLeft();
      }
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
