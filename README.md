# Light - Texas Electricity Plan Finder

**Find the best and most affordable Texas electricity plan. Free, unbiased, and accurate.**

Light is a static web application that helps Texans find the best electricity plan by calculating true annual costs based on actual usage patterns, not deceptive advertised rates.

🔗 **Live Site:** https://luisfork.github.io/light/ (deployed automatically via GitHub Actions)

---

## Why Light?

Most Texans overpay **$800+ annually** by choosing plans with deceptive bill credits that look cheap at 1,000 kWh but cost dramatically more throughout the year. Light calculates true costs by:

- ✅ **Including ALL fees** - Energy charges, TDU delivery, base fees, and taxes
- ✅ **Accounting for seasonal usage** - Texas summers use 40-80% more electricity than shoulder months
- ✅ **Revealing bill credit traps** - Shows how many months you'll miss those credits
- ✅ **Ranking by annual cost** - Not misleading "advertised rates"

**Core Principle:** Empowering Texans to make informed electricity decisions by calculating true monthly and annual costs based on actual usage patterns.

---

## Features

### For Users
- **ZIP Code Detection** - Automatically identifies your TDU service area
- **Three Usage Input Methods**
  - Quick estimate by home size
  - Average monthly usage
  - Detailed 12-month pattern for maximum accuracy
- **Accurate Cost Calculation** - Includes energy, TDU delivery, base charges, and local taxes
- **Gimmick Detection** - Identifies and warns about bill credit traps and time-of-use plans
- **Clean, Beautiful UI** - Apple-inspired design, mobile-first, accessible
- **100% Free & Unbiased** - No commissions, no ads, no hidden costs

### Technical
- **Static Site** - Zero hosting cost via GitHub Pages
- **Daily Data Updates** - GitHub Actions automatically fetches latest plans
- **Transparent Calculations** - All formulas visible in open-source code
- **Fast Performance** - Pre-fetched data, no external API calls during use

---

## How It Works

### Cost Calculation

Light calculates your true annual electricity cost using this algorithm:

```javascript
// For each month of the year:
1. Interpolate energy rate based on your usage
2. Add TDU delivery charges (base + per-kWh)
3. Add REP base charge
4. Subtract bill credits (only if you qualify that month)
5. Add local sales tax
6. Sum all 12 months for annual cost

// Then rank plans by annual cost
```

### Seasonal Usage Estimation

We apply Texas-specific seasonal multipliers:
- **Summer (Jun-Sep):** 1.4-1.8x baseline
- **Winter (Dec-Feb):** 1.1-1.3x baseline
- **Shoulder (Mar-May, Oct-Nov):** 1.0x baseline

This reflects real Texas usage patterns where summer AC dominates annual consumption.

---

## Data Sources

- **Electricity Plans:** Power to Choose (official PUCT platform)
- **TDU Rates:** PUCT tariff filings and TDU official websites
- **Local Taxes:** Texas Comptroller data
- **Update Frequency:** Daily at 2 AM Central Time

**Last Updated:** See `data/plans.json` for timestamp

---

## Project Structure

```
light/
├── .github/
│   └── workflows/
│       ├── deploy.yml           # GitHub Pages deployment automation
│       └── update-plans.yml     # Daily data update automation
├── data/
│   ├── plans.json               # Electricity plans (updated daily)
│   ├── tdu-rates.json           # TDU delivery charges
│   └── local-taxes.json         # Texas local tax rates
├── src/
│   ├── index.html               # Main application
│   ├── about.html               # Educational resources
│   ├── css/
│   │   └── styles.css           # Main stylesheet
│   └── js/
│       ├── api.js               # Data loading
│       ├── calculator.js        # Cost calculation engine
│       └── ui.js                # User interface logic
├── scripts/
│   ├── fetch_plans.py           # Fetch plans from Power to Choose
│   ├── fetch_tdu_rates.py       # TDU rate management
│   └── generate_sample_data.py  # Generate sample data
├── pyproject.toml               # Python dependencies
├── README.md
└── LICENSE
```

---

## Development Setup

### Prerequisites
- Python 3.11+
- `uv` package manager
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/light.git
   cd light
   ```

2. **Install Python dependencies**
   ```bash
   uv pip install --system -r requirements.txt
   # or using uv sync:
   uv sync
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

### Fetching Live Data

```bash
# Fetch electricity plans
python scripts/fetch_plans.py

# Note: Power to Choose may block automated requests.
# The GitHub Actions workflow may have better success.
```

---

## Deployment (GitHub Pages)

### Automated Deployment

