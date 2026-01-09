# Light - Texas Electricity Plan Finder

**Find the best and most affordable Texas electricity plan. Free, unbiased, and accurate.**

Light is a high-performance static web application that helps Texans find the best electricity plan by calculating true annual costs based on actual usage patterns, seasonal variations, and contract expiration timing—not deceptive advertised rates.

Live Site: <https://luisfork.github.io/light/> (deployed automatically via GitHub Actions)

---

## Why Light?

Most Texans overpay $816-$1,072 annually (EnergyBot 2025 study) by choosing plans with deceptive bill credits that look cheap at 1,000 kWh but cost dramatically more throughout the year. Additionally, many users inadvertently renew contracts during expensive summer months, compounding long-term costs.

Light calculates true costs by:

- **Including ALL fees** - Energy charges, TDU delivery, base fees, and taxes
- **Accounting for seasonal usage** - Texas summers use 40-80% more electricity than shoulder months
- **Revealing bill credit traps** - Shows how many months you'll miss those credits
- **Ranking by annual cost** - Not misleading "advertised rates"
- **Analyzing contract expiration timing** - Warns when renewals fall during expensive peak seasons
- **Properly calculating early termination fees** - Accounts for per-month-remaining ETF structures

**Core Principle:** Empowering Texans to make informed electricity decisions by calculating true monthly and annual costs based on actual usage patterns and optimal contract timing.

---

## Features

### For Users

- **ZIP Code Detection** - Automatically identifies your TDU service area
- **Three Usage Input Methods**
  - Quick estimate by home size
  - Average monthly usage
  - Detailed 12-month pattern for maximum accuracy
- **Accurate Cost Calculation** - Includes energy, TDU delivery, base charges, and local taxes
- **Contract Expiration Analysis** - NEW: Identifies when contracts expire during expensive renewal periods and suggests optimal contract lengths
- **Gimmick Detection** - Identifies and warns about bill credit traps and time-of-use plans
- **Provider Name Formatting** - All provider names displayed in clean, professional uppercase format
- **Enhanced ETF Calculation** - Properly handles per-month-remaining early termination fees
- **Duplicate Plan Detection** - Automatically removes duplicate English/Spanish versions of same plan
- **Quality Scoring System** - NEW: 0-100 scoring system with penalties for bad plan features
- **Clean, Professional UI** - Beautiful design, mobile-first, accessible, NO emojis, NO bento grids
- **100% Free & Unbiased** - No commissions, no ads, no hidden costs

### Technical

- **Static Site** - Zero hosting cost via GitHub Pages
- **Daily Data Updates** - GitHub Actions automatically fetches latest plans at 2 AM CT
- **Historical Data Storage** - Maintains unlimited archive of plan data in `data/historical/` for trend analysis
- **Transparent Calculations** - All formulas visible in open-source code
- **Fast Performance** - Pre-fetched data, no external API calls during use
- **Cross-Browser Compatible** - Works on all modern browsers and platforms

---

## How It Works

### Cost Calculation Algorithm

Light calculates your true annual electricity cost using this algorithm:

```javascript
// For each month of the year:
1. Interpolate energy rate based on your usage (500/1000/2000 kWh tiers)
2. Add TDU delivery charges (base + per-kWh)
3. Add REP base charge
4. Subtract bill credits (only if you qualify that month)
5. Add local sales tax
6. Sum all 12 months for annual cost

// Then rank plans by:
- Annual cost (lowest first)
- Quality score (0-100, considering cost, volatility, warnings, features)
- Volatility score (simpler plans preferred)
- Contract expiration timing (avoiding expensive renewal periods)
```

### Seasonal Usage Estimation

We apply Texas-specific seasonal multipliers based on real consumption patterns:

- **Summer (Jun-Sep):** 1.4-1.8x baseline (peak AC usage)
- **Winter (Dec-Feb):** 1.1-1.3x baseline (heating)
- **Shoulder (Mar-May, Oct-Nov):** 0.95-1.0x baseline

This reflects real Texas usage patterns where summer AC dominates annual consumption.

### Contract Expiration Timing Analysis

Light now analyzes when your electricity contract will expire and warns if renewal falls during expensive months:

- **Best renewal months:** April, May, October, November (rates typically 15-25% lower)
- **Worst renewal months:** July, August, January (peak demand = highest rates)
- **Recommendations:** Suggests alternative contract lengths to shift renewal to optimal months

Example: A 12-month contract starting in July expires in July (expensive). Light recommends a 9-month or 15-month contract to shift expiration to April or October.

### Early Termination Fee Calculation (ENHANCED)

Many plans charge $10-20 per month remaining instead of flat fees. Light properly calculates:

```javascript
// Per-month-remaining ETF (common for 12-36 month contracts):
Total ETF = Base Fee × Months Remaining

// Example: $15/month ETF with 18 months remaining = $270
// (not $15 flat fee as it might appear)
```

### Provider Name Formatting

