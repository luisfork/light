# Design Philosophy & Visual Language

## Overview

Light uses a professional, Apple-inspired design system focused on clarity, trustworthiness, and functional depth. Every design decision serves the core mission: helping Texans make informed electricity decisions through transparent, accurate calculations.

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

### 2. Apple-Inspired Visual System

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
|----------|-------------|-----------|
| Quick actions | `cubic-bezier(0.21, 1.02, 0.73, 1)` | Fast, responsive |
| Modal dialogs | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Bouncy, playful |
| Subtle reveals | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Soft anticipation |
| Spinners | `cubic-bezier(0.4, 0.0, 0.6, 1)` | Smooth rotation |
| Exit animations | `cubic-bezier(0.4, 0.0, 1, 1)` | Clean departure |

**Prohibited timing functions:**
- ❌ `linear`
- ❌ `ease`, `ease-in`, `ease-out`, `ease-in-out`
- ❌ `steps()`
- ❌ Custom cubic-bezier without spring characteristics

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

```css
--font-system: 'SF Pro', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-display: 'SF Pro Display', 'SF Pro', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-mono: 'SF Mono', ui-monospace, monospace;
--font-serif: 'New York', serif;
```

### Type Scale

```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 2rem;      /* 32px */
--text-4xl: 2.5rem;    /* 40px */
```

### Font Usage

- **Headings:** New York serif (font-weight: 600)
- **Body Text:** SF Pro (font-weight: 400-500)
- **Data/Numbers:** SF Mono for tabular data
- **Legal Text:** New York serif for disclaimers

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
