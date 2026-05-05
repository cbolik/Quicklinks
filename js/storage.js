const STORAGE_KEY = 'quicklinks';

export const loadLinks = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
};

export const saveLinks = (links) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
};

export const generateId = () =>
  Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

export const updateLink = (id, data) => {
  const links = loadLinks().map(l =>
    l.id === id ? { id: l.id, ...data } : l
  );
  saveLinks(links);
};

export const reorderLinks = (category, orderedIds) => {
  const links = loadLinks();
  const byId = Object.fromEntries(links.map(l => [l.id, l]));
  const reordered = orderedIds.map(id => byId[id]).filter(Boolean);
  const pool = [...reordered];
  saveLinks(links.map(l => l.category === category ? pool.shift() : l));
};

export const getCategories = () => {
  const seen = new Set();
  const categories = [];
  for (const link of loadLinks()) {
    if (!seen.has(link.category)) {
      seen.add(link.category);
      categories.push(link.category);
    }
  }
  return categories;
};

export const reorderPages = (orderedCategories) => {
  const links = loadLinks();
  const byCategory = {};
  for (const link of links) {
    (byCategory[link.category] ??= []).push(link);
  }
  const handled = new Set(orderedCategories);
  const reordered = [
    ...orderedCategories.flatMap(cat => byCategory[cat] ?? []),
    ...links.filter(l => !handled.has(l.category)),
  ];
  saveLinks(reordered);
};

export const renamePage = (oldName, newName) => {
  saveLinks(loadLinks().map(l =>
    l.category === oldName ? { ...l, category: newName } : l
  ));
};

export const deletePageLinks = (category) => {
  saveLinks(loadLinks().filter(l => l.category !== category));
};
