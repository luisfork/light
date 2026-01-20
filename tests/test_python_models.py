"""
Test suite for Python scripts - Pydantic validation and script functionality.

Tests cover:
- Pydantic model validation for TDU rates
- Script utility functions
"""

from pathlib import Path

import pytest

from scripts.models import TDURateModel, TDURatesDataModel, TDURateValidator


class TestTDURateModel:
    """Tests for TDURateModel Pydantic validation."""

    def test_valid_tdu_rate(self) -> None:
        """Test that valid TDU rate data passes validation."""
        data = {
            "code": "ONCOR",
            "name": "Oncor Electric Delivery",
            "monthly_base_charge": 4.39,
            "per_kwh_rate": 3.8495,
            "effective_date": "2024-03-01",
            "zip_codes": [[75001, 75999], [76001, 76999]],
            "notes": "Dallas-Fort Worth service area",
        }
        model = TDURateModel(**data)
        assert model.code == "ONCOR"
        assert model.monthly_base_charge == 4.39
        assert len(model.zip_codes) == 2

    def test_missing_required_field(self) -> None:
        """Test that missing required fields raise validation error."""
        data = {
            "code": "ONCOR",
            # missing name
            "monthly_base_charge": 4.39,
            "per_kwh_rate": 3.8495,
            "effective_date": "2024-03-01",
            "zip_codes": [],
        }
        with pytest.raises(ValueError):
            TDURateModel(**data)

    def test_invalid_rate_type(self) -> None:
        """Test that invalid rate type raises validation error."""
        data = {
            "code": "ONCOR",
            "name": "Oncor",
            "monthly_base_charge": "not a number",  # should be float
            "per_kwh_rate": 3.8495,
            "effective_date": "2024-03-01",
            "zip_codes": [],
        }
        with pytest.raises(ValueError):
            TDURateModel(**data)

    def test_negative_rate_raises_error(self) -> None:
        """Test that negative rates raise validation error (strictly positive required)."""
        data = {
            "code": "TEST",
            "name": "Test TDU",
            "monthly_base_charge": -1.0,
            "per_kwh_rate": 0.0,
            "effective_date": "2024-01-01",
            "zip_codes": [],
        }
        with pytest.raises(ValueError):
            TDURateModel(**data)


class TestTDURatesDataModel:
    """Tests for TDURatesDataModel container validation."""

    def test_valid_rates_data(self) -> None:
        """Test that valid rates data container passes validation."""
        data = {
            "tdus": [
                {
                    "code": "ONCOR",
                    "name": "Oncor Electric Delivery",
                    "monthly_base_charge": 4.39,
                    "per_kwh_rate": 3.8495,
                    "effective_date": "2024-03-01",
                    "zip_codes": [[75001, 75999]],
                }
            ],
            "last_updated": "2024-03-15T10:00:00Z",
            "next_update": "2024-04-01",
        }
        model = TDURatesDataModel(**data)
        assert len(model.tdus) == 1
        assert model.tdus[0].code == "ONCOR"

    def test_empty_tdus_list(self) -> None:
        """Test that empty TDUs list is valid."""
        data = {"tdus": [], "last_updated": "2024-03-15T10:00:00Z", "next_update": "2024-04-01"}
        model = TDURatesDataModel(**data)
        assert len(model.tdus) == 0


class TestTDURateValidator:
    """Tests for TDURateValidator utility functions."""

    def test_validate_rate_value_valid(self) -> None:
        """Test rate validation for valid values."""
        assert TDURateValidator.validate_rate_value(5.0) is True
        assert TDURateValidator.validate_rate_value(0.0) is True
        assert TDURateValidator.validate_rate_value(100.0) is True

    def test_validate_rate_value_invalid(self) -> None:
        """Test rate validation for unreasonably high values."""
        # Rates above 50 cents/kWh would be extremely unusual
        assert TDURateValidator.validate_rate_value(100.0, max_reasonable=50.0) is False

    def test_validate_zip_code_range_valid(self) -> None:
        """Test ZIP code range validation."""
        assert TDURateValidator.validate_zip_code_range(75001, 75999) is True
        assert TDURateValidator.validate_zip_code_range(77001, 77001) is True  # Single ZIP

    def test_validate_zip_code_range_invalid(self) -> None:
        """Test invalid ZIP code range detection."""
        # Min > Max
        assert TDURateValidator.validate_zip_code_range(75999, 75001) is False
        # Invalid ZIP length
        assert TDURateValidator.validate_zip_code_range(750, 759) is False


class TestScriptPaths:
    """Tests for script path handling."""

    def test_scripts_directory_exists(self) -> None:
        """Verify scripts directory exists."""
        scripts_dir = Path(__file__).parent.parent / "scripts"
        assert scripts_dir.exists()

    def test_models_module_exists(self) -> None:
        """Verify models module exists."""
        models_init = Path(__file__).parent.parent / "scripts" / "models" / "__init__.py"
        assert models_init.exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
