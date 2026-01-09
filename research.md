# Texas electricity plans: A complete guide for consumers and developers

**Last Updated: January 2026**

**The Texas deregulated electricity market offers significant savings—but only for those who understand its hidden complexity.** The difference between a well-chosen fixed-rate plan and a "gimmick" plan with bill credits can exceed **$1,072 annually** for the same household (EnergyBot 2025 study). This guide provides both practical shopping advice for consumers and complete technical specifications for developers building comparison tools.

The core insight: ignore advertised rates at 1,000 kWh. Calculate your actual annual cost using real usage data, focus exclusively on simple fixed-rate plans, and shop during spring or fall when rates drop 15-25%.

**2026 Market Context:** Texas electricity demand is projected to grow 9.6% in 2026, driven by AI data centers, cryptocurrency mining, and industrial expansion. ERCOT forecasts a 50% demand increase by 2029. Average residential rates range 14-19¢/kWh, with prices expected to rise 3-5% in 2026.

---

## How Texas electricity actually works

Texas operates the nation’s only competitive retail electricity market, where **over 300 Retail Electric Providers (REPs)** compete for customers across 173 deregulated counties. Understanding the three-layer structure is essential:

**ERCOT** (Electric Reliability Council of Texas) manages the grid and wholesale market serving 85-90% of Texas load. **REPs** purchase wholesale electricity and sell retail plans—they set your rates, handle billing, and provide customer service. **TDUs** (Transmission and Distribution Utilities) own the physical infrastructure and charge regulated delivery fees that appear on every bill regardless of which REP you choose.

Six TDUs serve deregulated Texas: **Oncor** (Dallas-Fort Worth, largest with 7.5 million customers), **CenterPoint** (Houston), **AEP Texas Central** (Corpus Christi, Rio Grande Valley), **AEP Texas North** (Abilene, San Angelo), **Texas-New Mexico Power** (scattered areas including Galveston), and **Lubbock Power & Light** (joined deregulation in January 2024). Major cities like Austin, San Antonio, and El Paso remain regulated with municipal utilities.

---

## Why fixed-rate plans win for most Texans

Fixed-rate plans lock your price per kilowatt-hour for the entire contract duration—typically 6 to 36 months. They consistently outperform alternatives for three reasons: **price predictability** shields you from market volatility (Winter Storm Uri caused variable rates to spike into thousands of dollars), rates are typically **lowest overall** among plan types, and budget stability makes financial planning straightforward.

Variable-rate plans offer flexibility but expose you to rates that can “climb above 16¢/kWh” during Texas summers. Indexed plans tie rates to market formulas, requiring significant monitoring. Time-of-use plans (including “Free Nights” offers) usually cost **more** than fixed-rate alternatives because most households cannot shift sufficient usage to off-peak hours.

The primary drawback of fixed-rate plans is Early Termination Fees (ETFs), typically **$150-$300** or $10-$20 per month remaining. However, Texas law prohibits ETFs if you move outside the provider’s service area.

---

## Reading the Electricity Facts Label correctly

The **Electricity Facts Label (EFL)** is your most important tool, mandated by PUCT Substantive Rule §25.475 to standardize plan disclosures. Every EFL displays average price per kWh at three usage levels: **500 kWh** (low-usage apartments), **1,000 kWh** (Texas benchmark), and **2,000 kWh** (larger homes with heavy AC).

These prices include TDU delivery charges—they represent your total expected cost, not just energy rates. The critical skill is examining how prices change across all three levels. A plan showing 9.9¢ at 1,000 kWh that jumps to 15.8¢ at 500 kWh contains hidden penalties for low-usage months.

**Key EFL sections to scrutinize:**

- **Energy charge**: The per-kWh rate for electricity supply
- **Base charge**: Fixed monthly fee regardless of usage ($0-$30)
- **Bill credits**: Discounts conditional on hitting usage thresholds
- **Early termination fee**: Flat amount or per-month-remaining formula
- **Renewable content**: Percentage from renewable sources (Texas average ~33%)

