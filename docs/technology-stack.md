# Technology Stack

Comprehensive overview of technologies, formats, and dependencies used in the Light project.

## Frontend

### Core Technologies

- **Architecture**: Static single-page application (SPA)
- **Language**: TypeScript 5.0+ (transpiled to ES2020)
- **Runtime**: Zero dependencies (Vanilla JS output)
- **HTML**: Semantic HTML5 with ARIA labels
- **CSS**: Custom design system with CSS variables

### CSS System

- **Format**: Modular CSS with custom bundler (`scripts/build-css.ts`)
- **Modules**:
  - `base.css`: Design tokens, typography, color system
  - `styles.css`: Component styles, layout, responsive design
  - `fonts.css`: Font-face declarations with progressive fallback (WOFF2 → WOFF → OTF)
- **Build**: Custom concatenation script running on Bun (`scripts/build-css.ts`)
- **Features**:
  - CSS custom properties for design tokens
  - Spring physics transitions (cubic-bezier)
  - Translucent materials with backdrop-filter
  - Responsive grid and flexbox layouts

### Typography

**Format**: Progressive font loading with WOFF2 → WOFF → OTF fallback chain

**Font Families**:

- **SF Pro**: Primary UI font
  - Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
  - Styles: Regular, Italic
  - Usage: Body text, buttons, navigation, form labels

- **SF Compact**: Condensed UI variant
  - Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
  - Styles: Regular, Italic
  - Usage: Table headers, badges, compact labels, mobile layouts

- **New York Small**: Serif font
  - Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
  - Styles: Regular, Italic
  - Usage: Headings, hero titles, editorial content

**Monospace**: DO NOT USE

- Usage: Numeric data, currency values, energy rates, tabular information

**Format Priority**:

1. **WOFF2**: Modern browsers (Chrome 36+, Firefox 39+, Safari 10+, Edge 14+)
   - Best compression (~30% smaller than WOFF)
   - Fastest load times
2. **WOFF**: Older browsers (Chrome 5+, Firefox 3.6+, Safari 5.1+, IE 9+)
   - Wide compatibility
   - Standard web font format
3. **OTF**: Legacy fallback
   - Universal browser support
   - Desktop font format for older clients

**File Structure**:

```bash
src/assets/fonts/
├── san_francisco/
│   ├── WOFF2/      SF-Pro-Text-*.woff2, SF-Compact-Text-*.woff2 (16 files)
│   ├── WOFF/       SF-Pro-Text-*.woff, SF-Compact-Text-*.woff (16 files)
│   └── OTF/        SF-Pro-Text-*.otf, SF-Compact-Text-*.otf (16 files)
└── new_york/
    ├── WOFF2/      NewYorkSmall-*.woff2 (8 files)
    ├── WOFF/       NewYorkSmall-*.woff (8 files)
    └── OTF/        NewYorkSmall-*.otf (8 files)
```

**Browser Behavior**: Modern browsers automatically select WOFF2 for optimal performance, while older browsers gracefully fall back to WOFF or OTF as needed.

### Design System

- **Philosophy**: Apple Human Interface Guidelines (HIG) inspired
- **Color System**: Official Apple system colors with semantic naming
- **Motion**: Spring physics only (no linear/ease transitions)
- **Depth**: Translucent materials, ambient lighting, layered shadows
- **Constraints**: No emojis, no bento grids, no shadcn/ui aesthetic

## Backend / Data Pipeline

### Python Stack

- **Version**: Python 3.11+
- **Package Manager**: `uv` (preferred) or `pip`
- **Dependencies**:
  - `requests`: HTTP client for Power to Choose API
  - `beautifulsoup4`: HTML parsing for EFL extraction
  - `lxml`: XML/HTML parser (faster than html.parser)
  - `pydantic`: Data validation with type safety (NEW)

### Data Scripts

| Script | Purpose | Output |
| --- | --- | --- |
| `fetch_plans.py` | Fetch electricity plans from Power to Choose API | `data/plans.json` |
| `fetch_tdu_rates.py` | Manage TDU delivery rates | `data/tdu-rates.json` |
| `archive_to_csv.py` | Convert JSON archives to CSV format | `data/csv-archive/*.csv` |

