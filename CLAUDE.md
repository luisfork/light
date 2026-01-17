# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

*Light* is a static web application that helps Texans find the best electricity plan by calculating true annual costs based on actual usage patterns, seasonal variations, and contract expiration timing. The app is hosted on GitHub Pages with zero backend infrastructure.

**Core Principle:** Calculate true monthly and annual costs—not deceptive advertised rates—by including ALL fees (energy, TDU delivery, base charges, taxes) and accounting for seasonal usage patterns and contract timing.

## Development Commands

### Local Development Setup

```bash
# Install Python dependencies (using uv - preferred)
uv pip install --system requests beautifulsoup4 lxml pdfplumber

# Or using pip
pip install requests beautifulsoup4 lxml pdfplumber

# Populate test data from cached CSV (for offline development)
TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py

# Fetch fresh data from Power to Choose API (requires internet)
uv run python scripts/fetch_plans.py

# Serve locally (REQUIRED - file:// protocol won't work due to CORS)
python -m http.server 8000
# Then open http://localhost:8000/src/ in browser

# Install JavaScript/testing dependencies (bun required)
bun install
bunx playwright install --with-deps chromium
```

### Automated Testing

```bash
# Run unit tests (node:test)
bun test tests/unit

# Run all UI tests (headless)
bunx playwright test

# Run tests and show report on failure
bunx playwright test --reporter=html

# Debug tests (shows browser window)
bunx playwright test --debug
```

### Linting & Formatting

```bash
# JavaScript/JSON linting with Biome
bunx biome check src/
bunx biome format --write src/

# HTML linting with djlint
uv tool run djlint src/ --check
uv tool run djlint src/ --reformat

# Python linting with Ruff
ruff check scripts/
ruff format scripts/

# GitHub Actions workflow validation
actionlint
```

### Data Management

```bash
# Fetch latest electricity plans
uv run python scripts/fetch_plans.py

# Update TDU rates (only when PUCT publishes changes - Mar/Sep)
uv run python scripts/fetch_tdu_rates.py

# Archive current plans to CSV
python scripts/archive_to_csv.py
```

**EFL ETF enrichment controls (optional):**

- `EFL_ETF_LOOKUP=1` enable EFL parsing (default on)
- `EFL_ETF_MAX_FETCHES=250` cap EFL fetches per run
- `EFL_ETF_TIMEOUT=20` seconds per EFL request
- `EFL_ETF_AUTO_ALLOWLIST=1` seed allowlist from existing `data/plans.json`
- `EFL_ETF_ALLOWED_DOMAINS=...` comma-separated allowlist overrides

EFL parsing requires `pdfplumber` and only stores a small `etf_details` object (no PDFs saved).

## Architecture

### Core Calculation Flow

```bash
User Input → Usage Estimator → Cost Calculator → Plan Ranker → UI Display
     ↓              ↓                  ↓              ↓
ZIP Code      Seasonal         Monthly Cost    Combined Score
Usage Type    Multipliers      (12 months)     (Multiplicative Value Score)
```

### Modular JavaScript Architecture

**Entry Points:**

- `src/js/ui.js` - DOM manipulation, event handlers, user interactions
- `src/js/api.js` - Data loading facade (plans, TDU rates, taxes)
- `src/js/calculator.js` - Main calculation facade

**Core Modules (src/js/modules/):**

| Module | Responsibility |
| --- | --- |
| `cache.js` | Cache management with TTL (5min default) |
| `data-loader.js` | HTTP fetch with retry logic and timeout |
| `tax-lookup.js` | ZIP code to local tax rate mapping |
| `provider-formatter.js` | Clean provider names (remove LLC, etc.) |
| `formatters.js` | Currency and rate display formatting |
| `usage-estimator.js` | Convert user input to 12-month pattern |
| `cost-calculator.js` | Calculate monthly/annual costs with all fees |
| `contract-analyzer.js` | Analyze contract expiration timing |
| `etf-calculator.js` | Properly calculate per-month-remaining ETFs |
| `plan-ranker.js` | Rank plans by combined weighted score |

### Python Scripts (scripts/)

- `fetch_plans.py` - Fetch from Power to Choose API with retry logic
- `fetch_tdu_rates.py` - Manage TDU delivery rates
- `archive_to_csv.py` - Export historical plan data to CSV

### Data Files (data/)

- `plans.json` - Current electricity plans (updated daily by GitHub Actions)
- `tdu-rates.json` - TDU delivery charges (manual updates Mar/Sep)
- `local-taxes.json` - Texas local tax rates by ZIP code
- `json-archive/` - Unlimited archive of historical plan snapshots (JSON)
- `csv-archive/` - Daily CSV exports for analysis

