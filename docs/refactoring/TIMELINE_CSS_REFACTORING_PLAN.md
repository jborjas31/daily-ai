# Timeline CSS Refactor — Actionable Implementation Plan

Scope: `public/css/timeline.css`
Intent: Keep visuals identical initially; refactor safely in small, verifiable batches.

## Prerequisites

- Define test pages/states: open Timeline with tasks covering priorities, categories, conflicts, progress, filters, drag/drop, menus, dialogs, inline edit, smart scheduling.
- Confirm dark mode and high-contrast can be toggled for visual checks.

## Batch A — Introduce Tokens and Layers (no visual change)

Status: Completed on 2025-09-02

Implementation Notes:
- Inserted `@layer base, components, variants, utilities, overrides;` under the top comment in `public/css/timeline.css`.
- Added `@layer base { :root { … } }` with tokens:
  - Colors: `--tl-surface`, `--tl-text`, `--tl-muted`, `--tl-border`, `--tl-accent`, `--tl-danger`.
  - Effects: `--tl-radius-sm/md/lg`, `--tl-shadow-sm/md/lg`.
  - Anim: `--tl-anim-fast`, `--tl-anim-med`, `--tl-ease`.
- Added dark-mode overrides under `@media (prefers-color-scheme: dark)` redefining only variables in `:root` within `@layer base`.
- Added high-contrast overrides under `@media (prefers-contrast: high)` redefining only variables in `:root` within `@layer base`.
- No existing selectors were changed; no visual differences expected.

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

Status: Completed on 2025-09-02

Implementation Notes:
- `.hour-marker`: replaced literals with tokens `var(--tl-border)` and `var(--tl-muted)`.
- `.time-indicator` and `::before`: backgrounds now `var(--tl-danger)`.
- `.sleep-block`: progressive enhancement using `color-mix(...)` for background/border-color with existing `rgba(...)` kept as fallback.
- `.task-block`: background `var(--tl-accent)`, border-radius `var(--tl-radius-md)`, shadow `var(--tl-shadow-sm)`, transition `all var(--tl-anim-fast) var(--tl-ease)` to preserve original 0.2s timing.
- `.task-block:hover`: shadow `var(--tl-shadow-md)`.
- No selector names changed; visual parity maintained across desktop/mobile.

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

Status: Completed on 2025-09-02

Implementation Notes:
- Appended a reduced-motion block to `public/css/timeline.css`:
  - `@media (prefers-reduced-motion: reduce)` wrapping an `@layer overrides` section.
  - Disabled animations and transitions for `.timeline-grid` and descendants; set `scroll-behavior: auto`.
  - Explicitly disabled `conflict-pulse` via `.task-conflict { animation: none !important; }`.
  - Added non-animated fallback for `.inline-edit-input` by removing animations/transitions.
- Scope is limited to the timeline to avoid global side effects; visual parity maintained with motion disabled.

1. Append at end of file:
   - `@media (prefers-reduced-motion: reduce) {`
     - Set `* { animation: none !important; transition: none !important; }` scoped to timeline container if necessary.
     - Provide non-animated alternatives for `.inline-edit-input` focus (keep styles without animation).
   - Close media block.

Acceptance:
- With reduced motion, animations for `conflict-pulse`, `priority-pulse`, hover transitions are disabled.

## Batch D — Add Utility/State Classes (non-breaking)

Status: Completed on 2025-09-02

Implementation Notes:
- Added utilities under `@layer utilities` in `public/css/timeline.css`:
  - `.is-dimmed { opacity: 0.3; }`
  - `.is-highlighted { outline: 0; filter: none; opacity: 1; }`
  - `.is-dragging { box-shadow: var(--tl-shadow-lg); }`
  - `.is-drop-target { background: color-mix(in srgb, var(--tl-accent) 10%, transparent); }`
- No legacy selectors modified; these classes are available for components with no visual changes until applied.

1. Under `@layer utilities`, add new classes (no removal yet):
   - `.is-dimmed { opacity: 0.3; }`
   - `.is-highlighted { outline: 0; filter: none; opacity: 1; }`
   - `.is-dragging { box-shadow: var(--tl-shadow-lg); }`
   - `.is-drop-target { background: color-mix(in srgb, var(--tl-accent) 10%, transparent); }`
2. Do not modify existing `.task-block.task-dimmed`/`.timeline-hour.hour-highlighted` etc. yet.

Acceptance:
- No change until components start applying these utilities.

## Batch E — Backward-Compatible Naming Aliases

Status: Completed on 2025-09-02

Implementation Notes:
- Added aliases to core selectors:
  - `.task-block, .tl-task { … }`
  - `.timeline-grid, .tl-grid { … }`
  - `.hour-marker, .tl-hour-marker { … }`
- Extended aliases to related variants to ensure parity:
  - Hover: `.task-block:hover, .tl-task:hover`.
  - Mobile/tablet media rules for `.task-block` and `.hour-marker` now include `.tl-task`/`.tl-hour-marker`.
  - High-contrast `.task-block` and `.hour-marker` also aliased.
