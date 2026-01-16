# Electricity Plan Deduplication - Enhancement Report

## Executive Summary

Enhanced the deduplication system to correctly identify duplicate English/Spanish plans while avoiding false positives for plans with different bill credits or special features.

## Problem Statement

### Previous Implementation Issues

1. **Missing Bill Credits**: Plans with identical rates but different bill credit structures were incorrectly flagged as duplicates
   - Example: Plan with "$50 credit at 1000 kWh" vs "$100 credit at 2000 kWh"

2. **Missing Special Features**: Plans with unique features (free weekends, solar buyback) were not differentiated
   - Example: Standard plan vs "Free Weekends" plan with same base rates

3. **Limited Transparency**: Users couldn't easily see deduplication statistics in the hero section

## Solution: Enhanced Fingerprinting

### Before vs After

**BEFORE (11 fields):**
```javascript
{
  rep, tdu, rate_type,
  p500, p1000, p2000,
  term, etf, base,
  renewable, prepaid, tou
}
```

**AFTER (13 fields):**
```javascript
{
  rep, tdu, rate_type,
  p500, p1000, p2000,
  term, etf, base,
  renewable, prepaid, tou,
  credits,  // NEW: Normalized bill credits
  special   // NEW: Special feature indicators
}
```

### Bill Credit Normalization

Extracts structured data from free-text `fees_credits` field:

```javascript
Input:  "Constellation will apply a $35 credit at 1000 kWh and $15 at 2000 kWh"
Output: "$15|$35|1000 KWH|2000 KWH"  // Sorted and normalized
```

### Special Terms Detection

Identifies key differentiators from `special_terms` field:

| Pattern | Indicator | Example |
|---------|-----------|---------|
| "FREE" + "WEEKEND"/"NIGHT" | `FREE_TIME` | "Free power from Friday midnight to Sunday 11:59 PM" |
| "MINIMUM USAGE" | `MIN_USAGE` | "Minimum usage requirement of 500 kWh per month" |
| "SOLAR" + "BUYBACK" | `SOLAR_BUYBACK` | "Indexed Solar Buyback Included" |
| "NEW CUSTOMER" | `NEW_ONLY` | "This offer is for new customers only" |

## Test Results

### Test Case: 4 Plans with Same Rates

```
Plan 1: Simple Rate 12 (English)
  - Fees: $50 credit at 1000 kWh
  - Special: None

Plan 2: Tarifa Simple 12 (Spanish)  [DUPLICATE]
  - Fees: $50 crédito at 1000 kWh
  - Special: None

Plan 3: Value Rate 12 (English)  [UNIQUE]
  - Fees: $100 credit at 2000 kWh  ← DIFFERENT
  - Special: None

Plan 4: Free Weekends 12 (English)  [UNIQUE]
  - Fees: None
  - Special: Free weekends  ← DIFFERENT
```

**Result:** ✓ 1 duplicate removed, 3 unique plans kept

## UI Enhancements

### Hero Metrics Section

**Before:**
```
486 Plans Analyzed
```

**After:**
```
486                           ← Large, prominent
(986 total, 500 duplicates removed)  ← Smaller subtitle
[Clickable for details]
```

### Deduplication Modal

Enhanced modal now includes:
- Bill credits in fingerprint field list
- Special features in fingerprint field list
- Note: "Plans with different bill credits or special features are treated as unique"
- Language distribution statistics (English-only, Spanish-only, pairs)

## Technical Implementation

### Files Modified

1. **src/js/api.js** (Lines 482-557)
   - Added `normalizeBillCredits()` function
   - Added `normalizeSpecialTerms()` function
   - Enhanced `createPlanFingerprint()` to include 2 new fields

2. **src/js/ui.js** (Lines 303-343)
   - Enhanced `updateHeroMetrics()` to show deduplication stats
   - Added click handler for deduplication modal
   - Updated modal content (Lines 997-1013)

3. **scripts/fetch_plans.py** (Lines 591-669)
   - Mirrored JavaScript implementation in Python
   - Ensures server-side deduplication matches client-side

4. **CLAUDE.md** (Lines 207-238)
   - Updated documentation with enhanced algorithm
   - Added key improvement note

### Code Quality

- ✓ All JavaScript files pass Biome linting
- ✓ All Python files pass Ruff linting
- ✓ Test suite validates fingerprinting logic
- ✓ Python and JavaScript implementations match exactly

## Addressing Concerns

### Concern 1: Orphaned Plans (English-only or Spanish-only)

**Handled:** System tracks and reports:
- `orphaned_english_count`: Plans with no Spanish equivalent
- `orphaned_spanish_count`: Plans with no English equivalent
- These are NOT removed, just tracked for transparency

### Concern 2: Should We Remove Plans That Are Identical Besides Name?

**Yes, but comprehensively:** The enhanced system removes plans that are:
- Same provider and TDU area
- Same rate type (FIXED, VARIABLE, etc.)
- Same pricing at all usage tiers
- Same contract term and fees
- Same renewable percentage, prepaid status, time-of-use status
- **Same bill credits and usage thresholds**
- **Same special features**

Only the plan names and documentation URLs can differ.

## Impact Summary

### Accuracy Improvements

1. **Reduced False Positives**: Plans with different bill credits are now correctly identified as unique
2. **Reduced False Negatives**: English/Spanish pairs with identical features are still correctly matched
3. **Feature Completeness**: All 13 key plan attributes are now considered

### User Experience Improvements

1. **Transparency**: Hero metrics show deduplication stats prominently
2. **Interactivity**: Clickable stats open detailed explanation modal
3. **Trust**: Users can see exactly how many duplicates were removed and why

### Maintainability Improvements

1. **Python/JS Consistency**: Both implementations use identical logic
2. **Extensibility**: Easy to add new special feature indicators
3. **Documentation**: CLAUDE.md fully documents the algorithm

## Future Considerations

### Potential Enhancements

1. **Machine Learning**: Use NLP to detect semantic similarities in special terms
2. **Provider Patterns**: Track which providers consistently list duplicates
3. **Historical Analysis**: Compare deduplication rates over time
4. **API Response**: Include deduplication metadata in plans.json

### Monitoring

- Track duplicate count trends in daily GitHub Actions runs
- Alert if duplicate count suddenly changes (possible data format change)
- Log orphaned plan counts for data quality monitoring

## Conclusion

The enhanced deduplication system provides:
- **Robustness**: Feature-based matching, not language detection heuristics
- **Accuracy**: Correctly handles bill credits and special features
- **Transparency**: Users see full statistics with click-through details
- **Maintainability**: Python and JavaScript implementations stay in sync

This addresses all concerns about English/Spanish plan detection while avoiding the pitfalls of the previous Spanish character-based approach.
