# Spotify Playlists Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a minimalist dark-themed static HTML page that lists 6 Spotify playlists as tappable deep links, deployed to GitHub Pages.

**Architecture:** Single `index.html` + `style.css`, no build step, no dependencies beyond a Google Font CDN link. Playlist data lives in a clearly commented block in the HTML. Deployed by pushing to `main` on GitHub with Pages configured to serve from the repo root.

**Tech Stack:** HTML5, CSS3 (flexbox, clamp()), Google Font (Inter), GitHub Pages

---

### Task 1: Initialize the project

**Files:**
- Create: `index.html`
- Create: `style.css`

**Step 1: Create `index.html` with boilerplate**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Playlists</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main>
    <p class="label">Playlists</p>

    <!-- =============================================
         PLAYLIST DATA — edit names and spotify URIs here
         ============================================= -->
    <nav>
      <a href="spotify:playlist:37i9dQZF1DXcBWIGoYBM5M">Today's Top Hits</a>
      <a href="spotify:playlist:37i9dQZF1DX0XUsuxWHRQd">RapCaviar</a>
      <a href="spotify:playlist:37i9dQZF1DX4JAvHpjipBk">New Music Friday</a>
      <a href="spotify:playlist:37i9dQZF1DWXRqgorJj26U">Rock Classics</a>
      <a href="spotify:playlist:37i9dQZF1DX4sWSpwq3LiO">Peaceful Piano</a>
      <a href="spotify:playlist:37i9dQZF1DX3rxVfibe1L0">Mood Booster</a>
    </nav>
    <!-- ============================================= -->

  </main>
</body>
</html>
```

**Step 2: Create empty `style.css`**

```css
/* styles go in next task */
```

**Step 3: Open `index.html` in a browser and confirm it renders (unstyled) with 6 links visible**

**Step 4: Commit**

```bash
git init
git add index.html style.css
git commit -m "feat: add project scaffold with placeholder playlists"
```

---

### Task 2: Base styles — reset, background, font

**Files:**
- Modify: `style.css`

**Step 1: Add reset + base styles to `style.css`**

```css
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
}

body {
  background-color: #0d0d0d;
  color: rgba(255, 255, 255, 0.75);
  font-family: 'Inter', system-ui, sans-serif;
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Step 2: Verify in browser — page should be dark with light text**

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add base styles and dark background"
```

---

### Task 3: Layout — center content on viewport

**Files:**
- Modify: `style.css`

**Step 1: Add layout styles**

```css
main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.5rem;
}
```

**Step 2: Verify in browser — content should be centered vertically and horizontally**

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add centered flex layout"
```

---

### Task 4: Typography — label and playlist links

**Files:**
- Modify: `style.css`

**Step 1: Style the label and nav links**

```css
.label {
  font-size: 0.65rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 1.6rem;
}

nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

nav a {
  display: block;
  font-size: clamp(0.9rem, 2.5vw, 1.05rem);
  font-weight: 300;
  line-height: 2.2;
  color: rgba(255, 255, 255, 0.72);
  text-decoration: none;
  text-align: center;
  -webkit-tap-highlight-color: transparent;
  transition: color 0.15s ease;
}

nav a:hover,
nav a:focus-visible {
  color: #ffffff;
  outline: none;
}

nav a:active {
  color: rgba(255, 255, 255, 0.5);
}
```

**Step 2: Verify in browser:**
- Label appears small, uppercase, dim
- Playlist names are clean, no underlines
- Hover brightens to white on desktop
- All 6 items are visible without scrolling (resize to ~390×844 using DevTools iPhone preset)

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add typography styles for label and playlist links"
```

---

### Task 5: Responsive polish

**Files:**
- Modify: `style.css`

**Step 1: Add max-width container and iPad/desktop tweaks**

```css
main {
  /* add to existing rule: */
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}
```

Note: Edit the existing `main` rule to add `max-width: 480px; margin: 0 auto; width: 100%;` — do not duplicate the rule.

**Step 2: Verify at multiple viewport sizes in DevTools:**
- iPhone 17 (390×844): all 6 items visible without scroll, centered
- iPad (820×1180): slightly larger font via `clamp()`, still centered
- Desktop (1440×900): content stays in a readable column, doesn't stretch

**Step 3: Commit**

```bash
git add style.css
git commit -m "feat: add max-width and responsive polish"
```

---

### Task 6: Set up GitHub Pages deployment

**Files:**
- Create: `.gitignore` (optional, minimal)

**Step 1: Create `.gitignore`**

```
.DS_Store
```

**Step 2: Ensure a GitHub repository exists and `main` branch is pushed**

```bash
# If not already done — create repo on GitHub first, then:
git remote add origin https://github.com/<your-username>/Spotify-Playlists.git
git branch -M main
git push -u origin main
```

**Step 3: Enable GitHub Pages**

- Go to the repository on GitHub
- Settings → Pages
- Source: Deploy from branch → `main` → `/ (root)`
- Save

**Step 4: Verify the live URL loads the page correctly (GitHub will show the URL, typically `https://<username>.github.io/Spotify-Playlists/`)**

**Step 5: Commit `.gitignore`**

```bash
git add .gitignore
git commit -m "chore: add gitignore"
git push
```

---

## Done

The page is live on GitHub Pages. To update playlists later: edit the commented block in `index.html`, commit, and push.
