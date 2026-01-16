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
import os
import random
import re
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

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
                delay = BASE_DELAY * (2**attempt) + random.uniform(0, 1)
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
    response.headers.get("Content-Type", "")
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

    # Check for test file override
    test_file = os.environ.get("TEST_FILE")
    if test_file:
        print(f"Using test file: {test_file}")
        if not os.path.exists(test_file):
            print(f"Error: Test file {test_file} not found")
            sys.exit(1)
        with open(test_file, encoding="utf-8") as f:
            return f.read(), "csv"

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
    csv_text = csv_text.lstrip("\ufeff").replace("\r\n", "\n").replace("\r", "\n")

    try:
        reader = csv.DictReader(csv_text.splitlines())

        # Verify we have expected columns
        if not reader.fieldnames:
            raise ValueError("No columns found in CSV")

        # Power to Choose uses bracketed column names like [TduCompanyName]
        # Map both old and new column formats
        print(f"  Found {len(reader.fieldnames)} columns")

        # Check for new bracket format
        has_brackets = any(col.startswith("[") for col in reader.fieldnames if col)
        if has_brackets:
            print("  Detected Power to Choose bracket column format")

    except csv.Error as e:
        print(f"CSV parsing error: {e}", file=sys.stderr)
        return []

    row_count = 0
    error_count = 0

    def get_val(row: dict, *keys: str) -> str:
        """Try multiple possible column names."""
        for key in keys:
            val = row.get(key)
            if val:
                return val
            # Try with brackets
            val = row.get(f"[{key}]")
            if val:
                return val
        return ""

    for row in reader:
        row_count += 1
        try:
            # Get TDU area and normalize it
            tdu_raw = get_val(row, "TduCompanyName", "TduCompany", "TDU", "TDU Area", "tdu_area")
            tdu_area = normalize_tdu_name(tdu_raw)

            # Parse prices - Power to Choose now returns decimal rates (e.g., 0.1600)
            # Convert to cents if needed
            price_500_raw = get_val(
                row, "kwh500", "Price/kWh 500", "Price/kWh: 500 kWh", "Price500", "price_kwh_500"
            )
            price_1000_raw = get_val(
                row,
                "kwh1000",
                "Price/kWh 1000",
                "Price/kWh: 1000 kWh",
                "Price1000",
                "price_kwh_1000",
            )
            price_2000_raw = get_val(
                row,
                "kwh2000",
                "Price/kWh 2000",
                "Price/kWh: 2000 kWh",
                "Price2000",
                "price_kwh_2000",
            )

            price_500 = parse_price(price_500_raw)
            price_1000 = parse_price(price_1000_raw)
            price_2000 = parse_price(price_2000_raw)

            # Extract Cancellation Fee
            cancel_fee_raw = get_val(
                row, "CancelFee", "Cancellation Fee", "ETF", "early_termination_fee"
            )
            if not cancel_fee_raw:
                # Try to extract from Pricing Details if CancelFee column is missing/empty
                pricing_details = get_val(row, "Pricing Details")
                if pricing_details:
                    # Look for "Cancellation Fee: $XXX" pattern
                    match = re.search(r"Cancellation Fee:\s*\$?([\d\.]+)", pricing_details)
                    if match:
                        cancel_fee_raw = match.group(1)

            # Parse plan data with validation

            # Determine language
            lang_raw = get_val(row, "Language", "Lang")
            if not lang_raw:
                # In exports where language isn't explicit but field exists as [Language], it's often populated.
                # If completely missing, assume English or check plan triggers?
                # For now default to 'English' if not mapped, but [Language] usually exists in offers.csv
                lang_raw = "English"

            plan = {
                "plan_id": sanitize_string(get_val(row, "idKey", "ID Plan", "Plan ID", "plan_id")),
                "rep_name": sanitize_string(get_val(row, "RepCompany", "REP Name", "rep_name")),
                "plan_name": sanitize_string(get_val(row, "Product", "Plan Name", "plan_name")),
                "tdu_area": tdu_area,
                # Prices at standard usage levels (in cents per kWh)
                "price_kwh_500": price_500,
                "price_kwh_1000": price_1000,
                "price_kwh_2000": price_2000,
                # Plan details
                "term_months": parse_int(
                    get_val(row, "TermValue", "Term Value", "Term", "term_months")
                ),
                "rate_type": sanitize_string(
                    get_val(row, "RateType", "Rate Type", "rate_type") or "FIXED"
                ).upper(),
                "renewable_pct": parse_int(
                    get_val(
                        row, "Renewable", "Renewable Perc", "Renewable Content", "renewable_pct"
                    )
                    or "0"
                ),
                "is_prepaid": get_val(row, "PrePaid", "Prepaid", "is_prepaid").upper()
                in ("TRUE", "YES", "1"),
                "is_tou": get_val(row, "TimeOfUse", "Time Of Use", "Time of Use", "is_tou").upper()
                in ("TRUE", "YES", "1"),
                # Fees
                "early_termination_fee": parse_float(cancel_fee_raw or "0"),
                "base_charge_monthly": parse_float(
                    get_val(row, "base_charge_monthly") or "0"
                ),  # Support internal field
                # URLs
                "efl_url": sanitize_url(
                    get_val(
                        row,
                        "FactsURL",
                        "Fact Sheet",
                        "Electricity Facts Label (EFL) URL",
                        "EFL URL",
                        "efl_url",
                    )
                ),
                "enrollment_url": sanitize_url(
                    get_val(
                        row,
                        "EnrollURL",
                        "Ordering Info",
                        "Enroll URL",
                        "Enrollment URL",
                        "enrollment_url",
                    )
                ),
                "terms_url": sanitize_url(
                    get_val(
                        row,
                        "TermsURL",
                        "Terms of Service",
                        "Terms of Service (TOS) URL",
                        "TOS URL",
                        "terms_url",
                    )
                ),
                # Special features
                "special_terms": sanitize_string(
                    get_val(
                        row,
                        "SpecialTerms",
                        "Plan Details",
                        "Special terms and conditions",
                        "Special Terms",
                        "special_terms",
                    )
                ),
                "promotion_details": sanitize_string(
                    get_val(row, "PromotionDesc", "Promotion", "Promotion details", "Promotions")
                ),
                # Additional fields
                "fees_credits": sanitize_string(
                    get_val(row, "Fees/Credits", "MinUsageFeesCredits", "Min Usage Fees/Credits")
                ),
                "min_usage_fees": sanitize_string(
                    get_val(row, "MinUsageFeesCredits", "Min Usage Fees/Credits", "Min Usage Fees")
                ),
                "language": sanitize_string(lang_raw),
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


def normalize_tdu_name(tdu_raw: str) -> str:
    """Normalize TDU company name to standard code."""
    if not tdu_raw:
        return "UNKNOWN"

    tdu_upper = tdu_raw.upper().strip()

    # Map full names to codes
    tdu_mapping = {
        "CENTERPOINT": "CENTERPOINT",
        "CENTERPOINT ENERGY": "CENTERPOINT",
        "CENTERPOINT ENERGY HOUSTON": "CENTERPOINT",
        "CENTERPOINT ENERGY HOUSTON ELECTRIC": "CENTERPOINT",
        "CENTERPOINT ENERGY HOUSTON ELECTRIC LLC": "CENTERPOINT",
        "ONCOR": "ONCOR",
        "ONCOR ELECTRIC": "ONCOR",
        "ONCOR ELECTRIC DELIVERY": "ONCOR",
        "ONCOR ELECTRIC DELIVERY COMPANY": "ONCOR",
        "AEP TEXAS CENTRAL": "AEP_CENTRAL",
        "AEP TEXAS CENTRAL COMPANY": "AEP_CENTRAL",
        "AEP CENTRAL": "AEP_CENTRAL",
        "AEP TEXAS NORTH": "AEP_NORTH",
        "AEP TEXAS NORTH COMPANY": "AEP_NORTH",
        "AEP NORTH": "AEP_NORTH",
        "TEXAS-NEW MEXICO POWER": "TNMP",
        "TEXAS-NEW MEXICO POWER COMPANY": "TNMP",
        "TNMP": "TNMP",
        "LUBBOCK POWER": "LPL",
        "LUBBOCK POWER & LIGHT": "LPL",
        "LPL": "LPL",
    }

    # Try exact match first
    if tdu_upper in tdu_mapping:
        return tdu_mapping[tdu_upper]

    # Try partial match
    for key, code in tdu_mapping.items():
        if key in tdu_upper or tdu_upper in key:
            return code

    return tdu_upper


def parse_price(value: Any) -> float | None:
    """Parse price value, handling both cents and decimal formats."""
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            num = float(value)
        else:
            cleaned = str(value).strip().replace("$", "").replace(",", "").replace("%", "")
            if not cleaned:
                return None
            num = float(cleaned)

        # Power to Choose returns rates as decimals (e.g., 0.1600 = 16 cents)
        # If value is less than 1, it's in dollars per kWh, convert to cents
        if num < 1.0:
            return num * 100
        return num
    except (ValueError, AttributeError):
        return None


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
                "early_termination_fee": parse_float(
                    item.get("etf", item.get("cancellationFee", "0"))
                ),
                "base_charge_monthly": parse_float(
                    item.get("baseCharge", item.get("monthlyCharge", "0"))
                ),
                "efl_url": sanitize_url(item.get("eflUrl", item.get("factLabel", ""))),
                "enrollment_url": sanitize_url(item.get("enrollUrl", item.get("enroll", ""))),
                "terms_url": sanitize_url(item.get("tosUrl", item.get("terms", ""))),
                "special_terms": sanitize_string(item.get("specialTerms", "")),
                "promotion_details": sanitize_string(item.get("promotions", "")),
                "language": sanitize_string(item.get("language", "English")),
            }

            if plan["price_kwh_1000"] and plan["price_kwh_1000"] > 0:
                if not plan["price_kwh_500"]:
                    plan["price_kwh_500"] = plan["price_kwh_1000"]
                if not plan["price_kwh_2000"]:
                    plan["price_kwh_2000"] = plan["price_kwh_1000"]
                plans.append(plan)

        except (ValueError, KeyError, TypeError):
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
    if url and not url.startswith(("http://", "https://")):
        if url.startswith("//"):
            url = "https:" + url
        elif url.startswith("/"):
            url = "https://www.powertochoose.org" + url
    return url