- Conflict state aliases added:
  - `.task-block.has-conflicts, .tl-task.is-conflict`
  - `.task-block.conflict-high|medium|low, .tl-task.is-conflict--high|--medium|--low`
- No removals of legacy selectors; `tl-*` classes now work without changing visuals.

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

Status: Completed on 2025-09-02

Implementation Notes:
- Dark mode: removed per-selector color overrides for `.hour-marker` and `.sleep-block`; all colors now derive from dark `:root` tokens (`--tl-border`, `--tl-muted`, etc.) defined under `@layer base`.
- High contrast: added `--tl-muted: #000` to high-contrast token overrides so `.hour-marker` inherits text/border from tokens. Replaced remaining literals with token-driven values:
  - `.task-block, .tl-task { border: 2px solid var(--tl-text); }` (structural width retained)
  - `.time-indicator` and `::before` backgrounds use `var(--tl-text)`.
- Kept structural differences only (e.g., thicker borders); removed redundant color declarations.

1. In existing `@media (prefers-color-scheme: dark)` blocks:
   - Replace repeated literal colors with variable overrides in `:root` dark section, then simplify component rules to rely on base tokens.
   - Example: replace dark `.hour-marker { color: #9ca3af; }` with `:root { --tl-muted: #9ca3af; }` and remove the per-selector color.
2. Repeat for high-contrast blocks: use token overrides; keep structural differences only when necessary (e.g., border widths).

Acceptance:
- No visual change; dark/contrast sections shrink as duplicates are removed.

## Batch G — Logical Properties for Priority Borders

Status: Completed on 2025-09-02

Implementation Notes:
- Converted priority borders to logical properties for RTL safety:
  - Replaced `border-left` with `border-inline-start` for all priority selectors.
  - Dark mode: swapped `border-left-color` → `border-inline-start-color`.
  - High contrast: swapped `border-left-color/width` → `border-inline-start-color/width`.
- Added `tl-*` priority aliases alongside legacy selectors:
  - `.tl-task--priority-5|4|3|2|1` included with existing `.task-block.priority-*` and `.task-block--priority-*` rules.
- No layout changes; LTR visuals unchanged. RTL parity expected when tested.

1. For priority indicators using `border-left`, switch to logical property:
   - `.task-block.priority-*` and `.task-block--priority-*` → `border-inline-start: 4px solid <token>`
   - Mirror in dark/high-contrast sections.
2. Keep left-anchored layout (ruler) explicit; do not change absolute positioning yet.

Acceptance:
- Visual parity LTR; verify RTL in browser devtools (if supported).

## Batch H — Consolidate Media Queries (tooling-safe)

Status: Completed on 2025-09-02

Implementation Notes:
- Grouped all `@media (max-width: 767px)` rules into a single consolidated block near the top of responsive sections.
- Moved content from scattered mobile blocks (filters, enhanced features, drag & drop, context menu, inline edit, smart scheduling) into the unified block preserving original order to maintain cascade behavior.
- Replaced original per-section mobile blocks with comments noting consolidation to reduce duplication.
- Tablet `(min-width: 768px) and (max-width: 1023px)` already existed as a single block; left unchanged.
- No visual change expected; diff shows reduced repetition and a single mobile block.

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

Status: Pass 2 Completed on 2025-09-02

Scope and rationale:
- Components now emit new aliases/utilities alongside legacy classes. We can safely remove legacy selectors where an equivalent `tl-*` or utility rule exists and is applied by components.

Removed in Pass 1:
- Conflicts: dropped legacy selectors in favor of new aliases
  - Removed `.task-block.has-conflicts` and `.task-block.conflict-{high,medium,low}` in all themes.
  - Kept `.tl-task.is-conflict` and `.tl-task.is-conflict--{high,medium,low}`.
- Priority: dropped legacy selectors in favor of `tl-task--priority-*`
  - Removed `.task-block.priority-*` and `.task-block--priority-*` (light/dark/high-contrast).
  - Kept `.tl-task--priority-[1..5]` rules with logical borders.

Removed in Pass 2:
- Highlight/Dim: replaced `.task-highlighted`/`.task-dimmed` and `.hour-highlighted`/`.hour-dimmed` with utility-driven equivalents:
  - `.tl-task.is-highlighted`, `.tl-task.is-dimmed` (+ hover), `.timeline-hour.is-highlighted`, `.timeline-hour.is-dimmed` (+ `.hour-marker` color).
- Drag/Drop: replaced `.dragging`/`.drag-over` with utility/state classes:
  - `.tl-task.is-dragging` mirrors transform/opacity/shadow (mobile + dark tweaks included).
  - `.timeline-hour.is-drop-target` mirrors background and border (dark/high-contrast variants included).

Acceptance:
- Visual parity holds across light/dark/high-contrast and desktop/mobile.
- Components emit both legacy and new classes; CSS now relies on `tl-*` and utilities for styling.

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
