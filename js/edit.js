import { loadLinks, saveLinks, reorderLinks } from './storage.js';

// Edit mode state
let editMode = false;
let menuBtn, menuDropdown;

export const isEditMode = () => editMode;

export const enterEditMode = () => {
  editMode = true;
  document.body.classList.add('edit-mode');
  menuBtn.textContent = 'Done';
};

export const exitEditMode = () => {
  editMode = false;
  document.body.classList.remove('edit-mode');
  menuBtn.textContent = '⋮';
};

// --- Menu + Export/Import ---

export const initMenu = (elements, { openDialog, onRender }) => {
  ({ menuBtn, menuDropdown } = elements);
  const { importFileInput } = elements;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (editMode) exitEditMode();
    else menuDropdown.classList.contains('hidden') ? openMenu() : closeMenu();
  });

  document.addEventListener('click', closeMenu);
  menuDropdown.addEventListener('click', (e) => e.stopPropagation());

  menuDropdown.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
      closeMenu();
      const action = item.getAttribute('data-action');
      if (action === 'edit') enterEditMode();
      else if (action === 'export') exportLinks();
      else if (action === 'import') importFileInput.click();
    });
  });

  importFileInput.addEventListener('change', () => {
    const file = importFileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const imported = JSON.parse(target.result);
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        mergeLinks(imported, onRender);
      } catch {
        alert("Could not read file — make sure it's a valid Quicklinks export.");
      }
      importFileInput.value = '';
    };
    reader.readAsText(file);
  });
};

const openMenu = () => menuDropdown.classList.remove('hidden');
const closeMenu = () => menuDropdown.classList.add('hidden');

const exportLinks = () => {
  const blob = new Blob([JSON.stringify(loadLinks(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: 'quicklinks-export.json' });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const mergeLinks = (imported, onRender) => {
  const existing = loadLinks();
  const existingIds = new Set(existing.map(l => l.id));
  const newLinks = imported.filter(l => l.id && l.category && l.name && l.url && !existingIds.has(l.id));
  if (newLinks.length === 0) {
    alert('No new links found — everything was already here.');
    return;
  }
  saveLinks([...existing, ...newLinks]);
  onRender();
};

// --- Per-render edit handlers ---

export const wireEditHandlers = (carousel, { openDialog, onRender }) => {
  carousel.querySelectorAll('.link-wrapper').forEach(wrapper => {
    const id = wrapper.getAttribute('data-id');

    wrapper.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      saveLinks(loadLinks().filter(l => l.id !== id));
      onRender();
    });

    wrapper.querySelector('.edit-link-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openDialog(id);
    });

    const handle = wrapper.querySelector('.drag-handle');
    handle.addEventListener('mousedown', (e) => { e.preventDefault(); startDrag(wrapper, e.clientY); });
    handle.addEventListener('touchstart', (e) => { e.stopPropagation(); startDrag(wrapper, e.touches[0].clientY); }, { passive: true });
  });
};

// --- Drag-to-reorder ---

const startDrag = (wrapper, startY) => {
  const nav = wrapper.closest('nav');
  if (!nav) return;
  const category = nav.getAttribute('data-category');
  let over = null;

  wrapper.classList.add('dragging');

  const getSiblings = () => Array.from(nav.querySelectorAll('.link-wrapper:not(.dragging)'));
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

    wrapper.classList.remove('dragging');
    clearIndicators();

    if (over) nav.insertBefore(wrapper, over.position === 'above' ? over.sibling : over.sibling.nextSibling);

    reorderLinks(
      category,
      Array.from(nav.querySelectorAll('.link-wrapper')).map(w => w.getAttribute('data-id'))
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