### Data Sources

- **Power to Choose API**: Official PUCT platform
  - Endpoint: `http://api.powertochoose.org/api/PowerToChoose/plans`
  - CSV Export: `http://www.powertochoose.org/en-us/Plan/ExportToCsv`
  - Update: Daily at 2 AM CT via GitHub Actions

- **TDU Rates**: PUCT tariff filings
  - Update: Semi-annually (March 1, September 1)
  - Manual updates via `fetch_tdu_rates.py`

- **Local Taxes**: Texas Comptroller data
  - ZIP code mapping in `data/local-taxes.json`

## Development Tools

### JavaScript/TypeScript Tooling

- **Runtime**: Bun (preferred) or Node.js 18+
- **Bundler**: Bun (native)
- **TypeScript**: Strict mode enabled with all null safety checks (NEW)
  - Source: `src/ts/`
  - Bundled output: `src/js/ (Git ignored)`
  - Config: `tsconfig.json`
- **Linter**: Biome (`biome.json`)
  - Enforces consistent code style
  - JSON validation
  - Import sorting
- **Testing**:
  - Unit: `bun test` runner
  - UI: Playwright (Chromium)
  - Location: `tests/unit/`, `tests/ui/`

### Python Tooling

- **Linter**: Ruff (`pyproject.toml`)
  - Fast Python linter and formatter
  - Replaces Black, isort, Flake8
- **Type Checker**: mypy (`pyproject.toml`) (NEW)
  - Strict mode enabled
  - All scripts require full type annotations
- **Validation**: Pydantic models for all data structures (NEW)
  - `scripts/models/__init__.py`

### Build & Deployment

- **Static Site**: GitHub Pages
- **Domain**: `luisfork.github.io/light`
- **CI/CD**: GitHub Actions
  - Daily data updates
  - Linting checks on PR
  - Automatic deployment on merge

## Data Formats

### JSON Schemas

- **Plans**: `data/plans.json` (primary data file)
  - 11-field numeric fingerprint for deduplication
  - Optional `etf_details` from EFL parsing
  - See `docs/data-schema-plans.md` for full spec

- **TDU Rates**: `data/tdu-rates.json`
  - Monthly base charge
  - Per-kWh delivery rate
  - Effective date

- **Local Taxes**: `data/local-taxes.json`
  - ZIP code keys
  - Percentage values (e.g., 0.08 for 8%)

### CSV Archives

- **JSON Archive**: `data/json-archive/plans_YYYY-MM-DD.json`
- **CSV Archive**: `data/csv-archive/plans_YYYY-MM-DD.csv`
- **Retention**: Unlimited (growing historical dataset)

## Browser Support

### Modern Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Required Features

- ES6 modules
- CSS custom properties
- CSS Grid & Flexbox
- Backdrop-filter (for translucent materials)
- Fetch API
- LocalStorage

### Progressive Enhancement

- System fonts fallback for missing custom fonts
- Graceful degradation without backdrop-filter
- ARIA labels for screen readers
- Keyboard navigation support

## Performance Characteristics

### Load Times

- **First Contentful Paint**: < 1s
- **Time to Interactive**: < 2s
- **Total Bundle Size**: ~200KB (including fonts)

### Optimizations

- WOFF2 fonts (~30% compression vs WOFF)
- Minified CSS bundle
- 5-minute browser cache for data
- No runtime dependencies
- Static asset CDN via GitHub Pages

## Accessibility

- **Standard**: WCAG 2.1 AA compliant
- **Contrast**: Minimum 4.5:1 for body text
- **Structure**: Semantic HTML5 with proper heading hierarchy
- **Navigation**: Full keyboard support with visible focus indicators
- **Screen Readers**: ARIA labels and landmarks throughout

## Version Control

- **Platform**: GitHub
- **Repository**: `luisfork/light`
- **Branch Strategy**: Main branch for production
- **Commit Style**: Conventional commits (optional)

## License

MIT License - Open source, permissive usage

---

**Last Updated**: January 2026