Calculate your expected bill: multiply energy charge by your kWh, add base charge, add TDU charges (both fixed and per-kWh components), then subtract any bill credits you’ll actually qualify for.

---

## The bill credit trap costs Texans up to $1,072 annually

An EnergyBot study of over 500 Texas residents found bill credit plans were **34% more expensive per kWh** than traditional fixed-rate plans, costing customers an average of **$816-$1,072 more annually** depending on analysis methodology. These plans offer deceptively low advertised rates by providing credits at specific usage thresholds—typically $100-$125 if you use exactly 1,000 kWh.

The math fails because Texas households use 70% of electricity during daytime for AC, and usage varies dramatically by season. Summer consumption often reaches **1,500-2,500 kWh**, while fall months drop to 800-900 kWh. Missing the credit threshold by even 50 kWh in a single month eliminates your savings and triggers effective rates of **22-23¢/kWh**.

**2025-2026 Update:** The complexity of bill credit plans makes it difficult for consumers to predict actual monthly costs. The variability in rates and conditions for receiving credits often leads to unexpected expenses, with many plans marketed using attractive promotional rates that do not reflect true costs.

“Free Nights” and “Free Weekends” plans suffer similar problems. Unless you use more than **65% of electricity during free hours**, you’ll pay more than a standard fixed-rate plan. Most households achieve only 25-35% off-peak usage, far below the 42-50% providers assume when calculating advertised rates. Daytime rates on these plans run **18-19¢/kWh** versus ~9¢ on standard fixed plans.

---

## TDU charges add 30-40% to every bill

TDU delivery charges are **unavoidable and identical** across all REPs in your territory—they’re regulated pass-through costs. Current rates (effective September 2025, with CenterPoint updated December 2025):

| TDU               | Monthly Base | Per-kWh Rate | Monthly Cost at 1,000 kWh |
| ----------------- | ------------ | ------------ | ------------------------- |
| CenterPoint       | $4.90        | 6.00¢        | ~$65                      |
| Oncor             | $4.23        | 5.60¢        | ~$60                      |
| AEP Texas Central | $3.21        | 6.04¢        | ~$64                      |
| AEP Texas North   | $3.21        | 5.91¢        | ~$62                      |
| TNMP              | $7.85        | 7.21¢        | ~$80                      |
| Lubbock P&L       | $0.00        | 6.31¢        | ~$63                      |

TDU rates update primarily on **March 1** (typically decrease) and **September 1** (typically increase). The PUCT approves all rate changes through formal proceedings. When comparing plans, always use the EFL’s all-inclusive average price, which incorporates TDU charges.

**Local taxes** also affect final bills. Approximately 500+ Texas cities impose local sales tax on residential electricity (up to ~3%), including Dallas, Houston, Fort Worth, and Austin. Municipal franchise fees apply in all incorporated areas.

---

## Strategic shopping saves 15-25%

**Best months to shop**: April, May, and October offer the lowest rates— 15-25% below peak season pricing. **Worst months**: July, August, and January see rates spike up to 40% higher due to demand.

If your contract expires during peak season, consider an odd-term plan (8, 9, or 14 months) to shift future renewals to favorable months. A 9-month plan starting in January expires in September/October when rates are typically lowest.

**Critical dates**: REPs must notify you at least 30 days before contract expiration. You can switch providers within 14 days of expiration without ETF penalty. Start shopping **60 days before** expiration.

The holdover rate trap catches many Texans: if you do nothing when your contract expires, you’re automatically placed on a variable “holdover rate” that’s typically **20-50% higher** than contracted rates. Most Texans save $200-500 annually simply by switching at renewal versus staying on holdover.

---

## Consumer protection under Texas law

The **Public Utility Commission of Texas (PUCT)** enforces protections under the Public Utility Regulatory Act. Core rights include: clear information via standardized EFLs, protection from unauthorized switching (slamming) and charges (cramming), privacy of customer-specific information, and the right to switch providers within 14 days of contract expiration without penalty.

**2026 Enhanced EFL Requirements:** The PUCT has implemented significant new consumer protections:

