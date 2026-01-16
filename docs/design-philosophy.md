# Design Philosophy & Visual Language

## Overview

Light uses a professional design system focused on clarity, trustworthiness, and functional depth. Every design decision serves the core mission: helping Texans make informed electricity decisions through transparent, accurate calculations.

---

## Core Design Principles

### 1. ZERO Decorative Elements

**Every pixel serves the truth.**

- NO emojis anywhere in the interface
- NO bento grids or card-based layouts
- NO shadcn/ui aesthetic
- NO badges, pills, or marketing chrome
- NO decorative illustrations or icons
- NO animations except spring physics

### 2. Visual System

**Professional, refined, and familiar.**

- **Typography:** San Francisco (SF Pro, SF Mono) and New York fonts
- **Color Palette:** Sophisticated ink grays with ambient light effects
- **Depth System:** Layered shadows and diffused glows
- **Layout:** Unitary surface with clear hierarchy

### 3. Spring-Based Motion

**All transitions use spring physics cubic-bezier curves.**

Light implements fluid, natural motion through spring-based timing functions. NO linear, ease, or ease-in-out timing is permitted.

#### Spring Physics Constants

```css
/* Fast, responsive spring */
--transition-fast: 0.15s cubic-bezier(0.21, 1.02, 0.73, 1);

/* Gentle bounce spring */
--transition-base: 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);

/* Soft, subtle spring */
--transition-slow: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

#### Animation Timing Functions

| Use Case | Cubic Bezier | Character |
| --- | --- | --- |
| Quick actions | `cubic-bezier(0.21, 1.02, 0.73, 1)` | Fast, responsive |
| Modal dialogs | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy, playful |
| Subtle reveals | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Soft anticipation |
| Spinners | `cubic-bezier(0.4, 0.0, 0.6, 1)` | Smooth rotation |
| Exit animations | `cubic-bezier(0.4, 0.0, 1, 1)` | Clean departure |

**Prohibited timing functions:**

- `linear`
- `ease`, `ease-in`, `ease-out`, `ease-in-out`
- `steps()`
- Custom cubic-bezier without spring characteristics

---

## Color System

### Official Apple Developer Color Specifications

Light implements Apple's official system colors for both Light and Dark modes.

#### Light Mode

```css
/* Neutral Ink Palette */
--color-ink: #1a1a1a;              /* Primary text */
--color-ink-secondary: #8e8e93;    /* Gray (1): rgb(142, 142, 147) */
--color-ink-tertiary: #aeaeb2;     /* Gray (2): rgb(174, 174, 178) */
--color-ink-muted: #aeaeb2;        /* Gray (2): rgb(174, 174, 178) */

/* Surface Colors */
--color-surface: #ffffff;                      /* Base surface */
--color-surface-raised: #f2f2f7;               /* Gray (6): rgb(242, 242, 247) */
--color-surface-sunken: #e5e5ea;               /* Gray (5): rgb(229, 229, 234) */
--color-surface-overlay: rgba(255, 255, 255, 0.95);

/* Accent Colors - Apple System Colors */
--color-accent: #0088ff;           /* Blue: rgb(0, 136, 255) */
--color-positive: #34c759;         /* Green: rgb(52, 199, 89) */
--color-caution: #ff8d28;          /* Orange: rgb(255, 141, 40) */
--color-negative: #ff383c;         /* Red: rgb(255, 56, 60) */
```

#### Dark Mode

```css
/* Neutral Ink Palette */
--color-ink: #f0f0f0;              /* Primary text */
--color-ink-secondary: #636366;    /* Gray (2) Dark: rgb(99, 99, 102) */
--color-ink-tertiary: #48484a;     /* Gray (3) Dark: rgb(72, 72, 74) */
--color-ink-muted: #8e8e93;        /* Gray (1): rgb(142, 142, 147) */

/* Surface Colors */
--color-surface: #1c1c1e;          /* Gray (6) Dark: rgb(28, 28, 30) */
--color-surface-raised: #2c2c2e;   /* Gray (5) Dark: rgb(44, 44, 46) */
--color-surface-sunken: #1c1c1e;   /* Gray (6) Dark: rgb(28, 28, 30) */
--color-surface-overlay: rgba(28, 28, 30, 0.95);

