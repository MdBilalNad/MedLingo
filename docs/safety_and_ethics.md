# MedLingo: Safety, Ethics, and Governance Charter

## 1. Intended Use and Scope
MedLingo is an educational decision-support and health-literacy application. It is designed to assist patients in understanding standard lab terminology and identifying questions to discuss with their licensed healthcare clinicians.

**Non-Goals & Prohibited Uses:**
- MedLingo is NOT a diagnostic device.
- It does NOT formulate clinical treatment regimens.
- It NEVER prescribes medications or specifies drug dosages.
- It is NOT a substitute for professional clinical judgment or emergency medicine.

## 2. Deterministic Grounding Principle
A core ethical vulnerability in medical AI applications is LLM numerical hallucination (e.g. asserting that a potassium level of 6.8 mmol/L is "fine").
MedLingo completely removes the LLM from the clinical flagging path:
- Flagging is calculated via 100% deterministic code against explicit laboratory intervals or verified reference tables.
- Critical values (e.g., Potassium > 6.0, Hemoglobin < 7.0, Platelets < 50) immediately trigger prominent Urgent Attention alerts.

## 3. Privacy by Design (PII Redaction)
- Zero persistent storage of personal health documents: reports are parsed ephemerally in memory and never logged to persistent disks or external telemetry.
- Comprehensive client/server PII Redaction masks Patient Name, Date of Birth, Phone Number, Email, Address, and Medical Record Number (MRN) before any prompt reaches an LLM.

## 4. Mitigating Demographic & Biological Bias
- Laboratory reference ranges vary across biological sex, age groups, and ethnic demographics.
- MedLingo supports age- and sex-adjusted reference intervals.
- The UI explicitly clarifies that reference ranges printed on the physical laboratory report always take legal and clinical precedence over generic reference intervals.

## 5. Automated Post-Generation Safety Filters
Generated patient texts pass through automated heuristic filters that block:
1. Definitive diagnostic assertions ("You have cancer/diabetes").
2. Medication names and dosage directives ("Take 500mg Metformin").
3. False safety assurances ("You are completely healthy, no need to see a doctor").

## 6. Localized Plain-Language Ethics
Health literacy barriers disproportionately harm marginalized linguistic communities and elderly patients. MedLingo maintains:
- Native bilingual generation with parenthetical English terminology (e.g. "हीमोग्लोबिन (Hemoglobin)").
- Arabic and Urdu right-to-left (RTL) typographical support.
- Audio speech synthesis for low-literacy users.
