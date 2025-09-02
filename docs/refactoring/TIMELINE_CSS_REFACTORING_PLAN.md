# Timeline CSS Refactor — Actionable Implementation Plan

Scope: `public/css/timeline.css`
Intent: Keep visuals identical initially; refactor safely in small, verifiable batches.

## Prerequisites

- Define test pages/states: open Timeline with tasks covering priorities, categories, conflicts, progress, filters, drag/drop, menus, dialogs, inline edit, smart scheduling.
- Confirm dark mode and high-contrast can be toggled for visual checks.

## Batch A — Introduce Tokens and Layers (no visual change)

1. Add cascade layers and tokens header at the top of `timeline.css`:
   - Insert exactly below the first comment block.
   - Content to add:
     - `@layer base, components, variants, utilities, overrides;`
     - Under `@layer base`, add `:root` variables:
       - Colors: `--tl-surface`, `--tl-text`, `--tl-muted`, `--tl-border`, `--tl-accent`, `--tl-danger`.
       - Effects: `--tl-radius-sm/md/lg`, `--tl-shadow-sm/md/lg`.
       - Anim: `--tl-anim-fast/.2s`, `--tl-anim-med/.3s`, `--tl-ease/ease`.
     - Dark/contrast overrides: redefine only variables inside their media queries.
2. Wrap nothing else yet. Verify no change in computed styles.

Acceptance:
- File compiles; UI unchanged in light/dark/high-contrast.

## Batch B — Tokenize Low-Risk Selectors

Edit the following selectors to replace literals with variables. Do not change selector names.

- `.hour-marker`
  - `border-top-color: var(--tl-border)`
  - `color: var(--tl-muted)`
- `.time-indicator`
  - `background: var(--tl-danger)`
- `.time-indicator::before`
  - `background: var(--tl-danger)`
- `.sleep-block`
  - `background: color-mix(in srgb, var(--tl-muted) 10%, transparent)` (fallback: keep rgba if color-mix unsupported)
  - `border-color: color-mix(in srgb, var(--tl-muted) 20%, transparent)`
- `.task-block`
  - `background: var(--tl-accent)`
  - `box-shadow: var(--tl-shadow-sm)`
  - `border-radius: var(--tl-radius-md)`
  - `transition: all var(--tl-anim-med) var(--tl-ease)`
- `.task-block:hover`
  - `box-shadow: var(--tl-shadow-md)`

Acceptance:
- Visual parity verified on desktop and mobile breakpoints.

## Batch C — Prefers Reduced Motion

1. Append at end of file:
   - `@media (prefers-reduced-motion: reduce) {`
     - Set `* { animation: none !important; transition: none !important; }` scoped to timeline container if necessary.
     - Provide non-animated alternatives for `.inline-edit-input` focus (keep styles without animation).
   - Close media block.

Acceptance:
- With reduced motion, animations for `conflict-pulse`, `priority-pulse`, hover transitions are disabled.

## Batch D — Add Utility/State Classes (non-breaking)

1. Under `@layer utilities`, add new classes (no removal yet):
   - `.is-dimmed { opacity: 0.3; }`
   - `.is-highlighted { outline: 0; filter: none; opacity: 1; }`
   - `.is-dragging { box-shadow: var(--tl-shadow-lg); }`
   - `.is-drop-target { background: color-mix(in srgb, var(--tl-accent) 10%, transparent); }`
2. Do not modify existing `.task-block.task-dimmed`/`.timeline-hour.hour-highlighted` etc. yet.

Acceptance:
- No change until components start applying these utilities.

## Batch E — Backward-Compatible Naming Aliases

Goal: Introduce normalized names without breaking legacy selectors.

1. Duplicate key block selectors to include aliases:
   - Change `.task-block { … }` to `.task-block, .tl-task { … }`
   - Change `.timeline-grid { … }` to `.timeline-grid, .tl-grid { … }`
   - Change `.hour-marker { … }` to `.hour-marker, .tl-hour-marker { … }`
2. Conflict/priority states (aliases only):
   - For each `.task-block.priority-*` and `.task-block--priority-*` rule, add `.tl-task--priority-*` in the selector list.
   - For `.task-block.has-conflicts`, add `.tl-task.is-conflict`.
   - For `.task-block.conflict-high|medium|low`, add `.tl-task.is-conflict--high|--medium|--low`.
