"""
Pydantic models for electricity plan data validation.

VULNERABILITY FIXED: All data is now validated before processing
VULNERABILITY FIXED: Explicit types replace implicit any
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field, field_validator


class RateType(str, Enum):
    """Valid rate types for electricity plans."""

    FIXED = "FIXED"
    VARIABLE = "VARIABLE"
    INDEXED = "INDEXED"


class ETFStructure(str, Enum):
    """Early termination fee calculation structure."""

    FLAT = "flat"
    PER_MONTH_REMAINING = "per-month-remaining"
    UNKNOWN = "unknown"


class ETFSource(str, Enum):
    """Source of ETF information."""

    EFL = "efl"
    TEXT_PARSING = "text-parsing"
    LEGACY = "legacy"


class ETFDetails(BaseModel):
    """Early termination fee details from EFL parsing."""

    structure: ETFStructure
    base_amount: float | None = None
    source: ETFSource

    model_config = {"frozen": True}


class ElectricityPlan(BaseModel):
    """
    Validated electricity plan data model.

    All fields match the Power to Choose API/CSV schema.
    Validation ensures data integrity before processing.

    VULNERABILITY FIXED: Pydantic validators replace manual isinstance checks
    """

    plan_id: str
    plan_name: str
    rep_name: str
    tdu_area: str
    rate_type: str  # Validated in field_validator
    term_months: Annotated[int, Field(ge=0)]
    price_kwh_500: Annotated[float, Field(ge=0)]
    price_kwh_1000: Annotated[float, Field(ge=0)]
    price_kwh_2000: Annotated[float, Field(ge=0)]
    base_charge_monthly: Annotated[float, Field(ge=0, default=0.0)]
    early_termination_fee: float | None = None
    renewable_pct: Annotated[int, Field(ge=0, le=100, default=0)]
    is_prepaid: bool = False
    is_tou: bool = False
    special_terms: str | None = None
    promotion_details: str | None = None
    fees_credits: str | None = None
    min_usage_fees: str | None = None
    language: str = "en"
    efl_url: str | None = None
    enrollment_url: str | None = None
    terms_url: str | None = None
    etf_details: ETFDetails | None = None

    model_config = {"frozen": True}

    @field_validator("rate_type")
    @classmethod
    def validate_rate_type(cls, v: str) -> str:
        """
        Validate rate_type is one of the expected values.

        VULNERABILITY FIXED: Explicit error instead of silent pass
        """
        valid_types = {"FIXED", "VARIABLE", "INDEXED"}
        upper = v.upper()
        if upper not in valid_types:
            raise ValueError(f"Invalid rate_type: {v}. Must be one of {valid_types}")
        return upper

    @field_validator("tdu_area")
    @classmethod
    def validate_tdu_area(cls, v: str) -> str:
        """Validate TDU area is not empty."""
        if not v or not v.strip():
            raise ValueError("tdu_area cannot be empty")
        return v.strip().upper()


class TDURate(BaseModel):
    """TDU delivery rate information."""

    code: str
    name: str
    monthly_base_charge: Annotated[float, Field(ge=0)]
    per_kwh_rate: Annotated[float, Field(ge=0)]
    effective_date: str
    zip_codes: list[tuple[int, int]] = Field(default_factory=list)
    notes: str | None = None

    model_config = {"frozen": True}


class PlansMetadata(BaseModel):
    """Metadata for plans.json file."""

    fetched_at: str
    total_plans: Annotated[int, Field(ge=0)]
    source: str

    model_config = {"frozen": True}


class PlansData(BaseModel):
    """Full plans.json file structure."""

    plans: list[ElectricityPlan]
    metadata: PlansMetadata

    model_config = {"frozen": True}


class TDURatesData(BaseModel):
    """Full tdu-rates.json file structure."""

    tdus: list[TDURate]
    last_updated: str
    next_update: str

    model_config = {"frozen": True}


class CityTaxData(BaseModel):
    """Tax data for a city."""

    rate: Annotated[float, Field(ge=0, le=1)]
    tdu: str | None = None
    deregulated: bool = True
    note: str | None = None
    zip_codes: list[str] = Field(default_factory=list)

    model_config = {"frozen": True}


class RangeTaxData(BaseModel):
    """Tax data for a ZIP range."""

    rate: Annotated[float, Field(ge=0, le=1)]
    region: str
    tdu: str | None = None
    note: str | None = None

    model_config = {"frozen": True}


class LocalTaxesData(BaseModel):
    """Full local-taxes.json file structure."""

    major_cities: dict[str, CityTaxData] = Field(default_factory=dict)
    zip_code_ranges: dict[str, RangeTaxData] = Field(default_factory=dict)
    default_local_rate: Annotated[float, Field(ge=0, le=1, default=0.0)]

    model_config = {"frozen": True}
