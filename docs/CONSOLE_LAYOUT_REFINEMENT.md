# Agent Buddy console layout refinement

This pass adds a second layout stylesheet on top of the base console styles.

```text
src/styles.css   = base design system and console components
src/layout.css   = refined layout layer and responsive behavior
```

## Layout goals

The Agent Buddy UI should now feel like a long-lived desktop Agent Console rather than a single marketplace page.

The refined layout focuses on:

- Stable left navigation.
- Sticky topbar.
- Clear page-level action bars.
- Dashboard metric density.
- Instance/agent card readability.
- Table usability.
- Right-inspector-ready layouts.
- Responsive behavior for laptop and smaller screens.

## Refined layout primitives

New CSS variables:

```css
--sidebar-width
--content-max
--content-gutter
--panel-radius
--panel-gap
--rail-width
--topbar-height
--focus-ring
```

These tokens make later layout changes easier and keep page shells consistent.

## Console shell behavior

The shell now supports:

```text
console-shell
  ├── console-sidebar      fixed-width local navigation
  └── console-main         max-width centered content area
```

The topbar is sticky on desktop:

```text
console-topbar
  ├── breadcrumb
  ├── page title
  ├── global search
  ├── Agent Doctor
  └── refresh
```

## Page layout patterns

### Standard two-column layout

```text
console-grid two
  ├── primary panel
  └── secondary panel
```

### Asymmetric layout

```text
console-grid asymmetric
  ├── main content
  └── secondary content
```

### Right rail layout

```text
console-grid right-rail
  ├── main content
  └── sticky inspector rail
```

### Workbench layout

```text
console-workbench
  ├── console-content
  └── console-inspector
```

The right rail is not yet required by all pages, but the CSS is ready for future extraction of Markdown preview, Runtime preview, logs, and config diff into a persistent inspector.

## Card density

Refined cards now use:

- Higher minimum width for instance and expert cards.
- Hover elevation.
- Better tag wrapping.
- More predictable text blocks.
- Stronger selected state.

This should improve large source catalogs such as `agency-agents-zh`.

## Tables

Tables now have:

- Sticky table headers.
- Scrollable wrappers.
- Row hover feedback.
- More consistent spacing.

This is important for runtime health, API reference, instance lists, and future logs.

## Wizard layout

The install wizard now has better visual separation for the six-step flow:

```text
1. Select Source
2. Select Agents
3. Environment Check
4. Configure Targets
5. Generate Plan
6. Confirm Deploy
```

The visual structure matches the product rule that importing a source does not automatically install anything into local runtimes.

## Responsive behavior

The layout has breakpoints:

```text
>= 1500px  full dashboard density
<= 1320px  collapse right rail / asymmetric layouts
<= 1100px  stack sidebar above main content
<= 720px   single-column mobile-friendly layout
```

## Next layout pass

1. Split `ConsoleApp.tsx` into dedicated page modules.
2. Move Markdown / Runtime preview into a persistent inspector drawer.
3. Add compact and comfortable density modes.
4. Add breadcrumbs based on the final menu tree.
5. Add skeleton loading states for each page.
6. Add empty states and error states for all major panels.
7. Add page-level command palette.