All provider names are displayed in professional uppercase format with legal suffixes removed:

- Original: "TXU Energy Retail Company LLC"
- Displayed: "TXU ENERGY RETAIL"

This ensures consistent, professional presentation across all plans.

---

## Data Sources

### Electricity Plans

**Source:** Power to Choose (official PUCT platform)
**API Endpoint:** `http://api.powertochoose.org/api/PowerToChoose/plans`
**Update Frequency:** Daily at 2 AM Central Time
**Coverage:** All deregulated Texas markets (Oncor, CenterPoint, AEP Central, AEP North, TNMP, Lubbock P&L)

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
- Early termination fee
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

**Source:** PUCT tariff filings and TDU official websites
**Update Schedule:** Rates change March 1 and September 1 annually
**Current Rates (as of January 2026):**

| TDU | Monthly Base | Per-kWh Rate | Effective Date |
| --- | ------------ | ------------ | -------------- |
| CenterPoint Energy Houston | $4.90 | 6.0009¢ | Dec 7, 2025 |
| Oncor Electric Delivery | $4.23 | 5.5833¢ | Sep 1, 2025 |
| AEP Texas Central | $5.49 | 5.6954¢ | Sep 1, 2025 |
| AEP Texas North | $5.49 | 5.2971¢ | Sep 1, 2025 |
| Texas-New Mexico Power | $7.85 | 6.0509¢ | Sep 1, 2025 |
| Lubbock Power & Light | $0.00 | 6.31¢ | Sep 1, 2025 |

**Implementation:** TDU rates stored in `data/tdu-rates.json` and updated manually when PUCT approves rate changes.

### Local Tax Rates

**Source:** Texas Comptroller data
**Coverage:** City and county sales tax on residential electricity
**Implementation:** ZIP code mapping to local tax rates in `data/local-taxes.json`

### Historical Data Archive

Light maintains a growing archive of electricity plan data for trend analysis and research.

#### JSON Archive

- **Location:** `data/historical/` directory
- **Format:** Timestamped JSON files (`plans_YYYY-MM-DD.json`)
- **Retention:** Unlimited (growing archive of all historical snapshots)
- **Purpose:** Programmatic access, trend analysis, data integrity verification

#### CSV Archive

- **Location:** `data/archive-csv/` directory
- **Format:** Timestamped CSV files (`plans_YYYY-MM-DD.csv`)
- **Retention:** Unlimited (daily snapshots)
- **Purpose:** Easy analysis in Excel, Google Sheets, or data science tools

**CSV Columns:**

```bash
plan_id, plan_name, rep_name, tdu_area, rate_type,
term_months, price_kwh_500, price_kwh_1000, price_kwh_2000,
base_charge_monthly, early_termination_fee, renewable_pct,
is_prepaid, is_tou, special_terms, efl_url, enrollment_url
```

**Accessing Historical Data:**

```javascript
// Load historical plan data from specific date (JavaScript)
const historicalData = await fetch('/data/historical/plans_2025-12-01.json');
const plans = await historicalData.json();

// Compare current vs historical rates
const current = await API.loadPlans();
console.log(`Plan count: ${plans.total_plans} → ${current.total_plans}`);
```

```python
# Load CSV archive for analysis (Python)
import pandas as pd

# Load specific date
df = pd.read_csv('data/archive-csv/plans_2026-01-01.csv')

# Compare rates over time
from pathlib import Path
csv_files = sorted(Path('data/archive-csv').glob('plans_*.csv'))
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
│       └── update-plans.yml     # Daily data updates + historical archival
├── data/
│   ├── plans.json               # Current electricity plans (updated daily)
│   ├── tdu-rates.json           # TDU delivery charges (updated Mar/Sep)
│   ├── local-taxes.json         # Texas local tax rates
│   └── historical/              # Unlimited archive of historical plan snapshots
├── docs/                        # Comprehensive technical documentation
│   ├── api-response-schema.md   # API response formats and data structures
│   ├── calculation-algorithm.md # Detailed algorithm walkthrough
│   ├── tdu-service-areas.md     # TDU coverage mapping and rates
│   └── data-schema-plans.md     # plans.json structure specification
├── src/
│   ├── index.html               # Main application
│   ├── css/
│   │   └── styles.css           # Professional design system (1,748 lines)
│   └── js/
│       ├── api.js               # Data loading + provider name formatting
│       ├── calculator.js        # Cost calculation + expiration analysis
│       └── ui.js                # User interface logic
├── scripts/
│   ├── fetch_plans.py           # Fetch from Power to Choose API
│   ├── fetch_tdu_rates.py       # TDU rate management
│   └── generate_sample_data.py  # Sample data generator
├── research.md                  # Texas electricity market research (updated Jan 2026)
├── CONTRACT_EXPIRATION_FEATURE.md  # Contract timing analysis documentation
├── pyproject.toml               # Python dependencies
├── requirements.txt             # Python package requirements
├── README.md                    # This file
└── LICENSE                      # MIT License
```

