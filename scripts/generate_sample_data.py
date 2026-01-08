#!/usr/bin/env python3
"""
Generate realistic sample electricity plan data for development

This creates sample data based on typical Texas electricity plans
for development and testing purposes.
"""

import json
from datetime import datetime, timezone
from pathlib import Path


def generate_sample_plans() -> list[dict]:
    """Generate realistic sample plans."""
    return [
        # Good simple fixed-rate plans
        {
            "plan_id": "4CHANGE_SIMPLE_12",
            "rep_name": "4Change Energy",
            "plan_name": "Maxx Saver Select 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 12.4,
            "price_kwh_1000": 9.8,
            "price_kwh_2000": 9.1,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 23,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl1.pdf",
            "enrollment_url": "https://example.com/enroll1",
            "terms_url": "https://example.com/tos1",
            "special_terms": "",
            "promotion_details": "",
        },
        {
            "plan_id": "GEXA_SAVER_12",
            "rep_name": "Gexa Energy",
            "plan_name": "Saver Supreme 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 11.9,
            "price_kwh_1000": 9.5,
            "price_kwh_2000": 8.9,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 100,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 175.0,
            "base_charge_monthly": 4.95,
            "efl_url": "https://example.com/efl2.pdf",
            "enrollment_url": "https://example.com/enroll2",
            "terms_url": "https://example.com/tos2",
            "special_terms": "",
            "promotion_details": "100% renewable energy",
        },
        {
            "plan_id": "RELIANT_TRUE_24",
            "rep_name": "Reliant Energy",
            "plan_name": "True Simple 24",
            "tdu_area": "CENTERPOINT",
            "price_kwh_500": 13.2,
            "price_kwh_1000": 10.2,
            "price_kwh_2000": 9.4,
            "term_months": 24,
            "rate_type": "FIXED",
            "renewable_pct": 0,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 240.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl3.pdf",
            "enrollment_url": "https://example.com/enroll3",
            "terms_url": "https://example.com/tos3",
            "special_terms": "",
            "promotion_details": "",
        },
        # Bill credit "gimmick" plan - looks good at 1000 kWh but terrible otherwise
        {
            "plan_id": "FRONTIER_CREDIT_12",
            "rep_name": "Frontier Utilities",
            "plan_name": "Bill Credit Plus 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 22.8,
            "price_kwh_1000": 7.9,
            "price_kwh_2000": 11.4,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 0,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl4.pdf",
            "enrollment_url": "https://example.com/enroll4",
            "terms_url": "https://example.com/tos4",
            "special_terms": "$120 bill credit applied when usage is between 1000-1050 kWh",
            "promotion_details": "Special promotional rate with bill credit",
        },
        # Free nights plan - expensive daytime rates
        {
            "plan_id": "TXU_FREENIGHTS_12",
            "rep_name": "TXU Energy",
            "plan_name": "Free Nights & Solar Days 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 16.8,
            "price_kwh_1000": 13.2,
            "price_kwh_2000": 11.9,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 50,
            "is_prepaid": False,
            "is_tou": True,
            "early_termination_fee": 195.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl5.pdf",
            "enrollment_url": "https://example.com/enroll5",
            "terms_url": "https://example.com/tos5",
            "special_terms": "Free electricity every night from 9 PM to 6 AM",
            "promotion_details": "Free nights with solar renewable energy",
        },
        # More good simple plans across different TDUs
        {
            "plan_id": "DIRECT_VALUE_12",
            "rep_name": "Direct Energy",
            "plan_name": "Live Brighter 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 12.1,
            "price_kwh_1000": 9.9,
            "price_kwh_2000": 9.2,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 15,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 8.95,
            "efl_url": "https://example.com/efl6.pdf",
            "enrollment_url": "https://example.com/enroll6",
            "terms_url": "https://example.com/tos6",
            "special_terms": "",
            "promotion_details": "",
        },
        {
            "plan_id": "PULSE_CHOICE_12",
            "rep_name": "Pulse Power",
            "plan_name": "Texas Choice 12",
            "tdu_area": "CENTERPOINT",
            "price_kwh_500": 13.8,
            "price_kwh_1000": 10.4,
            "price_kwh_2000": 9.7,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 8,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 165.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl7.pdf",
            "enrollment_url": "https://example.com/enroll7",
            "terms_url": "https://example.com/tos7",
            "special_terms": "",
            "promotion_details": "",
        },
        {
            "plan_id": "DISCOUNT_POWER_12",
            "rep_name": "Discount Power",
            "plan_name": "Saver 12",
            "tdu_area": "AEP_NORTH",
            "price_kwh_500": 11.7,
            "price_kwh_1000": 9.3,
            "price_kwh_2000": 8.8,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 30,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 4.95,
            "efl_url": "https://example.com/efl8.pdf",
            "enrollment_url": "https://example.com/enroll8",
            "terms_url": "https://example.com/tos8",
            "special_terms": "",
            "promotion_details": "",
        },
        {
            "plan_id": "GREEN_MOUNTAIN_24",
            "rep_name": "Green Mountain Energy",
            "plan_name": "Pollution Free e-Plus 24",
            "tdu_area": "CENTERPOINT",
            "price_kwh_500": 13.9,
            "price_kwh_1000": 10.8,
            "price_kwh_2000": 10.1,
            "term_months": 24,
            "rate_type": "FIXED",
            "renewable_pct": 100,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 225.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl9.pdf",
            "enrollment_url": "https://example.com/enroll9",
            "terms_url": "https://example.com/tos9",
            "special_terms": "",
            "promotion_details": "100% pollution-free renewable energy",
        },
        {
            "plan_id": "ENERGY_TEXAS_12",
            "rep_name": "Energy Texas",
            "plan_name": "The Bull 12",
            "tdu_area": "ONCOR",
            "price_kwh_500": 11.4,
            "price_kwh_1000": 9.2,
            "price_kwh_2000": 8.7,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 20,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 4.95,
            "efl_url": "https://example.com/efl10.pdf",
            "enrollment_url": "https://example.com/enroll10",
            "terms_url": "https://example.com/tos10",
            "special_terms": "",
            "promotion_details": "No-nonsense electricity",
        },
        # Another bill credit trap
        {
            "plan_id": "AMBIT_CREDIT_12",
            "rep_name": "Ambit Energy",
            "plan_name": "Credit Boost 12",
            "tdu_area": "CENTERPOINT",
            "price_kwh_500": 21.4,
            "price_kwh_1000": 8.4,
            "price_kwh_2000": 10.9,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 0,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 195.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl11.pdf",
            "enrollment_url": "https://example.com/enroll11",
            "terms_url": "https://example.com/tos11",
            "special_terms": "$100 bill credit when usage is exactly 1000 kWh",
            "promotion_details": "Introductory credit offer",
        },
        # TNMP plans (higher TDU costs)
        {
            "plan_id": "CIRRO_TNMP_12",
            "rep_name": "Cirro Energy",
            "plan_name": "Simple Rate 12",
            "tdu_area": "TNMP",
            "price_kwh_500": 14.2,
            "price_kwh_1000": 11.5,
            "price_kwh_2000": 10.8,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 12,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl12.pdf",
            "enrollment_url": "https://example.com/enroll12",
            "terms_url": "https://example.com/tos12",
            "special_terms": "",
            "promotion_details": "",
        },
        # 36-month plan
        {
            "plan_id": "CHAMPION_36",
            "rep_name": "Champion Energy",
            "plan_name": "Champ Saver-36",
            "tdu_area": "ONCOR",
            "price_kwh_500": 10.8,
            "price_kwh_1000": 8.9,
            "price_kwh_2000": 8.4,
            "term_months": 36,
            "rate_type": "FIXED",
            "renewable_pct": 18,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 300.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl13.pdf",
            "enrollment_url": "https://example.com/enroll13",
            "terms_url": "https://example.com/tos13",
            "special_terms": "",
            "promotion_details": "Long-term rate lock",
        },
        # Short 6-month plan
        {
            "plan_id": "SPRING_POWER_6",
            "rep_name": "Spring Power & Gas",
            "plan_name": "Seasonal Saver 6",
            "tdu_area": "ONCOR",
            "price_kwh_500": 13.1,
            "price_kwh_1000": 10.6,
            "price_kwh_2000": 9.9,
            "term_months": 6,
            "rate_type": "FIXED",
            "renewable_pct": 25,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 75.0,
            "base_charge_monthly": 9.95,
            "efl_url": "https://example.com/efl14.pdf",
            "enrollment_url": "https://example.com/enroll14",
            "terms_url": "https://example.com/tos14",
            "special_terms": "",
            "promotion_details": "Great for timing your renewal to fall season",
        },
        # AEP Central plan
        {
            "plan_id": "PENNYWISE_AEP_12",
            "rep_name": "Pennywise Power",
            "plan_name": "Smart Choice 12",
            "tdu_area": "AEP_CENTRAL",
            "price_kwh_500": 12.3,
            "price_kwh_1000": 9.7,
            "price_kwh_2000": 9.0,
            "term_months": 12,
            "rate_type": "FIXED",
            "renewable_pct": 22,
            "is_prepaid": False,
            "is_tou": False,
            "early_termination_fee": 150.0,
            "base_charge_monthly": 4.95,
            "efl_url": "https://example.com/efl15.pdf",
            "enrollment_url": "https://example.com/enroll15",
            "terms_url": "https://example.com/tos15",
            "special_terms": "",
            "promotion_details": "",
        },
    ]


def save_sample_data(output_path: Path) -> None:
    """Save sample plans to JSON file."""
    plans = generate_sample_plans()

    data = {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "data_source": "Sample Data (for development)",
        "note": "This is sample data for development. Replace with real Power to Choose data in production.",
        "total_plans": len(plans),
        "plans": plans,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Generated {len(plans)} sample plans at {output_path}")


def main() -> None:
    """Main execution function."""
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    output_path = project_root / "data" / "plans.json"

    print("=" * 70)
    print("Generating Sample Electricity Plan Data")
    print("=" * 70)

    save_sample_data(output_path)

    print("\nSample data includes:")
    print("  - Simple fixed-rate plans (recommended)")
    print("  - Bill credit 'gimmick' plans (to warn users about)")
    print("  - Time-of-use plans")
    print("  - Plans across all major TDUs")
    print("  - Various contract lengths (6, 12, 24, 36 months)")
    print("\n" + "=" * 70)


if __name__ == "__main__":
    main()
