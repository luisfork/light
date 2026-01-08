#!/usr/bin/env python3
"""
Fetch electricity plans from Power to Choose and save to data/plans.json

This script fetches plan data from the Power to Choose CSV export endpoint,
processes it, and saves it to a JSON file for the static site to consume.

Features:
- Exponential backoff retry logic for network resilience
- Multiple API endpoint fallbacks
- Robust CSV parsing with error handling
- Rate limiting compliance
"""

import csv
import json
import sys
import time
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import requests


# Configuration
MAX_RETRIES = 4
BASE_DELAY = 2  # Base delay in seconds for exponential backoff
REQUEST_TIMEOUT = 45  # Timeout in seconds

# Power to Choose endpoints (in order of preference)
ENDPOINTS = [
    {
        "name": "CSV Export",
        "url": "http://www.powertochoose.org/en-us/Plan/ExportToCsv",
        "type": "csv",
    },
    {
        "name": "API v1",
        "url": "http://api.powertochoose.org/api/PowerToChoose/plans",
        "type": "json",
    },
    {
        "name": "HTTPS CSV Export",
        "url": "https://www.powertochoose.org/en-us/Plan/ExportToCsv",
        "type": "csv",
    },
]


def get_request_headers() -> dict[str, str]:
    """Generate browser-like headers for API requests."""
    # Rotate through different browser user agents for better compatibility
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ]

    return {
        "User-Agent": random.choice(user_agents),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,text/csv,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "DNT": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
    }


def retry_with_backoff(func, *args, **kwargs):
    """
    Execute function with exponential backoff retry logic.

    Args:
        func: Function to execute
        *args, **kwargs: Arguments to pass to function

    Returns:
        Result of function call

    Raises:
        Last exception if all retries fail
    """
    last_exception = None

    for attempt in range(MAX_RETRIES):
        try:
            return func(*args, **kwargs)
        except requests.exceptions.RequestException as e:
            last_exception = e
            if attempt < MAX_RETRIES - 1:
                # Exponential backoff with jitter
                delay = BASE_DELAY * (2 ** attempt) + random.uniform(0, 1)
                print(f"  Attempt {attempt + 1} failed: {e}")
                print(f"  Retrying in {delay:.1f} seconds...")
                time.sleep(delay)
            else:
                print(f"  All {MAX_RETRIES} attempts failed")

    raise last_exception


def fetch_from_endpoint(endpoint: dict) -> tuple[str, str]:
    """
    Fetch data from a single endpoint.

    Args:
        endpoint: Endpoint configuration dict

    Returns:
        Tuple of (response_text, endpoint_type)
    """
    url = endpoint["url"]
    endpoint_type = endpoint["type"]

    print(f"  Trying {endpoint['name']}: {url}")

    headers = get_request_headers()

    # Create session for connection pooling
    session = requests.Session()
    session.headers.update(headers)

    response = session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
    response.raise_for_status()

    # Validate response content
    content_type = response.headers.get("Content-Type", "")
    content = response.text

    if not content or len(content) < 100:
        raise ValueError(f"Empty or too short response from {endpoint['name']}")

    # Check for error pages
    if "error" in content.lower()[:500] and "plan" not in content.lower()[:500]:
        raise ValueError(f"Error page received from {endpoint['name']}")

    print(f"  Success! Received {len(content)} bytes")
    return content, endpoint_type


def fetch_plans_data() -> tuple[str, str]:
    """
    Fetch plan data from Power to Choose using multiple endpoints.

    Returns:
        Tuple of (data_text, data_type)

    Raises:
        SystemExit if all endpoints fail
    """
    print("Fetching electricity plans from Power to Choose...")

    errors = []

    for endpoint in ENDPOINTS:
        try:
            return retry_with_backoff(fetch_from_endpoint, endpoint)
        except Exception as e:
            error_msg = f"{endpoint['name']}: {e}"
            errors.append(error_msg)
            print(f"  Endpoint failed: {e}")
            continue

    # All endpoints failed
    print("\nAll endpoints failed:", file=sys.stderr)
    for error in errors:
        print(f"  - {error}", file=sys.stderr)

    print("\nNote: Power to Choose may be blocking automated requests.")
    print("The GitHub Actions workflow will use sample data as fallback.")
    sys.exit(1)


