# Quicklinks — Project Context

## What this is
A minimalist, dark-themed static HTML page that serves as a personal link launcher. Currently used for Spotify playlists and albums, but designed to support any URL. Deployed to GitHub Pages. No build step, no framework — just `index.html` + `style.css` + `script.js`.

**Live URL:** https://cbolik.github.io/Quicklinks/
**Repo:** https://github.com/cbolik/Quicklinks

## Design decisions
- Dark background `#0d0d0d`, typography-only (no graphics/icons)
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`
- Primary target: iPhone 17 (~390px wide); also works on iPad and desktop
- Font sized so 6–7 items fit without scrolling on iPhone (uses `clamp()`)
- Link color: `#1DB954` (Spotify green), brightens to `#1ed760` on hover
- No underlines; color shift on hover/focus/active
- Page labels: 0.8rem, uppercase, dimmed white, acts as a section eyebrow
- Favicon: `favicon.svg` (SVG for modern browsers), `favicon.ico` (Safari fallback), `apple-touch-icon.png` 180×180 (iOS/iPadOS home screen)
- Horizontal carousel with CSS scroll-snap for multiple pages
- Indicator dots at bottom (JS-generated), arrow buttons on desktop only (`@media (hover: hover)`)
- Platform-aware Spotify link handling:
  - iOS/iPadOS: rewrites `spotify:` URIs to `https://open.spotify.com/...` universal links (no prompt)
  - macOS: keeps `spotify:` URI, click handler with 800ms blur/timer fallback to https
  - Other platforms: rewrites to `https://` URLs

## Current state — IN PROGRESS

The app currently has hardcoded links in `index.html` with a working carousel (2 pages: Playlists, Albums). A major rearchitecture is underway to move all link data to `localStorage`.

### What's done
- Carousel navigation (swipe, dots, arrows, keyboard)
- Platform-aware Spotify link handling
- Favicon and iOS home screen icon
- Repo renamed from `Spotify-Playlists` to `Quicklinks`

### What's next — localStorage rearchitecture
**Spec:** `docs/superpowers/specs/2026-03-26-quicklinks-localstorage-design.md`
**Plan:** `docs/superpowers/plans/2026-03-26-quicklinks-localstorage.md`

The plan has 4 tasks, none started yet:
1. **Update `index.html` to shell** — strip all hardcoded links, add dialog markup, FAB button, title → "Quicklinks"
2. **Update `style.css`** — add dialog, FAB, empty state, link-wrapper, swipe-to-delete, hover-X styles
3. **Rewrite `script.js`** — localStorage CRUD, render pipeline, dialog handling, delete (swipe-left on mobile, hover-X on desktop), retained Spotify rewriting + carousel logic
4. **Verify and push**

Key design decisions for the rearchitecture:
- Links stored in `localStorage` under key `quicklinks` as JSON array
- Each link: `{ id, category, name, url }`
- Pages generated dynamically from categories
- Add via floating + button → modal dialog (category with autocomplete, name, link)
- Delete via swipe-left on touch / hover-X on desktop
- Empty state: "Your links will appear here" + "Add Link" button
- No cross-device sync (accepted limitation)
- Link reordering deferred to future iteration

## File structure
```
index.html          — HTML shell (will become empty shell after rearchitecture)
style.css           — all styles
script.js           — platform detection, Spotify link rewriting, carousel, (soon: localStorage, dialog, delete)
favicon.svg         — SVG favicon source
favicon.ico         — ICO fallback
apple-touch-icon.png — 180×180 iOS home screen icon
.gitignore          — .DS_Store only
CLAUDE.md           — this file
docs/superpowers/   — specs and plans
```

## Pending / nice to have
- Link reordering UI (data model already supports it via array order)
- Import/export functionality
- `<meta name="apple-mobile-web-app-capable">` for PWA-lite launcher mode
- Star Trek-themed relaunch with transporter beam animation between pages
