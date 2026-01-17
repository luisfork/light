# API Response Schema Documentation

## Overview

This document provides complete schema specifications for all data structures used in the Light Texas Electricity Calculator application, including API responses from Power to Choose, internal data formats, and structured responses from calculation functions.

---

## Power to Choose API

### Base URL

```bash
http://api.powertochoose.org/
```

### Endpoints

#### 1. GET/POST `/api/PowerToChoose/plans`

Returns array of electricity plans from all REPs in Texas deregulated markets.

**Query Parameters:**

- `zip_code` (optional): Filter plans by 5-digit ZIP code
- `language` (optional): `en-us` (default) or `es-mx`

**Response Format:**

```json
{
  "status": "success",
  "data": [
    {
      "ID": "string",
      "REP": "string",
      "Product": "string",
      "TDU": "ONCOR|CENTERPOINT|AEP_CENTRAL|AEP_NORTH|TNMP|LPL",
      "KWH500": "float (cents per kWh)",
      "KWH1000": "float (cents per kWh)",
      "KWH2000": "float (cents per kWh)",
      "Fees": "string",
      "PrepaidYN": "Y|N",
      "TimeOfUseYN": "Y|N",
      "FixedRateYN": "Y|N",
      "RateType": "FIXED|VARIABLE|INDEXED",
      "Renewable": "int (0-100 percentage)",
      "TermLength": "int (months)",
      "CancelFee": "float (dollars)",
      "Website": "string (URL)",
      "FactsURL": "string (EFL PDF URL)",
      "EnrollPhone": "string",
      "EnrollURL": "string",
      "PrepaidProduct": "boolean",
      "RenewableContent": "string",
      "PromotionDesc": "string",
      "SpecialTerms": "string",
      "MinUsageFees": "string"
    }
  ],
  "total": "int",
  "timestamp": "ISO 8601 datetime"
}
```

**Field Descriptions:**

| Field | Type | Description | Notes |
| --- | --- | --- | --- | --- |
| `ID` | String | Unique plan identifier | Provider-assigned, may change on plan updates |
| `REP` | String | Retail Electric Provider name | Legal entity name (e.g., "TXU Energy Retail Company LLC") |
| `Product` | String | Marketing name of plan | May include version numbers or promotional text |
| `TDU` | Enum | Service area TDU code | ONCOR, CENTERPOINT, AEP_CENTRAL, AEP_NORTH, TNMP, LPL |
| `KWH500` | Float | Average price at 500 kWh usage | Includes all charges (energy + TDU + base) |
| `KWH1000` | Float | Average price at 1,000 kWh usage | PUCT benchmark for comparison |
| `KWH2000` | Float | Average price at 2,000 kWh usage | High-usage scenario |
| `Fees` | String | Free-text description of fees | Requires parsing; may include base charge, minimum usage fees |
| `PrepaidYN` | String | Is prepaid plan | "Y" or "N" |
| `TimeOfUseYN` | String | Is time-of-use plan | "Y" or "N" (includes "Free Nights" plans) |
| `FixedRateYN` | String | Is fixed-rate plan | "Y" or "N" |
| `RateType` | Enum | Primary rate structure | FIXED, VARIABLE, INDEXED |
| `Renewable` | Integer | Renewable energy percentage | 0-100, Texas average ~33% |
| `TermLength` | Integer | Contract duration in months | 1-36 typical, month-to-month = 1 |
| `CancelFee` | Float | Early termination fee | May be flat amount or per-month-remaining |
| `Website` | String | Provider website | Company homepage, not plan-specific |
| `FactsURL` | String | Electricity Facts Label PDF | Official PUCT-required disclosure document |
| `EnrollPhone` | String | Enrollment phone number | May be toll-free or local |
| `EnrollURL` | String | Direct enrollment link | Deep link to plan signup page |
| `PrepaidProduct` | Boolean | Redundant prepaid indicator | Same as PrepaidYN |
| `RenewableContent` | String | Renewable content description | Free-text, may specify wind/solar sources |
| `PromotionDesc` | String | Promotional details | Limited-time offers, gift cards, incentives |
| `SpecialTerms` | String | Critical plan conditions | Bill credits, usage restrictions, auto-renew terms |
| `MinUsageFees` | String | Minimum usage penalty description | Fee if monthly usage below threshold |

**CSV Export Alternative:**

