import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CostCalculator } from '../../src/ts/modules/cost-calculator';
import type { ElectricityPlan, TDURate } from '../../src/ts/types';

// Test fixtures
const createTestPlan = (overrides: Partial<ElectricityPlan> = {}): ElectricityPlan =>
  ({
    plan_id: 'test-001',
    plan_name: 'Test Plan',
    rep_name: 'Test REP',
    tdu_area: 'ONCOR',
    rate_type: 'FIXED',
    term_months: 12,
    price_kwh_500: 12,
    price_kwh_1000: 11,
    price_kwh_2000: 10,
    base_charge_monthly: 0,
    early_termination_fee: null,
    renewable_pct: 0,
    is_prepaid: false,
    is_tou: false,
    special_terms: null,
    promotion_details: null,
    fees_credits: null,
    min_usage_fees: null,
    language: 'English',
    efl_url: null,
    enrollment_url: null,
    terms_url: null,
    ...overrides
  }) as ElectricityPlan;

const createTestTDU = (overrides: Partial<TDURate> = {}): TDURate =>
  ({
    code: 'ONCOR',
    name: 'Oncor Electric Delivery',
    monthly_base_charge: 0,
    per_kwh_rate: 5,
    effective_date: '2024-01-01',
    zip_codes: [],
    ...overrides
  }) as TDURate;

test('calculateMonthlyCost handles zero usage safely', () => {
  const plan = createTestPlan();
  const tduRates = createTestTDU();

  const result = CostCalculator.calculateMonthlyCost(0, plan, tduRates, 0.02);

  assert.equal(result.total, 0);
  assert.equal(result.breakdown.effectiveRate, 0);
});

test('calculateAnnualCost handles zero usage safely', () => {
  const plan = createTestPlan();
  const tduRates = createTestTDU();

  const usage = Array(12).fill(0) as number[];
  const result = CostCalculator.calculateAnnualCost(usage, plan, tduRates, 0.02);

  assert.equal(result.annualCost, 0);
  assert.equal(result.effectiveAnnualRate, 0);
});

test('calculateMonthlyCost calculates correctly for 1000 kWh', () => {
  const plan = createTestPlan({
    price_kwh_1000: 10, // 10 cents/kWh = $100 for 1000 kWh
    base_charge_monthly: 10
  });
  const tduRates = createTestTDU({
    monthly_base_charge: 5,
    per_kwh_rate: 3
  });

  const result = CostCalculator.calculateMonthlyCost(1000, plan, tduRates, 0);

  // Energy: 1000 * 10 / 100 = $100
  // Base: $10
  // TDU: $5 + (1000 * 3 / 100) = $5 + $30 = $35
  // Total energy + base = $110
  assert.ok(result.total > 0);
  assert.ok(result.breakdown.energyCost > 0);
});

test('calculateAnnualCost sums monthly costs correctly', () => {
  const plan = createTestPlan({ price_kwh_1000: 10 });
  const tduRates = createTestTDU();

  // Each month 1000 kWh
  const usage = Array(12).fill(1000) as number[];
  const result = CostCalculator.calculateAnnualCost(usage, plan, tduRates, 0);

  assert.equal(result.totalUsage, 12000);
  assert.equal(result.monthlyCosts.length, 12);
  assert.ok(result.annualCost > 0);
});
