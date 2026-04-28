# Spotify Playlists Page — Design

**Date:** 2026-03-15

## Overview

A minimalist static web page deployed to GitHub Pages that displays a curated list of 6 favorite Spotify playlists. No graphics, typography only. Tapping a playlist name opens it via `spotify:` deep link.

## Architecture

- **Approach:** Pure HTML/CSS, no framework, no build step
- **Files:** `index.html` + `style.css`
- **Deployment:** GitHub Pages (push to `main`, serve from root or `docs/`)
- **Data:** Playlist names and Spotify URIs hardcoded in a clearly marked block in `index.html`

## Visual Design

- **Background:** `#0d0d0d` (near-black)
- **Font:** Google Font `Inter`
- **Title:** ~13px, uppercase, letter-spaced, `rgba(255,255,255,0.35)`
- **Playlist names:** `clamp()`-sized (~16–17px base), `rgba(255,255,255,0.75)` at rest, `#ffffff` on hover/focus
- **No underlines, no icons, no images**
- **Hover state:** color brightens to full white; tap highlight suppressed on mobile

## Layout

- Full-viewport centered column (flexbox)
- Title label above playlist list
- Playlist items stacked with generous line-height (~2.2)
- `max-width` container (e.g. 480px) so desktop doesn't stretch too wide
- Font sized so 6 items fit without scrolling on iPhone 17 (~390×844px logical, ~700px usable height after browser chrome)

## Responsiveness

- iPhone (primary): compact sizing, all 6 items visible without scroll
- iPad: same layout, slightly larger font via `clamp()`
- Desktop: same layout, full-white hover state visible

## Content (placeholder)

6 playlists with dummy names and `spotify:playlist:<id>` URIs, to be replaced by the user.

## Deployment

- GitHub Pages, no CI required — push `index.html` + `style.css` to `main`
- Repository settings: Pages source set to root of `main` branch
