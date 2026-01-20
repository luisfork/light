# Design System Reference

**Philosophy:** Every pixel serves the truth. Data over Decoration. This design system represents a utility-focused, data-centric aesthetic that prioritizes clarity over embellishment.

---

## Core Philosophy

### Design Principles

1. **Truth Over Beauty**: Visual elements exist to communicate data, not to decorate. If a design element doesn't serve understanding, it doesn't belong.

2. **Quiet Confidence**: The interface is calm, considered, and never shouts. Information hierarchy is established through typography and spacing, not through visual noise.

3. **Systematic Consistency**: Every color, spacing value, and typographic choice comes from a defined scale. No magic numbers.

4. **Native Fidelity**: Respect the platform. Use system fonts (San Francisco) and native interaction patterns.

---

## Forbidden Patterns (Anti-Patterns)

The following are explicitly forbidden in this design system:

| Pattern | Reason |
| --- | --- |
| Emojis in UI | Unprofessional, inconsistent rendering across platforms |
| Bento Grids/Cards/Masonry | Marketing aesthetic, prioritizes visual interest over data density |
| Shadcn/ui aesthetics | Generic startup look, lacks utility focus |
| Tailwind default styling | Cookie-cutter appearance, sacrifices semantic clarity |
| Marketing Chrome | Gradients, glows, decorative illustrations — serve no data purpose |
| Linear-style animations | Trendy motion design that prioritizes style over function |
| Rounded corners > 8px | Excessive softness erodes precision feel |
| Drop shadows for decoration | Shadows should only indicate elevation/layering |

---

## Typography

### Font Stack

```css
/* Primary — New York Small (headlines) */
font-family: "New York Small", serif, sans-serif;
/* light/src/assets/fonts/new_york/WOFF2/ */

/* Secondary — SF Pro Text (body, UI) */
font-family: "SF Pro Text", sans-serif;
/* light/src/assets/fonts/san_francisco/WOFF2/ */

/* Monospace — for data/code (use sparingly) */
font-family: "SF Compact", monospace;
/* light/src/assets/fonts/san_francisco/WOFF2/ */
```

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
| --- | --- | --- | --- | --- | --- |
| `headline-super` | 96px | 700 | 1.0 | -0.015em | Hero statements |
| `headline-elevated` | 64px | 600 | 1.05 | -0.009em | Section headers |
| `headline` | 48px | 600 | 1.08 | -0.003em | Subsection headers |
| `headline-reduced` | 40px | 600 | 1.1 | 0em | Tertiary headers |
| `eyebrow-super` | 28px | 600 | 1.14 | 0.007em | Large labels/stats |
| `eyebrow-elevated` | 24px | 600 | 1.17 | 0.009em | Stat labels |
| `eyebrow` | 21px | 600 | 1.19 | 0.011em | Section eyebrows |
| `eyebrow-reduced` | 19px | 400 | 1.21 | 0.012em | Body elevated |
| `body` | 17px | 400 | 1.47 | -0.022em | Body copy |
| `body-reduced` | 14px | 400 | 1.43 | -0.016em | Secondary body |
| `caption` | 12px | 400 | 1.33 | -0.01em | Captions, footnotes |

### Typography Rules

1. **No bold for emphasis in body text** — Use color or typographic hierarchy instead
2. **Headlines are always display weight** (600-700)
3. **Body text never exceeds 700 weight**
4. **Letter spacing tightens as size increases** (optical adjustment)
5. **Line height loosens as size decreases** (readability)

---

## Color System

### Light Theme (Default)

