#!/usr/bin/env python3
"""
Archive plans.json to CSV format for historical records.

VULNERABILITY FIXED: Full type hints for mypy strict mode
VULNERABILITY FIXED: Specific exception handling for I/O operations
VULNERABILITY FIXED: Structured logging replaces print statements
"""

from __future__ import annotations

import csv
import json
import logging
import os
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

# CSV columns for archive
CSV_COLUMNS: tuple[str, ...] = (
    "plan_id",
    "plan_name",
    "rep_name",
    "tdu_area",
    "rate_type",
    "term_months",
    "price_kwh_500",
    "price_kwh_1000",
    "price_kwh_2000",
    "base_charge_monthly",
    "early_termination_fee",
    "renewable_pct",
    "is_prepaid",
    "is_tou",
    "special_terms",
    "promotion_details",
    "fees_credits",
    "min_usage_fees",
    "language",
    "efl_url",
    "enrollment_url",
    "terms_url",
)


def load_plans_json(json_path: Path) -> dict[str, Any] | None:
    """
    Load and parse plans.json file.

    VULNERABILITY FIXED: Specific exception handling

    Args:
        json_path: Path to the plans.json file

    Returns:
        Parsed JSON data or None on error
    """
    if not json_path.exists():
        logger.error("File not found: %s", json_path)
        return None

    try:
        with json_path.open(encoding="utf-8") as f:
            data: dict[str, Any] = json.load(f)
            return data
    except json.JSONDecodeError as e:
        logger.error("JSON parse error: %s", e)
        return None
    except OSError as e:
        logger.error("File read error: %s", e)
        return None


def get_timestamp() -> str:
    """
    Get timestamp for archive filename.

    Uses TIMESTAMP env var if set, otherwise current date.

    Returns:
        Timestamp string in YYYY-MM-DD format
    """
    env_timestamp = os.environ.get("TIMESTAMP")
    if env_timestamp:
        return env_timestamp
    return datetime.now(tz=UTC).strftime("%Y-%m-%d")


def write_csv_archive(
    plans: list[dict[str, Any]],
    output_path: Path,
) -> bool:
    """
    Write plans to CSV file.

    VULNERABILITY FIXED: Specific exception handling for file I/O

    Args:
        plans: List of plan dictionaries
        output_path: Path to output CSV file

    Returns:
        True on success, False on error
    """
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with output_path.open("w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=list(CSV_COLUMNS), extrasaction="ignore")
            writer.writeheader()
            for plan in plans:
                writer.writerow(plan)

        return True
    except OSError as e:
        logger.error("Failed to write CSV: %s", e)
        return False
    except csv.Error as e:
        logger.error("CSV formatting error: %s", e)
        return False


def archive_plans_to_csv(
    json_path: str = "data/plans.json",
    archive_dir: str = "data/csv-archive",
) -> int:
    """
    Convert plans.json to CSV and save to archive directory.

    VULNERABILITY FIXED: Uses Path objects for type safety
    VULNERABILITY FIXED: Structured logging

    Args:
        json_path: Path to the plans.json file
        archive_dir: Directory to save CSV archives

    Returns:
        Number of plans archived, or -1 on error
    """
    json_file = Path(json_path)
    archive_directory = Path(archive_dir)

    # Load JSON data
    data = load_plans_json(json_file)
    if data is None:
        return -1

    # Extract plans list
    plans_data = data.get("plans")
    if not isinstance(plans_data, list):
        logger.warning("No plans found in JSON file")
        return 0

    plans: list[dict[str, Any]] = plans_data
    if not plans:
        logger.warning("Plans list is empty")
        return 0

    # Generate output filename
    timestamp = get_timestamp()
    output_path = archive_directory / f"plans_{timestamp}.csv"

    # Write CSV
    if not write_csv_archive(plans, output_path):
        return -1

    logger.info("Archived %d plans to %s", len(plans), output_path)
    return len(plans)


def main() -> int:
    """
    Main entry point.

    Returns:
        Exit code (0 for success, 1 for error)
    """
    count = archive_plans_to_csv()
    return 0 if count >= 0 else 1


if __name__ == "__main__":
    sys.exit(main())
