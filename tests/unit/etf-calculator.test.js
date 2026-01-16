const test = require('node:test');
const assert = require('node:assert/strict');
const ETFCalculator = require('../../src/js/modules/etf-calculator');

test('detects per-month remaining ETF with dollar sign', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 0,
    special_terms: 'Cancellation fee is $20 per month remaining.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 20);
  assert.equal(result.total, 120);
});

test('detects per-month remaining ETF without dollar sign', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 0,
    special_terms: 'Termination fee equals 15 per month remaining.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 4);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 15);
  assert.equal(result.total, 60);
});

test('parses fixed ETF from special terms', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 0,
    special_terms: 'Early termination fee: $150.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'flat');
  assert.equal(result.total, 150);
});

test('detects explicit no-fee language', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 50,
    special_terms: 'No early termination fee.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'none');
  assert.equal(result.total, 0);
});

test('flags conditional no-fee language', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 50,
    special_terms: 'No cancellation fee if you move.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'none-conditional');
  assert.equal(result.total, 0);
});

test('treats zero ETF with no terms as unknown', () => {
  const plan = {
    term_months: 24,
    early_termination_fee: 0,
    special_terms: ''
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 12);

  assert.equal(result.structure, 'unknown');
  assert.equal(result.total, 0);
});

test('treats unspecified fee language as unknown', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 0,
    special_terms: 'Early termination fee applies.'
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'unknown');
  assert.equal(result.total, 0);
});

test('does not infer per-month for prepaid plans', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 49,
    is_prepaid: true,
    special_terms: ''
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 6);

  assert.equal(result.structure, 'flat');
  assert.equal(result.total, 49);
});

test('uses etf_details when provided', () => {
  const plan = {
    term_months: 12,
    early_termination_fee: 0,
    etf_details: {
      structure: 'per-month',
      per_month_rate: 20,
      source: 'efl'
    }
  };

  const result = ETFCalculator.calculateEarlyTerminationFee(plan, 5);

  assert.equal(result.structure, 'per-month');
  assert.equal(result.perMonthRate, 20);
  assert.equal(result.total, 100);
});