```css
:root {
  /* Backgrounds */
  --color-bg-primary: rgb(255, 255, 255);
  --color-bg-secondary: rgb(245, 245, 247);       /* #f5f5f7 */
  --color-bg-tertiary: rgb(250, 250, 252);        /* #fafafc */

  /* Text */
  --color-text-primary: rgba(0, 0, 0, 0.88);
  --color-text-secondary: rgba(0, 0, 0, 0.56);
  --color-text-tertiary: rgba(0, 0, 0, 0.48);
  --color-text-contrast: rgba(0, 0, 0, 0.72);

  /* Interactive */
  --color-link: rgb(0, 102, 204);                 /* #0066cc */
  --color-link-hover: rgb(0, 113, 227);           /* #0071e3 */
  --color-focus: rgb(0, 113, 227);                /* #0071e3 */
  --color-focus-offset: 1px;
  --color-focus-offset-container: 3px;

  /* Borders */
  --color-border-primary: rgba(0, 0, 0, 0.16);
  --color-border-secondary: rgba(0, 0, 0, 0.1);
  --color-keyline-light: rgba(0, 0, 0, 0.16);

  /* Scrims & overlays */
  --color-scrim-light: rgba(250, 250, 252, 0.92);
  --color-scrim-light-blur: rgba(250, 250, 252, 0.8);

  /* Semantic */
  --color-success: rgb(40, 167, 69);
  --color-warning: rgb(255, 149, 0);
  --color-error: rgb(255, 59, 48);
}
```

### Dark Theme

```css
.theme-dark {
  /* Backgrounds */
  --color-bg-primary: rgb(0, 0, 0);
  --color-bg-secondary: rgb(29, 29, 31);          /* #1d1d1f */
  --color-bg-tertiary: rgb(22, 22, 23);           /* #161617 */

  /* Text */
  --color-text-primary: rgba(255, 255, 255, 0.92);
  --color-text-secondary: rgba(255, 255, 255, 0.56);
  --color-text-tertiary: rgba(255, 255, 255, 0.4);
  --color-text-contrast: rgba(255, 255, 255, 0.8);

  /* Interactive */
  --color-link: rgb(41, 151, 255);                /* #2997ff */
  --color-link-hover: rgb(64, 169, 255);
  --color-focus: rgb(0, 113, 227);
  --color-focus-offset: 1px;
  --color-focus-offset-container: 3px;

  /* Borders */
  --color-border-primary: rgba(255, 255, 255, 0.24);
  --color-border-secondary: rgba(255, 255, 255, 0.16);
  --color-keyline-dark: rgba(255, 255, 255, 0.24);

  /* Scrims & overlays */
  --color-scrim-dark: rgba(22, 22, 23, 0.88);
  --color-scrim-dark-blur: rgba(22, 22, 23, 0.8);
}
```

### Color Usage Rules

