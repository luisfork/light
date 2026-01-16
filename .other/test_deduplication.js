/**
 * Test deduplication logic
 * Run with: node .other/test_deduplication.js
 */

// Mock plans to test deduplication
const testPlans = [
  // English version
  {
    plan_id: '1',
    rep_name: 'TXU ENERGY',
    plan_name: 'Simple Rate 12',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.0,
    price_kwh_1000: 14.5,
    price_kwh_2000: 14.0,
    term_months: 12,
    rate_type: 'FIXED',
    renewable_pct: 25,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 150.0,
    base_charge_monthly: 0.0,
    fees_credits: '$50 bill credit when usage is at least 1000 kWh',
    special_terms: '',
    language: 'English'
  },
  // Spanish version (duplicate)
  {
    plan_id: '2',
    rep_name: 'TXU ENERGY',
    plan_name: 'Tarifa Simple 12',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.0,
    price_kwh_1000: 14.5,
    price_kwh_2000: 14.0,
    term_months: 12,
    rate_type: 'FIXED',
    renewable_pct: 25,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 150.0,
    base_charge_monthly: 0.0,
    fees_credits: '$50 crédito de factura cuando el uso es al menos 1000 kWh',
    special_terms: '',
    language: 'Spanish'
  },
  // Different plan (different bill credit)
  {
    plan_id: '3',
    rep_name: 'TXU ENERGY',
    plan_name: 'Value Rate 12',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.0,
    price_kwh_1000: 14.5,
    price_kwh_2000: 14.0,
    term_months: 12,
    rate_type: 'FIXED',
    renewable_pct: 25,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 150.0,
    base_charge_monthly: 0.0,
    fees_credits: '$100 bill credit when usage is at least 2000 kWh',
    special_terms: '',
    language: 'English'
  },
  // Different plan (free weekends)
  {
    plan_id: '4',
    rep_name: 'TXU ENERGY',
    plan_name: 'Free Weekends 12',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.0,
    price_kwh_1000: 14.5,
    price_kwh_2000: 14.0,
    term_months: 12,
    rate_type: 'FIXED',
    renewable_pct: 25,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 150.0,
    base_charge_monthly: 0.0,
    fees_credits: 'FALSE',
    special_terms: 'Free power from 12 midnight Friday night to 11:59 PM Sunday night',
    language: 'English'
  },
  // Test bilingual extraction: English "new customers only"
  {
    plan_id: '5',
    rep_name: 'DISCOUNT POWER',
    plan_name: 'Saver 24',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.5,
    price_kwh_1000: 15.2,
    price_kwh_2000: 15.0,
    term_months: 24,
    rate_type: 'FIXED',
    renewable_pct: 20,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 240.0,
    base_charge_monthly: 0.0,
    fees_credits: 'FALSE',
    special_terms: 'This offer is for new customers only',
    language: 'English'
  },
  // Spanish version (should be duplicate)
  {
    plan_id: '6',
    rep_name: 'DISCOUNT POWER',
    plan_name: 'Ahorrador 24',
    tdu_area: 'ONCOR',
    price_kwh_500: 15.5,
    price_kwh_1000: 15.2,
    price_kwh_2000: 15.0,
    term_months: 24,
    rate_type: 'FIXED',
    renewable_pct: 20,
    is_prepaid: false,
    is_tou: false,
    early_termination_fee: 240.0,
    base_charge_monthly: 0.0,
    fees_credits: 'FALSE',
    special_terms: 'Esta oferta es sólo para nuevos clientes',
    language: 'Spanish'
  }
];