This project uses GitHub Actions for automated deployment to GitHub Pages. The deployment workflow automatically:

1. **Assembles the site** - Combines application code from `src/` with data from `data/` into a deployable artifact
2. **Deploys to GitHub Pages** - Publishes the assembled site using GitHub's native Pages deployment action
3. **Triggers automatically** on:
   - Every push to `main` branch that affects `src/` or `data/`
   - After the daily data update workflow completes
   - Manual workflow dispatch (on-demand deployment)

### Initial Setup

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: **GitHub Actions** (not "Deploy from a branch")
   - The deployment workflow will handle everything automatically

2. **Configure Custom Domain** (optional)
   - Add a `CNAME` file to `src/` directory
   - Configure DNS records for your custom domain
   - GitHub Actions will include it in the deployment

3. **Push to main branch**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin main
   ```

4. **Verify deployment**
   - Check Actions tab for deployment status
   - Look for the "Deploy to GitHub Pages" workflow
   - Visit your GitHub Pages URL once deployment completes

### Automatic Updates

The site is automatically updated through two workflows:

1. **Data Update Workflow** (runs daily at 2 AM Central Time):
   - Fetches latest electricity plans from Power to Choose
   - Updates `data/plans.json`
   - Commits changes to the repository

2. **Deployment Workflow** (triggers after data updates):
   - Assembles the complete site
   - Deploys the updated site to GitHub Pages
   - Ensures users always see the latest plan data

### Manual Deployment

To manually trigger a deployment:
1. Go to the Actions tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the `main` branch and confirm

---

## Contributing

This is a community project. Contributions are welcome!

### Ways to Contribute
- **Report bugs** - Open an issue with details
- **Suggest features** - Describe your idea in an issue
- **Improve calculations** - Submit PR with algorithm enhancements
- **Add tests** - Help ensure accuracy
- **Update TDU rates** - Keep data current
- **Improve documentation** - Clarify usage or technical details

### Development Guidelines
1. Follow Apple design principles - clean, minimal, beautiful
2. Maintain accessibility (WCAG 2.1 AA)
3. Keep code simple and well-commented
4. Test on mobile devices
5. Verify calculations against EFLs

---

## Technical Details

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

### Performance
- Page load: < 2 seconds
- First Contentful Paint: < 1 second
- Total bundle size: ~50KB (unminified)

### Accessibility
- Semantic HTML5
- ARIA labels where needed
- Keyboard navigation
- Screen reader friendly
- WCAG 2.1 AA compliant

---

## Frequently Asked Questions

### Is this really free?
Yes. 100% free. No fees, no subscriptions, no hidden costs. We receive zero commissions from electricity providers.

### How accurate are the cost estimates?
Very accurate when you provide your actual usage pattern. We include all costs (energy, TDU, fees, taxes) and account for bill credit conditions. Always verify final details on the official EFL before enrolling.

### Why do you recommend against bill credit plans?
Bill credits only apply if you hit a narrow usage threshold (e.g., 1000-1050 kWh). Texas seasonal variation means you'll miss the credit 8-10 months per year, paying dramatically higher rates. Research shows these plans cost $800+ more annually for average households.

### What about variable-rate plans?
We only show fixed-rate plans as specified in project requirements. Variable rates expose you to market volatility - during Winter Storm Uri, some variable plans spiked to thousands of dollars per kWh.

### How do I get my actual usage data?
Register at [Smart Meter Texas](https://www.smartmetertexas.com) for free 15-minute interval data going back 24 months. You'll need your ESIID (from your electricity bill).

### Do TDU charges really matter?
Yes. TDU delivery charges represent 30-40% of your total bill and vary by region. TNMP has the highest rates (~7¢/kWh) while Oncor is among the lowest (~5.6¢/kWh).

---

## Disclaimer

This tool provides educational cost estimates based on publicly available data. Always verify plan details on the official Electricity Facts Label (EFL) before enrolling. We are not affiliated with any electricity provider, ERCOT, or the PUCT.

**Consumer Rights:** You have the right to switch providers, dispute charges, and file complaints with the PUCT. See our [About](src/about.html) page for details.

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- **Data:** Power to Choose (PUCT), TDU official tariffs
- **Research:** Based on comprehensive Texas electricity market analysis
- **Design:** Inspired by Apple's design principles
- **Community:** Built for Texans, by Texans

---

## Contact

- **Issues/Bugs:** [GitHub Issues](https://github.com/yourusername/light/issues)
- **Questions:** Open a discussion or issue
- **Data Corrections:** Submit a pull request with sources

---

**Made in Texas. For Texans. 🌟**