1. **Never use pure black (#000) for text on white** — Use rgba(0,0,0,0.88) for optical balance
2. **Links are always distinguishable** — Blue (#0066cc light / #2997ff dark)
3. **Avoid colored backgrounds for content areas** — Reserve color for data visualization
4. **Theme switching uses CSS custom properties** — No hardcoded color values

---

## Spacing System

### Base Unit: 4px

All spacing is derived from a 4px base unit, with a constrained scale:

| Token | Value | Usage |
| --- | --- | --- |
| `--space-0` | 0px | Reset |
| `--space-1` | 4px | Tight inline spacing |
| `--space-2` | 8px | Icon-to-text gaps |
| `--space-3` | 12px | Related element grouping |
| `--space-4` | 16px | Standard component padding |
| `--space-5` | 20px | Form element spacing |
| `--space-6` | 24px | Section internal padding |
| `--space-8` | 32px | Component separation |
| `--space-10` | 40px | Subsection breaks |
| `--space-12` | 48px | Section headers |
| `--space-14` | 56px | Major section padding |
| `--space-16` | 64px | Page section separation |
| `--space-20` | 80px | Hero spacing |
| `--space-24` | 96px | Major visual breaks |

### Content Width

```css
--content-max-width: 980px;      /* Primary content container */
--content-nav-max-width: 1024px; /* Global nav container */
--content-padding: 22px;         /* Desktop edge padding */
--content-padding-mobile: 16px;  /* Mobile edge padding */
```

### Viewport-Relative Spacing

For scroll-driven animations and viewport-based layouts:

```css
--viewport-trigger-start: calc(100vh - 200px);
--viewport-trigger-end: calc(100vh - 100px);
```

---

## Border Radius

Conservative, functional radius values:

| Token | Value | Usage |
| --- | --- | --- |
| `--radius-none` | 0px | Tables, data grids |
| `--radius-sm` | 4px | Inputs, small buttons |
| `--radius-md` | 8px | Cards, modals |
| `--radius-lg` | 12px | Large containers (use sparingly) |
| `--radius-pill` | 980px | Pills, tags only |

**Rule:** When in doubt, use `--radius-sm` (4px). Excessive rounding is prohibited.

---

## Motion & Animation

### Timing Functions

```css
/* Standard ease — most UI transitions */
--ease-standard: cubic-bezier(0.28, 0.11, 0.32, 1);

/* Ease in — menus, scrims, curtains */
--ease-in: cubic-bezier(0.4, 0, 0.6, 1);

/* Ease out — elements exiting/disappearing */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);

/* Badge/utility easing */
--ease-utility: cubic-bezier(0.25, 0.1, 0.3, 1);
```

### Duration Scale

| Token | Value | Usage |
| --- | --- | --- |
| `--duration-instant` | 100ms | Micro-interactions (hover states) |
| `--duration-fast` | 200ms | UI feedback (button press) |
| `--duration-standard` | 240ms | Global nav and keylines |
| `--duration-normal` | 320ms | Menu open/close, scrims |
| `--duration-slow` | 500ms | Page-level transitions |
| `--duration-glacial` | 1000ms | Complex orchestrated animations |

### Animation Rules

1. **Purpose over polish** — Animation must serve comprehension, not decoration
2. **Respect reduced motion** — Always check `prefers-reduced-motion`
3. **No perpetual animations** — Nothing should animate indefinitely
4. **Scroll-driven animations use CSS** — Avoid JavaScript when possible
5. **Stagger sequentially, not simultaneously** — Use `--item-index` for delays

### Scroll Animation Pattern

```css
/* Standard scroll reveal */
.section-content {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity var(--duration-normal) var(--ease-out),
              transform var(--duration-normal) var(--ease-out);
}

.section-content.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Staggered Fade Pattern

```css
/* Staggered list items */
.list-item {
  --item-index: 0;
  opacity: 0;
  transform: translateY(-4px);
  transition-delay: calc(var(--item-index) * 20ms + 260ms);
  transition-duration: 320ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
}

.list-item:nth-child(1) { --item-index: 0; }
.list-item:nth-child(2) { --item-index: 1; }
/* ... etc */
```

---

## Component Patterns

### Navigation (Local Nav)

```css
.localnav {
  height: 52px;                    /* Standard: 52px, Stacked: 66px */
  background: var(--color-scrim-light-blur);
  backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid var(--color-keyline-light);
}

.theme-dark .localnav {
  background: var(--color-scrim-dark-blur);
  border-bottom: 1px solid var(--color-keyline-dark);
}

```

### Navigation (Global Nav)

```css
.globalnav {
  height: 44px;                    /* Mobile: 48px */
  color: rgba(0, 0, 0, 0.8);
  background: none;
}

.globalnav-scrim {
  background: var(--color-scrim-light);
  backdrop-filter: saturate(180%) blur(20px);
}

.theme-dark .globalnav {
  color: rgba(255, 255, 255, 0.8);
}

.theme-dark .globalnav-scrim {
  background: var(--color-scrim-dark);
}
```

### Buttons

```css
/* Primary Button */
.button-primary {
  background: rgb(0, 113, 227);
  color: rgb(255, 255, 255);
  padding: 4px 11px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 400;
  letter-spacing: -0.01em;
  min-width: 45px;
  transition: background var(--duration-fast) var(--ease-standard);
}

.button-primary:hover {
  background: rgb(0, 118, 223);   /* #0076df */
}

.button-primary:active {
  background: rgb(0, 110, 219);   /* #006edb */
}
```

### Links

```css
.link {
  color: var(--color-link);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

/* Chevron links (more →) */
.link-chevron::after {
  content: "";
  font-family: "SF Pro Icons";
  padding-inline-start: 0.3em;
}
```

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: var(--color-focus-offset);           /* Standard: 1px */
}

.focus-container :focus-visible {
  outline-offset: var(--color-focus-offset-container); /* Container: 3px */
}
```

---

## Layout Patterns

### Viewport Content Container

```css
.viewport-content {
  margin: 0 auto;
  max-width: var(--content-max-width);
  padding: 0 var(--content-padding);
  padding-inline-start: max(var(--content-padding), env(safe-area-inset-left));
  padding-inline-end: max(var(--content-padding), env(safe-area-inset-right));
}
```

### Section Structure

```css
.section {
  padding-top: var(--space-16);
  padding-bottom: var(--space-16);
}

.section.no-pad-top { padding-top: 0; }
.section.no-pad-bottom { padding-bottom: 0; }
```

### Sticky Scroll Container

```css
.sticky-container {
  position: relative;
  height: calc(100vh * 3);        /* Scroll distance = 3 viewports */
}

.sticky-content {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

---

## Responsive Breakpoints

```css
/* Small (Mobile): 0 - 734px */
@media (max-width: 734px) { ... }

/* Medium (Tablet): 735px - 1068px */
@media (min-width: 735px) and (max-width: 1068px) { ... }

/* Large (Desktop): 1069px+ */
@media (min-width: 1069px) { ... }

/* Extra-Large (Wide): 1441px+ */
@media (min-width: 1441px) { ... }

/* Collapsible Navigation */
@media (max-width: 833px) { ... }    /* Mobile nav collapses */
@media (max-width: 1023px) { ... }   /* Medium nav adjustments */
```

### Mobile-First Overrides

```css
/* Example: Content padding */
.content {
  padding: var(--content-padding-mobile);  /* 16px */
}

@media (min-width: 735px) {
  .content {
    padding: var(--content-padding);       /* 22px */
  }
}
```

---

## Accessibility Requirements

### Minimum Standards

1. **Color contrast**: 4.5:1 for body text, 3:1 for large text
2. **Focus indicators**: Always visible, 2px solid ring
3. **Touch targets**: Minimum 44×44px on mobile
4. **Motion**: Respect `prefers-reduced-motion`
5. **Screen readers**: All interactive elements have accessible labels

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### High Contrast

```css
@media (prefers-contrast: more) {
  a:link {
    text-decoration: underline;
  }
}
```

---

## Data Visualization

For displaying electricity rate data:

### Colors for Data

```css
/* Use for rate comparisons */
--color-data-positive: rgb(40, 167, 69);    /* Good rates */
--color-data-neutral: rgb(0, 102, 204);     /* Average rates */
--color-data-negative: rgb(255, 59, 48);    /* High rates */
--color-data-muted: rgba(0, 0, 0, 0.2);     /* Baseline/context */
```

### Bar Charts

```css
.bar {
  height: 8px;
  background: var(--color-link);
  border-radius: 4px;
  transition: width var(--duration-normal) var(--ease-out);
}

.bar-label {
  font-size: 12px;
  color: var(--color-text-secondary);
}
```

---

## Implementation Notes

### CSS Architecture

1. **Layer imports**: fonts → variables → base → components → utilities
2. **No utility classes for layout** — Use semantic class names
3. **CSS custom properties for theming** — Single source of truth
4. **Component scoping** — Prefer descendant selectors over BEM

### File Organization

```css
css/
├── fonts.css       # @font-face declarations
├── modules/
│   └── base.css    # Reset, variables, root styles
├── components/
│   ├── button.css
│   ├── input.css
│   └── ...
└── bundle.css      # Import aggregator
```
