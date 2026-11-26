# Security notes: iPad prototype

This prototype runs entirely in the browser. It has no server, no login and sends no user data anywhere. The notes below describe what it protects against and what is deliberately out of scope. The repository-wide policy is in `SECURITY.md` and `docs/security/SECURITY_BASELINE.md`; the ecosystem policy is in branch 08 (Security) of `olaa-platform`; report vulnerabilities through GitHub Private Vulnerability Reporting, never in a public issue.

## What could go wrong, and what stops it

| Risk | Protection in this prototype |
|---|---|
| Script injection through file names, imported text or renamed notes | Every name is escaped (`esc()`) before it goes into HTML; note titles, toasts and imported text are set with `textContent`. There is no `eval`, `new Function` or `document.write`. |
| A malicious imported file | Images are read as `data:` URLs and shown only in `<img>`, where SVG scripts cannot run. Text is truncated to 20,000 characters and shown as plain text. Other types are listed by name and size only, never opened. Files over 25 MB are refused. |
| Third-party code running in the page | `index.html` sets a Content-Security-Policy: scripts only from this folder, no inline script, no plugins (`object-src 'none'`), no `<base>` changes, no form posts, workers only from this folder (the offline service worker), network requests only to this folder. |
| Tampered `localStorage` | Every value read back is validated: the theme must be `light` or `dark`, recent emoji must point at known entries, habit days must be `YYYY-MM-DD` and habit ids must be known. Anything else is ignored. |
| The offline cache serving stale or foreign files | `sw.js` caches only same-origin GET requests from this folder; requests to other sites (Google Fonts) always go to the network. The cache name is a hash of the app's files, so each release replaces the previous copy and old caches are deleted. |
| Leaking which page the user came from | `<meta name="referrer" content="no-referrer">`. |
| Clickjacking | Not covered by a `<meta>` tag. When this is hosted, send `Content-Security-Policy: frame-ancestors 'none'` as an HTTP header. |

## Why `style-src` allows `'unsafe-inline'`

The interface builds some elements with inline `style` attributes, for example colour swatches and emoji sizes. This allows CSS only, not script. Moving those values to CSS custom properties set from JavaScript would let the policy drop `'unsafe-inline'`; that is listed as a follow-up in the review.

## Privacy

- Nothing leaves the device except two requests to Google Fonts for the Inter typeface. Google can see the viewer's IP address. For production, self-host Inter (it is under the SIL Open Font License) and remove `fonts.googleapis.com` and `fonts.gstatic.com` from the policy.
- `localStorage` holds only the theme, up to 8 recent emoji and the ticked habits. No note content is stored.

## Not in scope for a prototype

Authentication, authorisation, encryption at rest, sync conflict handling and audit logging belong to the production app and the backend (branches 05, 08, 14 and 19 in `olaa-platform`).

## Checklist before any public hosting

- [ ] Self-host Inter and tighten the policy.
- [ ] Serve with HTTPS and the headers `Content-Security-Policy` (including `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- [ ] Keep Apple emoji images out of any public build.
- [ ] Run `npm audit` on the test tooling.