def parse_csv_to_plans(csv_text: str) -> list[dict[str, Any]]:
    """Parse CSV text into structured plan data."""
    plans = []

    # Handle potential BOM and normalize line endings
    csv_text = csv_text.lstrip('\ufeff').replace('\r\n', '\n').replace('\r', '\n')

    try:
        reader = csv.DictReader(csv_text.splitlines())

        # Verify we have expected columns
        if not reader.fieldnames:
            raise ValueError("No columns found in CSV")

        expected_columns = ["REP Name", "Product", "TDU"]
        missing = [col for col in expected_columns if col not in reader.fieldnames]
        if missing:
            print(f"Warning: Missing expected columns: {missing}", file=sys.stderr)

    except csv.Error as e:
        print(f"CSV parsing error: {e}", file=sys.stderr)
        return []

    row_count = 0
    error_count = 0

    for row in reader:
        row_count += 1
        try:
            # Filter to fixed-rate plans only as specified in requirements
            rate_type = row.get("Rate Type", "").upper()
            if "FIXED" not in rate_type:
                continue

            # Parse plan data with validation
            plan = {
                "plan_id": sanitize_string(row.get("ID Plan", row.get("Plan ID", ""))),
                "rep_name": sanitize_string(row.get("REP Name", "")),
                "plan_name": sanitize_string(row.get("Product", row.get("Plan Name", ""))),
                "tdu_area": sanitize_string(row.get("TDU", "")).upper(),
                # Prices at standard usage levels (in cents per kWh)
                "price_kwh_500": parse_float(row.get("Price/kWh: 500 kWh", row.get("Price500", ""))),
                "price_kwh_1000": parse_float(row.get("Price/kWh: 1000 kWh", row.get("Price1000", ""))),
                "price_kwh_2000": parse_float(row.get("Price/kWh: 2000 kWh", row.get("Price2000", ""))),
                # Plan details
                "term_months": parse_int(row.get("Term Value", row.get("Term", ""))),
                "rate_type": "FIXED",
                "renewable_pct": parse_int(row.get("Renewable Content", row.get("Renewable", "0"))),
                "is_prepaid": row.get("Prepaid", "").upper() == "YES",
                "is_tou": row.get("Time of Use", "").upper() == "YES",
                # Fees
                "early_termination_fee": parse_float(row.get("Cancellation Fee", row.get("ETF", "0"))),
                "base_charge_monthly": parse_float(row.get("Monthly Recurring Charge", row.get("Base Charge", "0"))),
                # URLs
                "efl_url": sanitize_url(row.get("Electricity Facts Label (EFL) URL", row.get("EFL URL", ""))),
                "enrollment_url": sanitize_url(row.get("Enroll URL", row.get("Enrollment URL", ""))),
                "terms_url": sanitize_url(row.get("Terms of Service (TOS) URL", row.get("TOS URL", ""))),
                # Special features
                "special_terms": sanitize_string(row.get("Special terms and conditions", row.get("Special Terms", ""))),
                "promotion_details": sanitize_string(row.get("Promotion details", row.get("Promotions", ""))),
            }

            # Validation: Only include plans with valid pricing data
            if not plan["price_kwh_1000"] or plan["price_kwh_1000"] <= 0:
                continue

            # Additional validation
            if not plan["rep_name"] or not plan["plan_name"]:
                continue

            # Ensure all required price points exist
            if not plan["price_kwh_500"]:
                plan["price_kwh_500"] = plan["price_kwh_1000"]
            if not plan["price_kwh_2000"]:
                plan["price_kwh_2000"] = plan["price_kwh_1000"]

            plans.append(plan)

        except (ValueError, KeyError, TypeError) as e:
            error_count += 1
            if error_count <= 5:  # Only log first 5 errors
                print(f"Warning: Error parsing row {row_count}: {e}", file=sys.stderr)
            continue

    if error_count > 5:
        print(f"Warning: {error_count - 5} additional parsing errors suppressed", file=sys.stderr)

    return plans


def parse_json_to_plans(json_text: str) -> list[dict[str, Any]]:
    """Parse JSON API response into structured plan data."""
    try:
        data = json.loads(json_text)
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}", file=sys.stderr)
        return []

    # Handle different JSON structures
    if isinstance(data, list):
        plans_data = data
    elif isinstance(data, dict):
        plans_data = data.get("plans", data.get("data", data.get("results", [])))
    else:
        print("Unexpected JSON structure", file=sys.stderr)
        return []

    plans = []

    for item in plans_data:
        try:
            # Map JSON fields to our structure
            rate_type = item.get("rateType", item.get("rate_type", "")).upper()
            if "FIXED" not in rate_type:
                continue

            plan = {
                "plan_id": str(item.get("planId", item.get("id", ""))),
                "rep_name": sanitize_string(item.get("repName", item.get("provider", ""))),
                "plan_name": sanitize_string(item.get("planName", item.get("name", ""))),
                "tdu_area": sanitize_string(item.get("tdu", "")).upper(),
                "price_kwh_500": parse_float(item.get("price500", item.get("priceKwh500", ""))),
                "price_kwh_1000": parse_float(item.get("price1000", item.get("priceKwh1000", ""))),
                "price_kwh_2000": parse_float(item.get("price2000", item.get("priceKwh2000", ""))),
                "term_months": parse_int(item.get("termMonths", item.get("term", ""))),
                "rate_type": "FIXED",
                "renewable_pct": parse_int(item.get("renewablePct", item.get("renewable", "0"))),
                "is_prepaid": item.get("isPrepaid", item.get("prepaid", False)),
                "is_tou": item.get("isTou", item.get("timeOfUse", False)),
                "early_termination_fee": parse_float(item.get("etf", item.get("cancellationFee", "0"))),
                "base_charge_monthly": parse_float(item.get("baseCharge", item.get("monthlyCharge", "0"))),
                "efl_url": sanitize_url(item.get("eflUrl", item.get("factLabel", ""))),
                "enrollment_url": sanitize_url(item.get("enrollUrl", item.get("enroll", ""))),
                "terms_url": sanitize_url(item.get("tosUrl", item.get("terms", ""))),
                "special_terms": sanitize_string(item.get("specialTerms", "")),
                "promotion_details": sanitize_string(item.get("promotions", "")),
            }

            if plan["price_kwh_1000"] and plan["price_kwh_1000"] > 0:
                if not plan["price_kwh_500"]:
                    plan["price_kwh_500"] = plan["price_kwh_1000"]
                if not plan["price_kwh_2000"]:
                    plan["price_kwh_2000"] = plan["price_kwh_1000"]
                plans.append(plan)

        except (ValueError, KeyError, TypeError) as e:
            continue

    return plans


