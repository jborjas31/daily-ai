# UX Polish Checklist

A pragmatic, high‑reward/low‑risk checklist to make the app feel polished and professional without heavy rework.

Priority: 🟢 High reward  🔵 Medium  ⚪ Nice-to-have
Effort: S (minutes) / M (hour or two)

## Quick Start Order
1. Adopt spacing + type scale (S, 🟢)
2. Define button states + focus styles (S, 🟢)
3. Add loading, empty, error states (M, 🟢)
4. Constrain content width + whitespace (S, 🟢)
5. Add favicon, page titles, metadata (S, 🟢)
6. Improve forms (labels, validation, keyboard) (M, 🟢)
7. Table polish (sticky header, zebra, empty row) (M, 🔵)
8. Performance touch-ups (lazy images, defer JS) (S, 🔵)
9. Accessibility passes (roles, contrast, alt) (S, 🔵)

---

## Spacing & Typography
- [ ] Establish spacing scale: 4/8px increments; use tokens (S, 🟢)
- [ ] Base font-size 16px; line-height ~1.5 (S, 🟢)
- [ ] Heading hierarchy H1–H3 consistent; avoid jumps (S, 🟢)
- [ ] Constrain readable width to ~64–80ch for text (S, 🟢)
- [ ] Use system font stack or preload webfont; font-display swap (S, 🔵)

## Color & Theme
- [ ] Limit palette to 3–5 colors (primary, surface, danger, success) (S, 🟢)
- [ ] Ensure text contrast ≥ 4.5:1 (S, 🟢)
- [ ] Define semantic tokens (e.g., `--bg`, `--text`, `--border`) (S, 🔵)

## Navigation
- [ ] Sticky header with clear active route state (S, 🔵)
- [ ] Breadcrumbs for pages ≥ level 2; last crumb not clickable (S, 🔵)
- [ ] Search/filter area: clear reset and result count (M, 🔵)

## Buttons & Interactions
- [ ] Define primary/secondary/destructive/ghost styles (S, 🟢)
- [ ] Hover/active/disabled states; 150–200ms transitions (S, 🟢)
- [ ] Visible focus ring on interactive elements (S, 🟢)
- [ ] Icon + text alignment; minimum touch target 40px (S, 🔵)

## Feedback & States
- [ ] Loading: skeletons for lists/cards (>600ms) (M, 🟢)
- [ ] Empty states: helpful copy + CTA (M, 🟢)
- [ ] Errors: inline message for fields; toast for global (S, 🟢)
- [ ] Success toasts with brief copy; auto-dismiss (S, 🔵)

## Forms
- [ ] Labels always visible; placeholders as examples only (S, 🟢)
- [ ] Inline validation on blur/typing; actionable messages (M, 🟢)
- [ ] Keyboard flow: Tab order, Enter submits, Esc cancels (S, 🟢)
- [ ] Destructive actions prompt confirm with explicit Cancel/Confirm (S, 🔵)

## Layout & Components
- [ ] Consistent card/list padding, radius, and shadow tokens (S, 🟢)
- [ ] Modals: centered, focus trap, Esc/overlay close (M, 🟢)
- [ ] Duplicate primary CTA at top/bottom for long pages (S, 🔵)

## Tables & Data
- [ ] Sticky header; zebra rows; aligned columns (M, 🔵)
- [ ] Empty-state row with CTA when no data (S, 🟢)
- [ ] Loading row skeletons; preserve table height (M, 🔵)

## Performance & Perceived Speed
- [ ] Image `srcset`/sizes; lazy-load below fold; fixed dimensions (M, 🔵)
- [ ] Defer non-critical JS; prefetch likely next routes (M, 🔵)
- [ ] Use optimistic UI for quick actions (M, 🔵)

## Accessibility
- [ ] Keep outlines; custom focus ring for clarity (S, 🟢)
- [ ] ARIA roles for dialogs/toasts/nav; announce errors (M, 🔵)
- [ ] Respect reduced motion; text zoom without breakage (M, 🔵)
- [ ] Meaningful `alt` text; empty `alt` for decorative images (S, 🟢)

