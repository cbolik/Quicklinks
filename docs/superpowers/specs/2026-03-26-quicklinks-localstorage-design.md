# Quicklinks — localStorage Rearchitecture Design Spec

**Date:** 2026-03-26
**Project:** Quicklinks (formerly Spotify Playlists)

---

## Problem

The app currently hardcodes Spotify links in `index.html`, which means the GitHub repo must be public (for free GitHub Pages), exposing all personal links publicly. The app also can't be used by anyone else without forking and editing HTML.

## Goals

1. Store all links in `localStorage` — data never leaves the device, never appears in the repo.
2. Dynamically generate carousel pages from stored data — categories and page count determined at runtime.
3. Provide a UI to add and delete links — no HTML editing required.
4. Rebrand to **Quicklinks**.
5. Retain platform-aware Spotify link handling (universal links on iOS, blur/timer fallback on macOS).
6. Support non-Spotify links (any URL).

## Non-Goals

- Cross-device sync (accepted limitation of localStorage).
- Link reordering UI (deferred — data model supports it via array order).
- Link editing (delete and re-add instead).
- Import/export functionality (deferred).

---

## Data Model

**localStorage key:** `quicklinks`

**Value:** JSON array of link objects, ordered by display position:

```json
[
  { "id": "a1b2c3", "category": "Playlists", "name": "Current Tracks", "url": "spotify:playlist:0NF8qR0UBjP7BMDepv3AVi" },
  { "id": "d4e5f6", "category": "Albums", "name": "Moon Safari", "url": "spotify:album:40EyFvLYo0Gesi6wRP8SMo" },
  { "id": "g7h8i9", "category": "Podcasts", "name": "Huberman Lab", "url": "https://example.com/podcast" }
]
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Random 8-char hex string, generated at creation time. Used for deletion. |
| `category` | string | Page title. Links with the same category appear on the same page. Case-sensitive. |
| `name` | string | Display text for the link. |
| `url` | string | The link target. Can be a `spotify:` URI, `https://` URL, or any valid URL. |

**Page ordering:** Pages appear in the order their category was first seen in the array. If a user adds "Playlists" first and "Albums" second, Playlists is page 1.

**Empty array or missing key:** App shows the empty state.

---

## Architecture

### Render Pipeline

On page load, `script.js` executes this pipeline:

1. **Read** — Parse `quicklinks` from localStorage (default to `[]`).
2. **Group** — Group links by category, preserving first-seen order.
3. **Render** — For each category, create a `<section class="page">` with `<h1 class="label">` and `<nav>` containing `<a>` elements. Append to `.carousel`.
4. **Spotify rewrite** — Run the existing platform-aware link rewriting on all generated `a[href^="spotify:"]` elements.
5. **Carousel init** — Generate dots, wire arrows, keyboard handlers.
6. **Delete wiring** — Attach swipe/hover-X handlers to each link.

If the array is empty, skip steps 2–6 and render the empty state instead.

Any mutation (add or delete) re-runs the full pipeline from step 1. This is simple and correct for the expected data size (~50 links max).

### File Structure (unchanged)

| File | Responsibility |
|------|---------------|
| `index.html` | Shell: empty `.carousel`, `.indicators`, add-link dialog markup, floating + button |
| `style.css` | All styles including new dialog, floating button, delete, and empty state styles |
| `script.js` | All logic: localStorage CRUD, render pipeline, dialog handling, delete handling, Spotify rewriting, carousel navigation |

No build step. No new files beyond existing three.

---

## UI Components

### 1. Empty State

Shown when localStorage has no links. Centered vertically and horizontally (same as current content centering).

```
         Your links will appear here

              [ + Add Link ]
```

- "Your links will appear here" — dimmed white text, same style as `.label` but slightly larger (~0.9rem).
- "Add Link" button — outlined, Spotify green border and text, rounded corners. On tap, opens the add dialog.

### 2. Populated State

Same as current carousel, but pages and links are generated from localStorage. The floating + button is always visible in the bottom-right corner.

### 3. Floating Add Button

- Fixed position, bottom-right corner, 1.5rem from edges.
- Sits above the indicators bar (`z-index: 20`).
- Circular, 48px diameter.
- Background: `#1DB954` (Spotify green). Text: white `+`.
- On tap: opens the add dialog.
- Hover: brightens to `#1ed760`.

### 4. Add Link Dialog

