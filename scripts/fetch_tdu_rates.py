#!/usr/bin/env python3
"""
Update TDU delivery rates from PUCT filings.

TDU rates are updated twice per year (March 1 and September 1).
This script helps maintain the tdu-rates.json file with current rates.

Since TDU rates come from official PUCT tariff filings, this script
provides a template for manual updates rather than automated scraping.

VULNERABILITY FIXED: Full type hints for mypy strict mode
VULNERABILITY FIXED: Specific exception handling for I/O operations
VULNERABILITY FIXED: Structured logging replaces print statements
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def load_current_rates(file_path: Path) -> dict[str, Any]:
    """
    Load existing TDU rates.

    VULNERABILITY FIXED: Specific exception handling

    Args:
        file_path: Path to tdu-rates.json

    Returns:
        Parsed rates data or empty dict on error
    """
    if not file_path.exists():
        logger.warning("TDU rates file not found: %s", file_path)
        return {}

    try:
        with file_path.open(encoding="utf-8") as f:
            data: dict[str, Any] = json.load(f)
            return data
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", e)
        return {}
    except OSError as e:
        logger.error("File read error: %s", e)
        return {}


def update_tdu_rate(
    rates_data: dict[str, Any],
    tdu_code: str,
    monthly_base: float | None = None,
    per_kwh: float | None = None,
    effective_date: str | None = None,
    notes: str | None = None,
) -> bool:
    """
    Update a specific TDU's rates.

    Args:
        rates_data: Full rates data dict (mutated in place)
        tdu_code: TDU code to update (e.g., "CENTERPOINT")
        monthly_base: New monthly base charge
        per_kwh: New per-kWh rate
        effective_date: New effective date string
        notes: Optional notes about the update

    Returns:
        True if TDU was found and updated, False otherwise
    """
    tdus = rates_data.get("tdus")
    if not isinstance(tdus, list):
        logger.error("Invalid rates data: missing tdus list")
        return False

    for tdu in tdus:
        if not isinstance(tdu, dict):
            continue
        if tdu.get("code") == tdu_code:
            if monthly_base is not None:
                tdu["monthly_base_charge"] = monthly_base
            if per_kwh is not None:
                tdu["per_kwh_rate"] = per_kwh
            if effective_date is not None:
                tdu["effective_date"] = effective_date
            if notes is not None:
                tdu["notes"] = notes
            logger.info("Updated TDU %s", tdu_code)
            return True

    logger.warning("TDU %s not found in data", tdu_code)
    return False


def save_rates(rates_data: dict[str, Any], file_path: Path) -> bool:
    """
    Save updated rates to file.

    VULNERABILITY FIXED: Specific exception handling

    Args:
        rates_data: Rates data to save
        file_path: Path to save to

    Returns:
        True on success, False on error
    """
    rates_data["last_updated"] = datetime.now(tz=UTC).strftime("%Y-%m-%d")

    try:
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(rates_data, f, indent=2, ensure_ascii=False)
        logger.info("Updated TDU rates saved to %s", file_path)
        return True
    except OSError as e:
        logger.error("Failed to save rates: %s", e)
        return False


def display_current_rates(rates_data: dict[str, Any]) -> None:
    """
    Display current TDU rates in a table.

    Args:
        rates_data: Full rates data dict
    """
    print("\n" + "=" * 90)
    print("Current TDU Delivery Rates")
    print("=" * 90)
    header = f"{'TDU':<20} {'Base Charge':<15} {'Per kWh':<15} {'Effective Date':<15}"
    print(header)
    print("-" * 90)

    tdus = rates_data.get("tdus")
    if isinstance(tdus, list):
        for tdu in tdus:
            if not isinstance(tdu, dict):
                continue
            name = str(tdu.get("name", "Unknown"))[:20]
            base_charge = tdu.get("monthly_base_charge", 0)
            per_kwh_rate = tdu.get("per_kwh_rate", 0)
            eff_date = str(tdu.get("effective_date", "Unknown"))

            base = f"${base_charge:.2f}/mo"
            per_kwh = f"{per_kwh_rate:.2f}¢/kWh"
            print(f"{name:<20} {base:<15} {per_kwh:<15} {eff_date:<15}")

    print("=" * 90)

    last_updated = rates_data.get("last_updated", "Unknown")
    next_update = rates_data.get("next_update", "Unknown")
    print(f"\nLast updated: {last_updated}")
    print(f"Next scheduled update: {next_update}")
    print()


def main() -> int:
    """
    Main execution function.

    Returns:
        Exit code (0 for success, 1 for error)
    """
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    rates_file = project_root / "data" / "tdu-rates.json"

    print("=" * 90)
    print("TDU Rate Management Tool")
    print("=" * 90)

    # Load current rates
    rates_data = load_current_rates(rates_file)

    tdus = rates_data.get("tdus")
    if not isinstance(tdus, list) or not tdus:
        logger.error("No TDU data found!")
        return 1

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

    return 0


if __name__ == "__main__":
    sys.exit(main())
