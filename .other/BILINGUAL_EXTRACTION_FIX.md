# Bilingual Special Terms Extraction - Issue Resolution

## Issue Identified

User identified that the enhanced fingerprinting system had a **language-dependent extraction vulnerability** in the `special_terms` field. While the `credits` field correctly extracted language-independent dollar amounts and kWh thresholds, the `special` field only detected English keywords.

## Problem Analysis

### Fields Affected

| Field | Language Dependency | Status |
|-------|-------------------|--------|
| `credits` | ✓ **Independent** | Dollar amounts ($50) and kWh (1000 kWh) are same in both languages |
| `special` | ✗ **Dependent** | English keywords only (FREE, WEEKEND, NEW CUSTOMER, etc.) |

### Real-World Impact

**Analysis of 986 plans:**
- 815 plans have special_terms
- **8 English/Spanish pairs** with mismatched extraction found
- **16 plans affected** (would NOT be detected as duplicates)

**Breakdown by Provider:**
- CleanSky Energy: 2 pairs
- Discount Power: 2 pairs
- CIRRO ENERGY: 1 pair
- DIRECT ENERGY: 3 pairs

**All affected by:** "NEW_ONLY" indicator
- English: "This offer is for new customers only" → `"NEW_ONLY"`
- Spanish: "Sólo para nuevos clientes" → `""` (empty)
- **Result**: Different fingerprints, NOT detected as duplicates

## Solution: Bilingual Keyword Matching

### Before (English-only)

```javascript
if (text.includes('NEW CUSTOMER')) {
  indicators.push('NEW_ONLY');
}
```

### After (Bilingual)

```javascript
if (
  text.includes('NEW CUSTOMER') ||
  text.includes('NUEVOS CLIENTES') ||
  text.includes('CLIENTES NUEVOS') ||
  text.includes('SOLO NUEVOS') ||
  text.includes('SÓLO NUEVOS') ||
  text.includes('NUEVO CLIENTE')
) {
  indicators.push('NEW_ONLY');
}
```

### Complete Bilingual Mapping

| Indicator | English Keywords | Spanish Keywords |
|-----------|-----------------|------------------|
| **FREE_TIME** | FREE, WEEKEND, NIGHT | GRATIS, GRATUITA, GRATUITO, FIN DE SEMANA, NOCHE |
| **MIN_USAGE** | MINIMUM USAGE | USO MÍNIMO, USO MINIMO, CONSUMO MÍNIMO, CONSUMO MINIMO |
| **SOLAR_BUYBACK** | SOLAR BUYBACK | RECOMPRA SOLAR, COMPRA DE ENERGÍA SOLAR |
| **NEW_ONLY** | NEW CUSTOMER | NUEVOS CLIENTES, CLIENTES NUEVOS, SOLO NUEVOS, SÓLO NUEVOS, NUEVO CLIENTE |

## Test Results

### Unit Test

```
Plan 5: Saver 24 (English)
  Special Terms: This offer is for new customers only
  Extraction: "NEW_ONLY"

Plan 6: Ahorrador 24 (Spanish)
  Special Terms: Esta oferta es sólo para nuevos clientes
  Extraction: "NEW_ONLY"

✓ Plans 5 & 6 should be DUPLICATES (bilingual test): YES ✓
```

### Real-World Validation

Re-running the analysis script on actual data confirms:
- All 8 pairs now extract matching indicators
- English: "NEW_ONLY" → Spanish: "NEW_ONLY"
- Fingerprints now match correctly
- Duplicates will be properly detected and removed

## Implementation

### Files Updated

1. **src/js/api.js** (Lines 509-567)
   - Enhanced `normalizeSpecialTerms()` with bilingual keywords
   - Added Spanish variants for all 4 indicators

2. **scripts/fetch_plans.py** (Lines 626-681)
   - Mirrored JavaScript implementation in Python
   - Ensures server-side and client-side consistency

3. **CLAUDE.md** (Lines 224, 238-240)
   - Updated documentation to mention bilingual capability
   - Added key improvement note

4. **Test Suite** (.other/test_deduplication.js)
   - Added bilingual test cases
   - Validates Spanish keyword extraction

### Code Quality

- ✓ All JavaScript files pass Biome linting
- ✓ All Python files pass Ruff linting
- ✓ Python and JavaScript implementations match exactly
- ✓ Unit tests validate bilingual extraction
- ✓ Real-world data analysis confirms fix

## Impact Assessment

### Before Fix

- **False Negatives**: 8 duplicate pairs NOT detected (16 plans shown as unique)
- **User Experience**: Users saw duplicate plans with Spanish names
- **Data Quality**: Duplicate count under-reported

### After Fix

- **Accuracy**: All 8 duplicate pairs correctly detected
- **User Experience**: Users see only unique plans
- **Data Quality**: Accurate duplicate count and statistics
- **Transparency**: Deduplication modal explains bilingual matching

### Performance Impact

- **Negligible**: String matching is fast
- **Memory**: No additional data structures
- **Complexity**: O(n) for each plan (same as before)

## Why This Approach Works

### 1. Language-Agnostic Dollar Amounts

```javascript
// Already worked before
"$50 bill credit" → "$50"
"$50 crédito" → "$50"
✓ Same extraction regardless of language
```

### 2. Bilingual Keyword Coverage

```javascript
// Now works after fix
"for new customers only" → "NEW_ONLY"
"sólo para nuevos clientes" → "NEW_ONLY"
✓ Both extract to same indicator
```

### 3. Normalized Indicators

All special features map to consistent English indicators:
- Simplifies fingerprint comparison
- Enables future feature additions
- Language-independent storage

### 4. Comprehensive Keyword Lists

Covers multiple Spanish variants:
- Formal: "nuevos clientes"
- Informal: "solo nuevos"
- With/without accents: "sólo" / "solo"

## Future Considerations

### Extensibility

Adding new indicators is straightforward:

```javascript
// Example: Renewable bonus
if (
  text.includes('RENEWABLE BONUS') ||
  text.includes('BONO RENOVABLE')
) {
  indicators.push('RENEWABLE_BONUS');
}
```

### Additional Languages

If Power to Choose adds more languages:
- Add keywords to existing conditionals
- Maintain same indicator names
- No changes to fingerprint structure

### Maintenance

- Review Spanish keywords annually
- Check for new special term patterns in data
- Update documentation when adding indicators

## Conclusion

The bilingual keyword matching enhancement:

✅ **Solves the identified issue**: Spanish special terms now correctly extracted
✅ **Maintains accuracy**: All 8 affected pairs now matched
✅ **Zero performance impact**: Same O(n) complexity
✅ **Future-proof**: Easy to extend with new keywords/indicators
✅ **Well-tested**: Unit tests + real-world validation
✅ **Documented**: CLAUDE.md reflects bilingual capability

This fix ensures the deduplication system is truly robust, avoiding false negatives while maintaining the high accuracy of feature-based matching.