/* Accent Colors - Apple System Colors */
--color-accent: #0091ff;           /* Blue: rgb(0, 145, 255) */
--color-positive: #30d158;         /* Green: rgb(48, 209, 88) */
--color-caution: #ff9230;          /* Orange: rgb(255, 146, 48) */
--color-negative: #ff4245;         /* Red: rgb(255, 66, 69) */
```

### Complete Apple Color Reference

| Color    | Light Mode RGB    | Dark Mode RGB     |
|----------|------------------|-------------------|
| Red      | (255, 56, 60)    | (255, 66, 69)     |
| Orange   | (255, 141, 40)   | (255, 146, 48)    |
| Yellow   | (255, 204, 0)    | (255, 214, 0)     |
| Green    | (52, 199, 89)    | (48, 209, 88)     |
| Mint     | (0, 200, 179)    | (0, 218, 195)     |
| Teal     | (0, 195, 208)    | (0, 210, 224)     |
| Cyan     | (0, 192, 232)    | (60, 211, 254)    |
| Blue     | (0, 136, 255)    | (0, 145, 255)     |
| Indigo   | (97, 85, 245)    | (109, 124, 255)   |
| Purple   | (203, 48, 224)   | (219, 52, 242)    |
| Pink     | (255, 45, 85)    | (255, 55, 95)     |
| Brown    | (172, 127, 94)   | (183, 138, 102)   |
| Gray (1) | (142, 142, 147)  | (142, 142, 147)   |
| Gray (2) | (174, 174, 178)  | (99, 99, 102)     |
| Gray (3) | (199, 199, 204)  | (72, 72, 74)      |
| Gray (4) | (209, 209, 214)  | (58, 58, 60)      |
| Gray (5) | (229, 229, 234)  | (44, 44, 46)      |
| Gray (6) | (242, 242, 247)  | (28, 28, 30)      |

---

## Typography

### Font Families

Light implements the complete Apple font ecosystem with precise usage guidelines following the Human Interface Guidelines.

```css
/* San Francisco Pro - Primary UI font */
--font-system: "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

/* San Francisco Pro Display - Large headings (>19px) */
--font-display: "SF Pro Display", "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

/* San Francisco Mono - Numeric and tabular data */
--font-mono: "SF Mono", -apple-system, BlinkMacSystemFont, system-ui, monospace;

/* San Francisco Compact - Condensed UI elements and table headers */
--font-compact: "SF Compact", "SF Pro", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-compact-display: "SF Compact Display", "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;

/* New York - Serif headings and editorial content */
--font-serif: "New York", -apple-system, BlinkMacSystemFont, system-ui, serif;

/* New York Large - Hero and display headings */
--font-serif-large: "New York Large", "New York", -apple-system, BlinkMacSystemFont, system-ui, serif;
```

### Type Scale

```css
--text-xs: 0.75rem;    /* 12px - Compact labels, table headers */
--text-sm: 0.875rem;   /* 14px - Secondary text, captions */
--text-base: 1rem;     /* 16px - Body text (default) */
--text-lg: 1.125rem;   /* 18px - Emphasized body text */
--text-xl: 1.25rem;    /* 20px - Section headings */
--text-2xl: 1.5rem;    /* 24px - Page headings */
--text-3xl: 2rem;      /* 32px - Feature headings */
--text-4xl: 2.5rem;    /* 40px - Hero headings */
```

### Font Usage Guidelines

#### San Francisco Pro (SF Pro)

**Purpose:** Primary UI text, body copy, navigation

**Weight Distribution:**

- 300 (Light): Rarely used, reserved for large display text
- 400 (Regular): Default body text
- 500 (Medium): Emphasized UI elements, button labels
- 600 (Semibold): Strong emphasis, active states
- 700 (Bold): Very strong emphasis (use sparingly)

**Elements:**

- Body paragraphs (400)
- Button labels (500)
- Form labels (600)
- Navigation items (500)
- Secondary descriptions (400)

#### San Francisco Pro Display

**Purpose:** Large headings (≥20px)

**When to use:**

- Hero titles ≥32px
- Section headings ≥20px
- Display text requiring optical sizing

**Note:** SF Pro Display is designed with wider apertures for large sizes. It provides better legibility at display sizes compared to SF Pro Text.

#### San Francisco Mono (SF Mono)

**Purpose:** Numeric data, tabular information, code

**Critical Usage:**

- Currency values ($1,234.56)
- Energy rates (12.5¢/kWh)
- Usage amounts (1,234 kWh)
- ZIP codes (75001)
- Contract terms (12 months)
- All table numeric cells
- Metric values in hero section
- Plan cost displays

**Why SF Mono:**

- Fixed-width characters ensure perfect alignment
- Tabular numerals maintain consistent spacing
- Superior legibility for financial data
- Reduces cognitive load when scanning numbers

#### San Francisco Compact

**Purpose:** Condensed UI elements, table headers, mobile optimization

**When to use:**

- Table column headers (uppercase, 600 weight)
- Mobile responsive layouts (<768px)
- Space-constrained interfaces
- Dense data displays

**Benefits:**

- 10-15% narrower than SF Pro
- Maintains legibility at small sizes
- Optimized for data-dense layouts

#### New York

**Purpose:** Editorial headings, serif accent text

**Weight Distribution:**

- 400 (Regular): Standard headings (h3, h4)
- 500 (Medium): Emphasized headings
- 600 (Semibold): Primary headings (h1, h2)
- 700 (Bold): Rare, very strong emphasis

**Elements:**

- Page titles (h1, h2)
- Section headings (h3, h4)
- Legal disclaimers (400, smaller size)
- Footer legal text

#### New York Large

**Purpose:** Hero section display headings

**When to use:**

- Hero titles ≥32px
- Landing page headlines
- Feature section headings

**Characteristics:**

- Optimized for large display sizes (≥32px)
- Enhanced contrast and readability
- Wider character spacing for visual impact

### Typography Pairing Rules

#### Hierarchy System

```bash
Hero Title       → New York Large (700, 40-64px)
Page Heading     → New York (600, 24-32px)
Section Heading  → SF Pro Display (600, 20-24px)
Subsection       → SF Pro (600, 18px)
Body Text        → SF Pro (400, 16px)
Caption          → SF Pro (400, 14px)
Label            → SF Compact (600, 12px uppercase)
Numeric Data     → SF Mono (500-700, varies)
```

#### Contrast Pairing

- **Serif + Sans:** New York headings with SF Pro body (current implementation)
- **Mono + Sans:** SF Mono numbers with SF Pro labels
- **Compact + Regular:** SF Compact headers with SF Pro content

### Advanced Typography Features

#### OpenType Features

```css
/* Enable tabular numerals for aligned columns */
font-variant-numeric: tabular-nums;