A modal overlay:

- **Backdrop:** `rgba(0, 0, 0, 0.7)`, covers full viewport, closes dialog on tap.
- **Dialog box:** Dark card (`#1a1a1a`), centered, `max-width: 360px`, `width: 90%`, rounded corners (12px), padding 1.5rem.
- **Title:** "Add Link" — white, 1.1rem, weight 400.
- **Three input fields**, stacked vertically with ~1rem gap:
  - **Category** — text input with `<datalist>` populated from existing categories for autocomplete. Placeholder: "e.g. Playlists". This is the first field so the user can quickly pick an existing category.
  - **Name** — text input. Placeholder: "e.g. Current Tracks".
  - **Link** — text input with `type="url"` (but also accepts `spotify:` URIs, so actual validation is custom). Placeholder: "e.g. spotify:playlist:abc123".
- **Input styling:** Dark background (`#2a2a2a`), light text, subtle border (`#3a3a3a`), rounded (8px). Focus: border brightens to `#1DB954`.
- **Buttons row:** Two buttons, right-aligned.
  - "Cancel" — ghost button, dimmed text. Closes dialog.
  - "Add" — solid button, Spotify green background, white text. Validates and saves.
- **Validation:** All three fields required. If any empty, the empty field's border flashes red briefly. No other validation — any string is a valid URL (the user knows what they're adding).
- **On save:** Generate 8-char hex `id`, append to `quicklinks` array, persist to localStorage, close dialog, re-render. If the category is new, a new page is created. Navigate the carousel to the page containing the new link.

### 5. Delete — Swipe Left (Mobile)

On touch devices (`@media (hover: none)`):

- **Swipe gesture:** User swipes a link left. The link slides left to reveal a red "Delete" button behind it.
- **Implementation:** Each link is wrapped in a `.link-wrapper` div. The `<a>` sits on top. Behind it (positioned absolutely) is a red delete button. Touch events (touchstart, touchmove, touchend) track horizontal movement and translate the `<a>` element.
- **Threshold:** If swiped > 80px left, snap open (reveal full delete button). If < 80px, snap back.
- **Delete button:** Red background (`#e74c3c`), white "Delete" text, right-aligned. On tap: remove from localStorage, re-render. If the category has no more links, the page is removed.
- **Only one link open at a time:** Opening a swipe on one link snaps any previously open link back.

### 6. Delete — Hover X (Desktop)

On hover-capable devices (`@media (hover: hover)`):

- **X button:** A small `×` appears to the right of the link text on hover. Dimmed white, brightens on hover over the X itself. Positioned absolutely within `.link-wrapper`.
- **On click:** Remove from localStorage, re-render.
- **Confirmation:** None — the action is immediate. If accidental, the user re-adds the link. This is acceptable for a personal tool.

---

## HTML Shell

`index.html` becomes a minimal shell. All content is generated by JS:

```html
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
```

---

## Spotify Link Handling

The existing platform-aware Spotify link handling is retained. It runs after DOM generation (step 4 of the render pipeline), so it correctly processes all dynamically created `a[href^="spotify:"]` elements.

Non-Spotify links (`https://`, `http://`, etc.) are not processed — they work as normal `<a>` tags on all platforms.

---

## Branding Changes

- `<title>` → "Quicklinks"
- Favicon: retained as-is for now (playlist icon still works as a generic "links" icon; can be updated later)
- CLAUDE.md: updated to reflect new name and architecture
- GitHub repo rename: deferred (manual step, changes the Pages URL)

---

## Migration

No automatic migration. When the new version deploys, the app loads with an empty state. The user re-adds their links via the UI. This is intentional — the whole point is to not have links in the repo.

---

## What Changes Per File

| File | What changes |
|------|-------------|
| `index.html` | Strip all hardcoded links. Keep shell elements (empty `.carousel`, `.indicators`). Add `.fab` button, add dialog markup. Update `<title>` to "Quicklinks". |
| `style.css` | Add: dialog/backdrop, fab button, empty state, `.link-wrapper`, swipe-to-delete, hover X, form input styles. Existing carousel/page/indicator/link styles remain mostly unchanged. |
| `script.js` | Major rewrite. New: localStorage read/write, render pipeline, dialog open/close/submit, delete handling (swipe + hover). Retained: Spotify link rewriting logic, carousel init logic (moved to run after dynamic render). |