```bash
http://www.powertochoose.org/en-us/Plan/ExportToCsv
```

Returns identical data in CSV format. More reliable than JSON API in production environments.

**Important Notes:**

- Prices at 500/1000/2000 kWh are **all-inclusive** (energy + TDU + base charges)
- REPs self-report data; PUCT does not independently verify accuracy
- Each REP limited to 5 plans on platform (strategic curation)
- Data refreshes multiple times daily; recommend caching with 5-minute TTL
- No authentication required for public endpoints
- Rate limiting not enforced but respect reasonable use (< 100 requests/min)

#### 2. GET/POST `/api/PowerToChoose/plans/count`

Returns total number of active plans.

**Response Format:**

```json
{
  "count": 967,
  "timestamp": "2026-01-08T08:09:12Z"
}
```

#### 3. GET/POST `/api/PowerToChoose/plans/types`

Returns available plan types and categories.

**Response Format:**

```json
{
  "rate_types": ["FIXED", "VARIABLE", "INDEXED"],
  "special_types": ["PREPAID", "TIME_OF_USE", "FREE_NIGHTS", "FREE_WEEKENDS"],
  "renewable_tiers": [0, 25, 50, 75, 100]
}
```

---

## Internal Data Schemas

### plans.json Structure

Processed and normalized plan data used by the calculator.

```json
{
  "last_updated": "ISO 8601 datetime",
  "data_source": "Power to Choose (https://www.powertochoose.org)",
  "total_plans": "int",
  "disclaimer": "string (legal disclaimer)",
  "plans": [
    {
      "plan_id": "string",
      "rep_name": "string (UPPERCASE, formatted)",
      "plan_name": "string",
      "tdu_area": "ONCOR|CENTERPOINT|AEP_CENTRAL|AEP_NORTH|TNMP|LPL",
      "price_kwh_500": "float (cents per kWh)",
      "price_kwh_1000": "float (cents per kWh)",
      "price_kwh_2000": "float (cents per kWh)",
      "term_months": "int",
      "rate_type": "FIXED",
      "renewable_pct": "int (0-100)",
      "is_prepaid": "boolean",
      "is_tou": "boolean",
      "early_termination_fee": "float",
      "etf_details": {
        "structure": "flat|per-month|none|unknown",
        "flat_fee": "float (optional)",
        "per_month_rate": "float (optional)",
        "source": "string (optional)"
      },
      "base_charge_monthly": "float",
      "efl_url": "string",
      "enrollment_url": "string",
      "terms_url": "string",
      "special_terms": "string",
      "promotion_details": "string",
      "fees_credits": "string",
      "min_usage_fees": "string"
    }
  ]
}
```

**Data Transformations from Power to Choose API:**

1. **Provider Name Formatting**: `rep_name` converted to UPPERCASE with legal suffixes removed
   - Before: `"TXU Energy Retail Company LLC"`
   - After: `"TXU ENERGY RETAIL"`

2. **Rate Type Filtering**: Only `FIXED` rate plans included (variable/indexed excluded)

3. **Price Normalization**: Prices stored as floats in cents per kWh (not dollars)

4. **Boolean Conversion**: `PrepaidYN` → `is_prepaid`, `TimeOfUseYN` → `is_tou`

5. **Base Charge Extraction**: Parsed from `Fees` field, default 0 if not specified
6. **EFL ETF Enrichment (Optional)**: When ETF values are missing/zero, the fetch job may parse the EFL and store `etf_details` for authoritative structure

**Field Specifications:**

| Field | Required | Default | Validation |
| --- | --- | --- | --- |
| `plan_id` | Yes | N/A | Non-empty string, unique |
| `rep_name` | Yes | N/A | UPPERCASE, 2-50 chars |
| `plan_name` | Yes | N/A | 5-200 chars |
| `tdu_area` | Yes | N/A | One of 6 TDU codes |
| `price_kwh_500` | Yes | N/A | 5.0-50.0 (cents) |
| `price_kwh_1000` | Yes | N/A | 5.0-50.0 (cents) |
| `price_kwh_2000` | Yes | N/A | 5.0-50.0 (cents) |
| `term_months` | Yes | N/A | 1-36 |
| `rate_type` | Yes | "FIXED" | Always "FIXED" (filtered) |
| `renewable_pct` | Yes | 0 | 0-100 |
| `is_prepaid` | Yes | false | Boolean |
| `is_tou` | Yes | false | Boolean |
| `early_termination_fee` | Yes | 0 | 0-500 (dollars) |
| `etf_details` | No | null | EFL-derived structure/rates (optional) |
| `base_charge_monthly` | Yes | 0 | 0-30 (dollars) |
| `efl_url` | No | "" | Valid URL or empty |
| `enrollment_url` | No | "" | Valid URL or empty |
| `terms_url` | No | "" | Valid URL or empty |
| `special_terms` | No | "" | Free-text |
| `promotion_details` | No | "" | Free-text |
| `fees_credits` | No | "" | Free-text |
| `min_usage_fees` | No | "" | Free-text |

