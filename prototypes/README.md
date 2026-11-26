# Olaa Notes prototypes: iPad and iPhone

Two installable web-app prototypes of Olaa Notes, built from **one source**:

| Build | Folder | Made for | Open locally |
|---|---|---|---|
| iPad | [`ipad-home/`](ipad-home/) | Apple Pencil; floating windows, files on the desk | `http://127.0.0.1:4173/ipad-home/` |
| iPhone | [`iphone-home/`](iphone-home/) | one finger draws; the note fills the screen, files behind the Files button | `http://127.0.0.1:4173/iphone-home/` |

What the prototype is (and is not), how to install it and the full list of interactions: [`ipad-home/README.md`](ipad-home/README.md). iPhone differences: [`iphone-home/README.md`](iphone-home/README.md).

## Where things live

```text
prototypes/
├── source/                    EDIT HERE
│   ├── takenote.html          the app: markup, shared CSS, shared JavaScript
│   ├── data/emoji-all.json    emoji names and categories (no images)
│   └── devices/
│       ├── devices.json       per device: barScale (top bar + pen toolbar), iconScale (file icons), name, orientation
│       ├── ipad.css  ipad.js      iPad layout and settings
│       └── iphone.css iphone.js   iPhone layout and settings
├── tools/build.py             writes everything below from source/
├── shared/                    GENERATED: css/app.css, js/app.js, js/emoji.js, data/ (icons/ is static)
├── ipad-home/                 GENERATED: index.html, css/ipad.css, js/ipad.js, manifest, sw.js (+ docs)
├── iphone-home/               GENERATED: index.html, css/iphone.css, js/iphone.js, manifest, sw.js (+ docs)
├── tests/ipad.spec.mjs        iPad smoke tests (1180 × 820, mouse)
├── tests/iphone.spec.mjs      iPhone smoke tests (iPhone 15, touch)
└── playwright.config.mjs, package.json
```

To review one device, read its two files: `<device>-home/css/<device>.css` and `<device>-home/js/<device>.js`. Everything both devices share is in `shared/`.

## Change something

```bash
cd prototypes
# 1. edit source/takenote.html (both devices) or source/devices/<device>.* (one device)
python3 tools/build.py            # 2. rebuild shared/, ipad-home/, iphone-home/
python3 -m http.server 4173 --bind 127.0.0.1   # 3. look at both
npm ci && npx playwright install chromium && npm test   # 4. test both
```

Never edit a generated file: the next build overwrites it, and CI fails if a generated file doesn't match the source.

**Sizes stay in sync.** `tools/build.py` reads every top-bar and pen-toolbar rule in the shared CSS and writes a scaled copy into each device's CSS, using that device's `barScale` in `devices.json`. File icons use `iconScale`. So when a button, icon or font size changes in the shared CSS, every device gets the same change at its own scale on the next build, and changing one number in `devices.json` resizes a whole device.

## Automation on GitHub

| Workflow | When | What |
|---|---|---|
| `.github/workflows/prototype-sync.yml` | a push (not to `main`) that changes `source/` or `tools/` | runs the build; if the device folders changed, commits them to the same branch |
| `.github/workflows/prototype-pages.yml` | pull requests and pushes to `main` that touch `prototypes/` | checks the build is current, runs both device test suites; on `main`, publishes both to GitHub Pages (iPhones get `iphone-home/`, everything else `ipad-home/`) |

## Single-file builds

`python3 tools/build.py --standalone <dir>` also writes `takenote-ipad.html` and `takenote-iphone.html`, each one self-contained, for offline demos. `--emoji-js <file>` embeds an emoji image map; Apple emoji artwork is not licensed for redistribution, so keep `<dir>` outside the repository.
