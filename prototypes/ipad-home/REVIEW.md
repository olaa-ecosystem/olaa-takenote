# Review: Olaa Takenote iPad home prototype

Date: 2026-11-24. Scope: the code in this folder after 14 rounds of design feedback. Method: reading the code, running the smoke tests (5 of 5 pass in Chromium at 1180 × 820), and the manual checks done during each round. Nothing here was tested on a real iPad with an Apple Pencil; every point about Pencil feel is a hypothesis until it is.

Each section lists what works, what to improve, and a priority: **P1** before the next user test, **P2** before choosing the production stack, **P3** when the production app is built.

## Summary

The prototype does its job: it shows a clear, calm idea of a Pencil-first notes app where the note, the files and the day live on one surface. Interaction quality is high for a web prototype: physics-based dragging, spring motion, palm rejection and pressure-sensitive ink. The main weaknesses are the ones you'd expect after fast iteration: one 2,700-line script, no persistence, little accessibility work, and Pencil behaviour that has only been simulated. Use it to run user tests and to write the specs for modules 03.04–03.06. Don't grow it into the product.

| Area | Rating | One line |
|---|---|---|
| Product and UX | Strong | One surface for note, files and day; few modes. |
| iPad and Apple Pencil | Promising, unverified | Right building blocks; never run on hardware. |
| Visual and brand | Strong | Glass, pastel and grain read as one family. |
| Motion | Strong | Springs and FLIP are consistent; reduced motion is respected. |
| Performance | Adequate | Fine for a demo; full redraws of committed ink and list rebuilds will not scale. |
| Accessibility | Weak | Labels exist on buttons; little else. |
| Security and privacy | Good for a prototype | Strict CSP for scripts, escaped input, validated storage. |
| Code quality | Weak | Works, but one IIFE with shared mutable state. |
| Ecosystem integration | Mock only | Habits, Language and Calendar are sample data. |
| Testing | Thin | 5 smoke tests; no Pencil, gesture or visual tests. |

## 1. Product and UX

**Works**
- One surface. The note, the files and the day view sit together, so a user never has to "go to" a file manager. Few apps in this space do that.
- Every action has a direct gesture: drag a file onto another to make a folder, hold for a menu, hold empty space to select. There is no edit mode to enter or leave, and selection ends when you tap empty space.
- The window buttons have one meaning each: red closes the note into the toolbar, yellow sets 75%, green goes full screen. That's easy to learn.
- The mood picker with one short line per feeling gives the app a personality without getting in the way.

**Improve**
- **P1** Discoverability. Long-press menus, hold-to-snap shapes and drag-to-pop-out are invisible. Add a first-run hint layer (three or four quiet cards, dismissible) and test whether users find folders without help.
- **P1** Undo. Delete, move-to-folder and merge have no undo. Add a short "Undo" toast after destructive actions, and two-finger tap to undo ink, as Notes and GoodNotes do.
- **P2** Many floating files on the main screen will become clutter after a few weeks of real use. Test with 50+ files and decide between auto-tidy, a "stack by day" option, or a cap with an archive.
- **P2** The note window is a single page. Real notes need page navigation (module 03.07) and the prototype gives no hint where it goes.
- **P3** Search (03.11) is absent; for a notes app it is a core path, not an extra.

## 2. iPad and Apple Pencil

**Works**
- Pointer Events with `pointerType` separate pen, touch and mouse cleanly: the pen draws, a finger pans and pinches, the mouse is for desktop testing.
- Pressure, coalesced events (more points per frame) and predicted events (lower perceived latency) are all used.
- Palm rejection: touches are ignored while the pen is down, and large contacts shortly after are dropped.
- Buttons capture the pointer so a Pencil tap that drifts a few pixels still counts; hover effects only apply to a mouse, so they don't stick after a tap.

**Improve**
- **P1** Test on a real iPad with Pencil 2 and Pencil Pro. Measure: latency from tip to ink (target under 20 ms perceived), missed taps on small controls, palm rejection while resting the hand mid-stroke, and pinch while the pen is lifted.
- **P1** Tilt (`tiltX`, `tiltY`, `altitudeAngle`) is not used. Pencil shading with the side of the tip is expected by artists.
- **P2** Pencil hover (iPad Pro M2 and later) and squeeze or barrel-roll (Pencil Pro) are not available in Safari to web pages in the same way as to native apps. If those gestures matter to the product, that is a strong reason to go native (see section 11).
- **P2** Double-tap on Pencil 2 to switch to the eraser is not reachable from the web.
- **P3** Scribble (handwriting into text fields) only works in native text inputs.

