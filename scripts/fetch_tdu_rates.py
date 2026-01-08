#!/usr/bin/env python3
"""
Update TDU delivery rates from PUCT filings

TDU rates are updated twice per year (March 1 and September 1).
This script helps maintain the tdu-rates.json file with current rates.

Since TDU rates come from official PUCT tariff filings, this script
provides a template for manual updates rather than automated scraping.
"""

import json
import sys
from datetime import datetime
from pathlib import Path


def load_current_rates(file_path: Path) -> dict:
    """Load existing TDU rates."""
    if file_path.exists():
        with open(file_path, encoding="utf-8") as f:
            return json.load(f)
    return {}


def update_tdu_rate(
    rates_data: dict,
    tdu_code: str,
    monthly_base: float | None = None,
    per_kwh: float | None = None,
    effective_date: str | None = None,
    notes: str | None = None,
) -> None:
    """Update a specific TDU's rates."""
    # Find the TDU in the data
    for tdu in rates_data.get("tdus", []):
        if tdu["code"] == tdu_code:
            if monthly_base is not None:
                tdu["monthly_base_charge"] = monthly_base
            if per_kwh is not None:
                tdu["per_kwh_rate"] = per_kwh
            if effective_date is not None:
                tdu["effective_date"] = effective_date
            if notes is not None:
                tdu["notes"] = notes
            return

    print(f"Warning: TDU {tdu_code} not found in data", file=sys.stderr)


def save_rates(rates_data: dict, file_path: Path) -> None:
    """Save updated rates to file."""
    rates_data["last_updated"] = datetime.now().strftime("%Y-%m-%d")

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(rates_data, f, indent=2, ensure_ascii=False)

    print(f"✓ Updated TDU rates saved to {file_path}")


def display_current_rates(rates_data: dict) -> None:
    """Display current TDU rates in a table."""
    print("\n" + "=" * 90)
    print("Current TDU Delivery Rates")
    print("=" * 90)
    print(
        f"{'TDU':<20} {'Base Charge':<15} {'Per kWh':<15} {'Effective Date':<15}"
    )
    print("-" * 90)

    for tdu in rates_data.get("tdus", []):
        base = f"${tdu['monthly_base_charge']:.2f}/mo"
        per_kwh = f"{tdu['per_kwh_rate']:.2f}¢/kWh"
        print(
            f"{tdu['name']:<20} {base:<15} {per_kwh:<15} {tdu['effective_date']:<15}"
        )

    print("=" * 90)
    print(f"\nLast updated: {rates_data.get('last_updated', 'Unknown')}")
    print(f"Next scheduled update: {rates_data.get('next_update', 'Unknown')}")
    print("\n")


def main() -> None:
    """Main execution function."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    rates_file = project_root / "data" / "tdu-rates.json"

    print("=" * 90)
    print("Light - TDU Rate Management Tool")
    print("=" * 90)

    # Load current rates
    rates_data = load_current_rates(rates_file)

    if not rates_data.get("tdus"):
        print("Error: No TDU data found!", file=sys.stderr)
        sys.exit(1)

    # Display current rates
    display_current_rates(rates_data)

    # Example: To update rates manually, uncomment and modify:
    # update_tdu_rate(
    #     rates_data,
    #     "CENTERPOINT",
    #     monthly_base=4.90,
    #     per_kwh=6.00,
    #     effective_date="2025-12-08",
    #     notes="Updated rate for Resiliency Plan"
    # )
    #
    # save_rates(rates_data, rates_file)

    print("TDU Rate Sources:")
    print("  - Official PUCT Tariff Archive:")
    print("    https://www.puc.texas.gov/industry/electric/rates/tdr/Default.aspx")
    print("  - Individual TDU websites for current tariffs")
    print("\nNote: TDU rates update on March 1 and September 1 each year.")
    print("      Monitor PUCT filings for rate change approvals.")


if __name__ == "__main__":
    main()
