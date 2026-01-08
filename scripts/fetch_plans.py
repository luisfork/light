#!/usr/bin/env python3
"""
Fetch electricity plans from Power to Choose and save to data/plans.json

This script fetches plan data from the Power to Choose CSV export endpoint,
processes it, and saves it to a JSON file for the static site to consume.
"""

import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests


def fetch_plans_csv(url: str = "http://www.powertochoose.org/en-us/Plan/ExportToCsv") -> str:
    """Fetch the CSV data from Power to Choose."""
    print(f"Fetching plans from {url}...")

    # Add headers to mimic a browser request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text
    except requests.exceptions.RequestException as e:
        print(f"Error fetching plans: {e}", file=sys.stderr)

        # Try alternative API endpoint
        print("\nTrying API endpoint instead...")
        try:
            api_url = "http://api.powertochoose.org/api/PowerToChoose/plans"
            response = requests.get(api_url, headers=headers, timeout=30)
            response.raise_for_status()

            # Convert JSON response to CSV-like format
            # For now, save as-is and we'll process it
            return response.text
        except requests.exceptions.RequestException as api_error:
            print(f"API endpoint also failed: {api_error}", file=sys.stderr)
            print("\nNote: Power to Choose data fetch requires manual intervention.")
            print("Consider creating sample data or using alternative data sources.")
            sys.exit(1)


def parse_csv_to_plans(csv_text: str) -> list[dict[str, Any]]:
    """Parse CSV text into structured plan data."""
    plans = []
    reader = csv.DictReader(csv_text.splitlines())

    for row in reader:
        try:
            # Filter to fixed-rate plans only as specified in requirements
            rate_type = row.get("Rate Type", "").upper()
            if "FIXED" not in rate_type:
                continue

            # Parse plan data
            plan = {
                "plan_id": row.get("ID Plan", ""),
                "rep_name": row.get("REP Name", ""),
                "plan_name": row.get("Product", ""),
                "tdu_area": row.get("TDU", "").upper(),
                # Prices at standard usage levels (in cents per kWh)
                "price_kwh_500": parse_float(row.get("Price/kWh: 500 kWh", "")),
                "price_kwh_1000": parse_float(row.get("Price/kWh: 1000 kWh", "")),
                "price_kwh_2000": parse_float(row.get("Price/kWh: 2000 kWh", "")),
                # Plan details
                "term_months": parse_int(row.get("Term Value", "")),
                "rate_type": "FIXED",
                "renewable_pct": parse_int(row.get("Renewable Content", "0")),
                "is_prepaid": row.get("Prepaid", "").upper() == "YES",
                "is_tou": row.get("Time of Use", "").upper() == "YES",
                # Fees
                "early_termination_fee": parse_float(row.get("Cancellation Fee", "0")),
                "base_charge_monthly": parse_float(row.get("Monthly Recurring Charge", "0")),
                # URLs
                "efl_url": row.get("Electricity Facts Label (EFL) URL", ""),
                "enrollment_url": row.get("Enroll URL", ""),
                "terms_url": row.get("Terms of Service (TOS) URL", ""),
                # Special features
                "special_terms": row.get("Special terms and conditions", ""),
                "promotion_details": row.get("Promotion details", ""),
            }

            # Only include plans with valid pricing data
            if plan["price_kwh_1000"] and plan["price_kwh_1000"] > 0:
                plans.append(plan)

        except (ValueError, KeyError) as e:
            print(f"Warning: Error parsing plan row: {e}", file=sys.stderr)
            continue

    return plans


def parse_float(value: str) -> float | None:
    """Parse a string to float, returning None if invalid."""
    try:
        cleaned = value.strip().replace("$", "").replace("¢", "").replace(",", "")
        return float(cleaned) if cleaned else None
    except (ValueError, AttributeError):
        return None


def parse_int(value: str) -> int | None:
    """Parse a string to int, returning None if invalid."""
    try:
        cleaned = value.strip()
        return int(cleaned) if cleaned else None
    except (ValueError, AttributeError):
        return None


def save_plans(plans: list[dict[str, Any]], output_path: Path) -> None:
    """Save plans to JSON file."""
    data = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "data_source": "Power to Choose (http://www.powertochoose.org)",
        "total_plans": len(plans),
        "plans": plans,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Saved {len(plans)} fixed-rate plans to {output_path}")


def main() -> None:
    """Main execution function."""
    # Determine project root (script is in scripts/ directory)
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / "data" / "plans.json"

    print("=" * 70)
    print("Light - Texas Electricity Plan Fetcher")
    print("=" * 70)

    # Fetch and parse data
    csv_text = fetch_plans_csv()
    plans = parse_csv_to_plans(csv_text)

    if not plans:
        print("Warning: No fixed-rate plans found!", file=sys.stderr)
        sys.exit(1)

    # Save to file
    save_plans(plans, output_path)

    # Print summary
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

    print("\n" + "=" * 70)
    print("✓ Data fetch complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