## 3. Visual and brand

**Works**
- Liquid glass panels with blur, a soft rim and inner light read as one family with the pastel palette.
- Film grain and muted colour fit the olaa visual direction without becoming a filter on everything.
- Light and dark themes are built from tokens, so a third theme or a brand change is a token edit.
- Inter at small sizes with careful weights keeps the interface quiet.

**Improve**
- **P1** Contrast. Small grey text on frosted glass (file meta, toolbar hints) is likely to fall below 4.5:1 over light backgrounds. Measure it and darken those tokens where it does.
- **P2** The blur cost grows with every glass layer that overlaps. On older iPads (A12, A13) test with 10+ open panels and fall back to a flatter fill when frame time rises.
- **P2** Icon set is a mix of hand-drawn SVG paths. Before production, draw one consistent set or map to SF Symbols in a native build.

## 4. Motion

**Works**
- Spring curves (`linear()` easings) and a small set of named springs keep motion consistent.
- FLIP transitions make panels morph from the button that opened them, so the user can see where things come from and go to.
- Files are physical: they can be flung, they bounce at the edges and collide only when free, which makes the canvas feel alive without being noisy.

**Improve**
- **P2** `prefers-reduced-motion` is checked in both CSS and JavaScript (spring durations drop to 1 ms, ripples and morphs are skipped). Verify on iPad with Reduce Motion on, including file flings, which still glide.
- **P2** Most transitions take 260–420 ms. In repeated use (opening files all day) test whether the longer ones feel slow and trim them toward 250–300 ms.
- **P3** Haptics are not available on iPad, but sound cues for snap and merge could help; keep them off by default.

## 5. Performance

**Works**
- The app is static files (about 350 KB before compression, no framework), so it loads quickly.
- The full emoji list is only fetched the first time the picker opens.
- Animation uses `transform` and `opacity`, which the browser can run on the compositor.

**Improve**
- **P1** Ink already uses two layers: committed strokes on a base canvas and the live stroke on its own layer, so drawing stays light. But any edit to committed ink (erase, lasso move, undo) redraws every stroke on the base. With hundreds of strokes that will stall. Redraw only the dirty region, or keep strokes in tiles.
- **P2** The physics loop runs every frame while anything moves. Put bodies to sleep when their speed is near zero and stop the loop when all are asleep (it partly does; profile it).
- **P2** `innerHTML` rebuilds (45 call sites) replace whole lists on small changes. Fine at 7 files, slow at 500. Update the changed node instead.
- **P3** Long notes need tiling or virtualised pages.

## 6. Accessibility

**Works**
- Most buttons have an `aria-label` (about 60 labels across markup and script).
- User text is real text, not drawn, so it can be read by VoiceOver.

**Improve**
- **P1** Files and folders are `div`s with pointer handlers only. Give them a role (`button` or `listitem`), a name and keyboard access (Enter to open, arrow keys to move, Delete to remove).
- **P1** Every gesture needs an alternative: long-press menus should also open from a visible "…" button or a keyboard key; drag-to-folder needs a "Move to" command (which exists in the menu; make sure it covers every case).
- **P1** Escape closes every open layer in the right order, which is good. Focus is not moved into menus and sheets when they open, or returned when they close; add that so keyboard and VoiceOver users don't get lost.
- **P2** Ink has no text alternative. Plan handwriting recognition (03.11) as an accessibility feature, not only search.
- **P2** Test with VoiceOver on iPad, Dynamic Type sizes, and Increase Contrast.

## 7. Security and privacy

**Works**
- `index.html` sets a Content-Security-Policy: scripts from this folder only, no inline script, no plugins, no form posts, no workers, network requests only to the same folder.
- All names are escaped before they enter HTML; user text uses `textContent`. A test checks that a file named `<img src=x onerror=…>` does nothing.
- Imported files are size-capped (25 MB), images are shown only in `<img>` (no SVG script), other types are never opened.
- Everything read back from `localStorage` is validated against known values.
- No Apple emoji artwork is in the repository, so there is no licence exposure.
- The single test dependency is pinned and locked.