3. Do not remove legacy classes yet.

Acceptance:
- Everything renders as before; `tl-*` classes start working if applied by components.

## Batch F — Centralize Dark/Contrast via Tokens

1. In existing `@media (prefers-color-scheme: dark)` blocks:
   - Replace repeated literal colors with variable overrides in `:root` dark section, then simplify component rules to rely on base tokens.
   - Example: replace dark `.hour-marker { color: #9ca3af; }` with `:root { --tl-muted: #9ca3af; }` and remove the per-selector color.
2. Repeat for high-contrast blocks: use token overrides; keep structural differences only when necessary (e.g., border widths).

Acceptance:
- No visual change; dark/contrast sections shrink as duplicates are removed.

## Batch G — Logical Properties for Priority Borders

1. For priority indicators using `border-left`, switch to logical property:
   - `.task-block.priority-*` and `.task-block--priority-*` → `border-inline-start: 4px solid <token>`
   - Mirror in dark/high-contrast sections.
2. Keep left-anchored layout (ruler) explicit; do not change absolute positioning yet.

Acceptance:
- Visual parity LTR; verify RTL in browser devtools (if supported).

## Batch H — Consolidate Media Queries (tooling-safe)

Note: Avoid `@custom-media` unless build tooling supports it. For now:

1. Group mobile rules under a single `@media (max-width: 767px)` block by moving repeated mobile sections together; ensure order remains consistent.
2. Group tablet rules similarly for `(min-width: 768px) and (max-width: 1023px)`.
3. Within grouped blocks, remove duplicate declarations that are identical.

Acceptance:
- No visual change; reduced repetition; file diff shows consolidated blocks.

## Batch I — Extract Feature Sections (optional, single-bundle output)

1. Create `public/css/timeline/` partials in-source (not yet wired to build):
   - `_tokens.css`, `_grid.css`, `_task.css`, `_indicators.css`, `_priority.css`, `_conflicts.css`, `_categories.css`, `_progress.css`, `_filters.css`, `_dragdrop.css`, `_menus.css`, `_dialogs.css`, `_inline-edit.css`, `_smart-scheduling.css`, `_responsive.css`, `_themes.css`.
2. Copy corresponding rules into partials; keep `timeline.css` as the concatenated result for now.
3. If no build step exists, postpone actual split; keep this as preparation.

Acceptance:
- If applied, local build produces the same single `timeline.css` bundle.

## Clean-up Window — Remove Legacy Selectors

Trigger only after components adopt `tl-*` and utility classes.

1. Remove legacy-only selectors:
   - `.task-block.priority-*`, `.task-block--priority-*`, `.has-conflicts`, `.conflict-*`, `.task-*/hour-* highlighted/dimmed` where replaced by utilities and new names.
2. Ensure all references updated in components per mapping.

Acceptance:
- No regressions; class usage consistent; CSS size reduced.

## Mapping: Legacy → New (for component updates)

- `.task-block` → `.tl-task`
- `.task-block.priority-critical|high|medium|low|minimal` → `.tl-task--priority-5|4|3|2|1`
- `.task-block--priority-[1-5]` → `.tl-task--priority-[1-5]`
- `.has-conflicts` → `.is-conflict`
- `.conflict-high|medium|low` → `.is-conflict--high|--medium|--low`
- `.task-highlighted` / `.hour-highlighted` → `.is-highlighted`
- `.task-dimmed` / `.hour-dimmed` → `.is-dimmed`
- `.dragging` / `.drag-over` → `.is-dragging` / `.is-drop-target`

## Verification Checklist (run for each batch)

- Light/dark/high-contrast parity on desktop and mobile.
- Drag/drop visuals (hover, dragging, drop indicator) match baseline.
- Conflict/priority/category visuals unchanged.
- Menus/dialogs typography, spacing, shadows match baseline.
- Mobile touch targets ≥ 44px remain intact.
- Reduced motion disables animations smoothly.

## Rollback Strategy

- Each batch is self-contained; revert by reverting the single batch commit.
- Keep before/after screenshots for fast comparison.

## Notes

- Avoid introducing new `@import` or build requirements until approved.
- Keep selectors stable during tokenization to minimize churn.