- **Mandatory Plain-Language Summaries**: EFLs must now include a simple, top-box summary of key terms with average prices at different usage levels
- **Enhanced Fee Transparency**: All potential non-recurring fees (disconnection, payment processing, etc.) must be clearly disclosed upfront; hidden fees are now punishable violations
- **Strengthened Notification Requirements**: Providers face stricter requirements for notifying customers about contract expirations and plan changes
- **Two-Page Format Requirement**: EFLs must be printable in no more than two pages (PUCT Rule §25.475)

These rules represent the most significant regulatory change since market inception, signaling a shift from passive oversight to active consumer protection.

**To file a complaint**: First contact your REP. If unresolved, file with PUCT online at puc.texas.gov/consumer/complaint, by phone at 1-888-782-8477, or by mail. PUCT investigates regulatory violations, not general satisfaction issues.

**Moving exemption**: Texas PUC prohibits ETFs if you move outside the provider's service area with proof of relocation.

---

## Implementation guide for developers

The following technical specifications enable LLM agents or developers to build Texas electricity comparison tools.

### Primary data source: Power to Choose API

The official PUCT-operated Power to Choose platform provides **public API access**:

```
Base URL: http://api.powertochoose.org/
Endpoints:
  GET/POST /api/PowerToChoose/plans - Returns plan data
  GET/POST /api/PowerToChoose/plans?zip_code={zip} - Filter by ZIP
  GET/POST /api/PowerToChoose/plans/count - Plan count
  GET/POST /api/PowerToChoose/plans/types - Available plan types

CSV Export: http://www.powertochoose.org/en-us/Plan/ExportToCsv
```

**Available fields** include: ID, TDU, REP name, product name, KWH500/KWH1000/KWH2000 prices, fees, prepaid/TOU/fixed indicators, rate type, renewable percentage, term length, cancel fee, EFL URL, enrollment URL, and promotion details.

REPs directly submit plan information—PUCT does not independently verify accuracy. Each REP is limited to 5 plans on the platform. Refresh data daily for accuracy.

### Smart Meter Texas integration

Smart Meter Texas (smartmetertexas.com) provides **15-minute interval data** for 8+ million Texas customers with smart meters.

**Official API access** requires:

1. Public SSL certificate (CA-authorized for production)
1. Static public IP address
1. Email to <support@smartmetertexas.com> with IP, ESIID, User ID, and certificate
1. Await approval and setup

**Rate limits**: 2 meter reads per hour per ESIID, 24 reads per calendar day.

**Unofficial token-based API** (used by Home Assistant integration): The `smart-meter-texas` Python library (PyPI v0.5.5) provides asynchronous access via login tokens, avoiding SSL certificate setup. Documentation at github.com/keatontaylor/smartmetertexas-api.

**Data available**: 15-minute interval consumption data, daily meter reads, monthly billing information, on-demand current readings, up to 24 months historical data. Export formats include CSV, Green Button XML, and JSON.

**Customer registration requires**: ESIID (17-22 digit Electric Service Identifier from bills), meter number, and REP name.

### Core data structures

```json
{
  "plan": {
    "plan_id": "string",
    "rep_name": "string",
    "plan_name": "string",
    "tdu_area": "ONCOR|CENTERPOINT|AEP_CENT|AEP_NORTH|TNMP|LPL",
    "price_kwh_500": "float",
    "price_kwh_1000": "float",
    "price_kwh_2000": "float",
    "energy_charge_cents_kwh": "float",
    "base_charge_monthly": "float",
    "bill_credits": [
      {"amount": "float", "min_kwh": "int", "max_kwh": "int|null"}
    ],
    "min_usage_fee": {"threshold_kwh": "int", "fee": "float"},
    "term_months": "int",
    "rate_type": "FIXED|VARIABLE|INDEXED",
    "early_termination_fee": "float|formula",
    "renewable_pct": "int",
    "is_prepaid": "boolean",
    "is_tou": "boolean",
    "efl_url": "string",
    "enrollment_url": "string"
  }
}
```

