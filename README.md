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

### Editing and deleting links

Tap **⋮ → Edit** to enter edit mode. Each link row gains a drag handle (☰) for reordering, a pencil button (✎) to edit, and a × to delete.

### Managing pages

Tap **⋮ → Pages** to open the page editor. Drag handles (☰) to reorder, tap the name or the ✎ to rename, × to delete a page and all its links.

### Backing up and syncing

Tap **⋮ → Export** to save your links as a `quicklinks-export.json` file. On iOS/iPadOS this opens the native Share Sheet (save to Files, send via AirDrop, etc.); on macOS it downloads the file directly.

Tap **⋮ → Import** (or the **Import** button on the empty-state screen) to load a previously exported file. Importing merges with existing links — duplicates are skipped, nothing is overwritten.

### Navigating pages

- **Mobile:** swipe left/right — wraps around continuously
- **Desktop:** click the `‹` `›` arrows, or use the left/right keyboard arrow keys
- **Dots** at the top show which page you're on and can be tapped directly

---

## Sharing links from other apps (iOS, iPadOS, macOS)

You can share any URL directly into Quicklinks from the Share Sheet using a Shortcuts automation. When triggered, Quicklinks opens with the Add Link dialog pre-populated — just pick a page and save.

> **Requirements:** iOS / iPadOS 16+ or macOS Monterey (12)+ for the Shortcuts app.

### How it works

Quicklinks reads the `?add=<url>` query parameter on load, opens the Add Link dialog with the URL pre-filled, then immediately strips the parameter from the address bar so a reload doesn't re-trigger it. If the shared content is plain text containing a URL (e.g. from Calm), Quicklinks extracts the URL automatically.

### Setting up the Shortcut (one-time)

The steps below are verified on iOS/iPadOS/macOS 26.

1. Open the **Shortcuts** app → tap **+** to create a new shortcut
2. Tap the **dropdown arrow** next to the title → **Rename** → type **"Add To Quicklinks"**
3. Add a temporary placeholder action (e.g. search for **"Open App"** and add it) — this is required to enable the **ⓘ** button in the bottom toolbar
4. Tap **ⓘ** → enable **Show in Share Sheet** → tap **Done**.
   A **"Receive from Share Sheet"** action is added automatically at the top.
5. Delete the placeholder action from step 3
6. Tap the **Receive** action and set the accepted input types to:
   **Text**, **Rich Text**, **Safari Web Pages**, **URLs**, **Articles**
7. Add the following three actions:

   **Action 1 — URL Encode**
   Set input to **Shortcut Input**

   **Action 2 — Text**
   ```
   https://cbolik.github.io/Quicklinks/?add=
   ```
   After the `=`, insert the **URL Encoded Text** output from Action 1.
   *(If you self-host, replace the URL with your own GitHub Pages URL.)*

   **Action 3 — Open**
   Set to the **Text** output from Action 2

8. Tap **Done** to save

### Using it

In any app — Safari, YouTube, Spotify, Chrome, Podcasts, Calm, etc. — tap the **Share** button then **Add To Quicklinks**. Quicklinks opens in your browser with the URL pre-filled. Type a name, choose a page, tap **Add Link**, done.

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

No build step required. It's a handful of static files.

1. **Fork this repo** and note your new GitHub Pages URL (e.g. `https://your-username.github.io/Quicklinks/`)
2. **Enable GitHub Pages** (Settings → Pages → Deploy from branch `main`)
3. **Add to your iPhone home screen** (Share → Add to Home Screen) for a launcher experience
4. **Moving to a new device:** use **⋮ → Export** on your old device to save a backup, then **⋮ → Import** (or the Import button on the empty-state screen) on the new one. Links are stored in `localStorage` and don't sync automatically.

> **If you set up the iOS Shortcut:** update the URL in the Text action to your own GitHub Pages URL (replace `cbolik.github.io/Quicklinks` with your URL).

That's it. Your links never appear in the repo.

---

## Technical notes

- Pure HTML/CSS/JS — no framework, no build step, no dependencies
- Data model: `localStorage["quicklinks"]` → JSON array of `{ id, category, name, url }`
- Pages are generated dynamically from category groupings
- Circular carousel with smooth wrap-around (clone trick + rAF animation)
- Touch swipe detection distinguishes taps from swipes to avoid accidental navigation
- `100dvh` layout with `overscroll-behavior: none` for stable iOS rendering
