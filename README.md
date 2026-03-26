# Quicklinks

A minimalist personal link launcher for your phone's home screen. Tap a link, the app opens instantly. No ads, no accounts, no tracking — just your links, stored locally on your device.

Originally built for Spotify playlists, but works with any deep link: Spotify, Apple Podcasts, Calm, YouTube, or anything else that has a URL scheme.

**[Live demo](https://cbolik.github.io/Quicklinks/)**

---

## What it does

- Organizes links into **pages by category** (e.g. "Playlists", "Podcasts", "Calm")
- Swipe or use arrow keys to move between pages
- Tap any link to open it directly in the target app
- **All data stored in `localStorage`** — nothing ever leaves your device or appears in the repo
- Works as a home screen web app on iPhone/iPad

## How to use

### Adding links

Tap the **+** button (bottom right) and fill in:

- **Category** — the page this link appears on (e.g. "Playlists"). Type a new name to create a new page, or pick an existing one from the autocomplete.
- **Name** — the display label for the link (e.g. "Current Tracks")
- **Link** — the URL or deep link URI (see examples below)

### Deleting links

- **Mobile:** swipe a link left to reveal a red Delete button
- **Desktop:** hover over a link and click the × that appears

### Navigating pages

- **Mobile:** swipe left/right — wraps around continuously
- **Desktop:** click the `‹` `›` arrows, or use the left/right keyboard arrow keys
- **Dots** at the top show which page you're on and can be tapped directly

---

## Link formats

Quicklinks accepts any URL or URI. Some useful formats:

| App | Example link |
|-----|-------------|
| Spotify playlist | `spotify:playlist:37i9dQZF1DXcBWIGoYBM5M` |
| Spotify album | `spotify:album:40EyFvLYo0Gesi6wRP8SMo` |
| Spotify track | `spotify:track:4uLU6hMCjMI75M1A2tKUQC` |
| Apple Podcasts show | `https://podcasts.apple.com/podcast/id12345` |
| Calm session | `https://www.calm.com/...` |
| Any website | `https://example.com` |

On iOS, standard `https://` links to supported apps (Spotify, Podcasts, Calm, YouTube, etc.) open directly in the app via universal links — no custom URL schemes needed.

### Spotify links on macOS

On macOS, `spotify:` URIs are used directly with an 800ms fallback to the web player if the desktop app doesn't respond.

---

## Self-hosting

No build step required. It's three files.

1. **Fork or clone this repo**
2. **Enable GitHub Pages** (Settings → Pages → Deploy from branch `main`)
3. **Add to your iPhone home screen** (Share → Add to Home Screen) for a full-screen launcher experience
4. Your links are stored in `localStorage` on each device — re-add them after setting up on a new device

That's it. Your links never appear in the repo.

---

## Technical notes

- Pure HTML/CSS/JS — no framework, no build step, no dependencies
- Data model: `localStorage["quicklinks"]` → JSON array of `{ id, category, name, url }`
- Pages are generated dynamically from category groupings
- Circular carousel with smooth wrap-around (clone trick + rAF animation)
- Touch swipe detection distinguishes taps from swipes to avoid accidental navigation
- `100dvh` layout with `overscroll-behavior: none` for stable iOS rendering