```json
{
  "tdu_rates": {
    "tdu_code": "string",
    "monthly_base": "float",
    "per_kwh_rate": "float",
    "effective_date": "date",
    "service_area_zips": ["string"]
  }
}
```

### True cost calculation algorithm

```python
def calculate_monthly_bill(usage_kwh, plan, tdu):
    # Energy charges (handle tiers if present)
    if hasattr(plan, 'energy_tiers'):
        energy_cost = calculate_tiered_energy(usage_kwh, plan.energy_tiers)
    else:
        energy_cost = usage_kwh * plan.energy_charge_cents_kwh / 100

    # TDU delivery (unavoidable, pass-through)
    tdu_cost = tdu.monthly_base + (usage_kwh * tdu.per_kwh_rate / 100)

    # Base charges
    base_cost = plan.base_charge_monthly

    # Minimum usage fee check
    if plan.min_usage_fee and usage_kwh < plan.min_usage_fee.threshold_kwh:
        base_cost += plan.min_usage_fee.fee

    # Bill credits (check threshold conditions)
    credit = 0
    for credit_rule in plan.bill_credits:
        min_met = usage_kwh >= credit_rule.min_kwh
        max_met = credit_rule.max_kwh is None or usage_kwh <= credit_rule.max_kwh
        if min_met and max_met:
            credit += credit_rule.amount

    total = energy_cost + tdu_cost + base_cost - credit
    return total

def calculate_annual_cost(monthly_usage_array, plan, tdu):
    """Use 12-month usage pattern for accurate comparison"""
    return sum(calculate_monthly_bill(usage, plan, tdu)
               for usage in monthly_usage_array)
```

### Usage estimation fallbacks

When Smart Meter data is unavailable, estimate from home characteristics:

| Home Size               | Estimated Monthly kWh |
| ----------------------- | --------------------- |
| 750 sq ft (1BR apt)     | 405                   |
| 1,000 sq ft (2BR apt)   | 500-540               |
| 1,500 sq ft             | 750-1,000             |
| 2,000 sq ft (TX median) | 1,094-1,200           |
| 3,000 sq ft             | 1,500                 |
| 4,000 sq ft             | 2,150                 |

Apply **seasonal multipliers**: Summer (June-Sept) 1.4-1.8x, Winter (Dec-Feb) 1.1-1.3x, Shoulder months (Mar-May, Oct-Nov) baseline.

For bill parsing, services like Parseur, Docsumo, Airparser, and Sensible provide AI/OCR extraction. Key extractable fields: ESIID, meter number, billing period, total kWh, charges breakdown.

### Plan ranking algorithm

```python
def rank_plans(plans, user_usage_12mo, preferences):
    for plan in plans:
        # Primary: Annual cost at user's actual pattern
        plan.annual_cost = calculate_annual_cost(user_usage_12mo, plan, tdu)

        # Secondary: Volatility score (bill credits = higher risk)
        plan.volatility = calculate_volatility(plan, user_usage_12mo)

        # ETF-adjusted for fair comparison across term lengths
        plan.etf_adjusted = plan.annual_cost + (plan.etf * 0.1)  # 10% switch probability

    # Filter to fixed-rate only (per requirements)
    plans = [p for p in plans if p.rate_type == 'FIXED']

    # Sort by annual cost, then volatility
    return sorted(plans, key=lambda p: (p.annual_cost, p.volatility))
```

### Edge cases and error handling

- **Bill credit near usage boundary**: Flag plans where user’s average usage is within 10% of credit threshold
- **Seasonal threshold misses**: Calculate percentage of months user would miss credit thresholds
- **TDU rate changes**: Cache TDU rates with effective dates; check for updates March 1 and September 1
- **SMT rate limiting**: Implement exponential backoff; cache successful reads
- **EFL parsing failures**: Fall back to Power to Choose 500/1000/2000 kWh prices if PDF extraction fails
- **Variable TDU pricing**: Some plans show “unbundled” rates—verify TDU inclusion method

### Supplementary data sources

**ERCOT APIs** (apiexplorer.ercot.com): Real-time grid data, wholesale prices, generation mix—useful for context but not retail plan comparison.