---

## Development Setup

### Prerequisites

- Python 3.11+
- `uv` package manager (or pip)
- Modern web browser

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

3. **Generate sample data** (for development)

   ```bash
   python scripts/generate_sample_data.py
   ```

4. **Serve locally**

   ```bash
   cd src
   python -m http.server 8000
   # Open http://localhost:8000 in your browser
   ```

### Fetching Latest Data

```bash
# Fetch current plans from Power to Choose
python scripts/fetch_plans.py

# Manually update TDU rates (when PUCT publishes changes)
python scripts/fetch_tdu_rates.py
```

### GitHub Actions Workflows

**Daily Data Updates** (`update-plans.yml`):

- Runs at 2 AM Central Time (7 AM UTC)
- Archives current plans to `data/historical/` (unlimited retention)
- Fetches latest plans from Power to Choose API
- Removes duplicate English/Spanish plan versions
- Commits and pushes if changes detected
- Triggers deployment workflow

**Deployment** (`deploy.yml`):

- Triggered on push to `main` branch
- Triggered after successful data update
- Builds site and deploys to GitHub Pages

---

## Key Technical Innovations

### 1. Contract Expiration Timing Analysis

Based on research showing Texans often renew during expensive months, Light implements sophisticated timing analysis:

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

### 2. Enhanced ETF Calculation

Many comparison tools incorrectly display per-month ETFs as flat fees. Light properly calculates:

```javascript
detectETFStructure(plan):
  if fee ≤ $50 AND term ≥ 12 months:
    return "per-month-remaining"
  if special_terms includes "per month remaining":
    return "per-month-remaining"
  else:
    return "flat"

calculateETF(plan, monthsRemaining):
  if structure == "per-month-remaining":
    return baseFee × monthsRemaining
  else:
    return baseFee
```

### 3. Quality Scoring System (NEW)

Comprehensive 0-100 scoring considering multiple factors:

```javascript
calculateQualityScore(plan, bestAnnualCost):
  score = 100

  // Penalties
  - Cost vs best plan: up to -40 points
  - Volatility score: up to -25 points
  - Warnings: -5 points each (max -25)
  - High base charge (>$15/mo): up to -5 points
  - Prepaid plan: -10 points

  // Bonuses
  + Renewable energy (50%+): up to +5 points
  + Low rate variance (<10%): +5 points

  return clamp(score, 0, 100)
```

**Quality Grades:**

- 90-100: A (Excellent - highly recommended)
- 80-89: B (Good - solid choice)
- 70-79: C (Acceptable - minor issues)
- 60-69: D (Caution - significant drawbacks)
- 0-59: F (Avoid - high cost or high risk)

### 4. Duplicate Plan Detection (NEW)

Automatically identifies and removes duplicate English/Spanish plan versions:

```javascript
deduplicatePlans(plans):
  1. Create fingerprint from: rep_name, tdu_area, prices, term, fees
  2. Detect duplicates with identical fingerprints
  3. Prefer English version over Spanish
  4. Remove duplicates, keep one version per unique plan

  return { deduplicated, duplicateCount }
```

Some providers list the same plan twice (e.g., "Truly Simple 12" and "Verdaderamente Simple 12") with identical pricing. Light detects these and shows only one version.

### 5. Provider Name Formatting

Ensures professional, consistent display:

```javascript
formatProviderName(name):
  1. Convert to uppercase
  2. Remove trailing: LLC, INC, LP, & CO, (TX), (TEXAS), COMPANY
  3. Trim whitespace and punctuation

Example: "Reliant Energy Retail Services, LLC" → "RELIANT ENERGY RETAIL SERVICES"
```

### 6. Historical Data Tracking

Unlike competitors, Light maintains 90-day historical archive:

- Daily snapshots before data refresh
- Enables rate trend analysis
- Verifies data integrity
- Supports future predictive features

---

## Design Philosophy

### Professional Aesthetic

- **NO emojis** - Professional text-only communication
- **NO bento grids** - Clear, hierarchical layout
- **NO shadcn/ui aesthetic** - Custom Apple-inspired design system
- **Sophisticated neutral palette** - Ink grays, ambient light effects
- **Typography-focused** - System fonts, clear hierarchy
- **Functional depth** - Rich calculations, transparent methodology

### Performance

- **Static architecture** - Zero backend, instant loading
- **Pre-fetched data** - No API calls during use
- **Minimal dependencies** - Vanilla JavaScript, custom CSS
- **Optimized caching** - 5-minute browser cache with retry logic

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

- **Power to Choose** - Official PUCT data source
- **Texas Public Utility Commission** - Regulatory oversight and consumer protection

---

## Contact

For questions, issues, or suggestions:

- **GitHub Issues:** <https://github.com/luisfork/light/issues>
- **Pull Requests:** <https://github.com/luisfork/light/pulls>
