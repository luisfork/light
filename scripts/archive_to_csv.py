#!/usr/bin/env python3
"""Archive plans.json to CSV format for historical records."""

import csv
import json
import os
import sys
from datetime import datetime


def archive_plans_to_csv(
    json_path: str = "data/plans.json",
    archive_dir: str = "data/archive-csv"
) -> int:
    """Convert plans.json to CSV and save to archive directory.

    Args:
        json_path: Path to the plans.json file
        archive_dir: Directory to save CSV archives

    Returns:
        Number of plans archived, or -1 on error
    """
    if not os.path.exists(json_path):
        print(f"Error: {json_path} not found")
        return -1

    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return -1

    plans = data.get("plans", [])
    if not plans:
        print("No plans found in JSON file")
        return 0

    # Define CSV columns
    columns = [
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
        "efl_url",
        "enrollment_url",
    ]

    # Get timestamp from env or generate new one
    timestamp = os.environ.get("TIMESTAMP", datetime.now().strftime("%Y%m%d_%H%M%S"))

    # Create output directory
    os.makedirs(archive_dir, exist_ok=True)

    # Write CSV
    output_path = os.path.join(archive_dir, f"plans_{timestamp}.csv")
    with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for plan in plans:
            writer.writerow(plan)

    print(f"Archived {len(plans)} plans to {output_path}")
    return len(plans)


if __name__ == "__main__":
    count = archive_plans_to_csv()
    sys.exit(0 if count >= 0 else 1)
