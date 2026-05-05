import { loadLinks, getCategories, reorderPages, renamePage, deletePageLinks } from './storage.js';

let pagesBackdrop, pagesList;
let onRender;

export const initPagesEditor = (elements, renderCallback) => {
  pagesBackdrop = elements.pagesBackdrop;
  pagesList = pagesBackdrop.querySelector('.pages-list');
  onRender = renderCallback;

  pagesBackdrop.querySelector('.pages-done-btn').addEventListener('click', closePagesEditor);

  // Tap backdrop to close
  pagesBackdrop.addEventListener('click', (e) => {
    if (e.target === pagesBackdrop) closePagesEditor();
  });
};

export const openPagesEditor = () => {
  renderPageList();
  pagesBackdrop.classList.remove('hidden');
  document.body.classList.add('pages-open');
};

const closePagesEditor = () => {
  pagesBackdrop.classList.add('hidden');
  document.body.classList.remove('pages-open');
  onRender();
};

// --- Page list rendering ---

const renderPageList = () => {
  pagesList.innerHTML = '';
  for (const cat of getCategories()) {
    pagesList.appendChild(createPageRow(cat));
  }
};

const createPageRow = (category) => {
  const row = document.createElement('div');
  row.className = 'page-row';
  row.dataset.category = category;

  const handle = Object.assign(document.createElement('button'), {
    className: 'page-drag-handle', textContent: '☰',
  });
  handle.setAttribute('aria-label', 'Drag to reorder');
  handle.addEventListener('mousedown', (e) => { e.preventDefault(); startPageDrag(row, e.clientY); });
  handle.addEventListener('touchstart', (e) => { e.stopPropagation(); startPageDrag(row, e.touches[0].clientY); }, { passive: true });

  const nameSpan = Object.assign(document.createElement('span'), {
    className: 'page-name', textContent: category,
  });
  nameSpan.addEventListener('click', () => startRename(row));

  const delBtn = Object.assign(document.createElement('button'), {
    className: 'page-delete-btn', textContent: '×',
  });
  delBtn.setAttribute('aria-label', `Delete ${category}`);
  delBtn.addEventListener('click', () => handleDelete(row.dataset.category));

  row.append(handle, nameSpan, delBtn);
  return row;
};

// --- Inline rename ---

const startRename = (row) => {
  if (row.querySelector('.page-name-input')) return; // already editing

  const currentName = row.dataset.category;
  const nameEl = row.querySelector('.page-name');

  const input = Object.assign(document.createElement('input'), {
    type: 'text', className: 'page-name-input', value: currentName,
  });

  row.replaceChild(input, nameEl);
  input.focus();
  input.select();

  const cancel = () => {
    if (!row.contains(input)) return;
    row.replaceChild(nameEl, input);
  };

  const commit = () => {
    if (!row.contains(input)) return;
    const newName = input.value.trim();
    if (!newName || newName === currentName) { cancel(); return; }

    // Check for name collision (merge pages)
    const existingCategories = Array.from(pagesList.querySelectorAll('.page-row'))
      .map(r => r.dataset.category);
    if (existingCategories.includes(newName)) {
      if (!confirm(`"${newName}" already exists. Merge "${currentName}" into it?`)) {
        cancel();
        return;
      }
    }

    renamePage(currentName, newName);
    renderPageList(); // re-render to reflect merge or simple rename
  };

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); cancel(); }
  });
};

// --- Delete with confirmation ---

const handleDelete = (category) => {
  const count = loadLinks().filter(l => l.category === category).length;
  const noun = count === 1 ? 'link' : 'links';
  const msg = count === 0
    ? `Delete page "${category}"?`
    : `Delete page "${category}" and its ${count} ${noun}?`;

  if (!confirm(msg)) return;

  deletePageLinks(category);
  renderPageList();

  if (pagesList.querySelectorAll('.page-row').length === 0) {
    closePagesEditor();
  }
};

// --- Drag-to-reorder pages ---

const startPageDrag = (row, _startY) => {
  const list = row.closest('.pages-list');
  if (!list) return;
  let over = null;

  row.classList.add('dragging');

  const getSiblings = () => Array.from(list.querySelectorAll('.page-row:not(.dragging)'));
  const clearIndicators = () => getSiblings().forEach(s => s.classList.remove('drag-above', 'drag-below'));

  const findTarget = (y) => {
    const siblings = getSiblings();
    for (const s of siblings) {
      const { top, height } = s.getBoundingClientRect();
      if (y < top + height / 2) return { sibling: s, position: 'above' };
    }
    return siblings.length ? { sibling: siblings[siblings.length - 1], position: 'below' } : null;
  };

  const onMove = (y) => {
    clearIndicators();
    over = findTarget(y);
    if (over) over.sibling.classList.add(over.position === 'above' ? 'drag-above' : 'drag-below');
  };

  const onEnd = () => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', mouseUp);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('touchend', touchEnd);

    row.classList.remove('dragging');
    clearIndicators();

    if (over) list.insertBefore(row, over.position === 'above' ? over.sibling : over.sibling.nextSibling);

    reorderPages(
      Array.from(list.querySelectorAll('.page-row')).map(r => r.dataset.category)
    );
  };

  const mouseMove = (e) => onMove(e.clientY);
  const mouseUp = () => onEnd();
  const touchMove = (e) => onMove(e.touches[0].clientY);
  const touchEnd = () => onEnd();

  document.addEventListener('mousemove', mouseMove);
  document.addEventListener('mouseup', mouseUp);
  document.addEventListener('touchmove', touchMove, { passive: true });
  document.addEventListener('touchend', touchEnd, { passive: true });
};
