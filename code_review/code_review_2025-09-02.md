# Quick Wins — Implementation Log (2025-09-02)

This note documents the “quick wins” applied and any follow‑ups needed.

## Changes Applied

- Google Fonts loading
  - Added `rel="preconnect"` for `fonts.googleapis.com` and `fonts.gstatic.com`.
  - Added `rel="stylesheet"` links with `display=swap` for Inter and JetBrains Mono.
  - File: `public/index.html`

- Security and caching headers (Firebase Hosting)
  - Added `Content-Security-Policy` for self + Firebase/Fonts domains.
  - Added `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` minimal, and `Strict-Transport-Security`.
  - Set `Cache-Control`:
    - `index.html`: no-cache (to prefer fresh HTML).
    - Static assets: long-lived `max-age=31536000, immutable`.
  - File: `firebase.json`

- Service Worker navigation strategy
  - Switched to network‑first for `request.mode === 'navigate'` to reduce stale HTML, with offline fallback to `/offline.html`.
  - Kept cache‑first for other requests.
  - File: `public/sw.js`

## Items Not Applied (Follow‑ups Needed)

- Icons (favicon + PWA)
  - Temporarily removed favicon and manifest icon references to avoid 404s.
  - When assets are available, re-add in `public/index.html` and `public/manifest.json`.
  - Recommended assets to add:
    - `public/icons/icon-72.png`
    - `public/icons/icon-192.png`
    - `public/icons/icon-512.png`
    - Optional: `public/icons/today-shortcut.png`, `public/icons/add-task-shortcut.png`
  - After adding, restore references and redeploy to enable full PWA install UI.

## Verification Checklist

- Fonts render with Inter/JetBrains Mono on reload.
- Response headers (on deploy) include CSP, referrer policy, permissions policy, nosniff.
- `index.html` served with no-cache headers; static assets with long cache.
- Navigations fetch fresh HTML; offline mode shows `/offline.html`.
- Manifest audit is clear once icons exist.

## Notes

- Consider migrating Firebase compat CDN to v9 ESM imports to reduce JS size and improve tree‑shaking.
- Replaced `alert(...)` usage with a lightweight toast component for non‑blocking UX (see `public/js/utils/Toast.js` and updates across utils/UI/components).