### tdu-rates.json Structure

TDU delivery charges updated semi-annually (March 1, September 1).

```json
{
  "last_updated": "YYYY-MM-DD",
  "effective_date": "YYYY-MM-DD",
  "next_update": "YYYY-MM-DD",
  "note": "string (update schedule reminder)",
  "tdus": [
    {
      "code": "ONCOR|CENTERPOINT|AEP_CENTRAL|AEP_NORTH|TNMP|LPL",
      "name": "string (full legal name)",
      "service_area": "string (geographic description)",
      "monthly_base_charge": "float (dollars)",
      "per_kwh_rate": "float (cents per kWh)",
      "effective_date": "YYYY-MM-DD",
      "notes": "string (regulatory context)"
    }
  ]
}
```

**Current Rates (January 2026):**

| Code | Name | Base | Per-kWh | Effective |
| --- | --- | --- | --- | --- |
| CENTERPOINT | CenterPoint Energy Houston Electric | $4.90 | 6.0009¢ | 2025-12-07 |
| ONCOR | Oncor Electric Delivery | $4.23 | 5.5833¢ | 2025-09-01 |
| AEP_CENTRAL | AEP Texas Central | $5.49 | 5.6954¢ | 2025-09-01 |
| AEP_NORTH | AEP Texas North | $5.49 | 5.2971¢ | 2025-09-01 |
| TNMP | Texas-New Mexico Power | $7.85 | 6.0509¢ | 2025-09-01 |
| LPL | Lubbock Power & Light | $0.00 | 6.31¢ | 2025-09-01 |

**TDU Rate Updates:**

- **March 1**: Typically 5-10% decrease (lower winter demand)
- **September 1**: Typically 3-8% increase (higher summer demand)
- Source: PUCT tariff filings (puc.texas.gov/industry/electric/rates/tdarchive.aspx)

### local-taxes.json Structure

ZIP code to TDU mapping and local tax rates.

```json
{
  "last_updated": "YYYY-MM-DD",
  "version": "string",
  "state_sales_tax": "float (0.0 for residential electricity)",
  "default_local_rate": "float (0.0 default)",
  "zip_code_ranges": {
    "75001-75999": {
      "region": "string",
      "tdu": "TDU code",
      "rate": "float (decimal, e.g., 0.02 = 2%)"
    }
  },
  "major_cities": {
    "dallas": {
      "zip_codes": ["string array"],
      "tdu": "TDU code or null",
      "rate": "float",
      "deregulated": "boolean",
      "note": "string (optional)"
    }
  }
}
```

**Deregulated vs. Municipal Utilities:**

- **Deregulated**: Dallas, Houston, Fort Worth, Arlington, Corpus Christi, Lubbock (customer choice available)
- **Municipal/Regulated**: Austin (Austin Energy), San Antonio (CPS Energy), El Paso (El Paso Electric)

**Local Tax Implementation:**

- Most Texas cities: 0-3% local sales tax on residential electricity
- Exempt from state sales tax (Texas law)
- Collected by REPs, remitted to municipalities
- Applied to total bill after TDU charges

---

## Calculation Function Responses

### calculateMonthlyCost() Response

```javascript
{
  total: 127.45,                    // Total monthly bill (dollars)
  breakdown: {
    energyCost: 95.50,              // Energy charges from REP (dollars)
    baseCost: 9.95,                 // Monthly base charge (dollars)
    tduCost: 60.23,                 // TDU delivery charges (dollars)
    credits: 0.00,                  // Bill credits applied (dollars)
    tax: 2.55,                      // Local sales tax (dollars)
    effectiveRate: 12.75            // Total cost ÷ usage (cents/kWh)
  }
}
```

