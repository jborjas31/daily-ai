# UX Polish Checklist — Vanilla JS + PWA (This Repo)

This trims the general list to concrete, low‑risk steps mapped to your codebase. Paths are relative to `public/`.

## Quick Wins (Do These First)
- [ ] Dynamic page titles per view (S)
  - Add a small helper and call it from `utils/ResponsiveNavigation.js` on view switch and from `components/TaskModalContainer.js` when opening modals.
- [ ] Favicons + PWA icons (S)
  - Re-enable favicon links in `index.html` and populate icons referenced by `manifest.json`.
- [ ] Social metadata (S)
  - Add Open Graph/Twitter meta tags for better link unfurls.
- [ ] Empty/loading state pass (S)
  - Today view and Library already have empty states; add lightweight skeletons while switching views or reloading schedule.

## Files To Touch
- `public/index.html`
- `public/js/utils/ResponsiveNavigation.js`
- `public/js/components/TaskModalContainer.js`
- `public/css/main.css`, `public/css/components.css`

---

## 1) Dynamic Page Titles
Keep titles meaningful so browser tabs and history are clearer.

- [ ] Add helper `public/js/utils/DocumentTitle.js` (S)
```js
// public/js/utils/DocumentTitle.js
const base = 'Daily AI';
export function setTitle(suffix = '') {
  document.title = suffix ? `${base} — ${suffix}` : base;
}
```

- [ ] Wire in `ResponsiveNavigation.switchToView` (S)
```js
// public/js/utils/ResponsiveNavigation.js
import { setTitle } from './DocumentTitle.js';
// ... inside switchToView(viewName):
const titles = { today: 'Today', library: 'Task Library', settings: 'Settings' };
setTitle(titles[viewName] || '');
```

- [ ] Set while modal is open (optional, S)
```js
// public/js/components/TaskModalContainer.js
import { setTitle } from '../utils/DocumentTitle.js';
// after opening:
const prevTitle = document.title;
setTitle(this._mode === 'edit' ? 'Edit Template' : 'Create Template');
// on close:
setTitle(prevTitle.replace(/^Daily AI — /, ''));
```

## 2) Favicons + PWA Icons
Your `index.html` comments note favicons were removed; `manifest.json` exists.

- [ ] Provide icons and re-enable links (S)
```html
<!-- public/index.html <head> -->
<link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/icons/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" sizes="180x180">
<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3B82F6">
<meta name="theme-color" content="#3B82F6">
```

- [ ] Ensure `public/manifest.json` icons exist (S)
- 48/72/96/128/144/152/192/384/512 PNG + one maskable. Place under `public/icons/` and reference in `manifest.json`.

## 3) Social Metadata
Better link previews when you share the app URL.

- [ ] Add OG/Twitter tags to `index.html` (S)
```html
<meta property="og:title" content="Daily AI — Task Manager">
<meta property="og:description" content="Time-based daily task manager with intelligent scheduling.">
<meta property="og:type" content="website">
<meta property="og:image" content="/icons/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Daily AI — Task Manager">
<meta name="twitter:description" content="Time-based daily task manager with intelligent scheduling.">
<meta name="twitter:image" content="/icons/og-image.png">
```

## 4) Navigation Polish
The responsive nav is in great shape; add micro-tweaks.

- [ ] Announce view changes to SRs (S)
```js
// public/js/utils/ResponsiveNavigation.js
const live = document.getElementById('sr-live') || Object.assign(document.body.appendChild(document.createElement('div')), { id: 'sr-live', className: 'sr-only', setAttribute: (k,v)=>HTMLElement.prototype.setAttribute.call(this,k,v) });
live.setAttribute('aria-live', 'polite');
live.textContent = `${titles[viewName]} view`;
```

- [ ] Keep active states consistent (already in place via `aria-current` and `.active`)

## 5) Loading + Empty States
Skeleton CSS exists in `components.css`. Use it briefly on view switches.

- [ ] Today view: show skeleton panel while schedule refreshes (S)
```js
// public/js/ui.js
// before async reloads, insert:
mainContent.innerHTML = `<div class="view-container"><div class=\"card skeleton\" style=\"height:120px\"></div><div class=\"card skeleton\" style=\"height:280px;margin-top:16px\"></div></div>`;
```

- [ ] Library: optional skeleton rows while filtering large sets (S)

## 6) Accessibility Checks
Most foundations are present (focus ring, roles, FocusTrap, reduced motion). A few targeted checks:

- [ ] Ensure modal close on `Esc` and overlay click (done)
- [ ] Ensure labels are visible and placeholders are examples (review task modal sections)
- [ ] Verify color contrast for `.btn-secondary` text ≥ 4.5:1 (quick sweep)

## 7) Performance Touch-ups
- [ ] Defer non-critical fonts (S)
```html
<!-- index.html: consider font-display swap already applied via CSS @import; alternatively inline preloads or swap to system stack if flashes are undesirable. -->
```
- [ ] Preconnects already present; keep images sized with explicit width/height to avoid CLS (S)

---

## Done/Already Implemented (Skip)
- Visible focus styles via `*:focus-visible` in `css/main.css`.
- Design tokens (spacing, radii, shadows, scale) in `css/main.css`.
- Toasts with `utils/Toast.js` and styles under `css/components.css`.
- Focus-trapped, accessible modal container with `role="dialog"` and `aria-modal`.
- Reduced motion handling in `css/main.css`.
- Offline support: `offline.html`, `sw.js`, and `utils/OfflineDetection.js`.

---

## Implementation Order (Fast Track)
1) Add `DocumentTitle.js` and wire to navigation + modal.
2) Re-enable favicon links and drop in icon files; update `manifest.json` if needed.
3) Add OG/Twitter meta tags.
4) Add lightweight skeletons during schedule refresh.

If you want, I can implement steps 1–3 in a single, small PR later.
