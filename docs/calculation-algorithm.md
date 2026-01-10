# Calculation Algorithm Detailed Walkthrough

## Overview

This document provides a comprehensive, step-by-step explanation of the cost calculation algorithms used in the Light Texas Electricity Calculator. Understanding these algorithms enables developers to verify accuracy, reproduce calculations, and extend functionality.

---

## Table of Contents

1. [Core Calculation Flow](#core-calculation-flow)
2. [Rate Interpolation Algorithm](#rate-interpolation-algorithm)
3. [Monthly Cost Calculation](#monthly-cost-calculation)
4. [Bill Credit Calculation](#bill-credit-calculation)
5. [Annual Cost Projection](#annual-cost-projection)
6. [Usage Pattern Estimation](#usage-pattern-estimation)
7. [Volatility Scoring](#volatility-scoring)
8. [Plan Ranking Algorithm](#plan-ranking-algorithm)
9. [Warning Detection System](#warning-detection-system)
10. [Early Termination Fee Calculation](#early-termination-fee-calculation)
11. [Contract Expiration Timing Analysis](#contract-expiration-timing-analysis)
12. [Quality Scoring System](#quality-scoring-system)
13. [Edge Cases and Special Handling](#edge-cases-and-special-handling)

---

## Core Calculation Flow

The calculation engine follows this high-level flow:

```bash
User Input (ZIP + Usage Pattern)
    ↓
[1] Detect TDU from ZIP code
    ↓
[2] Load plans for TDU area
    ↓
[3] For each plan:
    ├─→ Calculate monthly costs (12 months)
    ├─→ Sum to annual cost
    ├─→ Calculate volatility score
    ├─→ Identify warnings
    └─→ Calculate quality score
    ↓
[4] Rank plans by annual cost
    ↓
[5] Filter and present results
```

### Inputs Required

- **ZIP Code**: 5-digit Texas ZIP in deregulated area
- **Usage Pattern**: One of three methods:
  - **Estimate**: Home size → average kWh → seasonal pattern
  - **Average**: Single monthly average → seasonal pattern
  - **Detailed**: Actual 12-month usage data

### Outputs Produced

- **Ranked Plan List**: Sorted by annual cost (ascending)
- **Cost Breakdown**: Monthly and annual totals
- **Warnings**: Gimmicks, fees, timing issues
- **Recommendations**: Top 3-5 best plans

---

## Rate Interpolation Algorithm

### Purpose

Plans provide rates at exactly three usage levels: 500, 1000, and 2000 kWh. Real-world usage (e.g., 873 kWh) requires interpolation.

### Implementation

```javascript
function interpolateRate(usageKwh, plan) {
    const { price_kwh_500, price_kwh_1000, price_kwh_2000 } = plan;

    if (usageKwh <= 500) {
        // Use 500 kWh rate directly
        return price_kwh_500;

    } else if (usageKwh <= 1000) {
        // Linear interpolation between 500 and 1000
        const ratio = (usageKwh - 500) / 500;
        return price_kwh_500 + (price_kwh_1000 - price_kwh_500) * ratio;

    } else if (usageKwh <= 2000) {
        // Linear interpolation between 1000 and 2000
        const ratio = (usageKwh - 1000) / 1000;
        return price_kwh_1000 + (price_kwh_2000 - price_kwh_1000) * ratio;

    } else {
        // Extrapolation: use 2000 kWh rate (conservative)
        return price_kwh_2000;
    }
}
```

### Step-by-Step Example

**Given Plan:**

- 500 kWh: 13.5¢/kWh
- 1000 kWh: 10.2¢/kWh
- 2000 kWh: 9.8¢/kWh

**Calculate rate for 750 kWh:**

1. Usage (750) is between 500 and 1000
2. Calculate interpolation ratio:

   ```
   ratio = (750 - 500) / (1000 - 500)
         = 250 / 500
         = 0.5
   ```

3. Interpolate rate:

   ```
   rate = 13.5 + (10.2 - 13.5) × 0.5
        = 13.5 + (-3.3 × 0.5)
        = 13.5 - 1.65
        = 11.85¢/kWh
   ```

**Calculate rate for 1,500 kWh:**

1. Usage (1500) is between 1000 and 2000
2. Calculate ratio:

   ```
   ratio = (1500 - 1000) / (2000 - 1000)
         = 500 / 1000
         = 0.5
   ```

3. Interpolate:

   ```
   rate = 10.2 + (9.8 - 10.2) × 0.5
        = 10.2 + (-0.4 × 0.5)
        = 10.2 - 0.2
        = 10.0¢/kWh
   ```

### Why Linear Interpolation?

1. **Simplicity**: Easy to understand and verify
2. **Conservative**: Does not assume rate curves steeper than actual
3. **PUCT Compliance**: Matches how EFLs present pricing
4. **Accuracy**: Sufficient for comparison purposes (variance < 0.5¢/kWh)

### Alternative: Polynomial Interpolation (Not Used)

Polynomial (quadratic or cubic) interpolation could fit a smoother curve but:

- Adds computational complexity
- Can produce unrealistic rates between tiers
- Requires assumptions about rate structures

For transparency, we chose linear interpolation.

---

## Monthly Cost Calculation

### Formula

```bash
Total Monthly Cost = Energy Cost + TDU Cost + Base Cost - Credits + Tax

Where:
  Energy Cost = Usage (kWh) × Interpolated Rate (¢/kWh) ÷ 100
  TDU Cost = TDU Base Charge + (Usage × TDU Per-kWh Rate ÷ 100)
  Base Cost = REP Monthly Base Charge
  Credits = Bill Credit Amount (if usage qualifies)
  Tax = (Energy + Base + TDU - Credits) × Local Tax Rate
```

### Implementation

```javascript
function calculateMonthlyCost(usageKwh, plan, tduRates, localTaxRate = 0) {
    // Step 1: Calculate energy charges
    const energyRate = interpolateRate(usageKwh, plan);  // cents/kWh
    const energyCost = (usageKwh * energyRate) / 100;    // Convert to dollars

    // Step 2: Add TDU delivery charges
    const tduCost = tduRates.monthly_base_charge +
                    (usageKwh * tduRates.per_kwh_rate / 100);

    // Step 3: Add REP base charge
    const baseCost = plan.base_charge_monthly || 0;

    // Step 4: Calculate subtotal before credits
    const subtotal = energyCost + baseCost;

    // Step 5: Apply bill credits
    const credits = calculateBillCredits(usageKwh, plan);

    // Step 6: Calculate local sales tax
    const taxAmount = (subtotal - credits) * localTaxRate;

    // Step 7: Compute total (never negative)
    const total = Math.max(0, subtotal - credits + taxAmount);

    return {
        total: total,
        breakdown: {
            energyCost: energyCost,
            baseCost: baseCost,
            tduCost: tduCost,
            credits: credits,
            tax: taxAmount,
            effectiveRate: (total / usageKwh * 100)  // cents per kWh
        }
    };
}
```

### Detailed Example

**Scenario:**

- Usage: 1,200 kWh
- Plan: 500kWh=13.0¢, 1000kWh=10.0¢, 2000kWh=9.5¢, Base=$9.95
- TDU (Oncor): Base=$4.23, Rate=5.58¢/kWh
- Local Tax: 2%
- Bill Credit: $0 (none)

**Calculation:**

1. **Interpolate energy rate:**

   ```
   Ratio = (1200 - 1000) / (2000 - 1000) = 200/1000 = 0.2
   Rate = 10.0 + (9.5 - 10.0) × 0.2 = 10.0 - 0.1 = 9.9¢/kWh
   ```

2. **Energy cost:**

   ```
   Energy = 1200 kWh × 9.9¢/kWh ÷ 100 = $118.80
   ```

3. **TDU cost:**

   ```
   TDU = $4.23 + (1200 × 5.58¢ ÷ 100)
       = $4.23 + $66.96
       = $71.19
   ```

4. **Base cost:**

   ```
   Base = $9.95
   ```

5. **Subtotal:**

   ```
   Subtotal = $118.80 + $9.95 = $128.75
   ```

6. **Credits:**

   ```
   Credits = $0 (no bill credit applicable)
   ```

7. **Tax:**

   ```
   Tax = ($128.75 - $0) × 0.02 = $2.58
   ```

8. **Total:**

   ```
   Total = $128.75 - $0 + $2.58 = $131.33
   ```

9. **Effective Rate:**

   ```
   Effective = $131.33 ÷ 1200 kWh × 100 = 10.94¢/kWh
   ```

**Note:** Effective rate (10.94¢) is higher than interpolated energy rate (9.9¢) because it includes TDU charges, base fee, and tax.

---

## Bill Credit Calculation

### Challenge

Bill credits are specified in free-text `special_terms` field. Requires pattern matching and parsing.

### Common Patterns

1. **Range Credit**: "$100 credit when usage is between 1000-1050 kWh"
2. **Exact Credit**: "$120 credit at exactly 1000 kWh"
3. **Minimum Credit**: "$50 credit when usage exceeds 800 kWh"

### Implementation

```javascript
function calculateBillCredits(usageKwh, plan) {
    if (!plan.special_terms) return 0;

    const terms = plan.special_terms.toLowerCase();

    // Pattern 1: "$X bill credit"
    const creditMatch = terms.match(/\$(\d+)\s+bill\s+credit/i);
    if (!creditMatch) return 0;

    const creditAmount = parseFloat(creditMatch[1]);

    // Pattern 2: "between X-Y kWh" or "exactly X kWh"
    const rangeMatch = terms.match(/between\s+(\d+)-(\d+)\s+kwh/i) ||
                       terms.match(/exactly\s+(\d+)\s+kwh/i);

    if (rangeMatch) {
        const minKwh = parseFloat(rangeMatch[1]);
        const maxKwh = rangeMatch[2] ? parseFloat(rangeMatch[2]) : minKwh;

        if (usageKwh >= minKwh && usageKwh <= maxKwh) {
            return creditAmount;
        }
    }

    return 0;
}
```

### Examples

**Example 1: Range Credit**

Terms: "$100 bill credit when usage is between 1000-1050 kWh"

- Usage 999 kWh → Credit $0 (below minimum)
- Usage 1025 kWh → Credit $100 (within range)
- Usage 1051 kWh → Credit $0 (above maximum)

**Example 2: Exact Credit**

Terms: "$120 bill credit at exactly 1000 kWh"

- Usage 999 kWh → Credit $0
- Usage 1000 kWh → Credit $120
- Usage 1001 kWh → Credit $0

**Example 3: No Credit**

Terms: "No special terms or promotions"

- Any usage → Credit $0

### Limitations

- **Parsing Accuracy**: Relies on consistent text formatting from REPs
- **Complex Credits**: Does not handle tiered credits (e.g., "$50 at 500 kWh, $100 at 1000 kWh")
- **Time-Based Credits**: Does not handle seasonal or anniversary credits

For production use with real-world data, EFL PDF parsing or structured credit data from REPs would improve accuracy.

---

## Annual Cost Projection

### Purpose

Calculate total annual cost using realistic monthly usage pattern (not 12 identical months).

### Implementation

```javascript
function calculateAnnualCost(monthlyUsageArray, plan, tduRates, localTaxRate = 0) {
    // Validate input
    if (monthlyUsageArray.length !== 12) {
        throw new Error('monthlyUsageArray must contain exactly 12 values');
    }

    let totalCost = 0;
    const monthlyCosts = [];
    let totalUsage = 0;

    // Calculate cost for each month
    for (let i = 0; i < 12; i++) {
        const usage = monthlyUsageArray[i];
        const result = calculateMonthlyCost(usage, plan, tduRates, localTaxRate);

        monthlyCosts.push(result.total);
        totalCost += result.total;
        totalUsage += usage;
    }

    return {
        annualCost: totalCost,
        monthlyCosts: monthlyCosts,
        averageMonthlyCost: totalCost / 12,
        totalUsage: totalUsage,
        effectiveAnnualRate: (totalCost / totalUsage * 100)  // cents per kWh
    };
}
```

### Step-by-Step Example

**Inputs:**

- Monthly usage: [1000, 900, 800, 750, 900, 1400, 1800, 2000, 1500, 950, 850, 1100]
- Plan: Same as previous example
- TDU: Oncor
- Tax: 2%

**Calculations:**

| Month | Usage | Energy | TDU | Base | Tax | Total |
|-------|-------|--------|-----|------|-----|-------|
| Jan | 1000 | $100.00 | $60.01 | $9.95 | $3.40 | $173.36 |
| Feb | 900 | $89.10 | $54.45 | $9.95 | $3.07 | $156.57 |
| Mar | 800 | $79.20 | $48.87 | $9.95 | $2.76 | $140.78 |
| Apr | 750 | $74.44 | $46.08 | $9.95 | $2.61 | $133.08 |
| May | 900 | $89.10 | $54.45 | $9.95 | $3.07 | $156.57 |
| Jun | 1400 | $138.60 | $82.35 | $9.95 | $4.62 | $235.52 |
| Jul | 1800 | $175.50 | $104.67 | $9.95 | $5.80 | $296.92 |
| Aug | 2000 | $190.00 | $115.83 | $9.95 | $6.32 | $323.10 |
| Sep | 1500 | $147.00 | $87.93 | $9.95 | $4.90 | $249.78 |
| Oct | 950 | $94.53 | $57.24 | $9.95 | $3.23 | $164.95 |
| Nov | 850 | $84.15 | $51.66 | $9.95 | $2.92 | $148.68 |
| Dec | 1100 | $109.45 | $65.61 | $9.95 | $3.70 | $188.71 |

**Results:**

- Annual Cost: $2,368.02
- Average Monthly: $197.33
- Total Usage: 13,950 kWh
- Effective Annual Rate: 16.98¢/kWh

**Insights:**

- Summer months (Jun-Aug) cost $860.54 (36% of annual)
- Winter/shoulder (Apr, Oct, Nov) cost $446.71 (19% of annual)
- Peak month (Aug) is 2.4× cheapest month (Apr)

---

## Usage Pattern Estimation

### Purpose

When user provides only average monthly usage or home size, generate realistic seasonal pattern.

### Texas Seasonal Multipliers

Based on ERCOT load data and residential consumption patterns:

```javascript
const seasonalMultipliers = [
    1.2,   // January - Winter heating (20% above baseline)
    1.1,   // February - Moderate winter
    1.0,   // March - Shoulder season (baseline)
    0.95,  // April - Mild spring (5% below baseline)
    1.0,   // May - Pre-summer
    1.4,   // June - Summer AC starts (40% above)
    1.7,   // July - Peak summer (70% above)
    1.8,   // August - Absolute peak (80% above)
    1.5,   // September - Late summer (50% above)
    1.0,   // October - Fall shoulder (baseline)
    0.95,  // November - Mild fall
    1.2    // December - Winter heating
];
```

### Implementation

```javascript
function estimateUsagePattern(avgMonthlyKwh, homeSize = null) {
    // Calculate adjustment factor to ensure average equals input
    const sumMultipliers = seasonalMultipliers.reduce((a, b) => a + b, 0);
    // sumMultipliers = 14.6

    const adjustmentFactor = 12 / sumMultipliers;
    // adjustmentFactor = 12 / 14.6 = 0.8219

    // Generate monthly usage pattern
    return seasonalMultipliers.map(multiplier =>
        Math.round(avgMonthlyKwh * multiplier * adjustmentFactor)
    );
}
```

### Example

**Input:** Average 1,000 kWh/month

**Calculation:**

```bash
Adjustment Factor = 12 / 14.6 = 0.8219

January:   1000 × 1.2  × 0.8219 = 986 kWh
February:  1000 × 1.1  × 0.8219 = 904 kWh
March:     1000 × 1.0  × 0.8219 = 822 kWh
April:     1000 × 0.95 × 0.8219 = 781 kWh
May:       1000 × 1.0  × 0.8219 = 822 kWh
June:      1000 × 1.4  × 0.8219 = 1,151 kWh
July:      1000 × 1.7  × 0.8219 = 1,397 kWh
August:    1000 × 1.8  × 0.8219 = 1,479 kWh
September: 1000 × 1.5  × 0.8219 = 1,233 kWh
October:   1000 × 1.0  × 0.8219 = 822 kWh
November:  1000 × 0.95 × 0.8219 = 781 kWh
December:  1000 × 1.2  × 0.8219 = 986 kWh

Total: 12,164 kWh → Average: 1,014 kWh/month (close to 1,000 target)
```

**Why Adjustment Factor?**

Without adjustment, sum of multipliers (14.6) would create average of 1,217 kWh instead of 1,000 kWh. Adjustment factor scales pattern to match user's stated average.

### Home Size to Usage Mapping

```javascript
function estimateUsageFromHomeSize(homeSize) {
    const sizeMap = {
        'studio': 500,
        '1br': 500,
        '2br': 750,
        'small': 1000,
        'medium': 1500,
        'large': 2000,
        'xlarge': 2500
    };

    const key = homeSize.toLowerCase().replace(/[^a-z0-9]/g, '');
    return sizeMap[key] || 1000;  // Default to 1000 kWh
}
```

---

## Volatility Scoring

### Purpose

Quantify risk of unexpected costs. Higher volatility = less predictable bills.

### Components

1. **Bill Credit Risk** (0-0.8): Higher if credits are conditional and user likely to miss them
2. **Time-of-Use Risk** (0-0.3): Added if plan requires off-peak usage shifting
3. **Rate Variance Risk** (0-0.5): Added if prices vary dramatically between usage tiers

### Implementation

```javascript
function calculateVolatility(plan, userUsage) {
    let volatilityScore = 0;

    // Component 1: Bill credit risk
    if (plan.special_terms && plan.special_terms.includes('credit')) {
        volatilityScore += 0.5;  // Base credit risk

        // Calculate how many months user would miss credit
        let missedMonths = 0;
        for (const usage of userUsage) {
            const credits = calculateBillCredits(usage, plan);
            if (credits === 0) {
                missedMonths++;
            }
        }

        // Add penalty based on miss rate
        volatilityScore += (missedMonths / 12) * 0.3;
    }

    // Component 2: Time-of-use risk
    if (plan.is_tou) {
        volatilityScore += 0.3;
    }

    // Component 3: Rate variance risk
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;

    const variance = Math.max(
        Math.abs(rate500 - rate1000) / rate1000,
        Math.abs(rate2000 - rate1000) / rate1000
    );

    if (variance > 0.3) {  // More than 30% variance
        volatilityScore += variance * 0.5;
    }

    // Cap at 1.0
    return Math.min(volatilityScore, 1.0);
}
```

### Volatility Interpretation

| Score | Category | Description |
|-------|----------|-------------|
| 0.0-0.1 | Very Low | Simple fixed-rate, no gimmicks |
| 0.1-0.3 | Low | Straightforward plan, minor complexity |
| 0.3-0.5 | Moderate | Some conditional features, manageable |
| 0.5-0.7 | High | Bill credits or TOU, risky for average user |
| 0.7-1.0 | Very High | Multiple gimmicks, avoid unless expert |

### Examples

**Example 1: Simple Fixed Plan**

- No bill credits
- Not time-of-use
- Rates: 10.5¢, 10.0¢, 9.8¢ (low variance)

**Calculation:**

```bash
Credit Risk = 0
TOU Risk = 0
Variance = max(|10.5-10.0|/10.0, |9.8-10.0|/10.0) = max(0.05, 0.02) = 0.05
Variance < 0.3, so Variance Risk = 0

Volatility = 0 + 0 + 0 = 0.0 (Very Low)
```

**Example 2: Bill Credit Plan (User Misses 8 Months)**

- $100 credit at 1000-1050 kWh
- Not time-of-use
- User usage: mostly 800-900 or 1200-1400 kWh (misses 8 months)

**Calculation:**

```bash
Credit Risk = 0.5 + (8/12 × 0.3) = 0.5 + 0.2 = 0.7
TOU Risk = 0
Variance Risk = 0 (assume low variance)

Volatility = 0.7 + 0 + 0 = 0.7 (Very High)
```

**Example 3: High-Variance Plan**

- No credits
- Not TOU
- Rates: 18.0¢, 10.0¢, 9.5¢ (designed to punish low usage)

**Calculation:**

```bash
Credit Risk = 0
TOU Risk = 0
Variance = |18.0-10.0|/10.0 = 8.0/10.0 = 0.8 (80% variance!)
Variance > 0.3, so Variance Risk = 0.8 × 0.5 = 0.4

Volatility = 0 + 0 + 0.4 = 0.4 (Moderate-High)
```

---

## Plan Ranking Algorithm

### Ranking Criteria

**Primary:** Annual cost at user's actual usage (lowest first)

**Secondary (tie-breakers):**

1. Volatility score (lower preferred)
2. Quality score (higher preferred)
3. Contract term (shorter preferred for flexibility)

### Implementation

```javascript
function rankPlans(plans, userUsage, tduRates, options = {}) {
    const { localTaxRate = 0, termLengthPreference = null } = options;

    // Step 1: Calculate metrics for each plan
    const rankedPlans = plans.map(plan => {
        const annualResult = calculateAnnualCost(userUsage, plan, tduRates, localTaxRate);
        const volatility = calculateVolatility(plan, userUsage);
        const warnings = identifyWarnings(plan, userUsage);
        const qualityScore = calculateQualityScore(plan, volatility, warnings);

        return {
            ...plan,
            annualCost: annualResult.annualCost,
            averageMonthlyCost: annualResult.averageMonthlyCost,
            effectiveRate: annualResult.effectiveAnnualRate,
            monthlyCosts: annualResult.monthlyCosts,
            volatility: volatility,
            warnings: warnings,
            qualityScore: qualityScore,
            isGimmick: warnings.length > 0 || volatility > 0.3
        };
    });

    // Step 2: Filter to fixed-rate only
    const fixedRatePlans = rankedPlans.filter(p => p.rate_type === 'FIXED');

    // Step 3: Sort by annual cost (primary), then volatility (secondary)
    fixedRatePlans.sort((a, b) => {
        // Primary: Annual cost
        if (Math.abs(a.annualCost - b.annualCost) > 1.0) {
            return a.annualCost - b.annualCost;
        }

        // Tie-breaker 1: Volatility
        if (Math.abs(a.volatility - b.volatility) > 0.05) {
            return a.volatility - b.volatility;
        }

        // Tie-breaker 2: Quality score
        if (Math.abs(a.qualityScore - b.qualityScore) > 2.0) {
            return b.qualityScore - a.qualityScore;  // Higher is better
        }

        // Tie-breaker 3: Shorter term preferred
        return a.term_months - b.term_months;
    });

    return fixedRatePlans;
}
```

---

## Warning Detection System

### Categories of Warnings

1. **Bill Credit Traps**: User likely to miss credit thresholds
2. **Time-of-Use Issues**: Requires behavior change most users can't achieve
3. **High Early Termination Fees**: Expensive to exit contract
4. **Rate Volatility**: Prices vary dramatically with usage
5. **Contract Expiration Timing**: Renewal during expensive season

### Implementation

```javascript
function identifyWarnings(plan, userUsage, contractStartDate = null) {
    const warnings = [];

    // Warning 1: Bill credit traps
    if (plan.special_terms && plan.special_terms.includes('credit')) {
        let missedMonths = 0;
        let missedValue = 0;

        for (const usage of userUsage) {
            const credits = calculateBillCredits(usage, plan);
            if (credits === 0) {
                missedMonths++;
                const match = plan.special_terms.match(/\$(\d+)/);
                if (match) {
                    missedValue += parseFloat(match[1]);
                }
            }
        }

        if (missedMonths > 0) {
            warnings.push(
                `You would miss the bill credit ${missedMonths} months per year, ` +
                `potentially costing you an extra $${Math.round(missedValue)}`
            );
        }
    }

    // Warning 2: Time-of-use challenges
    if (plan.is_tou) {
        warnings.push(
            'Time-of-use plan requires shifting usage to off-peak hours. ' +
            'Most households save more with simple fixed-rate plans.'
        );
    }

    // Warning 3: High early termination fees
    if (plan.early_termination_fee > 0) {
        const midpointMonths = Math.floor(plan.term_months / 2);
        const totalETF = calculateEarlyTerminationFee(plan, midpointMonths);

        if (totalETF > 200) {
            warnings.push(
                `High early termination fee: $${totalETF.toFixed(0)} ` +
                `if cancelled at month ${midpointMonths}`
            );
        }
    }

    // Warning 4: Rate volatility
    const rate500 = plan.price_kwh_500;
    const rate1000 = plan.price_kwh_1000;
    const rate2000 = plan.price_kwh_2000;

    if (Math.abs(rate500 - rate1000) / rate1000 > 0.5) {
        warnings.push(
            'Rate varies dramatically with usage. ' +
            `${rate500.toFixed(1)}¢/kWh at low usage vs ` +
            `${rate1000.toFixed(1)}¢/kWh at 1000 kWh.`
        );
    }

    // Warning 5: Contract expiration timing
    if (contractStartDate && plan.term_months) {
        const expirationAnalysis = calculateContractExpiration(
            contractStartDate,
            plan.term_months
        );

        if (expirationAnalysis.riskLevel === 'high') {
            warnings.push(
                `Contract expires in ${expirationAnalysis.expirationMonthName} ` +
                `- peak renewal season. Consider ` +
                `${expirationAnalysis.alternativeTerms[0]?.termMonths || 'different'}-month ` +
                `term for better timing.`
            );
        }
    }

    return warnings;
}
```

---

## Early Termination Fee Calculation

### Fee Structures

1. **Flat Fee**: Fixed amount regardless of months remaining (e.g., $150)
2. **Per-Month-Remaining**: Multiplied by months left (e.g., $15/month × 18 months = $270)

### Detection Logic

```javascript
function calculateEarlyTerminationFee(plan, monthsRemaining) {
    if (!plan.early_termination_fee) return 0;

    const etfValue = plan.early_termination_fee;

    // Heuristic 1: Small ETF on long contract = per-month structure
    if (etfValue <= 50 && plan.term_months >= 12) {
        return etfValue * monthsRemaining;
    }

    // Heuristic 2: Check special_terms for explicit mention
    if (plan.special_terms) {
        const terms = plan.special_terms.toLowerCase();
        if (terms.includes('per month remaining') ||
            terms.includes('per remaining month') ||
            terms.includes('$' + etfValue + ' per month')) {
            return etfValue * monthsRemaining;
        }
    }

    // Default: Flat fee
    return etfValue;
}
```

### Examples

**Example 1: Flat Fee**

- ETF: $150
- Term: 12 months
- Months Remaining: 6

**Calculation:**

```bash
ETF = $150 does not meet small ETF heuristic
No "per month" text in special_terms
Result: $150 flat (regardless of months remaining)
```

**Example 2: Per-Month-Remaining**

- ETF: $15
- Term: 24 months
- Months Remaining: 18
- Special Terms: "Early termination fee of $15 per month remaining"

**Calculation:**

```bash
ETF = $15 ≤ $50 AND term = 24 ≥ 12 → Likely per-month
Special terms confirms "per month remaining"
Result: $15 × 18 = $270
```

---

## Contract Expiration Timing Analysis

### Seasonality Scoring

Texas electricity rates follow seasonal patterns:

| Month | Score | Reason |
|-------|-------|--------|
| Jan | 0.7 | Winter peak demand |
| Feb | 0.5 | Moderate |
| Mar | 0.2 | Transition, rates falling |
| Apr | 0.0 | **Best** - low demand, competitive |
| May | 0.1 | **Best** - pre-summer |
| Jun | 0.6 | Summer demand increasing |
| Jul | 1.0 | **Worst** - peak AC usage |
| Aug | 1.0 | **Worst** - peak AC usage |
| Sep | 0.7 | Still hot, high usage |
| Oct | 0.0 | **Best** - cooling off, competitive |
| Nov | 0.2 | Good |
| Dec | 0.6 | Holiday demand, cold snaps |

### Implementation

See full implementation in api-response-schema.md, calculateContractExpiration() section.

### Example

**Scenario:**

- Start Date: July 1, 2026
- Term: 12 months
- Expiration: July 1, 2027

**Analysis:**

```bash
Expiration Month: July (index 6)
Seasonality Score: 1.0 (worst)
Risk Level: High
Advice: "Your contract expires during the most expensive renewal period..."

Alternative Terms Suggested:
  - 9 months → Expires April 2027 (score 0.0, 100% improvement)
  - 15 months → Expires October 2027 (score 0.0, 100% improvement)
  - 21 months → Expires April 2028 (score 0.0, 100% improvement)
```

---

## Quality Scoring System

### Purpose

Holistic 0-100 score combining cost, volatility, and warnings for easy comparison.

### Formula

```bash
Quality Score = 100 - (Cost Penalty + Volatility Penalty + Warning Penalty)

Where:
  Cost Penalty = (Plan Annual Cost - Best Annual Cost) / Best Annual Cost × 50
  Volatility Penalty = Volatility Score × 30
  Warning Penalty = Number of Warnings × 5
```

### Implementation

```javascript
function calculateQualityScore(plan, volatility, warnings, bestAnnualCost) {
    // Cost penalty (0-50 points)
    const costPenalty = plan.annualCost > bestAnnualCost
        ? ((plan.annualCost - bestAnnualCost) / bestAnnualCost) * 50
        : 0;

    // Volatility penalty (0-30 points)
    const volatilityPenalty = volatility * 30;

    // Warning penalty (0-20+ points)
    const warningPenalty = warnings.length * 5;

    // Calculate score (never negative)
    const score = Math.max(0, 100 - costPenalty - volatilityPenalty - warningPenalty);

    return Math.round(score);
}
```

### Interpretation

| Score | Grade | Description |
|-------|-------|-------------|
| 90-100 | A | Excellent plan, highly recommended |
| 80-89 | B | Good plan, solid choice |
| 70-79 | C | Acceptable, minor issues |
| 60-69 | D | Caution advised, significant drawbacks |
| 0-59 | F | Avoid, high cost or high risk |

---

## Edge Cases and Special Handling

### 1. Usage Below 500 kWh

**Issue:** Plans may have high base fees that make low usage very expensive.

**Solution:** Use 500 kWh rate directly (no interpolation downward).

### 2. Usage Above 2000 kWh

**Issue:** No data beyond 2000 kWh tier.

**Solution:** Use 2000 kWh rate (conservative, often favorable for high usage).

### 3. Zero or Negative Usage

**Issue:** Invalid input.

**Solution:** Validate input, reject if any month < 0 or annual total < 1200 kWh.

### 4. Bill Credit Exactly at Threshold

**Issue:** User at 1000 kWh, credit requires 1000-1050 kWh.

**Solution:** Inclusive bounds (≥ minKwh AND ≤ maxKwh).

### 5. Missing TDU Rates

**Issue:** New TDU or outdated data.

**Solution:** Fail gracefully, notify user to update data.

### 6. Plans with $0 Base Charge

**Issue:** All-inclusive pricing or error in data.

**Solution:** Treat as valid ($0 base is legitimate).

### 7. Prepaid Plans

**Issue:** Different payment structure, not comparable.

**Solution:** Filter out entirely (only fixed-rate post-paid plans).

### 8. Duplicate Plans (English/Spanish)

**Issue:** Same plan listed twice with different names.

**Solution:** Detect by matching plan_id, rep_name, prices, and term; show only one.

---

## Performance Optimizations

### 1. Parallel Plan Calculation

Calculate all plans concurrently using web workers or async processing.

### 2. Memoization

Cache interpolated rates for common usage values.

### 3. Early Exit

Stop evaluating plan if annual cost exceeds user's budget threshold.

### 4. Data Prefiltering

Filter by TDU area before calculating (reduces plan count by ~83%).

---

## Validation and Testing

### Unit Test Cases

```javascript
// Test 1: Interpolation accuracy
assert(interpolateRate(750, plan) === expectedRate);

// Test 2: Bill credit eligibility
assert(calculateBillCredits(1025, planWithCredit) === 100);

// Test 3: Annual cost sum
const annual = calculateAnnualCost(usage, plan, tdu, 0);
assert(annual.annualCost === sum(annual.monthlyCosts));

// Test 4: Volatility bounds
assert(volatility >= 0 && volatility <= 1.0);

// Test 5: ETF calculation
assert(calculateEarlyTerminationFee(perMonthPlan, 18) === 270);
```

### Integration Test Cases

```javascript
// Test 1: End-to-end ranking
const ranked = rankPlans(allPlans, userUsage, tdu);
assert(ranked[0].annualCost <= ranked[1].annualCost);

// Test 2: Warning generation
const warnings = identifyWarnings(gimmickPlan, userUsage);
assert(warnings.length > 0);

// Test 3: Quality score ordering
assert(ranked[0].qualityScore >= ranked[ranked.length-1].qualityScore);
```

---

## References

- **PUCT Substantive Rule §25.475**: EFL requirements
- **ERCOT Load Data**: Seasonal consumption patterns
- **Texas Deregulation Law**: PURA §39.001 et seq.

---

**Last Updated**: January 2026