def parse_float(value: Any) -> float | None:
    """Parse a value to float, returning None if invalid."""
    if value is None:
        return None
    try:
        if isinstance(value, (int, float)):
            return float(value)
        cleaned = (
            str(value).strip().replace("$", "").replace("¢", "").replace(",", "").replace("%", "")
        )
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


def create_plan_fingerprint(plan: dict[str, Any]) -> str:
    """
    Create fingerprint matching JavaScript implementation.

    Duplicates typically occur when providers list the same plan in both English and Spanish
    with identical pricing, terms, and features but different plan names.

    Analysis shows that plans with identical numeric features always have identical
    text descriptions, making text extraction unnecessary.
    """

    def normalize_price(price):
        """Round price to 3 decimal places for consistent comparison"""
        if price is None:
            return 0.0
        return round(price * 1000) / 1000

    def normalize_fee(fee):
        """Round fee to 2 decimal places for consistent comparison"""
        if fee is None:
            return 0.0
        return round(fee * 100) / 100

    fingerprint_data = {
        "rep": (plan.get("rep_name") or "").upper().strip(),
        "tdu": (plan.get("tdu_area") or "").upper().strip(),
        "rate_type": (plan.get("rate_type") or "FIXED").upper().strip(),
        "p500": normalize_price(plan.get("price_kwh_500")),
        "p1000": normalize_price(plan.get("price_kwh_1000")),
        "p2000": normalize_price(plan.get("price_kwh_2000")),
        "term": plan.get("term_months") or 0,
        "etf": normalize_fee(plan.get("early_termination_fee")),
        "base": normalize_fee(plan.get("base_charge_monthly")),
        "renewable": plan.get("renewable_pct") or 0,
        "prepaid": bool(plan.get("is_prepaid")),
        "tou": bool(plan.get("is_tou")),
    }

    return json.dumps(fingerprint_data, sort_keys=True)


