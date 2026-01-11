# *Power to Choose* Data Formats

This document describes the structure and differences between the various data sources used in this project, specifically the *Power to Choose* API and manually downloaded CSV exports (from the [*Power to Choose* website](https://www.powertochoose.org)). It provides a guide for future developers working on the project.

## Overview

The "Light" project aggregates electricity plans from the official [*Power to Choose* website](https://www.powertochoose.org) (a service of the Public Utility Commission of Texas). The data is standardized into a JSON format (`data/plans.json`) for use by the frontend application.

## Data Sources

### 1. *Power to Choose* API (Primary Source)

The project primarily fetches data dynamically from the *Power to Choose* API endpoints. This ensures the plan data is up-to-date.

* **Endpoints**: The script (`scripts/fetch_plans.py`) queries several known endpoints to retrieve the full catalog of available offers.
* **Format**: The API returns data that resembles the "Offers Export" CSV format (headers in brackets).
* **Update Frequency**: The GitHub Action workflow updates this data daily.

### 2. Debugging & Investigation Files (Archived)

During the development and reverse-engineering of the *Power to Choose* data structure, two static CSV files were used. These have been moved to the `.other/` directory and are no longer used in production, but remain available for reference or local testing.

* **`power-to-choose-offers.csv`**: A bulk export of "Offers". This represents the raw data format often returned by the bulk API.
  * **Location**: `.other/power-to-choose-offers.csv`
  * **Significance**: This file helped identify the "bracketed header" format (e.g., `[kwh500]`) and the full range of available fields like `[idKey]` and `[TduCompanyName]`.

* **`power-to-choose-76107.csv`**: A specific export for zip code 76107.
  * **Location**: `.other/power-to-choose-76107.csv`
  * **Significance**: This file helped identify an alternative, "consumer-friendly" header format (e.g., `Price/kWh 500` instead of `[kwh500]`) which the script also supports for robustness. It highlighted missing columns like `CancelFee` which required parsing `Pricing Details`.

## Internal Data Model (`plan` Object)

The `fetch_plans.py` script standardizes incoming data into a consistent dictionary format. This is the "source of truth" for the application.

| Field Name | Type | Description | Source Mapping (Examples) |
| :--- | :--- | :--- | :--- |
| `plan_id` | `str` | Unique identifier for the plan | `[idKey]`, `ID Plan` |
| `rep_name` | `str` | Retail Electric Provider Name | `[RepCompany]`, `REP Name` |
| `plan_name` | `str` | Name of the electricity plan | `[Product]`, `Plan Name` |
| `tdu_area` | `str` | Normalized TDU region code (e.g., "ONCOR", "CENTERPOINT") | `[TduCompanyName]`, `TduCompany` |
| `rate_type` | `str` | "FIXED", "VARIABLE", or "INDEXED" | `[RateType]`, `Rate Type` |
| `term_months` | `int` | Contract length in months | `[TermValue]`, `Term Value` |
| `price_kwh_500` | `float` | Price in cents at 500 kWh usage | `[kwh500]`, `Price/kWh 500` |
| `price_kwh_1000` | `float` | Price in cents at 1000 kWh usage | `[kwh1000]`, `Price/kWh 1000` |
| `price_kwh_2000` | `float` | Price in cents at 2000 kWh usage | `[kwh2000]`, `Price/kWh 2000` |
| `early_termination_fee`| `float` | ETF in dollars | `[CancelFee]` or parsed from text |
| `renewable_pct` | `int` | Percentage of renewable energy (0-100) | `[Renewable]`, `Renewable Perc` |
| `is_prepaid` | `bool` | Whether the plan is prepaid | `[PrePaid]`, `Prepaid` |
| `is_tou` | `bool` | Whether it is a Time-of-Use plan | `[TimeOfUse]`, `Time Of Use` |
| `efl_url` | `str` | URL to the Electricity Facts Label (EFL) | `[FactsURL]`, `Fact Sheet` |
| `language` | `str` | "English" or "Spanish" | `[Language]` |

## Data Processing Logic

The `fetch_plans.py` script performs significant normalization:

1. **Header Detection**: It detects whether the input uses bracketed headers (`[Header]`) or standard headers (`Header`) and parses accordingly.
2. **TDU Normalization**: Maps various TDU names (e.g., "AEP TEXAS CENTRAL COMPANY", "AEP Central") to internal codes (`AEP_CENTRAL`, `ONCOR`, etc.).
3. **Price Parsing**: Converts values to floats. Handles formatted strings like `$0.16` or `16.5%`.
4. **Fee Extraction**: If the `CancelFee` column is missing (common in Zip code exports), strictly parses the `Pricing Details` text using Regex to find "Cancellation Fee: $XXX".
5. **Deduplication**: Removes duplicate entries based on `rep_name`, `plan_name`, `tdu_area`, `term_months`, and `language`.

## Tips

* **Testing**: When testing the extraction logic, you can point the `fetch_plans.py` script to a local CSV using the `TEST_FILE` environment variable.
  * Example: `TEST_FILE=.other/power-to-choose-offers.csv uv run python scripts/fetch_plans.py`
* **New Columns**: If Power to Choose adds new columns, add them to the mapping lists in the `get_val()` helper function chain within `fetch_plans.py`.