/* Enable ligatures for SF Pro (default) */
font-variant-ligatures: common-ligatures;

/* Disable ligatures for SF Mono (monospace integrity) */
font-variant-ligatures: none;
```

#### Letter Spacing

- **Headings:** -0.02em to -0.03em (tighter)
- **Body text:** 0 (default)
- **Small caps/labels:** 0.03em to 0.05em (looser)
- **Monospace:** 0 (preserve alignment)

#### Line Height

- **Headings:** 1.1 to 1.25 (tight)
- **Body text:** 1.6 to 1.7 (comfortable reading)
- **Captions:** 1.4 to 1.5 (compact)
- **Table cells:** 1.3 to 1.4 (dense data)

### Responsive Typography

#### Breakpoints

**Mobile (<640px):**

- Hero: clamp(1.5rem, 5vw, 2rem)
- Headings: Scale down 1 level
- Body: 16px (never below 16px for accessibility)
- Table headers: SF Compact (11px)

**Tablet (640px - 1024px):**

- Hero: clamp(2rem, 5vw, 2.5rem)
- Standard scale with minor adjustments

**Desktop (>1024px):**

- Full type scale
- Maximum readability

### Font Loading Strategy

```css
@font-face {
  font-family: "SF Pro";
  src: url("../assets/fonts/san_francisco/SF-Pro-Text-Regular.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Prevent FOIT (Flash of Invisible Text) */
}
```

**Strategy:** `font-display: swap`

- Shows fallback font immediately
- Swaps to custom font when loaded
- Prevents blank text during font download
- Acceptable for non-critical branding

### Accessibility Considerations

- **Minimum font size:** 12px (--text-xs)
- **Body text minimum:** 16px (--text-base)
- **Line length:** Max 75 characters for readability
- **Color contrast:** All text meets WCAG 2.1 AA (4.5:1 minimum)
- **Scalability:** Supports browser zoom up to 200%

### Font File Organization

```bash
src/assets/fonts/
├── san_francisco/
│   ├── SF-Pro-Text-*.otf        (12 files)
│   ├── SF-Pro-Display-*.otf     (9 files)
│   ├── SF-Mono-*.otf            (12 files)
│   └── SF-Compact-*.otf         (8 files loaded)
└── new_york/
    ├── NewYorkMedium-*.otf      (6 files)
    └── NewYorkLarge-*.otf       (4 files)
```

**Total fonts loaded:** 51 font files (necessary for complete weight and style coverage)

### Performance Optimization

- **Subset loading:** Consider creating font subsets for production
- **Preload critical fonts:** Preload Regular and Semibold weights
- **Lazy load display fonts:** New York Large can be loaded after initial render
- **WOFF2 conversion:** Convert OTF to WOFF2 for smaller file sizes (future enhancement)

---

## Ambient Light System

Light uses **layered shadow systems** instead of harsh drop shadows to create depth through ambient light diffusion.

### Glow Presets

```css
/* Subtle elevation */
--glow-subtle:
    0 0 0 1px var(--color-border-subtle),
    0 1px 3px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(0, 0, 0, 0.03);

/* Medium elevation */
--glow-medium:
    0 0 0 1px var(--color-border-subtle),
    0 2px 6px rgba(0, 0, 0, 0.03),
    0 8px 24px rgba(0, 0, 0, 0.05);

/* Strong elevation */
--glow-strong:
    0 0 0 1px var(--color-border-subtle),
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 16px 48px rgba(0, 0, 0, 0.06);

/* Accent glow */
--glow-accent:
    0 0 0 1px rgba(0, 136, 255, 0.15),
    0 4px 16px rgba(0, 136, 255, 0.08),
    0 12px 32px rgba(0, 136, 255, 0.04);
```

### Usage Guidelines

- **Input fields:** `glow-subtle` on focus
- **Buttons:** `glow-medium` on hover
- **Modal dialogs:** `glow-strong`
- **Interactive cards:** `glow-accent` for primary actions

---

## Layout Principles

### Unitary Surface Design

Light uses a **single-surface layout** instead of fragmented card grids.

**Characteristics:**

- Content flows vertically in a single column
- Sections separated by subtle divider lines
- NO isolated card containers
- NO bento grid arrangements
- Consistent padding and rhythm

### Spacing System

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

### Content Width

```css
--max-width-content: 960px;   /* Standard reading width */
--max-width-wide: 1200px;     /* Wide layouts (tables) */
```

---

## Accessibility

### WCAG 2.1 AA Compliance

- **Contrast Ratios:** All text meets 4.5:1 minimum
- **Semantic HTML:** Proper heading hierarchy, ARIA labels
- **Keyboard Navigation:** Full keyboard support without mouse
- **Focus Indicators:** Visible focus states with spring transitions
- **Screen Reader Support:** Descriptive labels and live regions

### Testing Tools

- Chrome DevTools Accessibility Audit
- axe DevTools browser extension
- VoiceOver (macOS) and NVDA (Windows) testing

---

## Performance Standards

### CSS Performance

- **NO runtime CSS-in-JS**
- Static CSS file with minimal specificity
- CSS custom properties for theming
- Hardware-accelerated transforms only

### Animation Performance

- **Prefer transforms over position changes**
- Use `transform: translateY()` instead of `top/bottom`
- Use `opacity` transitions (GPU-accelerated)
- Avoid animating `width`, `height`, or `margin`

### Best Practices

```css
/* ✅ Good - GPU-accelerated */
.modal {
    transform: translateY(-20px);
    opacity: 0;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
                opacity 0.3s cubic-bezier(0.21, 1.02, 0.73, 1);
}

/* ❌ Bad - triggers layout reflow */
.modal {
    top: -20px;
    transition: top 0.3s ease;
}
```

---

## Design Patterns

### Button Styles

**Primary Button:**

```css
.btn-primary {
    background: var(--color-accent);
    color: white;
    padding: var(--space-3) var(--space-5);
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
}
```

**Secondary Button:**

```css
.btn-secondary {
    background: transparent;
    color: var(--color-accent);
    border: 1px solid var(--color-border-medium);
    transition: all var(--transition-fast);
}
```

### Input Fields

```css
.field-input {
    border: 1px solid var(--color-border-medium);
    border-radius: var(--radius-md);
    transition: border-color var(--transition-fast),
                box-shadow var(--transition-fast);
}

.field-input:focus {
    border-color: var(--color-accent);
    box-shadow: var(--glow-accent);
    outline: none;
}
```

### Modal Dialogs

```css
.modal-backdrop {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(12px);
}

.modal-dialog {
    background: var(--color-surface);
    border-radius: 12px;
    box-shadow: var(--glow-strong);
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## Implementation Checklist

When adding new UI components, verify:

- [ ] NO emojis used
- [ ] NO card-based layouts (use unitary surface)
- [ ] NO shadcn/ui components
- [ ] All animations use spring-based cubic-bezier
- [ ] All transitions use spring-based cubic-bezier
- [ ] Colors from approved palette
- [ ] Typography uses SF Pro, SF Mono, or New York
- [ ] WCAG 2.1 AA contrast ratios met
- [ ] Keyboard navigation supported
- [ ] Semantic HTML with ARIA labels
- [ ] Mobile-responsive (test 375px, 768px, 1200px)

---

## Design Philosophy Summary

**Light is:**

- Professional, not playful
- Functional, not decorative
- Transparent, not obscure
- Apple-inspired, not generic
- Data-driven, not emotional

**Light is NOT:**

- Consumer-facing marketing site
- Dashboard with cards and widgets
- Flashy, animated experience
- Emoji-filled casual interface

---

## Future Enhancements

### Advanced Animations (Potential)

For future interactive features:

- Gesture-based spring animations
- Physics-based scroll interactions
- Magnetic buttons with spring rebound

---

## References

- **Apple Human Interface Guidelines:** [developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines)
- **SF Pro Fonts:** [developer.apple.com/fonts](https://developer.apple.com/fonts)
- **Spring Animation Math:** [webkit.org/demos/spring](https://webkit.org/demos/spring/)
- **WCAG 2.1 Guidelines:** [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated:** January 11, 2026
**Document Version:** 1.0.0
