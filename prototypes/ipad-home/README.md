# Olaa Notes: iPad prototype

A clickable prototype of the Olaa Notes home screen for iPad: a movable liquid-glass note window built for Apple Pencil, free-floating files and folders, a day-mood picker, and a Today view that links Notes with Olaa Habits and Olaa Language.

**Status: UI prototype.** It is a design and interaction study written in plain HTML, CSS and JavaScript, kept outside `src/` because the production stack is not approved yet (see `docs/decisions/ADR-001-ipad-ui-prototype.md`). It is not the production app:

- no backend, no sync, no accounts;
- notes and files live in memory and are lost on reload;
- only the theme, language, toolbar side, recent emoji and ticked habits are kept, in the browser's `localStorage`;
- Apple Calendar events and past days in the calendar are labelled sample data;
- the in-app "Add to Home Screen" and "Share" menu items only show a message.

## Install it on an iPad or iPhone

The prototype is an installable web app. Once it is published (see below):

1. Open the link in **Safari** on the iPad.
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Open **Olaa Notes** from the Home Screen. It runs full screen, without Safari's bars, and works offline after the first visit.

The published address is `https://olaa-ecosystem.github.io/olaa-note/` once GitHub Pages is switched on for this repository (Settings → Pages → Source: **GitHub Actions**). The workflow `.github/workflows/prototype-pages.yml` publishes this folder on every push to `main`.

This is not an App Store app. Distributing through the App Store or TestFlight needs a native build signed with an Apple Developer account.

## Run it locally

Any static file server works. Serve the folder over HTTP (not as a file) so the emoji list and offline support load.

```bash
cd prototypes/ipad-home
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`. To try it on an iPad on the same network, use `--bind 0.0.0.0` and the computer's address; offline install needs HTTPS, so use the published link for that.

## Test it

```bash
cd prototypes/ipad-home
npm ci
npx playwright install chromium
npm test
```

The smoke tests start a local server, load the page and check: no script errors, no Content-Security-Policy violations, drawing a stroke, the mood picker, the long-press menu, importing a text file, that HTML in a file name is shown as text, and that the app installs and opens offline.

## Folder layout

```text
prototypes/ipad-home/
├── index.html              markup only; strict Content-Security-Policy
├── manifest.webmanifest    app name, icons and full-screen display for Add to Home Screen
├── sw.js                   offline cache of this folder's own files
├── icons/                  Home Screen icons (180, 192, 512, maskable 512, SVG)
├── css/app.css             all styles; light and dark themes as tokens
├── js/emoji.js             emoji image map (empty on purpose, see below)
├── js/app.js               all behaviour, one IIFE, no globals besides EMOJI
├── data/emoji-all.json     emoji names and categories (no images)
├── scripts/build_standalone.py   bundles everything into one HTML file
├── tests/smoke.spec.mjs    Playwright smoke tests
├── playwright.config.mjs
├── package.json            dev dependency only: @playwright/test (pinned)
├── package-lock.json       locked dependency tree for the tests
├── REVIEW.md               strengths, weaknesses and next steps
├── SECURITY.md             threat model and protections for this prototype
└── THIRD_PARTY_NOTICES.md
```

## Emoji

The repository contains no emoji artwork. The app draws emoji with the device's own font, which is Apple Color Emoji on iPad and Mac, so it looks the same there. Apple's emoji images are Apple's property and are not licensed for redistribution, so they are never committed. `scripts/build_standalone.py --apple-emoji <dir>` can add them to a private, local build for demos.

## Main interactions

| Area | How it works |
|---|---|
| Note window | Apple Pencil draws. Pinch to zoom the page (100%–400%, centred between your fingers); one finger pans when zoomed and moves the window at 100%; double-tap toggles 200%. Drag the corner to resize. Red: close to the toolbar. Yellow: 75% of the screen. Green: full screen. |
| Several files | Opening another note or file keeps the first one open behind it at the same size; tap a window behind to bring it forward. |
| Snap | Drag the note (by its handle or with one finger) or a file window (by its title bar) to the left or right edge: it takes half the workspace, and another open window fills the other half. Near a corner it takes a quarter. Drag a snapped window's corner to move the divider (for example 75% / 25%). Drag it away from the edge to unsnap; it keeps the size it had while snapped until you resize it yourself. Windows resize from their bottom-right corner, except a note preview, which has its Open button there. |
| Split screen | **Split** in the top bar: 2 side by side, 3 (one large, two stacked) or 4 in a grid; stacked on a phone. The note pane you are in is live (green outline); touch another note pane to write there. Text and images can be read and scrolled in their panes. **Change file** swaps what a pane shows. |
| Layout | On opening, the note sits in the centre, folders in a column on the left, files on the right. |
| Toolbar | Always the top layer: notes, open files and dragged files pass underneath it. Bottom centre by default; drop it near another edge to move it there, or near a corner to fold it into a circle. Colours, pen, pencil, highlighter, eraser, lasso, undo, redo, page style, finger drawing, this note, recent files. |
| Files column (75% window) | Tap opens, hold shows the menu, a vertical swipe scrolls. Drag a file or folder sideways out of the column and let go over the workspace to open it. |
| Files | Drag freely; hold one over another to make a folder; press and hold a file or folder for its menu; press and hold empty space to select, group, delete or change icons. |
| Top bar | Mood emoji, New note, Import, Files, language, light or dark. Tap the date for the calendar and habits. |
