<!-- markdownlint-disable MD053 -->

# ***Light*** — Texas Electricity Plan Finder

> Find the best and most affordable Texas electricity plan.
>
> **Free, unbiased, and accurate.**

*Light* is a high-performance static web application that helps Texans find the best electricity plan by calculating true annual costs based on actual usage patterns, seasonal variations, and contract expiration timing—not deceptive advertised rates.

Visit [**luisfork.github.io/light**](https://luisfork.github.io/light)

[![Website Status](https://img.shields.io/website?url=https%3A%2F%2Fluisfork.github.io%2Flight)](https://luisfork.github.io/light)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://opensource.org/licenses/MIT)
![Vanilla JS](https://img.shields.io/badge/vanilla-JavaScript-f7df1e?logo=javascript&logoColor=fff)
![Python](https://img.shields.io/badge/Python-3.11%2B-3776ab?logo=python&logoColor=fff)
![No Dependencies](https://img.shields.io/badge/dependencies-zero-success)
![Playwright Tests](https://img.shields.io/badge/tested%20with-Playwright-45ba4b?logo=playwright)
![Code Style: Biome](https://img.shields.io/badge/code%20style-Biome-60a5fa?logo=biome&logoColor=fff)
![Python: Ruff](https://img.shields.io/badge/python-Ruff-261230?logo=ruff&logoColor=fff)
![WCAG 2.1 AA](https://img.shields.io/badge/WCAG-2.1%20AA-blue)

<!-- [![Repo Size](https://img.shields.io/github/repo-size/luisfork/light)](https://github.com/luisfork/light) -->
<!-- ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=fff) -->

---

## Why *Light*?

<!-- The following is correctly formatted Markdown. Ignore warnings. -->

Many Texans overpay between **$816**[^1] and **$1,072**[^2] annually by selecting electricity plans with deceptive structures—such as *"bill credits"* or *"free nights"*—that are engineered to appear cheapest at the 1,000 kWh benchmark while charging significantly higher rates for actual household usage[^3]. This financial burden is compounded by the *"summer renewal trap,"* where consumers inadvertently renew contracts during peak-price months; academic research indicates that nearly 45% of Texans now face monthly bills exceeding $200 during the summer due to market volatility and complex plan terms[^4].

<!-- The following is correctly formatted Markdown. Ignore warnings. -->

[^1]: EnergyBot. "The Truth About Texas Bill Credit Electricity Plans." *EnergyBot*, 15 Jan. 2025, [www.energybot.com/blog/bill-credit-electricity-plans.html](https://www.energybot.com/blog/bill-credit-electricity-plans.html).

[^2]: EnergyBot. "The Truth About Texas Free Nights Electricity Plans." *EnergyBot*, 20 Jan. 2025, [www.energybot.com/blog/truth-about-texas-free-nights-electricity-plans.html](https://www.energybot.com/blog/truth-about-texas-free-nights-electricity-plans.html).

[^3]: EnergyBot. "Texas Electricity Plan Study." *EnergyBot*, Jan. 2025, [www.energybot.com/electricity-plan-study.html](https://www.energybot.com/electricity-plan-study.html).

[^4]: Hobby School of Public Affairs and Barbara Jordan-Mickey Leland School of Public Affairs. *Texas Trends 2025: Energy*. University of Houston and Texas Southern University, 2025, [www.uh.edu/hobby/txtrends/2025](https://www.uh.edu/hobby/txtrends/2025/).

*Light* calculates true costs by:

- **Including ALL fees**: Energy charges, TDU delivery, base fees, and taxes
- **Accounting for seasonal usage**: Texas summers use 40-80% more electricity than shoulder months
- **Revealing bill credit traps**: Shows how many months you'll miss those credits
- **Ranking by annual cost**: Not misleading "advertised rates"
- **Analyzing contract expiration timing**: Warns when renewals fall during expensive peak seasons
- **Properly calculating early termination fees (ETF)**: Accounts for per-month-remaining ETF structures

**Core Principle:** Empowering Texans to make informed electricity decisions by calculating true monthly and annual costs based on actual usage patterns and optimal contract timing.

---

## Updates

### Deduplication System

- **Numeric-Only Fingerprinting**: Simplified from 13 fields to 11 fields by removing complex text extraction
- **Removed 100+ Lines of Code**: Eliminated fragile keyword matching and bilingual text parsing
- **Data-Driven Simplification**: Analysis of 986 plans confirmed that plans with identical numeric features always have identical substantive terms
- **Language-Agnostic**: Automatic language independence (no keyword dictionaries to maintain)
- **11-Field Fingerprint**: Provider, TDU area, rate type, prices (3 tiers), term, ETF, base charge, renewable %, prepaid flag, TOU flag
- **Same Accuracy**: 100% duplicate detection maintained with significantly simpler approach
- **Orphaned Plan Detection**: Identifies and tracks plans that only exist in one language
- **Transparency UI**: Enhanced statistics showing "988 unique plans (1,854 total, 866 duplicates removed)"
- **Detailed Modal**: Clickable info button explains numeric-only fingerprinting rationale

### UI/UX Enhancements

- **Improved Accessibility**: Enhanced text contrast for WCAG 2.1 AA compliance (5.74:1 and 4.54:1 ratios)
- **Better Visualization**: Redesigned usage chart with 75% taller bars, month labels, and heat-map color coding (red=high, orange=medium-high, yellow=medium, blue=low)
- **Polished Components**: Upgraded grade badges with gradients, enhanced dropdown styling, and improved TIME OF USE warning badges
- **Cleaner Layout**: Moved ZIP validation indicator horizontal, removed redundant "Plans Requiring Caution" section
- **Fixed Precision**: Annual usage now displays exactly 12,000 kWh (was 11,999 kWh due to rounding)

### Functional Improvements

- **Smarter Ranking**: F-grade plans (0/100 quality) now properly rank below acceptable plans regardless of cost
- **Better ETF Detection**: Enhanced cancelation fee pattern matching for phrases like "multiplied by months remaining"
- **Consistent Display**: All contract lengths now show as "months" instead of abbreviated "mo" with proper spacing

---

## Features

### For Users

- **ZIP Code Detection**: Automatically identifies your TDU service area
- **Regulated Area Detection**: Warns if your ZIP code is outside deregulated markets
- **Three Usage Input Methods**
  - Quick estimate by home size
  - Average monthly usage
  - Detailed 12-month pattern for maximum accuracy
- **Accurate Cost Calculation**: Includes energy, TDU delivery, base charges, and ZIP-based local taxes
- **Contract Expiration Analysis**: Identifies when contracts expire during expensive renewal periods and suggests optimal contract lengths
- **Gimmick Detection**: Identifies and warns about bill credit traps and time-of-use plans
- **Provider Name Formatting**: All provider names displayed in clean, professional uppercase format
- **Early Termination Fee (ETF) Calculation**: Properly handles per-month-remaining early termination fees (ETF)
- **Duplicate Plan Detection**: Simple numeric fingerprinting automatically removes duplicate English/Spanish versions (11 objective fields, no text parsing)
- **Quality Scoring System**: 0-100 scoring with penalties and bonuses for plan features, transparent score breakdowns on hover
- **Best Value Indicators**: Visual highlighting of lowest cost, best rate, and highest quality plans in comparison table
- **Interactive Grade Legend**: Expanded grade guide with descriptions explaining what each grade means
- **100% Free & Unbiased**: No commissions, no ads, no hidden costs

### Technical

- **Static Site**: Hosting via GitHub Pages
- **Daily Data Updates**: GitHub Actions automatically fetches latest plans at 2 AM CT
- **Historical Data Storage**: Maintains unlimited archive of plan data in `data/json-archive/` and `data/csv-archive/` for trend analysis
- **Transparent Calculations**: All formulas visible in open-source code
- **Fast Performance**: Pre-fetched data, no external API calls during use
- **Cross-Browser Compatible**: Works on all modern browsers and platforms

---

## Implementation Details

### Cost Calculation Algorithm

*Light* calculates your true annual electricity cost using this algorithm:

```javascript
// For each month of the year:
1. Interpolate energy rate based on your usage (500/1000/2000 kWh tiers)
2. Add TDU delivery charges (base + per-kWh)
3. Add REP base charge
4. Subtract bill credits (only if you qualify that month)
5. Add local sales tax
6. Sum all 12 months for annual cost

// Then calculate combined score (Multiplicative Value Model):
- Cost score: 100 for lowest cost, scaled down for higher costs
- Quality score: 0-100 based on volatility, renewal timing, fee structure
- Combined score = Cost Score × (Quality Score / 100)
- This ensures that a plan must have BOTH a competitive price AND high quality to rank well.
- Cheap but risky plans (bad renewal timing, volatile rates) are heavily discounted.
```

### Seasonal Usage Estimation

We apply Texas-specific seasonal multipliers based on real consumption patterns:

- **Summer (Jun-Sep):** 1.4-1.8x baseline (peak AC usage)
- **Winter (Dec-Feb):** 1.1-1.3x baseline (heating)
- **Shoulder (Mar-May, Oct-Nov):** 0.95-1.0x baseline

This reflects real Texas usage patterns where summer AC dominates annual consumption.

### Contract Expiration Timing Analysis

*Light* now analyzes when your electricity contract will expire and warns if renewal falls during expensive months:

- **Best renewal months:** April, May, October, November (rates typically 15-25% lower)
- **Worst renewal months:** July, August, January (peak demand = highest rates)
- **Recommendations:** Suggests alternative contract lengths to shift renewal to optimal months

Example: A 12-month contract starting in July expires in July (expensive). *Light* recommends a 9-month or 15-month contract to shift expiration to April or October.

### Early Termination Fee (ETF) Calculation

Many plans charge $10-20 per month remaining instead of flat fees. *Light* properly calculates:

```javascript
// Per-month-remaining ETF (common for 12-36 month contracts):
Total ETF = Base Fee × Months Remaining

// Example: $15/month ETF with 18 months remaining = $270
// (not $15 flat fee as it might appear)
```

### Provider Name Formatting

All provider names are displayed in professional uppercase format with legal suffixes removed:

- Original: "TXU Energy Retail Company LLC"
- Displayed: "TXU ENERGY"

This ensures consistent, professional presentation across all plans.

---

## Data Sources

### Electricity Plans

- **Source:** Power to Choose (official PUCT platform)
- **API Endpoint:** `http://api.powertochoose.org/api/PowerToChoose/plans`
- **Update Frequency:** Daily at 2 AM Central Time
- **Coverage:** All deregulated Texas markets *(Oncor, CenterPoint, AEP Central, AEP North, TNMP, Lubbock P&L)*

#### Power to Choose API Details

The official Public Utility Commission of Texas (PUCT) Power to Choose platform provides public API access:

**Base URL:** `http://api.powertochoose.org/`

**Primary Endpoints:**

```bash
GET/POST /api/PowerToChoose/plans
  Returns: Array of electricity plans with full details
  Parameters:
    - zip_code (optional): Filter by ZIP code
    - language (optional): en-us or es-mx

GET/POST /api/PowerToChoose/plans/count
  Returns: Total number of active plans

GET/POST /api/PowerToChoose/plans/types
  Returns: Available plan types (Fixed, Variable, Indexed, etc.)

CSV Export: http://www.powertochoose.org/en-us/Plan/ExportToCsv
  Downloads: Complete plan database as CSV
```

**Available Data Fields:**

- Plan ID, REP name, Product name
- TDU service area
- Pricing at 500/1000/2000 kWh (includes TDU charges)
- Contract term length
- Rate type (Fixed, Variable, Indexed)
- Renewable energy percentage
- Prepaid/Time-of-use indicators
- Early termination fee (ETF)
- EFL (Electricity Facts Label) URL
- Enrollment URL
- Promotional details and special terms

**Important Notes:**

- REPs directly submit plan information (PUCT does not independently verify)
- Each REP limited to 5 plans on platform
- Prices shown include TDU delivery charges (all-inclusive per PUCT rules)
- Data refreshed frequently; recommend daily fetching
- No authentication required for public endpoints

**Our Implementation:**

- Fetch via CSV export endpoint (most reliable)
- Fallback to JSON API if CSV unavailable
- Retry logic with exponential backoff
- Data validation and deduplication
- Provider name formatting applied post-fetch

### TDU Delivery Rates

- **Source:** PUCT tariff filings and TDU official websites
- **Update Schedule:** Rates change March 1 and September 1 annually
- **Current Rates (January 2026):**

| TDU | Monthly Base | Per-kWh Rate | Effective Date |
| --- | --- | --- | --- |
| CenterPoint Energy | $4.90 | 6.0009¢ | Dec 7, 2025 |
| Oncor Electric Delivery | $4.23 | 5.5833¢ | Sep 1, 2025 |
| AEP Texas Central | $5.49 | 5.6954¢ | Sep 1, 2025 |
| AEP Texas North | $5.49 | 5.2971¢ | Sep 1, 2025 |
| Texas-New Mexico Power | $7.85 | 6.0509¢ | Sep 1, 2025 |
| Lubbock Power & Light | $0.00 | 6.31¢ | Sep 1, 2025 |

**Implementation:** TDU rates stored in `data/tdu-rates.json` and updated manually when PUCT approves rate changes.

### Local Tax Rates

- **Source:** Texas Comptroller data
- **Coverage:** City and county sales tax on residential electricity
- **Implementation:** ZIP code mapping to local tax rates in `data/local-taxes.json`

### Historical Data Archive

*Light* maintains a growing archive of electricity plan data for trend analysis and research.

#### JSON Archive

- **Location:** `data/json-archive/` directory
- **Format:** Timestamped JSON files (`plans_YYYY-MM-DD.json`)
- **Retention:** Unlimited (growing archive of all historical snapshots)
- **Purpose:** Programmatic access, trend analysis, data integrity verification

#### CSV Archive

- **Location:** `data/csv-archive/` directory
- **Format:** Timestamped CSV files (`plans_YYYY-MM-DD.csv`)
- **Retention:** Unlimited (daily snapshots)
- **Purpose:** Easy analysis in Excel, Google Sheets, or data science tools

**CSV Columns:**

```bash
plan_id, plan_name, rep_name, tdu_area, rate_type,
term_months, price_kwh_500, price_kwh_1000, price_kwh_2000,
base_charge_monthly, early_termination_fee, renewable_pct,
is_prepaid, is_tou, special_terms, promotion_details,
fees_credits, min_usage_fees, language, efl_url, enrollment_url, terms_url
```

**Accessing Historical Data:**

```javascript
// Load historical plan data from specific date (JavaScript)
const historicalData = await fetch('/data/json-archive/plans_2025-12-01.json');
const plans = await historicalData.json();

// Compare current vs historical rates
const current = await API.loadPlans();
console.log(`Plan count: ${plans.total_plans} → ${current.total_plans}`);
```

```python
# Load CSV archive for analysis (Python)
import pandas as pd
****
# Load specific date
df = pd.read_csv('data/csv-archive/plans_2026-01-01.csv')

# Compare rates over time
from pathlib import Path
csv_files = sorted(Path('data/csv-archive').glob('plans_*.csv'))
for f in csv_files[-5:]:  # Last 5 days
    df = pd.read_csv(f)
    avg_rate = df['price_kwh_1000'].mean()
    print(f"{f.stem}: avg rate = {avg_rate:.2f}¢/kWh")
```

**Use Cases:**

- Track rate changes over time
- Identify seasonal pricing patterns
- Research provider pricing strategies
- Build predictive models for rate forecasting
- Verify data integrity across updates

---

## Project Structure

```bash
light/
├── .github/
│   └── workflows/
│       ├── deploy.yml           # GitHub Pages deployment automation
│       ├── lint.yml             # Code linting (Ruff, Biome)
│       └── update-plans.yml     # Daily data updates + historical archival
├── data/
│   ├── plans.json               # Current electricity plans (updated daily)
│   ├── tdu-rates.json           # TDU delivery charges (updated Mar/Sep)
│   ├── local-taxes.json         # Texas local tax rates
│   ├── json-archive/            # Unlimited archive of historical plan snapshots (JSON)
│   └── csv-archive/             # Daily CSV exports of plan data
├── docs/                        # Comprehensive technical documentation
│   ├── api-response-schema.md   # API response formats and data structures
│   ├── calculation-algorithm.md # Detailed algorithm walkthrough
│   ├── contract-expiration.md   # Contract timing analysis documentation
│   ├── data-schema-plans.md     # plans.json structure specification
│   ├── data_formats.md          # CSV/JSON format specifications
│   ├── design-philosophy.md     # Design system, spring animations, accessibility
│   ├── research.md              # Texas electricity market research
│   └── tdu-service-areas.md     # TDU coverage mapping and rates
├── src/
│   ├── assets/
│   │   └── fonts/
│   │       ├── san_francisco/   # SF Pro, SF Compact, SF Mono fonts
│   │       └── new_york/        # New York serif fonts
│   ├── index.html               # Main application
│   ├── css/
│   │   ├── fonts.css            # @font-face declarations
│   │   └── styles.css           # Professional design system
│   └── js/
│       ├── modules/             # Modular JavaScript components
│       │   ├── cache.js               # Cache management with TTL
│       │   ├── data-loader.js         # Fetch with retry and timeout
│       │   ├── tax-lookup.js          # ZIP code to tax rate mapping
│       │   ├── provider-formatter.js  # Provider name cleanup
│       │   ├── formatters.js          # Currency and rate formatting
│       │   ├── usage-estimator.js     # Seasonal usage pattern Estimation
│       │   ├── cost-calculator.js     # Monthly/Annual cost calculations
│       │   ├── contract-analyzer.js   # Contract expiration timing analysis
│       │   ├── etf-calculator.js      # Early termination fee (ETF) calculations
│       │   └── plan-ranker.js         # Plan ranking with quality scoring
│       ├── api.js               # Data loading API facade (includes numeric-only deduplication)
│       ├── calculator.js        # Main calculator facade
│       └── ui.js                # User interface logic
├── scripts/
│   ├── fetch_plans.py           # Fetch from Power to Choose API
│   ├── fetch_tdu_rates.py       # TDU rate management
│   └── archive_to_csv.py        # Archive plans.json to CSV format
├── biome.json                   # Biome linter configuration (JS/JSON)
├── pyproject.toml               # Python deps + Ruff linter config
├── README.md                    # This file (hello!)
└── LICENSE                      # MIT License
```

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ (optional, bun preferred)
- `uv` package manager (or pip)
- `bun` (preferred) or `npm`

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/luisfork/light.git
   cd light
   ```

2. **Install Python dependencies**

   ```bash
   # Using uv (recommended):
   uv pip install --system requests beautifulsoup4 lxml

   # Or using pip:
   pip install requests beautifulsoup4 lxml
   ```

3. **Populate test data**

   The app requires plan data in `data/plans.json`. Generate it from cached test CSV:

   ```bash
   # Generate from cached Power to Choose CSV (recommended for local dev)
   TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py
   ```

4. **Install JavaScript dependencies**

   ```bash
   bun install
   bunx playwright install --with-deps chromium
   ```

5. **Serve locally**

   ```bash
   # Start local server (from project root)
   python -m http.server 8000

   # Open http://localhost:8000/src/ in your browser
   ```

> [!IMPORTANT]
> Opening `index.html` directly via `file://` **will not work** due to browser CORS restrictions.
> You must use a local HTTP server.

### Automated Testing

*Light* uses **node:test** (via Bun) for unit tests and **Playwright** for robust UI testing. This ensures that core calculation logic, cost formatting, and critical UI components remain stable after code changes.

> [!NOTE]
> Testing is performed against a real browser engine (Chromium) but remains decoupled from the production code, which stays **100% *Vanilla* JavaScript**.

```bash
# Run unit tests
bun test tests/unit

# Run all UI tests (headless)
bunx playwright test

# Run tests and show report on failure
bunx playwright test --reporter=html

# Debug tests (shows browser window)
bunx playwright test --debug
```

Test specifications are located in `tests/ui/` and configuration in `playwright.config.js`.

### Fetching Data

```bash
# For local development: Use cached test CSV
TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py

# For production/fresh data: Fetch from Power to Choose API
uv run python scripts/fetch_plans.py

# Manually update TDU rates (when PUCT publishes changes)
uv run python scripts/fetch_tdu_rates.py
```

> [!NOTE]
> The `TEST_FILE` environment variable controls the data source:
>
> - **Set**: Uses the specified local CSV file (fast, offline-capable)
> - **Not set**: Fetches fresh data from Power to Choose API

### GitHub Actions Workflows

**Daily Data Updates** (`update-plans.yml`):

- Runs at 2 AM Central Time (7 AM UTC)
- Archives current plans to `data/json-archive/` (unlimited retention)
- Archives CSV to `data/csv-archive/` (daily snapshot with columns)
- Verifies archive integrity (JSON validation, CSV line count)
- Fetches latest plans from Power to Choose API
- Removes duplicate English/Spanish plan versions using simple numeric-only fingerprinting (11 fields)
- Commits and pushes if changes detected
- Triggers deployment workflow

**Deployment** (`deploy.yml`):

- Triggered on push to `main` branch
- Triggered after successful data update
- Builds site and deploys to GitHub Pages

**Linting** (`lint.yml`):

- Runs on pull requests and pushes to main
- Biome for JavaScript/JSON linting and formatting
- Ruff for Python linting and formatting
- djlint for HTML linting (configured via `.djlintrc`)
- actionlint for GitHub Actions workflow validation
- Comprehensive error handling with continue-on-error and summary reporting

---

## Key Technical Innovations

### 1. Contract Expiration Timing Analysis

Based on research showing Texans often renew during expensive months, *Light* implements sophisticated timing analysis:

- Calculates exact contract expiration date
- Scores renewal month seasonality (0.0 = best, 1.0 = worst)
- Identifies peak season expirations (July/August/January)
- Suggests 2-3 alternative contract lengths for optimal timing
- Warns users proactively about expensive renewal periods

**Algorithm:**

```javascript
Renewal Seasonality Scores:
- April, October: 0.0 (best)
- May, November: 0.1-0.2 (excellent)
- July, August, January: 1.0 (worst)

If expiration score ≥ 0.8: "High Risk" warning
  → Suggest alternative terms shifting to score < 0.5
```

### 2. Early Termination Fee (ETF) Calculation with Verification

Many comparison tools incorrectly display per-month ETFs as flat fees. *Light* properly calculates ETFs and alerts users when verification is needed:

```javascript
detectETFStructure(plan):
  // Detection with multiple regex patterns
  if special_terms matches "per month remaining|multiplied by|for each month":
    return "per-month-remaining"
  if fee ≤ $50 AND term ≥ 12 months:
    return "per-month-remaining"
  else:
    return "flat"

calculateETF(plan, monthsRemaining):
  if structure == "per-month-remaining":
    return baseFee × monthsRemaining
  else:
    return baseFee
```

**User Verification Feature:** When ETF structure is automatically detected (not explicitly stated), *Light* displays an info icon that opens a verification modal reminding users to check the official Electricity Facts Label (EFL), Terms of Service (TOS), and "Your Rights as a Customer" documents for exact cancellation terms.

### 3. Quality Scoring System

Plans are ranked by a combined score: **85% cost efficiency + 15% quality factors**.

```javascript
calculateCombinedScore(plan, bestCost, worstCost):
  // Cost score (0-100, lower cost = higher score)
  costScore = 100 - ((plan.annualCost - bestCost) / (worstCost - bestCost)) * 100

  // Quality score (0-100, based on plan features)
  qualityScore = calculateQualityScore(plan)

  // Combined: 85% cost, 15% quality
  return (costScore * 0.85) + (qualityScore * 0.15)
```

**Quality Score Components:**

The quality score (0-100) is calculated from multiple factors:

| Factor | Max Impact | Description |
| --- | --- | --- |
| Base Score | 100 | Starting point for all fixed-rate plans |
| Cost Penalty | -40 | Deducted for plans more expensive than best |
| Expiration Seasonality | -30 | Deducted for plans expiring in peak Summer/Winter months |
| Volatility Penalty | -25 | Deducted for unpredictable costs |
| Warning Penalty | -25 | Deducted for risk factors (5 per warning) |
| Base Charge Penalty | -5 | Deducted for high monthly fees (>$15) |

**Automatic F Grade (Score = 0):**

- Non-fixed rate plans (VARIABLE, INDEXED): Price can change unpredictably
- Prepaid plans: Require upfront payment and credit monitoring
- Time-of-use plans: Rates vary by time of day, impractical for most users

**Quality Grades:**

| Score | Grade | Description | Meaning |
| --- | --- | --- | --- |
| 90-100 | A | Excellent | Top-tier plan with competitive pricing, stable rates |
| 80-89 | B | Good | Good overall value with reasonable pricing |
| 70-79 | C | Acceptable | Moderate value; review details carefully |
| 60-69 | D | Caution | Below-average with notable drawbacks |
| 0-59 | F | Avoid | High risk or variable rates |

> [!TIP]
> **Score Transparency:** Hover over any quality grade to see a detailed breakdown of how the score was calculated (e.g., "Base: 100 | Cost: -5 | Consistent rates: +5").

**Table Features:**

- Click any column header to sort (Grade, Provider, Plan, Term, Contract Ends, Annual Cost, Monthly Cost, Rate, Renewable %, Cancel Fee)
- "Contract Ends" column shows expiration date and warns about high-risk renewal months (for July/August/January)
- Best values highlighted in green (lowest cost, lowest rate, best quality)
- "Lowest" indicator badge on the most affordable plan
- Tooltips on column headers explaining each metric

> [!NOTE]
> **Warning Badges:** Plans with non-fixed rates, prepaid requirements, or time-of-use restrictions display warning badges (VARIABLE, PREPAID, TIME OF USE) and automatically receive an F grade.

### 4. Simplified Duplicate Plan Detection

Automatically identifies and removes duplicate English/Spanish plan versions using simple, robust numeric-only fingerprinting:

```javascript
deduplicatePlans(plans):
  1. Create fingerprint from 11 objective fields:
     - Identifiers: rep_name, tdu_area, rate_type
     - Prices: p500, p1000, p2000 (rounded to 3 decimals)
     - Fees: term_months, etf, base_charge (fees rounded to 2 decimals)
     - Flags: renewable_pct, prepaid (boolean), tou (boolean)
  2. Detect duplicates with identical fingerprints
  3. Track language pairs vs. orphaned plans:
     - Language pairs: Plans with both English and Spanish versions
     - English-only: Plans offered only in English (no Spanish equivalent)
     - Spanish-only: Plans offered only in Spanish (no English equivalent)
  4. Prefer English version using weighted scoring:
     - Explicit language field: +50 for English, -50 for Spanish
     - Spanish characters (ñ, á, é, í, ó, ú): -10 to -20 points
     - Name length: Shorter preferred (English typically more concise)
  5. Mark Spanish-only plans with is_spanish_only flag for UI display
  6. Remove duplicates, keep one version per unique plan

  return {
    deduplicated,
    duplicateCount,
    orphanedEnglishCount,
    orphanedSpanishCount
  }
```

**Why Numeric-Only?**

Analysis of 986 plans confirms that plans with identical numeric features (prices, fees, term) always have identical substantive terms. Text extraction (bill credits, special features) adds significant complexity without improving accuracy. If two plans have the same numbers, they ARE duplicates—regardless of marketing text.

**Simplification Benefits:**

- ✓ **100+ lines removed**: Eliminated fragile text parsing and keyword matching
- ✓ **Language-agnostic**: No bilingual dictionaries to maintain
- ✓ **Robust**: Numbers don't change with marketing phrases or translations
- ✓ **Same accuracy**: 100% duplicate detection maintained

**Example from real data (1,854 total plans):**

- 866 duplicates removed (433 language pairs)
- 97 English-only plans (no Spanish version exists)
- 25 Spanish-only plans (no English version exists)
- Result: 988 unique plans displayed

**Transparency Features:**

- UI displays: "988 unique plans (1,854 total, 866 duplicates removed)"
- Spanish-only plans show blue `SPANISH ONLY` badge with tooltip
- Clickable info button opens detailed modal explaining numeric-only approach
- Console logging: "Language distribution: 97 English-only, 25 Spanish-only, 866 language pairs"

**Correct Detection Examples:**

```javascript
// DUPLICATES (same numeric fingerprint, English kept):
"Truly Simple 12" vs "Verdaderamente Simple 12"
  → Same prices (15.0¢, 14.5¢, 14.0¢), term (12 months), fees ($150 ETF)
  → System keeps English version

// NOT DUPLICATES (different numeric fingerprint, both kept):
"Better Rate 12" (15.0¢) vs "Mejor Tarifa 12" (13.1¢)
  → Different pricing despite similar names
  → Both plans unique and displayed
```

### 5. Provider Name Formatting

Ensures professional, consistent display:

```javascript
formatProviderName(name):
  1. Convert to uppercase
  2. Remove trailing: LLC, INC, LP, & CO, (TX), (TEXAS), COMPANY, RETAIL, SERVICES
  3. Trim whitespace and punctuation

Example: "Reliant Energy Retail Services, LLC" → "RELIANT ENERGY"
```

### 6. Historical Data Tracking

Unlike competitors, *Light* maintains unlimited historical archive:

- Daily snapshots before data refresh (JSON and CSV formats)
- Enables rate trend analysis and market research
- Verifies data integrity across updates
- Supports data science workflows and predictive modeling
- Archive integrity verification ensures valid JSON and non-empty CSV files

---

## Design Philosophy

### Professional Aesthetic

- **NO emojis**: Professional text-only communication
- **NO bento grids**: Clear, hierarchical layout
- **NO shadcn/ui aesthetic**: Custom Apple-inspired design system
- **NO animations except spring physics**: All transitions use spring-based cubic-bezier timing functions
- **Sophisticated neutral palette**: Ink grays, ambient light effects
- **Typography-focused**: Complete Apple font ecosystem with precise usage guidelines
  - **SF Pro**: Primary UI text and body copy (font-weight: 400-700)
  - **SF Pro Display**: Large headings ≥20px with optical sizing
  - **SF Mono**: All numeric and tabular data for superior legibility and alignment
  - **SF Compact**: Table headers and mobile-responsive dense layouts
  - **New York**: Editorial headings and serif accent text
  - **New York Large**: Hero section display headings ≥32px
- **Functional depth**: Rich calculations, transparent methodology

> [!TIP]
> See [**design philosophy**](docs/design-philosophy.md) for comprehensive design guidelines, animation specifications, and implementation checklist.

### Performance

- **Static architecture**: Zero backend, instant loading
- **Pre-fetched data**: No API calls during use
- **Minimal dependencies**: Vanilla JavaScript, custom CSS
- **Optimized caching**: 5-minute browser cache with retry logic

### Accessibility

- WCAG 2.1 AA compliant
- Semantic HTML5 structure
- ARIA labels and landmarks
- Keyboard navigation support
- Color contrast ratios > 4.5:1

---

## License

MIT License - See LICENSE file for details

---

## Acknowledgments

- **Power to Choose**: Official PUCT data source
- **Texas Public Utility Commission**: Regulatory oversight and consumer protection

---

## Contact

For questions, issues, or suggestions:

- **GitHub Issues:** <https://github.com/luisfork/light/issues>
- **Pull Requests:** <https://github.com/luisfork/light/pulls>

---

![Data Updates](https://img.shields.io/badge/data-daily%20updates-brightgreen)
![Power to Choose](https://img.shields.io/badge/data%20source-Power%20to%20Choose-blue)
[![Deploy]****(https://github.com/luisfork/light/actions/workflows/deploy.yml/badge.svg)](https://github.com/luisfork/light/actions/workflows/deploy.yml)
[![Update Plans](https://github.com/luisfork/light/actions/workflows/update-plans.yml/badge.svg)](https://github.com/luisfork/light/actions/workflows/update-plans.yml)
[![Lint](https://github.com/luisfork/light/actions/workflows/lint.yml/badge.svg)](https://github.com/luisfork/light/actions/workflows/lint.yml)

**Last Updated**: January 2026
