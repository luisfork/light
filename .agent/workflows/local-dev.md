---
description: How to run and test the project locally with real plan data
---

# Local Development Workflow

This workflow explains how to run and test the Light project locally with real electricity plan data.

## Why Local Testing Requires a Server

Opening `src/index.html` directly via `file://` protocol **will not work** because browsers block JavaScript from loading local JSON files due to CORS security restrictions. You must use a local HTTP server.

## Quick Start

### 1. Start Local Server

// turbo

```bash
cd /Users/luis/Desktop/light
python -m http.server 8000
```

The server will run at `http://localhost:8000/src/` (navigate to `/src/` for the app)

### 2. Ensure Test Data Exists

If `data/plans.json` doesn't exist or is empty, generate it from test CSV:

```bash
cd /Users/luis/Desktop/light
TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py
```

This uses the cached Power to Choose CSV in `.other/` to populate `data/plans.json`.

### 3. Open in Browser

// turbo

```bash
open http://localhost:8000/src/
```

## Test Data Files

| File | Purpose |
|------|---------|
| `.other/power-to-choose-offers.csv` | Full Power to Choose CSV export (cached for testing) |
| `.other/plans_YYYY-MM-DD.csv` | Date-stamped CSV snapshots |
| `data/plans.json` | Active plan data used by the app |
| `data/tdu-rates.json` | TDU delivery rates |
| `data/local-taxes.json` | Local tax rates by ZIP code |

## Using Test Data vs Production Data

### For Local Development (Use Cached CSV)

```bash
# Generate plans.json from cached test file
TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py
```

### For Production (Fetch Latest from API)

```bash
# Fetch fresh data from Power to Choose API
uv run python scripts/fetch_plans.py
```

The `TEST_FILE` environment variable controls the data source:

- **Set**: Uses the specified local CSV file
- **Not set**: Fetches fresh data from Power to Choose API

## Important Notes

1. **GitHub Actions uses live data**: The deployed version at `luisfork.github.io/light` always uses fresh data from the API, fetched daily by GitHub Actions.

2. **Local changes to plans.json are safe**: The `data/plans.json` file is updated by GitHub Actions on deploy. Your local changes won't affect production.

3. **Keep test files in .other/**: The `.other/` directory is for local testing files and is not used by the deployed app.

## Troubleshooting

### "No plans found" or Empty Results

1. Check if `data/plans.json` exists and is not empty
2. Regenerate from test data: `TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py`
3. Verify the JSON is valid: `python -m json.tool data/plans.json > /dev/null`

### CORS Errors in Console

You're likely opening the file directly (`file://`). Use a local server instead:

```bash
python -m http.server 8000
# Then open http://localhost:8000/src/
```

### "TypeError: Cannot read properties of null"

The API is failing to load. Check browser console for specific errors and ensure the server is serving from the correct directory.
