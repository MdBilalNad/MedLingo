import { determineFlag, parseReferenceRange, resolveCanonicalName, normalizeLabResult } from '../src/core/flagging.ts';
import { redactPii } from '../src/core/redaction.ts';
import { sanitizeExplanationText, checkUrgentCriticalValues } from '../src/core/safety.ts';
import { MockLLMClient } from '../src/core/llm/mock.ts';
import { SYNTHETIC_REPORTS } from '../src/data/synthetic_data.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${testName}`, details || '');
  }
}

console.log('--- RUNNING MEDLINGO TEST SUITE ---');

// 1. Flagging & Range Parsing Tests
console.log('\n[1. Deterministic Flagging & Range Tests]');
{
  const range1 = parseReferenceRange('13.0 - 17.5');
  assert(range1.low === 13.0 && range1.high === 17.5, 'Parses standard hyphen range');

  const range2 = parseReferenceRange('< 200');
  assert(range2.low === null && range2.high === 200, 'Parses < inequality bound');

  const range3 = parseReferenceRange('> 40');
  assert(range3.low === 40 && range3.high === null, 'Parses > inequality bound');

  // Boundary testing
  const flagNormal = determineFlag('Hemoglobin', 14.5, 12.0, 16.0);
  assert(flagNormal.flag === 'normal', 'Identifies normal value inside interval');

  const flagLow = determineFlag('Hemoglobin', 10.2, 12.0, 16.0);
  assert(flagLow.flag === 'low', 'Identifies low hemoglobin');

  const flagHigh = determineFlag('Total Cholesterol', 240, null, 200);
  assert(flagHigh.flag === 'high', 'Identifies high total cholesterol above upper bound');

  // Critical threshold testing (Potassium critical high threshold is 6.0 in KB)
  const flagCritK = determineFlag('Potassium', 6.8, 3.5, 5.0);
  assert(flagCritK.flag === 'critical_high', 'Detects critical high hyperkalemia (Potassium 6.8)');

  const flagCritPlatelet = determineFlag('Platelets', 35, 150, 450);
  assert(flagCritPlatelet.flag === 'critical_low', 'Detects critical low thrombocytopenia (Platelets 35)');

  // Alias resolution
  assert(resolveCanonicalName('Hb') === 'Hemoglobin', 'Resolves alias Hb -> Hemoglobin');
  assert(resolveCanonicalName('SGPT') === 'Alanine Aminotransferase', 'Resolves alias SGPT -> Alanine Aminotransferase');
  assert(resolveCanonicalName('FBS') === 'Fasting Blood Glucose', 'Resolves alias FBS -> Fasting Blood Glucose');
}

// 2. PII Redaction Tests
console.log('\n[2. PII Redaction Tests]');
{
  const sample = `Patient Name: John Doe
DOB: 12/05/1982
MRN: 9948210
Phone: (555) 234-5678
Email: j.doe@example.com
Hemoglobin 13.5 g/dL`;

  const redacted = redactPii(sample);
  assert(!redacted.redactedText.includes('John Doe'), 'Masks patient full name');
  assert(!redacted.redactedText.includes('12/05/1982'), 'Masks date of birth');
  assert(!redacted.redactedText.includes('(555) 234-5678'), 'Masks phone number');
  assert(!redacted.redactedText.includes('j.doe@example.com'), 'Masks email address');
  assert(!redacted.redactedText.includes('9948210'), 'Masks medical record number');
  assert(redacted.redactedText.includes('Hemoglobin 13.5 g/dL'), 'Preserves clinical laboratory data');
}

// 3. Safety Guardrails & Urgent Alerts
console.log('\n[3. Safety Guardrails & Urgent Escalation]');
{
  const badDiagnosisText = 'You have severe diabetes and should take 500mg Metformin immediately.';
  const sanitized = sanitizeExplanationText(badDiagnosisText);
  assert(sanitized.violations.length >= 2, 'Detects both definitive diagnosis and medication dosage violations');
  assert(!sanitized.cleanText.includes('take 500mg Metformin'), 'Strips direct medication prescription instruction');

  // Urgent notice test
  const normalNotice = checkUrgentCriticalValues([
    {
      test_name: 'Hemoglobin',
      raw_name: 'Hemoglobin',
      value: 13.5,
      value_text: '13.5',
      unit: 'g/dL',
      ref_low: 12.0,
      ref_high: 16.0,
      ref_text: '12 - 16',
      flag: 'normal',
      confidence: 1.0,
    },
  ]);
  assert(normalNotice === null, 'No urgent notice when all values are normal');

  const critNotice = checkUrgentCriticalValues([
    {
      test_name: 'Potassium',
      raw_name: 'Potassium',
      value: 6.8,
      value_text: '6.8',
      unit: 'mmol/L',
      ref_low: 3.5,
      ref_high: 5.0,
      ref_text: '3.5 - 5.0',
      flag: 'critical_high',
      confidence: 1.0,
    },
  ]);
  assert(critNotice !== null && critNotice.includes('URGENT'), 'Triggers prominent urgent clinical notice for critical values');
}

// 4. LLM Abstraction Mock Tests
console.log('\n[4. LLM Abstraction & Mock Provider]');
{
  const mock = new MockLLMClient();
  assert(mock.isAvailable() === true, 'Mock client reports available');
  assert(mock.providerName().includes('Mock'), 'Reports correct provider name');
}

// 5. Synthetic Ground Truth Verification
console.log('\n[5. Synthetic Reports & Knowledge Base Fallback]');
{
  assert(SYNTHETIC_REPORTS.length >= 8, `Has at least 8 synthetic reports (found ${SYNTHETIC_REPORTS.length})`);
  const critReport = SYNTHETIC_REPORTS.find((r) => r.has_critical);
  assert(Boolean(critReport), 'Includes synthetic report with critical test flag');
}

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