**PUCT Industry Scorecard**: REP complaint ratios (rolling 6-month average) for provider quality signals.

**TDU tariff archives**: puc.texas.gov/industry/electric/rates/tdarchive.aspx for current delivery rates.

---

## Market outlook for 2026-2027

**Demand Growth:** EIA forecasts ERCOT demand to grow 11% annually in 2025-2026, with ERCOT projecting a 50% increase by 2029. Growth driven primarily by AI data centers (requiring 24/7 power), cryptocurrency mining operations, and expanding industrial processes.

**Price Trends:** Forecasts suggest 3-5% price increases from 2025 to 2026. Most Texans currently pay 14-19¢/kWh for residential electricity. The market exhibits "contango" conditions with short-term contracts offering good value, though supply-demand fundamentals point to higher long-term prices.

**Grid Reliability:** ERCOT implemented Real-Time Co-optimization Plus Batteries (RTC+B) in December 2025, marking completion of a modernization effort begun in 2019. Battery storage playing increasingly critical role in reliability. December 2025 Monthly Outlook for Resource Adequacy (MORA) indicates sufficient capacity for normal winter conditions.

**Regulatory Changes:** ERCOT evaluating 4CP (4 Coincident Peaks) system revamp, as large industrial users minimize grid cost share by cutting usage during peak demand days, shifting costs to residential consumers.

## Conclusion

Selecting the best Texas electricity plan requires ignoring marketing and calculating true annual costs. **Simple fixed-rate plans without bill credits consistently deliver the lowest total costs** for most households. Shop during spring or fall, use Smart Meter Texas data to understand your actual consumption pattern, and never let contracts expire without action.

For developers, the Power to Choose API and Smart Meter Texas integration provide the essential data infrastructure. The critical implementation insight is that **annual cost at the user's actual seasonal usage pattern**—not the advertised 1,000 kWh rate—is the only fair comparison metric. Bill credit plans that look attractive on paper fail in practice because Texas usage varies 800-2,500 kWh seasonally, causing most consumers to miss credit thresholds repeatedly.

Build tools that calculate costs across the full 300-3,000 kWh range, flag plans with volatility near the user's typical usage, and default to recommending straightforward fixed-rate structures. The $1,072 annual penalty from choosing poorly-designed "gimmick" plans represents real money that better tools can help Texans keep.

---

## Sources

- [RTC Deployed, ERCOT Takes on New Challenges in 2026 - RTO Insider](https://www.rtoinsider.com/122627-rtc-deployed-ercot-takes-on-new-challenges/)
- [Texas Electricity Rate Trends & Price Forecast for 2026](https://electricityplans.com/texas-electricity-trends/)
- [Texas Electricity Prices in 2026: Rates, ERCOT Risks & Tips](https://energyoutlet.com/learn/texas-electricity-prices-2026-rates-winter-grid-risks/)
- [We expect rapid electricity demand growth in Texas and the mid-Atlantic - EIA](https://www.eia.gov/todayinenergy/detail.php?id=65844)
- [Understanding Bill Credit Electricity Plans: Avoid a Costly Mistake - EnergyBot](https://www.energybot.com/blog/bill-credit-electricity-plans.html)
- [Electricity Plan Study - EnergyBot](https://www.energybot.com/electricity-plan-study.html)
- [Study Finds Texans May Be Losing Out on Thousands - Newswire](https://www.newswire.com/news/study-finds-texans-may-be-losing-out-on-thousands-thanks-to-free-22386643)
- [How New PUCT Rules are Sparking Legal Challenges - LawFuel](https://www.lawfuel.com/how-new-puct-rules-are-sparking-legal-challenges-in-the-texas-energy-market/)
- [PUCT Subchapter R Customer Protection Rules §25.475](https://www.puc.texas.gov/agency/rulesnlaws/subrules/electric/25.475/25.475.pdf)
- [Learn About Your Electricity Facts Label - Choose Texas Power](https://www.choosetexaspower.org/energy-resources/electricity-facts-label-guide/)
