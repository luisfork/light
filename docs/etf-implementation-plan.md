# Early Termination Fee (ETF) Detection and Data Enrichment Implementation Plan from Electricity Facts Label (EFL) Documents

## Summary

Improve early termination fee (ETF) (also known as cancellation fee) accuracy by enriching plan data with authoritative ETF details from the Electricity Facts Label (EFL) document during the data-fetch pipeline and using those details in the UI. This avoids guessing when Power to Choose fields are missing or ambiguous.

## Problems Observed

- Power to Choose often omits or zeroes `early_termination_fee` for plans that actually have a per-month-remaining ETF.
- `special_terms` rarely contain ETF language
- UI falls back to "None" or weak inference, causing incorrect cancel fees in the table.

## Goals

- Display correct ETF structure in the "Cancel Fee" column:
  - Flat fee (e.g., $150)
  - Per-month remaining fee (e.g., $20/mo remaining)
  - No fee (only when explicitly stated)
  - Unknown (when not disclosed)
- Avoid misclassifying prepaid/short plans as per-month just because the fee is small.
- Keep runtime fast by doing ETF extraction offline during data refresh.

## Key Design Decisions

- **Source of truth**: If a plan’s EFL can be parsed, it should override heuristics.
- **No PDF storage**: Fetch EFL PDFs during the data job, extract text, discard bytes, and only store a small `etf_details` object.
- **Conservative classification**: When ETF is missing/ambiguous, display “See EFL” (unknown), not “None.”

## Implementation Phases

### 1. Data Pipeline Enrichment (offline)

**File**: `scripts/fetch_plans.py`

- Add EFL ETF extraction:
  - Download EFL content (PDF/HTML) for plans with missing/zero ETF.
  - Extract text and parse for ETF patterns:
    - `per-month` (e.g., "$20 multiplied by months remaining")
    - `flat` (e.g., "Early termination fee: $150")
    - `none` (explicit "No early termination fee")
    - `unknown` (ETF mentioned but no amount)
- Store result in `etf_details` (e.g., `{ structure: "per-month", per_month_rate: 20, source: "efl" }`).
- Add allowlist and fetch cap to limit runtime.
- Skip EFL fetching when a flat ETF is explicitly provided in the dataset (positive numeric value).

### 2. ETF Calculator Logic

**File**: `src/js/modules/etf-calculator.js`

- Prefer `etf_details` when present.
- Expand term sources to include `fees_credits`, `promotion_details`, `min_usage_fees`.
- Avoid per-month inference for prepaid plans or small fees without explicit language.
- Use `unknown` for missing ETF on non‑zero term plans.

### 3. UI Display & Sorting

**File**: `src/js/ui.js`

- Display `See EFL` when `structure === "unknown"` and show verification icon.
- Sort `unknown` ETFs last to avoid being treated as lowest fee.

### 4. Tests

**File**: `tests/unit/etf-calculator.test.js`

- Test EFL‑derived `etf_details` handling.
- Test prepaid plans remain `flat`.
- Test unknown for missing ETF with no explicit “no fee” language.

## Data Format Additions

`plans.json` adds:

```json
"etf_details": {
  "structure": "per-month",
  "per_month_rate": 20,
  "source": "efl"
}
```

## Operational Notes

- **No PDF storage**: PDFs are downloaded only during the fetch job and discarded.
- **Performance controls**:
  - Domain allowlist
  - Max fetch cap per run
  - Cache by URL
  - Small page window (first 1–2 pages)
- **Allowlist source**: Derive the initial domain allowlist from `efl_url` hostnames in `data/plans.json`, then keep it configurable.

## Success Criteria

- Rhythm's plans like "Digital Choice 3" and "No Bull 3" should show `"$20/mo remaining"` instead of "None".
- Prepaid plans like "PTC 12 Month - Prepaid" show flat $49, not per-month.
- Unknown cases show `See EFL` with info icon.

## Rollout Steps

1. Run data fetch job with EFL enrichment enabled.
2. Validate ETF display in UI for known examples.
3. Commit updated `data/plans.json`.
4. Monitor for runtime regressions in GitHub Actions.

## Open Questions

- Should the allowlist be refreshed each run from `efl_url` hostnames, then merged with a small static override list for robustness?
- Max EFL fetches per run?
