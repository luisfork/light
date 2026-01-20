import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ETFCalculator } from '../../src/ts/modules/etf-calculator';
import type { ElectricityPlan, ETFDetails } from '../../src/ts/types';

// Test fixture helper
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
    early_termination_fee: 0,
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

test('detects per-month remaining ETF with dollar sign', () => {
  const plan = createTestPlan({
    special_terms: 'Cancellation fee is $20 per month remaining.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 20);
  assert.equal(result.total, 120);
});

test('detects per-month remaining ETF without dollar sign', () => {
  const plan = createTestPlan({
    special_terms: 'Termination fee equals 15 per month remaining.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 4);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 15);
  assert.equal(result.total, 60);
});

test('parses fixed ETF from special terms', () => {
  const plan = createTestPlan({
    special_terms: 'Early termination fee: $150.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'flat');
  assert.equal(result.total, 150);
});

test('detects explicit no-fee language', () => {
  const plan = createTestPlan({
    early_termination_fee: 50,
    special_terms: 'No early termination fee.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'none');
  assert.equal(result.total, 0);
});

test('flags conditional no-fee language', () => {
  const plan = createTestPlan({
    early_termination_fee: 50,
    special_terms: 'No cancellation fee if you move.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'none-conditional');
  assert.equal(result.total, 0);
});

test('treats zero ETF with no terms as unknown', () => {
  const plan = createTestPlan({
    term_months: 24,
    special_terms: ''
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 12);

  assert.equal(result.structure, 'unknown');
  assert.equal(result.total, 0);
});

test('treats unspecified fee language as unknown', () => {
  const plan = createTestPlan({
    special_terms: 'Early termination fee applies.'
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'unknown');
  assert.equal(result.total, 0);
});

test('does not infer per-month for prepaid plans', () => {
  const plan = createTestPlan({
    early_termination_fee: 49,
    is_prepaid: true,
    special_terms: ''
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'flat');
  assert.equal(result.total, 49);
});

test('uses etf_details when provided', () => {
  const etfDetails: ETFDetails = {
    structure: 'per-month-remaining',
    base_amount: 20,
    source: 'efl'
  };

  const plan = createTestPlan({
    etf_details: etfDetails
  });

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 5);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 20);
  assert.equal(result.total, 100);
});

test('getETFDisplayInfo returns formatted text', () => {
  const plan = createTestPlan({
    early_termination_fee: 150
  });

  const info = ETFCalculator.getETFDisplayInfo(plan);

  assert.ok(info.displayText !== undefined);
  assert.ok(typeof info.displayText === 'string');
});
