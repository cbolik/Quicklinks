// Module-level handler refs so initCarousel can clean up on re-render
let currentScrollHandler = null;
let currentKeyHandler = null;
let currentTouchStartHandler = null;
let currentTouchMoveHandler = null;
let currentTouchEndHandler = null;

export const initCarousel = (carousel, categories, { dialogBackdrop, arrowLeft, arrowRight, pageHeaderLabel, pageHeaderDots }) => {
  const pages = Array.from(carousel.querySelectorAll('.page'));

  // Clean up previous handlers
  if (currentScrollHandler) carousel.removeEventListener('scroll', currentScrollHandler);
  if (currentKeyHandler) document.removeEventListener('keydown', currentKeyHandler);
  if (currentTouchStartHandler) {
    carousel.removeEventListener('touchstart', currentTouchStartHandler);
    carousel.removeEventListener('touchmove', currentTouchMoveHandler);
    carousel.removeEventListener('touchend', currentTouchEndHandler);
  }

  pageHeaderLabel.textContent = categories[0] ?? '';
  pageHeaderDots.innerHTML = '';

  if (pages.length <= 1) return;

  const total = pages.length;
  let wrapping = false;

  // Dots
  const dots = categories.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = `dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Go to page ${i + 1}`);
    dot.addEventListener('click', () => {
      const cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      scrollToPage(i, i > cur ? 1 : -1);
    });
    pageHeaderDots.appendChild(dot);
    return dot;
  });

  const updateHeader = () => {
    if (wrapping) return;
    const index = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    if (index < 0 || index >= total) return;
    pageHeaderLabel.textContent = categories[index];
    dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
  };

  currentScrollHandler = updateHeader;
  carousel.addEventListener('scroll', currentScrollHandler);

  // rAF animation that disables scroll-snap during wrap to prevent direction fighting
  const smoothScroll = (from, to, cb) => {
    const duration = 350;
    let start = null;
    carousel.style.scrollSnapType = 'none';
    carousel.scrollLeft = from;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p+2, 3)/2;
      carousel.scrollLeft = from + (to - from) * ease;
      if (p < 1) requestAnimationFrame(step);
      else { carousel.scrollLeft = to; cb(); }
    };
    requestAnimationFrame(step);
  };

  const wrapRight = () => {
    wrapping = true;
    const pageWidth = carousel.offsetWidth;
    const clone = pages[0].cloneNode(true);
    carousel.appendChild(clone);
    smoothScroll((total - 1) * pageWidth, total * pageWidth, () => {
      carousel.scrollLeft = 0;
      clone.remove();
      carousel.style.scrollSnapType = '';
      wrapping = false;
      updateHeader();
    });
  };

  const wrapLeft = () => {
    wrapping = true;
    const pageWidth = carousel.offsetWidth;
    const clone = pages[total - 1].cloneNode(true);
    carousel.insertBefore(clone, pages[0]);
    smoothScroll(pageWidth, 0, () => {
      carousel.scrollLeft = total * pageWidth;
      clone.remove();
      carousel.scrollLeft = (total - 1) * pageWidth;
      carousel.style.scrollSnapType = '';
      wrapping = false;
      updateHeader();
    });
  };

  // dir: 1 = forward, -1 = backward
  const scrollToPage = (idx, dir) => {
    if (wrapping) return;
    const pageWidth = carousel.offsetWidth;
    const cur = Math.round(carousel.scrollLeft / pageWidth);
    if (idx === cur) return;
    if (dir > 0 && cur === total - 1 && idx === 0) wrapRight();
    else if (dir < 0 && cur === 0 && idx === total - 1) wrapLeft();
    else carousel.scrollTo({ left: idx * pageWidth, behavior: 'smooth' });
  };

  if (arrowLeft) {
    arrowLeft.onclick = () => {
      const cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      scrollToPage((cur - 1 + total) % total, -1);
    };
  }
  if (arrowRight) {
    arrowRight.onclick = () => {
      const cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
      scrollToPage((cur + 1) % total, 1);
    };
  }

  currentKeyHandler = (e) => {
    if (!dialogBackdrop.classList.contains('hidden')) return;
    const cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    if (e.key === 'ArrowLeft') scrollToPage((cur - 1 + total) % total, -1);
    else if (e.key === 'ArrowRight') scrollToPage((cur + 1) % total, 1);
  };
  document.addEventListener('keydown', currentKeyHandler);

  // Touch wrap: pre-place clone on first horizontal move so native scroll handles it
  let cloneRight = null;
  let cloneLeft = null;

  const afterSnap = (fn) => {
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      carousel.removeEventListener('scrollend', run);
      fn();
    };
    const timer = setTimeout(run, 500);
    carousel.addEventListener('scrollend', run, { once: true });
  };

  let touchStartX = 0;
  let touchStartY = 0;
  let clonePlaced = false;

  currentTouchStartHandler = (e) => {
    if (wrapping || cloneRight || cloneLeft) return;
    ({ clientX: touchStartX, clientY: touchStartY } = e.touches[0]);
    clonePlaced = false;
  };

  currentTouchMoveHandler = (e) => {
    if (wrapping || clonePlaced || cloneRight || cloneLeft) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) return;

    const cur = Math.round(carousel.scrollLeft / carousel.offsetWidth);
    const pageWidth = carousel.offsetWidth;
    clonePlaced = true;

    if (dx < 0 && cur === total - 1) {
      cloneRight = pages[0].cloneNode(true);
      cloneRight.style.pointerEvents = 'none';
      carousel.appendChild(cloneRight);
    } else if (dx > 0 && cur === 0) {
      cloneLeft = pages[total - 1].cloneNode(true);
      cloneLeft.style.pointerEvents = 'none';
      carousel.insertBefore(cloneLeft, pages[0]);
      if (carousel.scrollLeft === 0) carousel.scrollLeft = pageWidth;
    }
  };

  currentTouchEndHandler = () => {
    if (wrapping || (!cloneRight && !cloneLeft)) return;
    afterSnap(() => {
      const pageWidth = carousel.offsetWidth;
      wrapping = true;

      if (cloneRight) {
        if (Math.round(carousel.scrollLeft / pageWidth) >= total) {
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
          carousel.style.scrollSnapType = 'none';
          carousel.scrollLeft = total * pageWidth;
          cloneLeft.remove();
          carousel.scrollLeft = (total - 1) * pageWidth;
          carousel.style.scrollSnapType = '';
        } else {
          const realPage = Math.round(carousel.scrollLeft / pageWidth) - 1;
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
};