## Key Technical Details

### Calculation Algorithm

```javascript
// For each of 12 months:
1. Interpolate energy rate from 500/1000/2000 kWh tiers
2. Calculate energy cost = usage × rate
3. Add TDU delivery charges (base + per-kWh)
4. Add REP base charge
5. Subtract bill credits (only if usage qualifies that month)
6. Add local sales tax
7. Sum all 12 months for annual cost

// Combined score (Multiplicative Value Model):
costScore = 100 - ((annualCost - bestCost) / (worstCost - bestCost)) * 100
qualityScore = calculateQualityScore(plan)  // 0-100
combinedScore = costScore * (Math.max(1, qualityScore) / 100)
// F-grade plans (score < 60) get severe penalty (-1000)
```

### Quality Scoring System

**Base Score:** 100 points for all fixed-rate plans

**Automatic F (score = 0):**

- Non-fixed rates (VARIABLE, INDEXED)
- Prepaid plans
- Time-of-use plans

**Penalties:**

- Cost penalty: Up to -40 (expensive vs best)
- Volatility penalty: Up to -25 (unpredictable costs)
- Warning penalty: -5 per warning, max -25
- Base charge penalty: Up to -5 (high monthly fees >$15)
- Expiration Seasonality: Up to -30 (plans expiring in peak Summer/Winter months)

**Bonuses:**

- None (Strictly penalty-based scoring for risk reduction)

### Seasonal Usage Multipliers

Texas-specific patterns based on real consumption data:

- **Summer (Jun-Sep):** 1.4-1.8x baseline (peak AC usage)
- **Winter (Dec-Feb):** 1.1-1.3x baseline (heating)
- **Shoulder (Mar-May, Oct-Nov):** 0.95-1.0x baseline

### Contract Expiration Analysis

**Renewal Seasonality Scores:**

- April, October: 0.0 (best - rates 15-25% lower)
- May, November: 0.1-0.2 (excellent)
- July, August, January: 1.0 (worst - peak demand)

**Warning Threshold:** Score ≥ 0.8 triggers "High Risk" warning with alternative contract length suggestions.

### ETF (Early Termination Fee) Calculation

Many plans charge per-month-remaining, NOT flat fees. The calculator prioritizes EFL-derived `etf_details` when available and treats ambiguous cases as unknown:

```javascript
// Detection logic:
if (plan.etf_details) → use etf_details.structure
if (special_terms includes "per month remaining") → per-month-remaining
if (fee ≤ $50 AND term ≥ 12 months WITHOUT explicit language) → unknown

// Calculation:
if (per-month-remaining):
  totalETF = baseFee × monthsRemaining
else if (unknown):
  totalETF = 0  // UI shows “See EFL”
else:
  totalETF = baseFee
```

### Duplicate Plan Detection

Power to Choose lists identical plans in English and Spanish. We use simple, robust numeric fingerprinting to detect and remove duplicates:

```javascript
// Numeric-only fingerprint (11 fields):
fingerprint = hash({
  rep_name,           // Provider name (uppercase, normalized)
  tdu_area,           // TDU service area
  rate_type,          // FIXED, VARIABLE, etc.
  p500,               // Price at 500 kWh (rounded to 3 decimals)
  p1000,              // Price at 1000 kWh (rounded to 3 decimals)
  p2000,              // Price at 2000 kWh (rounded to 3 decimals)
  term_months,        // Contract length
  etf,                // Early termination fee (rounded to 2 decimals)
  base_charge,        // Monthly base charge (rounded to 2 decimals)
  renewable_pct,      // Renewable energy percentage
  prepaid,            // Prepaid flag (boolean)
  tou                 // Time-of-use flag (boolean)
})

// Preference scoring (higher = preferred):
score = 100
  + 50 if language === 'English'
  - 50 if language === 'Spanish'
  - penalties for Spanish characters (ñ, á, é, etc.)
  - penalties for longer names
  - penalties for special characters

// Keep English version, remove Spanish duplicate
```

**Why Numeric-Only?**
Analysis of 986 plans confirms that plans with identical numeric features (prices, fees, term, etc.) always have identical substantive terms. Text extraction (bill credits, special features) adds significant complexity without improving accuracy. Plans that appear identical numerically ARE identical—regardless of how the marketing text describes them.

### Provider Name Formatting

Ensure professional, consistent display:

