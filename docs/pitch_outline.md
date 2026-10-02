# MedLingo Pitch Outline (Hackathon Presentation)

## Slide 1: The Problem
- **The Reality:** 80 million people in the US and hundreds of millions globally receive lab reports written in medical jargon ("microcytic hypochromic anemia", "elevated transaminases").
- **The Pain Point:** Patients wait days in anxiety, turn to unverified internet searches, or fail to take critical action. For non-native speakers, migrant families, and elderly patients, the barrier is even higher.

## Slide 2: The Core Innovation
- **MedLingo:** The Multilingual Medical Report Explainer.
- Upload any lab report (photo or text) -> instant plain-language explanation at a 6th-grade reading level in your mother tongue (Spanish, Hindi, Arabic, Bengali, French, English).
- Complete with:
  1. Color-coded & text-flagged lab results.
  2. "What this means in plain words" with common non-serious daily causes.
  3. Actionable "Questions to Ask Your Doctor" checklist.
  4. Audio text-to-speech for accessibility.

## Slide 3: Grounded Safety Architecture (Why Judges Can Trust It)
- **Zero Hallucination Flagging:** Flags (normal, low, high, critical) are computed by **100% deterministic code**, NEVER the LLM.
- **Urgent Red Alerting:** Critical values (e.g. Potassium 6.8 mmol/L) trigger immediate alerts to seek emergency care.
- **Privacy First:** Automatic PII scrubbing masks names, phone numbers, and IDs before external transmission.
- **Zero Diagnosis Guarantee:** Filters block prescriptions, diagnoses, and false promises.

## Slide 4: Live Demo (3-minute flow)
- 1-click test with a high-potassium critical emergency report.
- Switch live to Spanish or Hindi: test names retain English in brackets, e.g. "पोटेशियम (Potassium)".
- Show audio read-aloud and doctor question checklist.

## Slide 5: Global Impact & Roadmap
- Impact: Bridges the health literacy gap and democratizes clinical decision support.
- Next Steps: Direct EHR integration (FHIR/HL7), offline on-device deployment via Gemma 2/Ollama, expanded indigenous language models.
