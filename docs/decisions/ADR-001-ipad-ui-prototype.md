# ADR-001: Keep the iPad UI prototype in `prototypes/`, outside the application source

- Status: Proposed
- Date: 2026-11-24
- Owners: TBD

## Context

A clickable iPad prototype of the Olaa Notes home screen exists (plain HTML, CSS and JavaScript, no dependencies). It was built through about 25 rounds of design feedback to explore the canvas, Apple Pencil input, files and folders, and multitasking. It previously lived in `olaa-platform/prototypes/takenote-ipad-home` (olaa-platform ADR-0003) because this repository was not available to the session.

`docs/architecture/TECH_STACK.md` lists the production stack as proposed, not approved, and says not to install dependencies until it is. The prototype does not use that stack.

## Decision

- The prototype lives in `prototypes/ipad-home/`, not in `src/`. It is a reference for behaviour and visual design, not application code.
- It is published as an installable web app (manifest, icons, offline service worker) through GitHub Pages so it can be tried on an iPad from the Home Screen.
- Its only dependency is `@playwright/test`, pinned and locked, scoped to `prototypes/ipad-home/package.json` for its smoke tests. Nothing is added to the repository root.
- No module in `docs/architecture/MODULES.md` is marked as implemented because of it.

## Alternatives considered

- **Put it in `src/`:** would imply an approved stack and production status. Rejected.
- **Leave it in `olaa-platform`:** contradicts the four-repository model (app code lives in the app repository).
- **Native build (SwiftUI/PencilKit) via TestFlight:** the likely production path for Pencil quality, but needs an Apple Developer account and a separate project; out of scope for a prototype.

## Consequences

- The product team can install and try the design on real iPads.
- When the production stack is approved, `src/` starts from scratch; the prototype stays as a reference until it is retired.
- The prototype has its own README, SECURITY.md, REVIEW.md and tests.

## Security / privacy impact

Static files only, no backend, no accounts. A strict Content-Security-Policy is set; the service worker caches only same-origin files. Google Fonts is the only third-party request. See `prototypes/ipad-home/SECURITY.md`.

## Rollback / migration

Delete `prototypes/ipad-home/` and `.github/workflows/prototype-pages.yml`, and switch off GitHub Pages. Nothing else depends on them.
