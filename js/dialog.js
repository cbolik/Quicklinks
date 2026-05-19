import { loadLinks, saveLinks, generateId, updateLink } from './storage.js';

let editingLinkId = null;
let onRender = null;

// DOM refs — set once by initDialog
let dialogBackdrop, dialogTitle, addForm, categoryInput, nameInput, urlInput,
    categoryList, submitBtn, cancelBtn, carousel, urlHint;

export const initDialog = (elements, renderCallback) => {
  ({ dialogBackdrop, dialogTitle, addForm, categoryInput, nameInput, urlInput,
     categoryList, submitBtn, cancelBtn, carousel } = elements);
  urlHint = document.getElementById('url-hint');
  onRender = renderCallback;

  urlInput.addEventListener('input', checkDuplicate);
  cancelBtn.addEventListener('click', closeDialog);

  dialogBackdrop.addEventListener('click', (e) => {
    if (e.target === dialogBackdrop) closeDialog();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dialogBackdrop.classList.contains('hidden')) closeDialog();
  });

  addForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = categoryInput.value.trim();
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!category || !name || !url) return;

    if (editingLinkId) {
      updateLink(editingLinkId, { category, name, url });
      closeDialog();
      onRender();
    } else {
      const links = loadLinks();
      links.push({ id: generateId(), category, name, url });
      saveLinks(links);
      closeDialog();
      onRender();

      // Navigate to the new link's page after render
      const cats = [...new Set(loadLinks().map(l => l.category))];
      const pageIndex = cats.indexOf(category);
      if (pageIndex >= 0) {
        setTimeout(() => {
          carousel.scrollTo({ left: pageIndex * carousel.offsetWidth, behavior: 'smooth' });
        }, 100);
      }
    }
  });
};

export const openDialog = (linkId, prefill = {}) => {
  const links = loadLinks();
  const cats = [...new Set(links.map(l => l.category))];

  categoryList.innerHTML = '';
  cats.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    categoryList.appendChild(option);
  });

  if (linkId) {
    editingLinkId = linkId;
    const link = links.find(l => l.id === linkId);
    if (link) {
      categoryInput.value = link.category;
      nameInput.value = link.name;
      urlInput.value = link.url;
    }
    dialogTitle.textContent = 'Edit Link';
    submitBtn.textContent = 'Save';
  } else {
    editingLinkId = null;
    categoryInput.value = prefill.category ?? '';
    nameInput.value = prefill.name ?? '';
    urlInput.value = prefill.url ?? '';
    dialogTitle.textContent = 'Add Link';
    submitBtn.textContent = 'Add Link';
  }

  dialogBackdrop.classList.remove('hidden');
  checkDuplicate();
  // Focus the first empty field: Page if name is pre-filled, otherwise Name
  if (prefill.name) {
    categoryInput.focus();
  } else {
    nameInput.focus();
  }
};

export const closeDialog = () => {
  dialogBackdrop.classList.add('hidden');
  editingLinkId = null;
  dialogTitle.textContent = 'Add Link';
  submitBtn.textContent = 'Add Link';
  clearDuplicateHint();
};

// --- Duplicate URL detection ---

const checkDuplicate = () => {
  const url = urlInput.value.trim();
  if (!url) { clearDuplicateHint(); return; }
  const match = loadLinks().find(l => l.url === url && l.id !== editingLinkId);
  if (match) {
    urlInput.classList.add('duplicate');
    urlHint.textContent = `Already saved as "${match.name}" on ${match.category}`;
    urlHint.classList.remove('hidden');
  } else {
    clearDuplicateHint();
  }
};

const clearDuplicateHint = () => {
  urlInput.classList.remove('duplicate');
  urlHint.classList.add('hidden');
  urlHint.textContent = '';
};