def sanitize_string(value: Any) -> str:
    """Sanitize and clean string values."""
    if value is None:
        return ""
    return str(value).strip()


def sanitize_url(value: Any) -> str:
    """Sanitize and validate URL values."""
    if value is None:
        return ""
    url = str(value).strip()
    if url and not url.startswith(('http://', 'https://')):
        if url.startswith('//'):
            url = 'https:' + url
        elif url.startswith('/'):
            url = 'https://www.powertochoose.org' + url
    return url


def parse_float(value: Any) -> float | None:
    """Parse a value to float, returning None if invalid."""
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            return float(value)
        cleaned = str(value).strip().replace("$", "").replace("¢", "").replace(",", "").replace("%", "")
        return float(cleaned) if cleaned else None
    except (ValueError, AttributeError):
        return None


def parse_int(value: Any) -> int | None:
    """Parse a value to int, returning None if invalid."""
    if value is None:
        return None
    try:
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        cleaned = str(value).strip().replace(",", "")
        # Handle cases like "12 months"
        cleaned = cleaned.split()[0] if cleaned else ""
        return int(float(cleaned)) if cleaned else None
    except (ValueError, AttributeError):
        return None


def deduplicate_plans(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicate plans based on key fields."""
    seen = set()
    unique_plans = []

    for plan in plans:
        # Create a key from identifying fields
        key = (
            plan["rep_name"].lower(),
            plan["plan_name"].lower(),
            plan["tdu_area"],
            plan["term_months"],
        )

        if key not in seen:
            seen.add(key)
            unique_plans.append(plan)

    return unique_plans


def save_plans(plans: list[dict[str, Any]], output_path: Path) -> None:
    """Save plans to JSON file with metadata."""
    # Deduplicate before saving
    plans = deduplicate_plans(plans)

    data = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "data_source": "Power to Choose (https://www.powertochoose.org)",
        "total_plans": len(plans),
        "disclaimer": "Plan information is subject to change. Always verify details on the official EFL before enrolling.",
        "plans": plans,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(plans)} fixed-rate plans to {output_path}")


def print_summary(plans: list[dict[str, Any]]) -> None:
    """Print a summary of fetched plans."""
    print("\nSummary:")
    print(f"  Total fixed-rate plans: {len(plans)}")

    # Count plans by TDU
    tdu_counts: dict[str, int] = {}
    for plan in plans:
        tdu = plan.get("tdu_area", "UNKNOWN")
        tdu_counts[tdu] = tdu_counts.get(tdu, 0) + 1

    print("\n  Plans by TDU:")
    for tdu, count in sorted(tdu_counts.items()):
        print(f"    {tdu}: {count}")

    # Show price range
    prices = [p["price_kwh_1000"] for p in plans if p.get("price_kwh_1000")]
    if prices:
        print(f"\n  Price range at 1000 kWh:")
        print(f"    Lowest:  {min(prices):.2f}¢/kWh")
        print(f"    Highest: {max(prices):.2f}¢/kWh")
        print(f"    Average: {sum(prices) / len(prices):.2f}¢/kWh")

    # Show renewable options
    renewable_100 = sum(1 for p in plans if p.get("renewable_pct", 0) == 100)
    print(f"\n  100% Renewable plans: {renewable_100}")


def main() -> None:
    """Main execution function."""
    # Determine project root (script is in scripts/ directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / "data" / "plans.json"

    print("=" * 70)
    print("Light - Texas Electricity Plan Fetcher")
    print("=" * 70)

    # Fetch data
    data_text, data_type = fetch_plans_data()

    # Parse based on data type
    if data_type == "csv":
        plans = parse_csv_to_plans(data_text)
    else:
        plans = parse_json_to_plans(data_text)

    if not plans:
        print("Warning: No fixed-rate plans found!", file=sys.stderr)
        print("This may indicate an issue with the data source.")
        sys.exit(1)

    # Save to file
    save_plans(plans, output_path)

    # Print summary
    print_summary(plans)

    print("\n" + "=" * 70)
    print("Data fetch complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