```javascript
"TXU Energy Retail Company LLC" → "TXU ENERGY RETAIL"
"Reliant Energy Retail Services, Inc." → "RELIANT ENERGY RETAIL SERVICES"

// Rules:
1. Convert to uppercase
2. Remove: LLC, INC, LP, & CO, (TX), (TEXAS), COMPANY
3. Trim whitespace and trailing punctuation
```

## Code Style

### JavaScript (Biome)

- **Quote style:** Single quotes
- **Semicolons:** Always
- **Indentation:** 2 spaces
- **Line width:** 100 characters
- **Trailing commas:** None
- **Cost Format:** Always use `"$XXX.XX (X months)"` (e.g., "$318.21 (3 months)") for multi-month totals.

### Python (Ruff)

- **Line length:** 100 characters
- **Target:** Python 3.11+
- **Type hints:** Not required (vanilla Python scripts)
- **Linting rules:** E, F, W, I, N, UP, B, A, C4, DTZ, T10, RUF

## Design Philosophy

### NO Emojis, NO Bento Grids, NO Shadcn Aesthetic

This is a professional financial tool with a sophisticated design system:

- **Typography-focused:** San Francisco & New York fonts
- **Neutral palette:** Ink grays, ambient light effects
- **Functional depth:** Rich calculations, transparent methodology
- **Warning Icons:** Always use custom **perfect circle** SVG icons (not emojis) for "TIME OF USE" or "PREPAID" badges.
- **WCAG 2.1 AA compliant:** Contrast ratios > 4.5:1, semantic HTML5, ARIA labels

### Performance First

- **Static architecture:** Zero backend, instant loading
- **Pre-fetched data:** No API calls during use
- **Minimal dependencies:** Vanilla JavaScript, custom CSS
- **Optimized caching:** 5-minute browser cache with retry logic

## GitHub Actions Workflows

### Daily Data Updates (update-plans.yml)

Runs at 2 AM Central Time (7 AM UTC):

1. Archive current `plans.json` to `data/json-archive/plans_YYYY-MM-DD.json`
2. Archive CSV to `data/csv-archive/plans_YYYY-MM-DD.csv`
3. Verify archive integrity (JSON validation, CSV line count)
4. Fetch latest plans from Power to Choose API
5. Deduplicate English/Spanish versions
6. Commit and push if changes detected
7. Trigger deployment workflow

### Deployment (deploy.yml)

Triggered on push to `main` or after data update:

1. Assemble site from `src/` and `data/`
2. Upload artifact to GitHub Pages
3. Deploy to production

### Linting (lint.yml)

Runs on PR and push:

- Biome for JavaScript/JSON
- Ruff for Python
- djlint for HTML
- actionlint for GitHub Actions workflows

## Data Sources

### Power to Choose API

**Base URL:** `http://api.powertochoose.org/`

**Primary Endpoints:**

- CSV Export: `http://www.powertochoose.org/en-us/Plan/ExportToCsv` (preferred)
- JSON API: `/api/PowerToChoose/plans` (fallback)

**Update Frequency:** Daily at 2 AM CT via GitHub Actions

**Important:** Prices shown include TDU delivery charges (all-inclusive per PUCT rules). REPs directly submit plan information; PUCT does not independently verify.

### TDU Delivery Rates

**Source:** PUCT tariff filings and TDU official websites
**Update Schedule:** Rates change March 1 and September 1 annually
**Storage:** `data/tdu-rates.json` (manual updates required)

### Historical Data Archive

**Location:** `data/json-archive/` (JSON), `data/csv-archive/` (CSV)
**Retention:** Unlimited (growing archive since project start)
**Purpose:** Trend analysis, data integrity verification, research

## Important Notes

### CORS Restrictions

The app MUST be served via HTTP server. Opening `src/index.html` directly via `file://` protocol will fail due to CORS restrictions when loading JSON data.

**Always use:** `python -m http.server 8000` and navigate to `http://localhost:8000/src/`

### TDU Rate Updates

TDU rates are stored in `data/tdu-rates.json` and updated manually when PUCT approves rate changes (typically March 1 and September 1). These are NOT automatically fetched.

**To update:**

1. Check PUCT tariff filings or TDU websites
2. Run `uv run python scripts/fetch_tdu_rates.py` (if automated)
3. Or manually edit `data/tdu-rates.json`

### Testing with Cached Data

For offline development, use the cached CSV file:

```bash
TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py
```

This populates `data/plans.json` without hitting the Power to Choose API.

### Bun (Required for Testing & Linting)

This is a **static web application** with vanilla JavaScript. No build process is required for production. However, **Bun** is required for the Playwright automated testing suite and Biome linting.

All JavaScript modules use browser-native ES6 imports.