### calculateAnnualCost() Response

```javascript
{
  annualCost: 1529.40,              // Total annual cost (dollars)
  monthlyCosts: [                   // Array of 12 monthly costs
    127.45, 115.30, 102.20, ...
  ],
  averageMonthlyCost: 127.45,       // Annual ÷ 12 (dollars)
  totalUsage: 12000,                // Sum of 12 months (kWh)
  effectiveAnnualRate: 12.75        // Annual cost ÷ total usage (cents/kWh)
}
```

### rankPlans() Response

```javascript
[
  {
    // Original plan fields...
    plan_id: "string",
    rep_name: "string",
    plan_name: "string",
    // ... all plan fields ...

    // Calculated fields added by rankPlans()
    annualCost: 1529.40,            // Total annual cost at user's usage
    averageMonthlyCost: 127.45,     // Average monthly cost
    effectiveRate: 12.75,           // Overall rate (cents/kWh)
    monthlyCosts: [/* 12 values */], // Individual month costs
    volatility: 0.15,               // Risk score 0-1 (lower = better)
    warnings: [                     // Array of warning strings
      "High early termination fee: $270 if cancelled at month 18"
    ],
    isGimmick: false,               // True if warnings or volatility > 0.3
    qualityScore: 92.5              // Overall quality metric 0-100
  }
  // ... more plans, sorted by annualCost ascending
]
```

### calculateContractExpiration() Response

```javascript
{
  startDate: Date,                  // Contract start date object
  expirationDate: Date,             // Calculated expiration date
  termMonths: 12,                   // Contract length
  expirationMonth: 6,               // Month index (0-11)
  expirationMonthName: "July",      // Human-readable month
  expirationYear: 2027,             // Expiration year
  renewalTiming: "Peak Season (Expensive)", // Category
  renewalAdvice: "string",          // Personalized recommendation
  riskLevel: "high",                // high|medium|low
  seasonalityScore: 1.0,            // 0.0 (best) to 1.0 (worst)
  alternativeTerms: [               // Better contract length options
    {
      termMonths: 9,
      expirationDate: Date,
      expirationMonth: 3,
      seasonalityScore: 0.0,
      improvement: "100%"
    }
  ],
  daysUntilExpiration: 552          // Days from now to expiration
}
```

**Seasonality Scores by Month:**

| Month | Score | Description |
| --- | --- | --- |
| January | 0.7 | Expensive (winter peak demand) |
| February | 0.5 | Moderate |
| March | 0.2 | Good |
| April | 0.0 | Excellent (best renewal month) |
| May | 0.1 | Excellent |
| June | 0.6 | Expensive (summer starts) |
| July | 1.0 | Very expensive (peak) |
| August | 1.0 | Very expensive (peak) |
| September | 0.7 | Expensive |
| October | 0.0 | Excellent (best renewal month) |
| November | 0.2 | Good |
| December | 0.6 | Moderate to expensive |

### calculateEarlyTerminationFee() Response

Returns single number (float) representing total ETF in dollars.

```javascript
// Per-month-remaining ETF:
calculateEarlyTerminationFee(plan, 18) → 270.00
// (Plan with $15/month ETF, 18 months remaining = $15 × 18)

// Flat ETF:
calculateEarlyTerminationFee(plan, 18) → 150.00
// (Plan with $150 flat ETF, months remaining irrelevant)
```

**ETF Detection Logic:**

1. If `early_termination_fee ≤ $50` AND `term_months ≥ 12` → Per-month-remaining
2. If `special_terms` contains "per month remaining" → Per-month-remaining
3. Otherwise → Flat fee

---

## API Error Responses

### Standard Error Format

```json
{
  "status": "error",
  "error": {
    "code": "string (ERROR_CODE)",
    "message": "string (human-readable)",
    "details": "string (optional technical details)",
    "timestamp": "ISO 8601 datetime"
  }
}
```

**Common Error Codes:**

| Code | HTTP Status | Description | Resolution |
| --- | --- | --- | --- |
| `INVALID_ZIP` | 400 | ZIP code not in deregulated Texas | Verify ZIP is 5 digits, in ERCOT service area |
| `NO_PLANS_FOUND` | 404 | No plans available for criteria | Broaden search filters, check TDU area |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Implement exponential backoff, respect 100 req/min |
| `EXTERNAL_API_FAILURE` | 502 | Power to Choose API unavailable | Retry with backoff, fallback to cached data |
| `INVALID_USAGE_DATA` | 400 | Usage array not 12 values or negative | Validate input: 12 positive numbers |
| `TDU_NOT_FOUND` | 404 | TDU code not recognized | Check tdu-rates.json for valid codes |
| `PARSE_ERROR` | 500 | Failed to parse CSV/JSON response | Check data format, report to developers |