def calculate_plan_preference(plan: dict[str, Any]) -> int:
    """Score plans to prefer English versions with shorter names"""
    score = 100
    plan_name = plan.get("plan_name", "")
    special_terms = plan.get("special_terms", "")
    language = (plan.get("language") or "").lower()
    text = f"{plan_name} {special_terms}".lower()

    # Strong preference for explicitly marked English plans
    if language == "english":
        score += 50
    elif language in ("spanish", "español"):
        score -= 50

    # Penalize Spanish characters
    if "ñ" in text:
        score -= 20
    for char in ["á", "é", "í", "ó", "ú"]:
        if char in text:
            score -= 10
    if "ción" in text:
        score -= 15

    # Penalize longer names
    name_length = len(plan_name)
    if name_length > 50:
        score -= 15
    elif name_length > 30:
        score -= 10
    elif name_length > 20:
        score -= 5

    # Penalize special characters
    special_chars = sum(1 for c in plan_name if not c.isalnum() and c not in (" ", "-"))
    score -= special_chars * 2

    return score


def deduplicate_plans(plans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicate plans based on fingerprinting.

    Uses same fingerprinting logic as JavaScript implementation:
    - Creates fingerprint from pricing, terms, fees, and features
    - Prefers English versions with shorter, clearer names
    - Excludes plan_name and plan_id from fingerprint (these differ for duplicates)
    """
    fingerprint_map = {}

    for plan in plans:
        fingerprint = create_plan_fingerprint(plan)

        if fingerprint not in fingerprint_map:
            fingerprint_map[fingerprint] = plan
        else:
            # Compare preference scores - higher score wins
            existing_plan = fingerprint_map[fingerprint]
            existing_score = calculate_plan_preference(existing_plan)
            current_score = calculate_plan_preference(plan)

            if current_score > existing_score:
                fingerprint_map[fingerprint] = plan

    return list(fingerprint_map.values())


def save_plans(plans: list[dict[str, Any]], output_path: Path) -> None:
    """Save plans to JSON file with metadata.

    Note: We intentionally do NOT deduplicate here. Deduplication happens
    client-side in JavaScript so we can show statistics to the user about
    how many duplicates were removed.
    """
    data = {
        "last_updated": datetime.now(UTC).isoformat(),
        "data_source": "Power to Choose (https://www.powertochoose.org)",
        "total_plans": len(plans),
        "disclaimer": "Plan information is subject to change. Always verify details on the official EFL before enrolling.",
        "plans": plans,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(plans)} plans to {output_path}")


def print_summary(plans: list[dict[str, Any]]) -> None:
    """Print a summary of fetched plans."""
    # Show both total and deduplicated counts
    unique_plans = deduplicate_plans(plans)
    duplicate_count = len(plans) - len(unique_plans)

    print("\nSummary:")
    print(f"  Total plans (with duplicates): {len(plans)}")
    print(f"  Unique plans (after deduplication): {len(unique_plans)}")
    if duplicate_count > 0:
        print(f"  Duplicates removed: {duplicate_count}")

    # Count plans by TDU
    tdu_counts: dict[str, int] = {}
    for plan in unique_plans:
        tdu = plan.get("tdu_area", "UNKNOWN")
        tdu_counts[tdu] = tdu_counts.get(tdu, 0) + 1

    print("\n  Plans by TDU:")
    for tdu, count in sorted(tdu_counts.items()):
        print(f"    {tdu}: {count}")

    # Show price range
    prices = [p["price_kwh_1000"] for p in unique_plans if p.get("price_kwh_1000")]
    if prices:
        print("\n  Price range at 1000 kWh:")
        print(f"    Lowest:  {min(prices):.2f}¢/kWh")
        print(f"    Highest: {max(prices):.2f}¢/kWh")
        print(f"    Average: {sum(prices) / len(prices):.2f}¢/kWh")

    # Show renewable options
    renewable_100 = sum(1 for p in unique_plans if p.get("renewable_pct", 0) == 100)
    print(f"\n  100% Renewable plans: {renewable_100}")


def main() -> None:
    """Main execution function."""
    # Determine project root (script is in scripts/ directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / "data" / "plans.json"

    print("=" * 70)
    print("Texas Electricity Plan Fetcher")
    print("=" * 70)

    # Fetch data
    data_text, data_type = fetch_plans_data()

    # Parse based on data type
    if data_type == "csv":
        plans = parse_csv_to_plans(data_text)
    else:
        plans = parse_json_to_plans(data_text)

    if not plans:
        print("Warning: No plans found!", file=sys.stderr)
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
