# Data Schema for plans.json Structure

## Overview

This document provides the authoritative specification for the `plans.json` data file, which contains normalized electricity plan data used by the Light calculator. The schema defines required fields, data types, validation rules, and transformation logic from raw Power to Choose API data.

---

## Table of Contents

1. [File Structure](#file-structure)
2. [Metadata Fields](#metadata-fields)
3. [Plan Object Schema](#plan-object-schema)
4. [Field Specifications](#field-specifications)
5. [Data Transformations](#data-transformations)
6. [Validation Rules](#validation-rules)
7. [Example Plan Objects](#example-plan-objects)
8. [Duplicate Plan Detection](#duplicate-plan-detection)
9. [Historical Data Format](#historical-data-format)

---

## File Structure

### Top-Level Schema

```json
{
  "last_updated": "ISO 8601 datetime string",
  "data_source": "string (source attribution)",
  "total_plans": "integer (count of plans array)",
  "disclaimer": "string (legal disclaimer)",
  "plans": [
    { /* plan object */ },
    { /* plan object */ },
    ...
  ]
}
```

### Type Definitions

```typescript
interface PlansJSON {
  last_updated: string;        // ISO 8601 datetime with timezone
  data_source: string;          // "Power to Choose (https://...)"
  total_plans: number;          // Length of plans array
  disclaimer: string;           // Legal disclaimer text
  plans: Plan[];                // Array of plan objects
}
```

---

## Metadata Fields

### last_updated

**Type:** String (ISO 8601 datetime with timezone)
**Required:** Yes
**Format:** `YYYY-MM-DDTHH:MM:SS.ssssss+00:00`
**Example:** `"2026-01-08T08:09:12.312755+00:00"`

**Purpose:** Timestamp indicating when data was fetched from Power to Choose API.

**Generation:**

```python
from datetime import datetime, timezone
last_updated = datetime.now(timezone.utc).isoformat()
```

**UI Display:**

```javascript
const date = new Date(data.last_updated);
const displayDate = date.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});
// "Jan 8, 2026"
```

### data_source

**Type:** String
**Required:** Yes
**Fixed Value:** `"Power to Choose (https://www.powertochoose.org)"`

**Purpose:** Attribution to data source for transparency and compliance.

### total_plans

**Type:** Integer
**Required:** Yes
**Validation:** Must equal `plans.length`

**Purpose:** Quick count without parsing entire plans array. Useful for metadata display and data integrity checks.

### disclaimer

**Type:** String
**Required:** Yes
**Recommended Value:**

```bash
"Plan information is subject to change. All rates, terms, and conditions should be verified with the provider before enrollment. Light is not affiliated with any Retail Electric Provider and does not earn commissions. Data sourced from Power to Choose, the official PUCT comparison platform."
```

**Purpose:** Legal disclaimer protecting users and application from data inaccuracies.

---

## Plan Object Schema

### Complete TypeScript Interface

```typescript
interface Plan {
  // Identification
  plan_id: string;                    // Unique plan identifier
  rep_name: string;                   // Retail Electric Provider (UPPERCASE)
  plan_name: string;                  // Marketing name of plan

  // Service Area
  tdu_area: TDUCode;                  // TDU service area code

  // Pricing (cents per kWh, includes TDU charges)
  price_kwh_500: number;              // Rate at 500 kWh usage
  price_kwh_1000: number;             // Rate at 1,000 kWh usage
  price_kwh_2000: number;             // Rate at 2,000 kWh usage

  // Contract Terms
  term_months: number;                // Contract length in months
  rate_type: "FIXED";                 // Always "FIXED" (filtered)
  renewable_pct: number;              // Renewable energy percentage (0-100)

  // Plan Type Flags
  is_prepaid: boolean;                // Is prepaid plan
  is_tou: boolean;                    // Is time-of-use plan

  // Fees and Charges
  early_termination_fee: number;      // ETF in dollars (may be per-month)
  base_charge_monthly: number;        // REP base charge in dollars

  // Documentation URLs
  efl_url: string;                    // Electricity Facts Label PDF
  enrollment_url: string;             // Direct signup link
  terms_url: string;                  // Terms and conditions page

  // Additional Information
  special_terms: string;              // Bill credits, restrictions
  promotion_details: string;          // Limited-time offers
  fees_credits: string;               // Fee/credit descriptions
  min_usage_fees: string;             // Minimum usage penalties
}

type TDUCode =
  | "ONCOR"
  | "CENTERPOINT"
  | "AEP_CENTRAL"
  | "AEP_NORTH"
  | "TNMP"
  | "LPL";
```

---

## Field Specifications

### plan_id

**Type:** String
**Required:** Yes
**Source:** Power to Choose `ID` field
**Uniqueness:** Should be unique, but duplicates possible for English/Spanish versions
**Example:** `"4EE1FC26-B5D4-4F9E-9B8E-4A7C8B3E9D12"`

**Validation:**

```javascript
assert(typeof plan_id === 'string' && plan_id.length > 0);
assert(plan_id.match(/^[A-Z0-9-]+$/i));  // Alphanumeric + hyphens
```

**Notes:**

- REPs may change plan_id when updating plans
- Not suitable as long-term stable identifier
- Combine with rep_name and plan_name for better uniqueness

### rep_name

**Type:** String
**Required:** Yes
**Format:** UPPERCASE, legal suffixes removed
**Source:** Power to Choose `REP` field (transformed)
**Example:** `"TXU ENERGY RETAIL"` (not "TXU Energy Retail Company LLC")

**Transformation:**

```javascript
function formatProviderName(rawName) {
    return rawName
        .toUpperCase()
        .replace(/\s+(LLC|INC|L\.P\.|LP|COMPANY|CO\.|& CO\.?|RETAIL COMPANY)$/gi, '')
        .replace(/\s+\(TX\)|\(TEXAS\)/gi, '')
        .trim();
}
```

**Validation:**

```javascript
assert(rep_name === rep_name.toUpperCase());
assert(rep_name.length >= 2 && rep_name.length <= 50);
assert(!rep_name.match(/\b(LLC|INC|L\.P\.|LP)\b/i));  // Suffixes removed
```

**Common Providers:**

- `"TXU ENERGY RETAIL"`
- `"RELIANT ENERGY RETAIL SERVICES"`
- `"DIRECT ENERGY"`
- `"GEXA ENERGY"`
- `"CHAMPION ENERGY SERVICES"`
- `"FRONTIER UTILITIES"`

### plan_name

**Type:** String
**Required:** Yes
**Format:** As provided by REP (not transformed)
**Source:** Power to Choose `Product` field
**Example:** `"Champion 12-Month Plan"`

**Validation:**

```javascript
assert(typeof plan_name === 'string');
assert(plan_name.length >= 5 && plan_name.length <= 200);
```

**Notes:**

- May contain version numbers: "Plan v2.1"
- May include promotional text: "Holiday Special 2026"
- Duplicate names possible across different REPs

### tdu_area

**Type:** Enum String
**Required:** Yes
**Allowed Values:** `"ONCOR"`, `"CENTERPOINT"`, `"AEP_CENTRAL"`, `"AEP_NORTH"`, `"TNMP"`, `"LPL"`
**Source:** Power to Choose `TDU` field (normalized)

**Normalization Mapping:**

```javascript
const tduNormalization = {
  "Oncor Electric Delivery": "ONCOR",
  "Oncor": "ONCOR",
  "ONCOR": "ONCOR",

  "CenterPoint Energy Houston Electric": "CENTERPOINT",
  "CenterPoint": "CENTERPOINT",
  "CENTERPOINT": "CENTERPOINT",

  "AEP Texas Central": "AEP_CENTRAL",
  "AEP Central": "AEP_CENTRAL",
  "TNMP South": "AEP_CENTRAL",  // Legacy name

  "AEP Texas North": "AEP_NORTH",
  "AEP North": "AEP_NORTH",
  "AEP TCC": "AEP_NORTH",  // Legacy name
  "AEP TNC": "AEP_NORTH",  // Legacy name

  "Texas-New Mexico Power": "TNMP",
  "TNMP": "TNMP",
  "Texas New Mexico Power": "TNMP",

  "Lubbock Power & Light": "LPL",
  "Lubbock P&L": "LPL",
  "LPL": "LPL"
};
```

**Validation:**

```javascript
const validTDUs = ["ONCOR", "CENTERPOINT", "AEP_CENTRAL", "AEP_NORTH", "TNMP", "LPL"];
assert(validTDUs.includes(tdu_area));
```

### price_kwh_500 / price_kwh_1000 / price_kwh_2000

**Type:** Float
**Required:** Yes (all three)
**Unit:** Cents per kilowatt-hour
**Source:** Power to Choose `KWH500`, `KWH1000`, `KWH2000` fields
**Range:** 5.0 - 50.0 (typical), may exceed for specialty plans

**Validation:**

```javascript
assert(typeof price_kwh_500 === 'number' && !isNaN(price_kwh_500));
assert(price_kwh_500 >= 5.0 && price_kwh_500 <= 50.0);
assert(typeof price_kwh_1000 === 'number' && !isNaN(price_kwh_1000));
assert(price_kwh_1000 >= 5.0 && price_kwh_1000 <= 50.0);
assert(typeof price_kwh_2000 === 'number' && !isNaN(price_kwh_2000));
assert(price_kwh_2000 >= 5.0 && price_kwh_2000 <= 50.0);

// Sanity check: price generally decreases with higher usage
// (but bill credit plans violate this, so it's a warning not error)
if (price_kwh_500 < price_kwh_1000) {
  console.warn(`Plan ${plan_id}: 500 kWh price lower than 1000 kWh (possible gimmick)`);
}
```

**Important Notes:**

- Prices are **all-inclusive**: energy + TDU charges + base fees
- Directly from EFL (Electricity Facts Label), PUCT-mandated format
- Represent **average price** at that usage level, not marginal rate
- Used for interpolation to calculate cost at arbitrary usage levels

**Typical Patterns:**

```bash
Good Simple Plan:  13.5¢ → 10.0¢ → 9.8¢  (decreasing, reasonable variance)
Bill Credit Trap:  24.0¢ → 9.9¢ → 12.0¢  (dramatic drop at 1000, spike at 2000)
Flat-ish Plan:     10.5¢ → 10.2¢ → 10.0¢ (minimal variance, predictable)
```

### term_months

**Type:** Integer
**Required:** Yes
**Unit:** Months
**Source:** Power to Choose `TermLength` field
**Range:** 1-36 (typical), 1 = month-to-month

**Validation:**

```javascript
assert(Number.isInteger(term_months));
assert(term_months >= 1 && term_months <= 36);
```

**Common Values:**

- 1 month: Month-to-month (no commitment)
- 6 months: Short-term fixed
- 12 months: Most common
- 24 months: Long-term savings
- 36 months: Maximum lock-in

**Contract Expiration Analysis:**
Best contract lengths depend on start date to avoid expensive renewal seasons.

### rate_type

**Type:** Enum String
**Required:** Yes
**Fixed Value:** `"FIXED"` (variable/indexed plans filtered out)
**Source:** Power to Choose `RateType` field

**Filtering Logic:**

```python
def should_include_plan(plan_data):
    return plan_data['RateType'].upper() == 'FIXED'
```

**Rationale:**
Variable and indexed-rate plans expose users to unpredictable costs. Light focuses exclusively on fixed-rate plans for consumer protection.

### renewable_pct

**Type:** Integer
**Required:** Yes
**Unit:** Percentage (0-100)
**Source:** Power to Choose `Renewable` field
**Default:** 0 (if not specified)

**Validation:**

```javascript
assert(Number.isInteger(renewable_pct));
assert(renewable_pct >= 0 && renewable_pct <= 100);
```

**Interpretation:**

- 0%: Standard Texas grid mix (~33% renewable)
- 25-49%: Partial renewable content
- 50-99%: Majority renewable
- 100%: Fully renewable (wind/solar credits)

**User Filter:**
Allows filtering to plans with ≥50% or 100% renewable content.

### is_prepaid

**Type:** Boolean
**Required:** Yes
**Source:** Power to Choose `PrepaidYN` field
**Default:** `false`

**Transformation:**

```javascript
is_prepaid = (rawData.PrepaidYN === 'Y' || rawData.PrepaidProduct === true);
```

**Validation:**

```javascript
assert(typeof is_prepaid === 'boolean');
```

**Notes:**

- Prepaid plans not currently displayed in Light (filtered out)
- Different payment structure makes comparison difficult
- May be added as separate category in future

### is_tou

**Type:** Boolean
**Required:** Yes
**Source:** Power to Choose `TimeOfUseYN` field
**Default:** `false`

**Transformation:**

```javascript
is_tou = (rawData.TimeOfUseYN === 'Y');
```

**Validation:**

```javascript
assert(typeof is_tou === 'boolean');
```

**Usage:**

- Flags plans requiring off-peak usage shifting
- Includes "Free Nights" and "Free Weekends" plans
- Triggers warning in UI: "Most households save more with fixed-rate plans"

### early_termination_fee

**Type:** Float
**Required:** Yes
**Unit:** Dollars
**Source:** Power to Choose `CancelFee` field
**Default:** 0 (if not specified)

**Validation:**

```javascript
assert(typeof early_termination_fee === 'number' && !isNaN(early_termination_fee));
assert(early_termination_fee >= 0 && early_termination_fee <= 500);
```

**Fee Structure Detection:**

```javascript
// Small ETF on long contract → likely per-month-remaining
if (early_termination_fee <= 50 && term_months >= 12) {
  // Assume per-month structure: Total ETF = fee × months_remaining
  // Example: $15/month × 18 months = $270
}

// Otherwise: Flat fee regardless of timing
// Example: $150 flat
```

**Common Patterns:**

- $0: No ETF (rare, usually month-to-month)
- $10-$20: Per-month-remaining (12-36 month contracts)
- $150-$300: Flat fee (6-12 month contracts)
- $400+: High penalty (avoid unless specific need)

### base_charge_monthly

**Type:** Float
**Required:** Yes
**Unit:** Dollars per month
**Source:** Parsed from Power to Choose `Fees` field
**Default:** 0 (if not specified)

**Parsing Logic:**

```python
def extract_base_charge(fees_text):
    # Pattern: "$9.95 base charge"
    match = re.search(r'\$?(\d+\.?\d*)\s*(monthly\s+)?(base\s+)?charge', fees_text, re.I)
    if match:
        return float(match.group(1))
    return 0.0
```

**Validation:**

```javascript
assert(typeof base_charge_monthly === 'number' && !isNaN(base_charge_monthly));
assert(base_charge_monthly >= 0 && base_charge_monthly <= 30);
```

**Common Values:**

- $0: All-inclusive pricing (no separate base charge)
- $4.95-$9.95: Typical base charges
- $15-$30: High base charges (unusual)

**Impact:**
Base charges favor high-usage households and penalize low-usage customers.

### efl_url

**Type:** String (URL)
**Required:** No (empty string if unavailable)
**Source:** Power to Choose `FactsURL` field
**Format:** HTTPS URL to PDF document

**Validation:**

```javascript
if (efl_url !== '') {
  assert(efl_url.startsWith('http://') || efl_url.startsWith('https://'));
  assert(efl_url.endsWith('.pdf') || efl_url.includes('/efl/'));
}
```

**Purpose:**

- Official PUCT-mandated disclosure document
- Contains all plan details, fees, and terms
- Required reading before enrollment

### enrollment_url

**Type:** String (URL)
**Required:** No (empty string if unavailable)
**Source:** Power to Choose `EnrollURL` field
**Format:** HTTPS URL to provider's signup page

**Validation:**

```javascript
if (enrollment_url !== '') {
  assert(enrollment_url.startsWith('http://') || enrollment_url.startsWith('https://'));
}
```

**Purpose:**
Deep link to plan-specific signup page for user convenience.

### terms_url

**Type:** String (URL)
**Required:** No (empty string if unavailable)
**Source:** Power to Choose `Website` field or constructed
**Format:** HTTPS URL to terms and conditions

**Validation:**

```javascript
if (terms_url !== '') {
  assert(terms_url.startsWith('http://') || terms_url.startsWith('https://'));
}
```

### special_terms

**Type:** String
**Required:** No (empty string if none)
**Source:** Power to Choose `SpecialTerms` field
**Format:** Free-text description

**Common Content:**

- Bill credit conditions: "$100 credit when usage is 1000-1050 kWh"
- Minimum usage requirements: "Minimum 500 kWh per month or $25 fee"
- Auto-renewal terms: "Automatically renews at variable rate"
- Promotional conditions: "Rate valid for first 12 months only"

**Parsing:**
Used by `calculateBillCredits()` and warning detection functions.

### promotion_details

**Type:** String
**Required:** No (empty string if none)
**Source:** Power to Choose `PromotionDesc` field
**Format:** Free-text description

**Common Content:**

- "$100 Visa gift card after 60 days of service"
- "First month free with annual contract"
- "No deposit required with credit check"

**Notes:**
Promotions often have eligibility requirements and redemption complexities. Not factored into cost calculations.

### fees_credits

**Type:** String
**Required:** No (empty string if none)
**Source:** Power to Choose `Fees` field
**Format:** Free-text description

**Common Content:**

- "$9.95 monthly base charge"
- "$50 returned payment fee"
- "$20 late payment fee"
- "$25 disconnect/reconnect fee"

### min_usage_fees

**Type:** String
**Required:** No (empty string if none)
**Source:** Power to Choose `MinUsageFees` field
**Format:** Free-text description

**Common Content:**

- "$25 fee if usage below 500 kWh"
- "Minimum 1000 kWh usage required"
- "No minimum usage requirement"

**Impact:**
Penalizes low-usage customers. Important for apartments and seasonal properties.

---

## Data Transformations

### From Power to Choose API to plans.json

```python
def transform_plan(raw_plan):
    return {
        'plan_id': raw_plan['ID'],
        'rep_name': format_provider_name(raw_plan['REP']),
        'plan_name': raw_plan['Product'].strip(),
        'tdu_area': normalize_tdu_code(raw_plan['TDU']),
        'price_kwh_500': float(raw_plan['KWH500']),
        'price_kwh_1000': float(raw_plan['KWH1000']),
        'price_kwh_2000': float(raw_plan['KWH2000']),
        'term_months': int(raw_plan['TermLength']),
        'rate_type': 'FIXED',  # Pre-filtered
        'renewable_pct': int(raw_plan.get('Renewable', 0)),
        'is_prepaid': raw_plan.get('PrepaidYN', 'N') == 'Y',
        'is_tou': raw_plan.get('TimeOfUseYN', 'N') == 'Y',
        'early_termination_fee': float(raw_plan.get('CancelFee', 0)),
        'base_charge_monthly': extract_base_charge(raw_plan.get('Fees', '')),
        'efl_url': raw_plan.get('FactsURL', ''),
        'enrollment_url': raw_plan.get('EnrollURL', ''),
        'terms_url': raw_plan.get('Website', ''),
        'special_terms': raw_plan.get('SpecialTerms', ''),
        'promotion_details': raw_plan.get('PromotionDesc', ''),
        'fees_credits': raw_plan.get('Fees', ''),
        'min_usage_fees': raw_plan.get('MinUsageFees', '')
    }
```

---

## Validation Rules

### Pre-Save Validation

```python
def validate_plan(plan):
    # Required fields
    assert plan['plan_id'], "Missing plan_id"
    assert plan['rep_name'], "Missing rep_name"
    assert plan['plan_name'], "Missing plan_name"

    # TDU validation
    valid_tdus = ['ONCOR', 'CENTERPOINT', 'AEP_CENTRAL', 'AEP_NORTH', 'TNMP', 'LPL']
    assert plan['tdu_area'] in valid_tdus, f"Invalid TDU: {plan['tdu_area']}"

    # Price validation
    for field in ['price_kwh_500', 'price_kwh_1000', 'price_kwh_2000']:
        price = plan[field]
        assert isinstance(price, (int, float)), f"{field} not numeric"
        assert 5.0 <= price <= 50.0, f"{field} out of range: {price}"

    # Term validation
    assert isinstance(plan['term_months'], int), "term_months not integer"
    assert 1 <= plan['term_months'] <= 36, f"term_months out of range: {plan['term_months']}"

    # Type validation
    assert plan['rate_type'] == 'FIXED', f"Non-fixed rate type: {plan['rate_type']}"
    assert isinstance(plan['is_prepaid'], bool), "is_prepaid not boolean"
    assert isinstance(plan['is_tou'], bool), "is_tou not boolean"

    # Fee validation
    assert isinstance(plan['early_termination_fee'], (int, float)), "ETF not numeric"
    assert 0 <= plan['early_termination_fee'] <= 500, f"ETF out of range: {plan['early_termination_fee']}"
    assert isinstance(plan['base_charge_monthly'], (int, float)), "Base charge not numeric"
    assert 0 <= plan['base_charge_monthly'] <= 30, f"Base charge out of range: {plan['base_charge_monthly']}"

    # Renewable percentage
    assert isinstance(plan['renewable_pct'], int), "renewable_pct not integer"
    assert 0 <= plan['renewable_pct'] <= 100, f"renewable_pct out of range: {plan['renewable_pct']}"

    return True
```

---

## Example Plan Objects

### Example 1: Simple Fixed-Rate Plan

```json
{
  "plan_id": "ABC123-DEF456",
  "rep_name": "CHAMPION ENERGY SERVICES",
  "plan_name": "Champion 12-Month Fixed",
  "tdu_area": "ONCOR",
  "price_kwh_500": 13.2,
  "price_kwh_1000": 10.1,
  "price_kwh_2000": 9.8,
  "term_months": 12,
  "rate_type": "FIXED",
  "renewable_pct": 0,
  "is_prepaid": false,
  "is_tou": false,
  "early_termination_fee": 150.0,
  "base_charge_monthly": 9.95,
  "efl_url": "https://example.com/efl.pdf",
  "enrollment_url": "https://example.com/enroll",
  "terms_url": "https://example.com/terms",
  "special_terms": "",
  "promotion_details": "",
  "fees_credits": "$9.95 monthly base charge",
  "min_usage_fees": ""
}
```

### Example 2: Bill Credit Gimmick Plan

```json
{
  "plan_id": "GIM456-ICK789",
  "rep_name": "DECEPTIVE ENERGY",
  "plan_name": "Amazing Low Rate 12",
  "tdu_area": "CENTERPOINT",
  "price_kwh_500": 24.5,
  "price_kwh_1000": 9.9,
  "price_kwh_2000": 15.2,
  "term_months": 12,
  "rate_type": "FIXED",
  "renewable_pct": 0,
  "is_prepaid": false,
  "is_tou": false,
  "early_termination_fee": 15.0,
  "base_charge_monthly": 9.95,
  "efl_url": "https://example.com/efl2.pdf",
  "enrollment_url": "https://example.com/enroll2",
  "terms_url": "https://example.com/terms2",
  "special_terms": "$120 bill credit when usage is between 1000-1050 kWh",
  "promotion_details": "$50 gift card after 60 days",
  "fees_credits": "$9.95 monthly base charge",
  "min_usage_fees": ""
}
```

### Example 3: 100% Renewable Plan

```json
{
  "plan_id": "GRN789-ECO012",
  "rep_name": "GREEN MOUNTAIN ENERGY",
  "plan_name": "Pollution Free 12",
  "tdu_area": "CENTERPOINT",
  "price_kwh_500": 14.1,
  "price_kwh_1000": 11.5,
  "price_kwh_2000": 10.9,
  "term_months": 12,
  "rate_type": "FIXED",
  "renewable_pct": 100,
  "is_prepaid": false,
  "is_tou": false,
  "early_termination_fee": 195.0,
  "base_charge_monthly": 9.95,
  "efl_url": "https://example.com/efl3.pdf",
  "enrollment_url": "https://example.com/enroll3",
  "terms_url": "https://example.com/terms3",
  "special_terms": "",
  "promotion_details": "",
  "fees_credits": "$9.95 monthly base charge",
  "min_usage_fees": ""
}
```

---

## Duplicate Plan Detection

### Problem: English/Spanish Duplicate Plans

Some REPs list identical plans in both English and Spanish versions with different plan_ids but identical pricing and terms.

**Example:**

```json
{
  "plan_id": "EN-12345",
  "rep_name": "RELIANT ENERGY RETAIL SERVICES",
  "plan_name": "Truly Simple 12",
  "price_kwh_500": 13.0,
  "price_kwh_1000": 10.5,
  "price_kwh_2000": 10.0,
  "term_months": 12
}

{
  "plan_id": "ES-12345",
  "rep_name": "RELIANT ENERGY RETAIL SERVICES",
  "plan_name": "Verdaderamente Simple 12",
  "price_kwh_500": 13.0,
  "price_kwh_1000": 10.5,
  "price_kwh_2000": 10.0,
  "term_months": 12
}
```

### Detection Algorithm

```javascript
function detectDuplicatePlans(plans) {
  const seen = new Map();
  const duplicates = [];

  for (const plan of plans) {
    // Create fingerprint from key fields
    const fingerprint = JSON.stringify({
      rep: plan.rep_name,
      tdu: plan.tdu_area,
      p500: plan.price_kwh_500,
      p1000: plan.price_kwh_1000,
      p2000: plan.price_kwh_2000,
      term: plan.term_months,
      etf: plan.early_termination_fee,
      base: plan.base_charge_monthly
    });

    if (seen.has(fingerprint)) {
      duplicates.push({
        original: seen.get(fingerprint),
        duplicate: plan
      });
    } else {
      seen.set(fingerprint, plan);
    }
  }

  return duplicates;
}
```

### Deduplication Strategy

```javascript
function deduplicatePlans(plans) {
  const fingerprintMap = new Map();

  for (const plan of plans) {
    const fingerprint = createFingerprint(plan);

    if (!fingerprintMap.has(fingerprint)) {
      fingerprintMap.set(fingerprint, plan);
    } else {
      // Keep the English version (prefer non-Spanish plan names)
      const existing = fingerprintMap.get(fingerprint);
      if (isSpanishPlan(existing) && !isSpanishPlan(plan)) {
        fingerprintMap.set(fingerprint, plan);
      }
    }
  }

  return Array.from(fingerprintMap.values());
}

function isSpanishPlan(plan) {
  const spanishKeywords = ['verdaderamente', 'simple', 'fijo', 'renovable', 'energía'];
  const name = plan.plan_name.toLowerCase();
  return spanishKeywords.some(keyword => name.includes(keyword));
}
```

### User Notification

When duplicates are detected, notify user:

```bash
"Note: {count} duplicate plans removed (English/Spanish versions of same plan)"
```

---

## Historical Data Format

Historical plan data stored in `data/historical/plans_YYYY-MM-DD.json` uses identical schema to current `plans.json`.

### Filename Convention

```bash
plans_2026-01-08.json
plans_2026-01-09.json
plans_2026-01-10.json
```

### Usage

```javascript
// Load historical data for comparison
const current = await fetch('/data/plans.json').then(r => r.json());
const historical = await fetch('/data/historical/plans_2025-12-01.json').then(r => r.json());

// Compare plan counts
console.log(`Plan count change: ${historical.total_plans} → ${current.total_plans}`);

// Track specific plan's rate history
const planHistory = historical.plans.find(p => p.plan_id === targetPlanId);
```

### Retention Policy

- **Current:** Unlimited retention (files never deleted)
- **Previous (90-day):** To be updated to unlimited per requirements
- **Git Repository:** All historical files tracked in version control

---

## JSON Schema Definition

For programmatic validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["last_updated", "data_source", "total_plans", "disclaimer", "plans"],
  "properties": {
    "last_updated": {
      "type": "string",
      "format": "date-time"
    },
    "data_source": {
      "type": "string"
    },
    "total_plans": {
      "type": "integer",
      "minimum": 0
    },
    "disclaimer": {
      "type": "string"
    },
    "plans": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "plan_id", "rep_name", "plan_name", "tdu_area",
          "price_kwh_500", "price_kwh_1000", "price_kwh_2000",
          "term_months", "rate_type", "renewable_pct",
          "is_prepaid", "is_tou", "early_termination_fee",
          "base_charge_monthly"
        ],
        "properties": {
          "plan_id": { "type": "string", "minLength": 1 },
          "rep_name": { "type": "string", "minLength": 2, "maxLength": 50 },
          "plan_name": { "type": "string", "minLength": 5, "maxLength": 200 },
          "tdu_area": {
            "type": "string",
            "enum": ["ONCOR", "CENTERPOINT", "AEP_CENTRAL", "AEP_NORTH", "TNMP", "LPL"]
          },
          "price_kwh_500": { "type": "number", "minimum": 5.0, "maximum": 50.0 },
          "price_kwh_1000": { "type": "number", "minimum": 5.0, "maximum": 50.0 },
          "price_kwh_2000": { "type": "number", "minimum": 5.0, "maximum": 50.0 },
          "term_months": { "type": "integer", "minimum": 1, "maximum": 36 },
          "rate_type": { "type": "string", "enum": ["FIXED"] },
          "renewable_pct": { "type": "integer", "minimum": 0, "maximum": 100 },
          "is_prepaid": { "type": "boolean" },
          "is_tou": { "type": "boolean" },
          "early_termination_fee": { "type": "number", "minimum": 0, "maximum": 500 },
          "base_charge_monthly": { "type": "number", "minimum": 0, "maximum": 30 },
          "efl_url": { "type": "string" },
          "enrollment_url": { "type": "string" },
          "terms_url": { "type": "string" },
          "special_terms": { "type": "string" },
          "promotion_details": { "type": "string" },
          "fees_credits": { "type": "string" },
          "min_usage_fees": { "type": "string" }
        }
      }
    }
  }
}
```

---

## References

- **Power to Choose API**: <http://api.powertochoose.org/>
- **PUCT EFL Requirements**: §25.475
- **JSON Schema Specification**: <https://json-schema.org/>

---

**Document Version**: 2.0
**Last Updated**: January 2026
**Maintained By**: Light Project Contributors
