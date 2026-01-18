# Technology Stack

Comprehensive overview of technologies, formats, and dependencies used in the Light project.

## Frontend

### Core Technologies

- **Architecture**: Static single-page application (SPA)
- **JavaScript**: 100% Vanilla JS (ES6+), zero runtime frameworks
- **HTML**: Semantic HTML5 with ARIA labels
- **CSS**: Custom design system with CSS variables

### CSS System

- **Format**: Modular CSS with custom bundler (`scripts/build-css.js`)
- **Modules**:
  - `base.css`: Design tokens, typography, color system
  - `styles.css`: Component styles, layout, responsive design
  - `fonts.css`: Font-face declarations (WOFF2 only)
- **Build**: Bun-based CSS concatenation into `bundle.css`
- **Features**:
  - CSS custom properties for design tokens
  - Spring physics transitions (cubic-bezier)
  - Translucent materials with backdrop-filter
  - Responsive grid and flexbox layouts

### Typography

**Format**: WOFF2 exclusively for optimal performance (~30% smaller than WOFF)

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

**Monospace**: System fonts (ui-monospace, SF Mono fallback, Menlo)

- Usage: Numeric data, currency values, energy rates, tabular information

**Performance**: WOFF2 reduces font file size by ~30% vs WOFF while maintaining full browser support.

**File Structure**:

```
src/assets/fonts/
├── san_francisco/
│   └── WOFF2/
│       ├── SF-Pro-Text-*.woff2 (8 files)
│       └── SF-Compact-Text-*.woff2 (8 files)
└── new_york/
    └── WOFF2/
        └── NewYorkSmall-*.woff2 (8 files)
```

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
  - `pdfplumber`: PDF text extraction for ETF details

### Data Scripts

| Script | Purpose | Output |
|--------|---------|--------|
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

### JavaScript Tooling

- **Runtime**: Bun (preferred) or Node.js 18+
- **Linter**: Biome (`biome.json`)
  - Enforces consistent code style
  - JSON validation
  - Import sorting
- **Testing**:
  - Unit: `node:test` runner via Bun
  - UI: Playwright (Chromium)
  - Location: `tests/unit/`, `tests/ui/`

### Python Tooling

- **Linter**: Ruff (`ruff.toml`, `pyproject.toml`)
  - Fast Python linter and formatter
  - Replaces Black, isort, Flake8
- **Type Checking**: None (pragmatic approach)

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