// Simplified fingerprinting function for testing
function createPlanFingerprint(plan) {
  const normalizePrice = (price) => Math.round((price || 0) * 1000) / 1000;
  const normalizeFee = (fee) => Math.round((fee || 0) * 100) / 100;

  const normalizeBillCredits = (feesCredits) => {
    if (!feesCredits || feesCredits === 'FALSE' || feesCredits === 'false') return '';
    const text = feesCredits.toString().toUpperCase();
    const amounts = [];
    const dollarMatches = text.match(/\$\d+(?:\.\d{2})?/g);
    if (dollarMatches) amounts.push(...dollarMatches.sort());
    const kwhMatches = text.match(/\d+\s*KWH/g);
    if (kwhMatches) amounts.push(...kwhMatches.sort());
    return amounts.join('|');
  };

  const normalizeSpecialTerms = (terms) => {
    if (!terms || terms === 'FALSE' || terms === 'false') return '';
    const text = terms.toString().toUpperCase();
    const indicators = [];

    // Bilingual: English and Spanish
    if (
      text.includes('FREE') ||
      text.includes('GRATIS') ||
      text.includes('GRATUITA') ||
      text.includes('GRATUITO')
    ) {
      if (
        text.includes('WEEKEND') ||
        text.includes('NIGHT') ||
        text.includes('FIN DE SEMANA') ||
        text.includes('NOCHE')
      ) {
        indicators.push('FREE_TIME');
      }
    }

    if (
      text.includes('MINIMUM USAGE') ||
      text.includes('USO MÍNIMO') ||
      text.includes('USO MINIMO') ||
      text.includes('CONSUMO MÍNIMO') ||
      text.includes('CONSUMO MINIMO')
    ) {
      indicators.push('MIN_USAGE');
    }

    if (
      (text.includes('SOLAR') && text.includes('BUYBACK')) ||
      text.includes('RECOMPRA SOLAR') ||
      text.includes('COMPRA DE ENERGÍA SOLAR') ||
      text.includes('COMPRA DE ENERGIA SOLAR')
    ) {
      indicators.push('SOLAR_BUYBACK');
    }

    if (
      text.includes('NEW CUSTOMER') ||
      text.includes('NUEVOS CLIENTES') ||
      text.includes('CLIENTES NUEVOS') ||
      text.includes('SOLO NUEVOS') ||
      text.includes('SÓLO NUEVOS') ||
      text.includes('NUEVO CLIENTE')
    ) {
      indicators.push('NEW_ONLY');
    }

    return indicators.sort().join('|');
  };

  return JSON.stringify({
    rep: (plan.rep_name || '').toUpperCase().trim(),
    tdu: (plan.tdu_area || '').toUpperCase().trim(),
    rate_type: (plan.rate_type || 'FIXED').toUpperCase().trim(),
    p500: normalizePrice(plan.price_kwh_500),
    p1000: normalizePrice(plan.price_kwh_1000),
    p2000: normalizePrice(plan.price_kwh_2000),
    term: plan.term_months || 0,
    etf: normalizeFee(plan.early_termination_fee),
    base: normalizeFee(plan.base_charge_monthly),
    renewable: plan.renewable_pct || 0,
    prepaid: !!plan.is_prepaid,
    tou: !!plan.is_tou,
    credits: normalizeBillCredits(plan.fees_credits),
    special: normalizeSpecialTerms(plan.special_terms)
  });
}

// Test the fingerprinting
console.log('Testing Deduplication Fingerprinting\n');
console.log('='.repeat(80));

const fingerprints = testPlans.map((plan, idx) => {
  const fp = createPlanFingerprint(plan);
  console.log(`\nPlan ${idx + 1}: ${plan.plan_name} (${plan.language})`);
  console.log(`Fees/Credits: ${plan.fees_credits}`);
  console.log(`Special Terms: ${plan.special_terms || 'None'}`);
  console.log(`Fingerprint: ${fp.substring(0, 100)}...`);
  return fp;
});

console.log('\n' + '='.repeat(80));
console.log('\nDuplication Analysis:');
console.log(`- Plans 1 & 2 should be DUPLICATES: ${fingerprints[0] === fingerprints[1] ? 'YES ✓' : 'NO ✗'}`);
console.log(`- Plans 1 & 3 should be DIFFERENT: ${fingerprints[0] !== fingerprints[2] ? 'YES ✓' : 'NO ✗'}`);
console.log(`- Plans 1 & 4 should be DIFFERENT: ${fingerprints[0] !== fingerprints[3] ? 'YES ✓' : 'NO ✗'}`);
console.log(`- Plans 3 & 4 should be DIFFERENT: ${fingerprints[2] !== fingerprints[3] ? 'YES ✓' : 'NO ✗'}`);
console.log(
  `- Plans 5 & 6 should be DUPLICATES (bilingual test): ${fingerprints[4] === fingerprints[5] ? 'YES ✓' : 'NO ✗'}`
);

console.log('\n' + '='.repeat(80));
console.log('\nExpected Results:');
console.log('- 6 plans input');
console.log('- 2 duplicates removed (plan 2 Spanish, plan 6 Spanish)');
console.log('- 4 unique plans remaining (plans 1, 3, 4, 5)');
