# Quicklinks — Edit Mode Plan
*Created: 2026-04-28*

## Goal
Replace the swipe-to-delete gesture (which clashes with carousel swipe) with a dedicated
edit mode that supports reorder, rename/update, and delete — without breaking the
existing page-swipe navigation. Mobile-first; same functionality on desktop.

---

## UX Design

### Normal mode (unchanged)
- Tap a link → opens it
- Swipe left/right → navigate pages (unchanged)
- FAB `+` → add new link
- No swipe-to-delete

### Edit mode
- Fixed header gains an **"Edit" button** (top-right, always visible)
- Tap "Edit" → enter edit mode; button text changes to "Done"
- In edit mode each link row shows:
  - **Drag handle `≡`** on the left — drag up/down to reorder within the page
  - **Link name** in the middle (greyed, not tappable as a link)
  - **Edit pencil `✎`** on the right — opens dialog pre-filled with that link's data
  - **Delete `×`** on the far right — deletes immediately, no swipe needed
- Page swipe (carousel) **still works** in edit mode
- FAB `+` stays visible in edit mode

### Dialog (extended)
- FAB or empty-state button → opens as "Add Link" (existing behaviour)
- Pencil icon in edit mode → opens as "Edit Link" with fields pre-filled; submit button
  label changes from "Add" to "Save"; updates the link in place

---

## Data changes
None to the storage schema `{ id, category, name, url }`. Reordering rewrites the
array in localStorage to reflect the new order.

---

## Tasks

### Task 1 — `index.html`
- Add `<button class="edit-btn" aria-label="Edit links">Edit</button>` inside
  `.page-header` (after the dots div)
- Change dialog `<h2 class="dialog-title">` to `<h2 class="dialog-title">Add Link</h2>`
  (already correct — title will be overwritten by JS when editing)
- Change `<button type="submit" class="btn-add">Add</button>` — label overridden by JS

### Task 2 — `style.css`
- **`.edit-btn`** — `pointer-events: auto`, positioned absolute within `.page-header`
  at right edge; text style matching existing dimmed-white label aesthetic; `color:
  rgba(255,255,255,0.45)` normal, `color: white` in edit mode
- **`.drag-handle`** — hidden (`display: none`) by default; shown in edit mode; ≡
  glyph, left-aligned in row, `cursor: grab`, `color: rgba(255,255,255,0.3)`
- **`.edit-link-btn`** — hidden by default; shown in edit mode; small `✎` or `…` glyph,
  right of link name, `color: rgba(255,255,255,0.3)`
- **`.delete-btn` in edit mode** — shown as compact red `×` (no swipe reveal needed);
  remove touch swipe styles in edit mode
- **`body.edit-mode .link-content`** — `pointer-events: none`, `color:
  rgba(255,255,255,0.4)` (greyed, visually inactive)
- **`.link-wrapper.dragging`** — `opacity: 0.4`, background slightly lighter
- **`.link-wrapper.drag-above`** / **`.drag-below`** — `border-top` / `border-bottom`
  highlight (green line) showing drop target position
- **Remove** touch swipe-to-delete styles (`.link-content.swiped`,
  `translateX` pattern) — no longer needed

### Task 3 — `script.js`
Major changes; keep overall IIFE + ES5 style.

#### 3a. State & storage helpers
```
var editMode = false;
var editingLinkId = null;   // null = adding, string = editing
```
Add `updateLink(id, data)` helper that finds the link by id in localStorage and
overwrites its fields.

Add `reorderLinks(category, newOrder)` helper that splices the new per-category order
back into the full links array while preserving other categories' positions.

#### 3b. Edit button wiring
- Add DOM ref: `var editBtn = document.querySelector('.edit-btn')`
- `enterEditMode()`:
  - `editMode = true`
  - `document.body.classList.add('edit-mode')`
  - `editBtn.textContent = 'Done'`
  - Call `wireEditHandlers()` to attach drag + per-link buttons
- `exitEditMode()`:
  - `editMode = false`
  - `document.body.classList.remove('edit-mode')`
  - `editBtn.textContent = 'Edit'`
- `editBtn.addEventListener('click', ...)` toggles between the two

#### 3c. Remove swipe-to-delete
Remove the entire swipe block inside `wireDeleteHandlers()` (the `touchstart` /
`touchmove` / `touchend` listeners on `.link-content`). Rename function to
`wireEditHandlers()`.

#### 3d. `wireEditHandlers()`
Replaces `wireDeleteHandlers()`. Called once after render.

For each `.link-wrapper`:
- **Delete button** — `click` → `deleteLink(id)` (same as now; no swipe)
- **Edit button (pencil)** — `click` → `openDialog(id)`
- **Drag handle** — `mousedown` / `touchstart` → `startDrag(wrapper, event)`

#### 3e. Drag-to-reorder
Single drag interaction handler; works the same for touch and mouse.

```
startDrag(wrapper, e)
  - record startY, currentOrder of siblings
  - add .dragging to wrapper
  - bind moveDrag / endDrag to document

moveDrag(e)
  - get clientY (touch or mouse)
  - compare to midpoints of sibling wrappers
  - DOM-reorder in real time (insertBefore) — no ghost needed, feels native
  - add .drag-above or .drag-below to the hovered sibling

endDrag(e)
  - remove .dragging, .drag-above, .drag-below
  - read new DOM order of wrapper ids
  - call reorderLinks(category, newIds) to persist
  - unbind moveDrag / endDrag from document
  - no re-render needed (DOM already reflects new order)
```

Drag is scoped to the `<nav>` inside the current `.page` — no cross-page reordering.

#### 3f. Dialog changes
`openDialog(linkId)` — optional param:
- If called without arg (FAB): existing Add behaviour
- If called with `linkId`:
  - `editingLinkId = linkId`
  - Pre-fill `categoryInput`, `nameInput`, `urlInput` from matching link
  - Set dialog title to "Edit Link", submit button to "Save"

`addForm submit handler`:
- If `editingLinkId`:
  - Call `updateLink(editingLinkId, { category, name, url })`
  - Reset `editingLinkId = null`
  - `closeDialog()` → `render()` (stay in edit mode after render via `editMode` flag)
- Else: existing add behaviour

On `closeDialog()` reset title back to "Add Link" / btn back to "Add".

#### 3g. Edit mode persistence across render
`render()` should check `editMode` and if true, immediately call `enterEditMode()`
after re-rendering (so the edit button and row state are restored after a delete or
save operation).

### Task 4 — Verify and push
- [ ] Normal mode: tap links open, carousel swipe works, FAB adds
- [ ] Enter/exit edit mode on both mobile and desktop
- [ ] Delete in edit mode
- [ ] Edit (pre-fill) → save → link updated in place
- [ ] Category change in edit dialog moves link to correct page
- [ ] Reorder within a page — persists after exit and reload
- [ ] No regression on wrap-around carousel
- [ ] Empty state still works

---

## Files affected
- `index.html` — minor (edit button, no structural changes)
- `style.css` — edit mode styles, remove swipe-delete styles
- `script.js` — edit mode state, drag logic, dialog dual-mode, remove swipe handlers