**Improve**
- **P2** `style-src 'unsafe-inline'` is still needed for inline `style` attributes. Move those values to CSS custom properties set via `element.style.setProperty`, then drop it.
- **P2** Self-host Inter to remove the only third-party request (Google can see the viewer's IP).
- **P3** For the product: encryption at rest for notes, sign-in, sharing permissions and sync conflict handling belong to branches 05, 08, 14 and 19. The prototype does not model any of them, so their effect on the UI (lock icons, sharing states, conflict banners) is still undesigned.

See [SECURITY.md](SECURITY.md) for the threat table and the hosting checklist.

## 8. Code quality and architecture

**Works**
- No dependencies, no build step: anyone can open and read it.
- Clear building blocks exist inside the script: a `Body` physics class, a single `draggable()` helper, `morph()` and `swapMenu()` for motion, and one layer order list for z-index.
- Escaping and storage validation are centralised.

**Improve**
- **P1** Split `js/app.js` (2,714 lines, one IIFE) into ES modules: `physics`, `drag`, `ink`, `files`, `menus`, `mood`, `today`, `theme`. Each should export a small interface; shared state goes into one `store` module. ES modules also work under the current CSP.
- **P2** State is mutated from many places (file list, selection, open note). Introduce one state object with explicit actions so the UI can be re-rendered or tested from state.
- **P2** Magic numbers (hold times, thresholds, spring constants) are spread through the code. Gather them in one `config` module; they are design decisions and should be visible.
- **P2** Add ESLint and Prettier with a minimal config to keep the split modules consistent.
- **P3** The production app should not be built by extending this code (see section 11). Treat it as a reference implementation of behaviour.

## 9. Ecosystem integration

**Works**
- The Today view shows how Notes, Habits and Language could share one day: mood, habit ticks, lessons and calendar events in one place.
- App icons near the title show the three apps as one family.

**Improve**
- **P1** All of it is sample data. Before building it, define the contracts in branch 20 (API & Integration Contracts): a `day-summary` read model, a `habit-checked` event and a `mood-set` event, and record them as PENDING in `DEPENDENCY_MAP.md`.
- **P2** Apple Calendar access is only possible from a native app (EventKit) or through a server-side CalDAV integration (branch 16). The web prototype cannot do it, so the design should not depend on it for the first release.
- **P2** Decide who owns mood: Takenote, Habits, or Shared Core (04). It appears in both apps today.

## 10. Testing

**Works**
- Playwright smoke tests cover: no script errors, no CSP violations, drawing a stroke, the mood picker, the long-press menu, importing a file, and HTML escaping in file names.

**Improve**
- **P1** Add tests for folder creation by drag, selection and delete, the three window buttons, and theme switching.
- **P1** Add a WebKit project to the Playwright config; iPad Safari is WebKit, not Chromium.
- **P2** Visual regression screenshots for light and dark at iPad sizes (1180 × 820, 1366 × 1024, 820 × 1180 portrait).
- **P2** A manual Pencil test script (a checklist) for each release, since automation cannot simulate a real Pencil.
- **P2** Run the tests in CI (branch 10) on every pull request.

## 11. Path to production

The biggest open decision is in `IMPLEMENTATION_STATUS.md`: "main client platform: not decided". This prototype gives evidence for it.

| Option | For | Against |
|---|---|---|
| Native (SwiftUI + PencilKit) | Lowest ink latency, full Pencil features (hover, squeeze, barrel roll, double-tap), Scribble, EventKit for Calendar, real glass materials, iCloud | iPad and iPhone only; separate web and Android work |
| Web (PWA) | One codebase for every device, this prototype is a head start, instant updates | Higher ink latency, no Pencil Pro gestures, no Calendar access, limited background sync, storage can be evicted |
| Hybrid (native shell, web views) | Reuse some UI | Two ink stacks; latency and gestures stay limited in the web part |

**Recommendation:** for a Pencil-first notes app, build the client natively with SwiftUI and PencilKit, and keep this prototype as the interaction reference. Record the choice in an ADR. Re-use from this prototype: the interaction rules (hold times, thresholds, window button meanings), the motion specs, the colour and type tokens, and the test checklist.

## Next steps, in order

1. Run a Pencil test on a real iPad and record the numbers (section 2).
2. Run a five-person user test with the first-run hints added (section 1).
3. Fix the P1 accessibility and contrast items (sections 3 and 6).
4. Write the platform ADR (section 11) and the three integration contracts (section 9).
5. Move this prototype into `olaa-takenote` when that repository is set up, and split `app.js` into modules if it will be used for further tests.
