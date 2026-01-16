/**
 * Analyze the language-dependent extraction issue
 * Shows which English/Spanish pairs might have mismatched special term extraction
 */

const fs = require('fs');

// Load plans data
const data = JSON.parse(fs.readFileSync('./data/plans.json', 'utf-8'));

// Spanish keyword mappings
const spanishKeywords = {
  FREE_TIME: ['gratis', 'gratuita', 'gratuito', 'sin cargo', 'electricidad gratis', 'fin de semana'],
  MIN_USAGE: ['uso mínimo', 'consumo mínimo', 'mínimo de uso'],
  SOLAR_BUYBACK: ['recompra solar', 'compra de energía solar'],
  NEW_ONLY: ['nuevos clientes', 'clientes nuevos', 'solo nuevos']
};

// Current extraction function (English-only)
function extractSpecialTermsEnglish(terms) {
  if (!terms || terms === 'FALSE') return '';
  const text = terms.toUpperCase();
  const indicators = [];

  if (text.includes('FREE') && (text.includes('WEEKEND') || text.includes('NIGHT')))
    indicators.push('FREE_TIME');
  if (text.includes('MINIMUM USAGE'))
    indicators.push('MIN_USAGE');
  if (text.includes('SOLAR') && text.includes('BUYBACK'))
    indicators.push('SOLAR_BUYBACK');
  if (text.includes('NEW CUSTOMER'))
    indicators.push('NEW_ONLY');

  return indicators.sort().join('|');
}

// Enhanced extraction function (bilingual)
function extractSpecialTermsBilingual(terms) {
  if (!terms || terms === 'FALSE') return '';
  const text = terms.toUpperCase();
  const indicators = [];

  // Check English and Spanish keywords
  if (text.includes('FREE') || text.includes('GRATIS') || text.includes('GRATUITA')) {
    if (text.includes('WEEKEND') || text.includes('NIGHT') ||
        text.includes('FIN DE SEMANA') || text.includes('NOCHE')) {
      indicators.push('FREE_TIME');
    }
  }

  if (text.includes('MINIMUM USAGE') || text.includes('USO MÍNIMO') ||
      text.includes('CONSUMO MÍNIMO')) {
    indicators.push('MIN_USAGE');
  }

  if ((text.includes('SOLAR') && text.includes('BUYBACK')) ||
      text.includes('RECOMPRA SOLAR')) {
    indicators.push('SOLAR_BUYBACK');
  }

  if (text.includes('NEW CUSTOMER') || text.includes('NUEVOS CLIENTES') ||
      text.includes('CLIENTES NUEVOS') || text.includes('SOLO NUEVOS')) {
    indicators.push('NEW_ONLY');
  }

  return indicators.sort().join('|');
}

// Find mismatches
const mismatches = [];
const analyzed = new Set();

for (const plan of data.plans) {
  if (analyzed.has(plan.plan_id)) continue;

  // Find potential duplicate
  const duplicate = data.plans.find(p =>
    p.plan_id !== plan.plan_id &&
    p.rep_name === plan.rep_name &&
    p.tdu_area === plan.tdu_area &&
    Math.abs(p.price_kwh_1000 - plan.price_kwh_1000) < 0.01 &&
    p.term_months === plan.term_months &&
    p.language !== plan.language &&
    (p.special_terms || plan.special_terms) &&
    p.special_terms !== 'FALSE' &&
    plan.special_terms !== 'FALSE'
  );

  if (duplicate) {
    const englishOnly1 = extractSpecialTermsEnglish(plan.special_terms);
    const englishOnly2 = extractSpecialTermsEnglish(duplicate.special_terms);

    const bilingual1 = extractSpecialTermsBilingual(plan.special_terms);
    const bilingual2 = extractSpecialTermsBilingual(duplicate.special_terms);

    // Check if English-only extraction causes mismatch
    if (englishOnly1 !== englishOnly2 && bilingual1 === bilingual2) {
      mismatches.push({
        rep: plan.rep_name,
        plan1: plan.plan_name,
        lang1: plan.language,
        plan2: duplicate.plan_name,
        lang2: duplicate.language,
        englishExtract1: englishOnly1 || '(none)',
        englishExtract2: englishOnly2 || '(none)',
        bilingualExtract: bilingual1 || '(none)',
        terms1: plan.special_terms.substring(0, 100),
        terms2: duplicate.special_terms.substring(0, 100)
      });
    }

    analyzed.add(plan.plan_id);
    analyzed.add(duplicate.plan_id);
  }
}

console.log('='.repeat(100));
console.log('LANGUAGE-DEPENDENT EXTRACTION ANALYSIS');
console.log('='.repeat(100));
console.log(`\nTotal plans analyzed: ${data.plans.length}`);
console.log(`Plans with special terms: ${data.plans.filter(p => p.special_terms && p.special_terms !== 'FALSE').length}`);
console.log(`\nEnglish/Spanish pairs with mismatched extraction: ${mismatches.length}`);

if (mismatches.length > 0) {
  console.log('\n' + '='.repeat(100));
  console.log('MISMATCHED PAIRS (Would be incorrectly treated as DIFFERENT plans):');
  console.log('='.repeat(100));

  mismatches.forEach((m, i) => {
    console.log(`\n[${i + 1}] ${m.rep}`);
    console.log(`  Plan 1: ${m.plan1} (${m.lang1})`);
    console.log(`    Terms: ${m.terms1}...`);
    console.log(`    English-only extract: "${m.englishExtract1}"`);
    console.log(`  Plan 2: ${m.plan2} (${m.lang2})`);
    console.log(`    Terms: ${m.terms2}...`);
    console.log(`    English-only extract: "${m.englishExtract2}"`);
    console.log(`  Bilingual extract (both): "${m.bilingualExtract}"`);
  });
} else {
  console.log('\n✓ No mismatches found! Current implementation is working correctly.');
  console.log('  (Spanish plans either have no special_terms or use English keywords)');
}

console.log('\n' + '='.repeat(100));