## Meta & Branding
- [ ] Favicon + app icon; consistent titles per route (S, 🟢)
- [ ] Social metadata (title, description, image) (S, 🔵)
- [ ] 404/500 pages with friendly copy (S, 🔵)

---

## Snippets (drop-in helpers)

### Spacing & Tokens (CSS)
```css
:root {
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 40px; --space-8: 48px;

  --radius-1: 6px; --radius-2: 10px;
  --shadow-1: 0 1px 2px rgba(0,0,0,.06), 0 1px 6px rgba(0,0,0,.04);

  --fg: #111; --fg-muted: #555; --bg: #fff; --border: #e5e7eb;
  --primary: #2563eb; --primary-contrast: #fff; --danger: #dc2626;
}

.container { max-width: 72ch; margin: 0 auto; padding: var(--space-6); }
.card { padding: var(--space-5); border: 1px solid var(--border); border-radius: var(--radius-2); box-shadow: var(--shadow-1); }
```

### Buttons (CSS)
```css
.button { display:inline-flex; align-items:center; gap:8px; height:40px; padding:0 14px; border-radius:10px; font-weight:600; transition: all .18s ease; }
.button:focus { outline: 2px solid #0000; box-shadow: 0 0 0 3px rgba(37,99,235,.35); }
.button[disabled] { opacity:.5; cursor:not-allowed; }

.button--primary { background: var(--primary); color: var(--primary-contrast); }
.button--primary:hover { filter: brightness(1.05); }
.button--primary:active { transform: translateY(1px); }

.button--secondary { background:#f3f4f6; color:#111; border:1px solid var(--border); }
.button--danger { background: var(--danger); color:#fff; }
```

### Focus Ring (global)
```css
:focus-visible { outline: 2px solid #0000; box-shadow: 0 0 0 3px rgba(37,99,235,.35); border-radius: 6px; }
```

### Skeleton Loader (CSS)
```css
.skeleton { position:relative; overflow:hidden; background: #f3f4f6; border-radius: 6px; }
.skeleton::after { content:""; position:absolute; inset:0; transform: translateX(-100%);
  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.6) 50%, rgba(255,255,255,0) 100%);
  animation: shimmer 1.2s infinite; }
@keyframes shimmer { 100% { transform: translateX(100%); } }
```

### Toast (minimal HTML/CSS)
```html
<div id="toast" role="status" aria-live="polite"></div>
```
```css
#toast { position:fixed; right:16px; bottom:16px; max-width: 360px; background:#111; color:#fff; padding:12px 14px; border-radius:10px; opacity:0; transform: translateY(10px); transition: all .2s ease; }
#toast.show { opacity:1; transform: translateY(0); }
```
```js
function toast(msg, ms=2200){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(()=> el.classList.remove('show'), ms);
}
```

### Accessible Modal Essentials
```html
<div id="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" hidden>
  <div class="card">
    <h2 id="modal-title">Title</h2>
    <div>Content</div>
    <button onclick="closeModal()" class="button button--secondary">Close</button>
  </div>
</div>
```
```js
function openModal(){ const m = document.getElementById('modal'); m.hidden=false; m.dataset.prev=document.activeElement?.id||''; m.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus(); }
function closeModal(){ const m = document.getElementById('modal'); m.hidden=true; const id=m.dataset.prev; if(id) document.getElementById(id)?.focus(); }
```

---

## Definition of Done
- [ ] Visual rhythm consistent (spacing, type, width)
- [ ] Interactive states polished (hover/active/focus/disabled)
- [ ] Loading/empty/error states present across key views
- [ ] Forms usable by keyboard with clear validation
- [ ] Basic a11y checks pass (focus, roles, alt, contrast)
- [ ] App has favicon, titles, and friendly error pages

## Notes
- Prefer incremental changes; ship small sections frequently.
- Apply tokens first, then component states, then page states.
- Validate improvements with a quick accessibility pass on each screen.