---

## Data Validation Rules

### Plan Validation

```javascript
const validatePlan = (plan) => {
  assert(plan.plan_id && typeof plan.plan_id === 'string');
  assert(plan.rep_name && plan.rep_name === plan.rep_name.toUpperCase());
  assert(plan.price_kwh_500 >= 5.0 && plan.price_kwh_500 <= 50.0);
  assert(plan.price_kwh_1000 >= 5.0 && plan.price_kwh_1000 <= 50.0);
  assert(plan.price_kwh_2000 >= 5.0 && plan.price_kwh_2000 <= 50.0);
  assert(plan.term_months >= 1 && plan.term_months <= 36);
  assert(['ONCOR', 'CENTERPOINT', 'AEP_CENTRAL', 'AEP_NORTH', 'TNMP', 'LPL']
    .includes(plan.tdu_area));
  assert(plan.renewable_pct >= 0 && plan.renewable_pct <= 100);
  assert(plan.early_termination_fee >= 0 && plan.early_termination_fee <= 500);
};
```

### Usage Data Validation

```javascript
const validateUsageArray = (monthlyUsage) => {
  assert(Array.isArray(monthlyUsage) && monthlyUsage.length === 12);
  monthlyUsage.forEach(usage => {
    assert(typeof usage === 'number');
    assert(usage >= 0 && usage <= 10000);  // Reasonable range
  });
  const total = monthlyUsage.reduce((a, b) => a + b, 0);
  assert(total >= 1200 && total <= 120000);  // 100-10,000 kWh/month avg
};
```

### ZIP Code Validation

```javascript
const validateZipCode = (zip) => {
  assert(typeof zip === 'string');
  assert(/^\d{5}$/.test(zip));  // Exactly 5 digits
  assert(parseInt(zip) >= 73301 && parseInt(zip) <= 79999);  // Texas range
};
```

---

## Caching Recommendations

### Client-Side Caching Strategy

```javascript
const CACHE_CONFIG = {
  plans: {
    ttl: 300000,        // 5 minutes (data changes infrequently)
    key: 'light_plans'
  },
  tduRates: {
    ttl: 86400000,      // 24 hours (changes only Mar 1 / Sep 1)
    key: 'light_tdu_rates'
  },
  localTaxes: {
    ttl: 86400000,      // 24 hours (very stable)
    key: 'light_local_taxes'
  },
  calculations: {
    ttl: 1800000,       // 30 minutes (user-specific, recompute often)
    key: 'light_results_{usage_hash}'
  }
};
```

### Server-Side Caching (if applicable)

- **CDN**: Cache plans.json, tdu-rates.json, local-taxes.json with 5-minute TTL
- **Edge Caching**: Enable for static assets (HTML/CSS/JS), 1-hour TTL
- **API Gateway**: Rate limit Power to Choose API calls to 10/minute per IP

---

## Changelog

### Version 2.0 (January 2026)

- Added contract expiration analysis fields to rankPlans response
- ETF calculation to detect per-month-remaining structures
- Added `qualityScore` field to ranked plans (0-100 scale)
- Provider name formatting now uppercase with suffixes removed
- Added duplicate plan detection for English/Spanish versions

### Version 1.5 (December 2025)

- Added CenterPoint rate update (Dec 7, 2025 effective date)
- Quality scoring system improvements
- Improved bill credit parsing for complex threshold rules

### Version 1.0 (September 2025)

- Initial schema documentation
- Power to Choose API integration
- Core calculation functions defined

---

## References

- **Power to Choose Platform**: <https://www.powertochoose.org>
- **PUCT Tariff Archive**: <https://www.puc.texas.gov/industry/electric/rates/tdarchive.aspx>
- **ERCOT Grid Data**: <https://www.ercot.com>
- **Texas Deregulation Law**: PURA §39.001 et seq.
- **EFL Requirements**: PUCT Substantive Rule §25.475

---

**Last Updated**: January 2026
