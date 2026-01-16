const test = require('node:test');
const assert = require('node:assert/strict');
const CostCalculator = require('../../src/js/modules/cost-calculator');

test('calculateMonthlyCost handles zero usage safely', () => {
  const plan = {
    price_kwh_500: 12,
    price_kwh_1000: 11,
    price_kwh_2000: 10,
    base_charge_monthly: 0,
    special_terms: null
  };

  const tduRates = {
    monthly_base_charge: 0,
    per_kwh_rate: 5
  };

  const result = CostCalculator.calculateMonthlyCost(0, plan, tduRates, 0.02);

  assert.equal(result.total, 0);
  assert.equal(result.breakdown.effectiveRate, 0);
});

test('calculateAnnualCost handles zero usage safely', () => {
  const plan = {
    price_kwh_500: 12,
    price_kwh_1000: 11,
    price_kwh_2000: 10,
    base_charge_monthly: 0,
    special_terms: null
  };

  const tduRates = {
    monthly_base_charge: 0,
    per_kwh_rate: 5
  };

  const usage = Array(12).fill(0);
  const result = CostCalculator.calculateAnnualCost(usage, plan, tduRates, 0.02);

  assert.equal(result.annualCost, 0);
  assert.equal(result.effectiveAnnualRate, 0);
});
