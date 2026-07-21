# Design

The shared visual contract for the `pure*` apps. `pureui` owns this file; consuming
apps (`purerequest`, `purequery`, ...) follow it so every app reads as one product.
Entries are about *visual language and interaction*, not domain logic. Read this before
building or changing any component. Tokens live in
[src/styles/theme.css](../src/styles/theme.css); composition rules in
[composed-components.md](composed-components.md).

## Components

- **Reach for a shadcn/ui (Radix) primitive first, always.** Before hand-rolling any UI element (button, dialog, select, tabs, tooltip, switch, popover, ...), start from a shadcn primitive (`npx shadcn add <name>`, configured via [components.json](../components.json)). Don't reinvent a primitive shadcn already ships. Strip its `rounded-*` per the Corners rule.
- **Every component is composed** - compound parts + `asChild`/`Slot`, Radix-style. Non-negotiable; see [composed-components.md](composed-components.md).
- Hand-roll only when no shadcn primitive fits (e.g. a square Switch, because shadcn's is a rounded pill) - and document why here.

## Corners

- **No rounded corners. Anywhere.** Sharp edges only. The radius token is pinned to zero (`--radius: 0rem` and every `--radius-{sm,md,lg,xl}: 0rem`) - never raise it.
- Do not use `rounded-*` utilities (`rounded`, `rounded-sm/md/lg/full/xs`, ...). If a primitive ships with a `rounded-*` class, strip it.
- Treat any rounded corner as a defect.

## Borders & dividers

- **Dividers are 1px. Never thicken, brighten, or colour on hover or drag.** A resize handle is a `w-px`/`h-px` line in `bg-border`.
- Give a thin divider a larger **invisible** hit area instead of a visible thick bar: an `::after` overlay (`after:absolute after:inset-y-0 after:left-1/2 after:w-2 after:-translate-x-1/2` for a vertical handle) catches the pointer while the visible line stays 1px.
- Cursor signals affordance (`cursor-col-resize` / `cursor-row-resize`), not thickness.
- Borders use the `border`/`border-border` token, 1px. Don't introduce heavier borders for emphasis - use background/spacing instead.
- **Transient drag/drop cues** (a before/after drop line, an inside-folder drop ring) may use a 1px primary line (`h-px bg-primary`) or a 1px inset ring (`ring-1 ring-inset ring-primary`) - never a fill or a thicker border, and they vanish on drop/cancel. This is the only place a primary-colored 1px line/ring appears on drag.

## Scrollbars

- **One scrollbar everywhere: thin, square, semi-transparent, overlay, auto-hiding.** Never defer to the raw OS bar (thick gray gutter on Windows/Linux).
- Prefer a shared Radix `ScrollArea` (`type="hover"` auto-hide, thin `w-1.5`/`h-1.5` track, `bg-foreground/20` thumb, hover `/30`) over a bare `overflow-auto` div.
- Surfaces that own their own internal scroller and can't host a `ScrollArea` (e.g. CodeMirror, Select/Command popovers) fall back to the global `::-webkit-scrollbar` + `scrollbar-width`/`scrollbar-color` rule in [theme.css](../src/styles/theme.css), tuned to match.
- **The thumb stays square** - no `rounded-*`. "macOS-style" is delivered via thin + semi-transparent + overlay + auto-hide, NOT rounding. Thumb color tracks `--foreground` via `color-mix`, so it adapts across themes - don't hard-code a scrollbar color.

## Tables / grids

- One grid component, reused everywhere a result set is shown: same row height, padding, header treatment, single-line cells (`overflow-hidden text-ellipsis whitespace-nowrap`), resizable columns.
- Headers always render, even for an empty result, so the column structure stays visible; show an empty-state message ("No rows.") beneath the header row, not instead of it.
- NULL renders as a dim `[NULL]`, visually distinct from an empty string.
- Edited/dirty cells get a subtle highlight (`bg-amber-500/15`), applied identically in every view.

## Density & typography

- Compact, keyboard-first, IDE-like. Rows and controls are single-line and tight (`py-1`/`py-1.5`, `text-xs`/`text-sm`).
- Monospace (`font-mono`) for data, identifiers, and anything tabular. UI chrome (labels, buttons, tabs) uses the default sans stack.
- Muted foreground (`text-muted-foreground`) for secondary text (column headers, hints, timestamps); full foreground for primary content.

## Color & status

- **Theme via CSS tokens** (`bg-background`, `bg-muted/30`, `text-foreground`, `border-border`), never hard-coded colors, so light/dark and per-app custom themes both work. Mode toggles a `.dark` class on `<html>`.
- Status colors: success green (`text-green-600 dark:text-green-400`), error/destructive red (`text-red-600 dark:text-red-400`). A destructive action button is filled red.
- **A primary action is the filled `default` Button variant** (`bg-primary text-primary-foreground`) - the one solid, high-contrast control per surface; everything else stays `ghost`/`outline`. Don't restyle a primary action as a faint icon button.
- Status dots are a small `size-2` filled circle, never with a text label leaking into an accessible name (give the row an explicit `aria-label`).
- **Syntax highlighting is the one sanctioned exception to "no hard-coded colors"** - a code editor genuinely needs hue per token. Drive token colors from theme tokens where possible; keep the editor *chrome* (background, gutter) transparent so it inherits the pane behind it. Don't extend this exception to UI chrome.

## Layout

- Resizable splits at the shell level; a split inside a panel still obeys the 1px-divider rule.
- Tabs are flat, square, separated by 1px borders; the active tab reads via `bg-background` + full foreground, inactive via muted foreground.
- **A tab strip owns its own horizontal scroller** - tabs scroll INSIDE the bar (`min-w-0 overflow-x-auto`, each tab `shrink-0`), never stretch the pane. The active underline is drawn as an inset shadow, not a bottom-border overhang (a vertical scroller would clip an overhang).
- **Toggles are square switches, theme-token colored, no rounded pill.** `role="switch"` + `aria-checked`, a `bg-primary` (on) / `bg-input/40` (off) track with a `bg-background` knob that shifts via `translate-x`. shadcn's switch is a rounded pill - hand-roll the square one.
- **Every `Select` sets `position="popper"` on its `SelectContent`.** The Radix default (`item-aligned`) mispositions inside a scrollable/flex panel and can render with no visible options. (jsdom can't open a Radix Select, so this is a standing rule, not unit-testable.)

## Accessibility

- Purely-visual affordances (resize handles, status dots) are `aria-hidden` or carry an explicit non-leaking label so they don't pollute the accessible name of their container.
- Inputs opt out of browser autofill noise: `autoComplete="off"`, `autoCorrect="off"`, `autoCapitalize="off"`, `spellCheck={false}`, plus `data-1p-ignore` / `data-lpignore` for password managers.
