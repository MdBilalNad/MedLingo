# MedLingo - Multilingual Medical Report Explainer
It helps analyze reports
> **Hackathon Edition**: Decision support and health literacy for patients, migrant workers, rural families, and non-native speakers.

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Flagging](https://img.shields.io/badge/Flagging-100%25%20Deterministic-blue.svg)]()
[![Privacy](https://img.shields.io/badge/PII-Auto%20Redacted-green.svg)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)]()

---

## 1. Problem & One-Liner
Patients frequently receive confusing laboratory reports filled with complex acronyms (`ALT`, `TSH`, `BUN`, `eGFR`) and technical ranges. Non-native speakers and low-literacy patients face immense anxiety trying to decipher these values.

**One-liner:** Upload any lab report (PDF, photo, or text) and receive a plain-language explanation in your mother tongue: abnormal values highlighted, common non-serious daily causes explained, and actionable questions to ask your doctor.

---

## 2. Architecture & Pipeline

```
[Uploaded Lab Report: PDF, Image, Plaintext]
                       │
                       ▼
         [1. Ingestion & Pre-processing]
         - Format validation & image sizing (<10MB)
         - OCR / text ingestion via multimodal Gemini
                       │
                       ▼
             [2. PII Redaction Layer]
         - Regex & heuristic masking of Patient Names, DOB, Phone, MRN, Address
         - Preserves age and sex tokens for biological interval matching
                       │
                       ▼
          [3. Structured Extraction]
         - Schema-constrained JSON extraction
         - High-precision table regex parser fallback
                       │
                       ▼
       [4. Validation & Normalization]
         - Canonical test resolution (Hb -> Hemoglobin, SGPT -> ALT, etc.)
         - Range string parsing ("13.0 - 17.5", "< 200", "> 40")
                       │
                       ▼
       [5. Deterministic Flagging (Pure Code)]
         - Strictly deterministic Python/TypeScript logic (NO LLM)
         - Evaluates low, normal, high, critical_low, critical_high
         - Fallback to biological knowledge base if report lacks bounds
                       │
                       ▼
        [6. RAG Grounded Plain-Language Explanation]
         - Context assembled from curated clinical tests knowledge base
         - Target reading level: 6th-8th grade
         - Native generation across English, Hindi, Spanish, Arabic, French, Bengali
                       │
                       ▼
              [7. Safety Guardrails]
         - Prominent urgent alert for any critical value (e.g. Potassium > 6.0)
         - Forbidden content filtering: blocks diagnoses, drug prescriptions, false assurances
         - Mandatory localized disclaimers
                       │
                       ▼
         [8. Multilingual Audio & Client UI]
         - Arabic/Urdu RTL layout support
         - Gemini 3.8 Flash Lite TTS audio output
         - One-click copy, PDF export, checklist of doctor questions
```

---

## 3. Core Safety & Ethics Commitments

- **Zero Hallucination Flagging:** Flags are computed **strictly in deterministic code**, never by an LLM.
- **Urgent Critical Alerts:** Immediate red banners for critical levels (e.g. Potassium > 6.0 mmol/L, Platelets < 50 x10^3/uL).
- **PII Masking:** Patient names, IDs, addresses, and phone numbers are scrubbed prior to any external model transmission.
- **Strict Non-Diagnostic Scope:** Forbidden content filters block definitive diagnostic claims and prescription medication dosages.
- **Health Literacy, Not Replacement:** Always directs users to licensed healthcare professionals.

---

## 4. Quick Start & Execution

### Full-Stack Vite + Express Server:
```bash
# Install dependencies
npm install

# Run automated test suite
npm run test

# Start the full-stack server (Port 3000)
npm run dev
```

### Or using Make:
```bash
make test
make run
```

---

## 5. Supported Languages
- English (`en`)
- हिन्दी - Hindi (`hi`)
- Español - Spanish (`es`)
- العربية - Arabic (`ar`, with native Right-to-Left RTL support)
- Français - French (`fr`)
- বাংলা - Bengali (`bn`)
- اردو - Urdu (`ur`, RTL support)
- தமிழ் - Tamil (`ta`)

---

## 6. Project Structure

```
medical-report-explainer/
├── app/                        # FastAPI scaffolding & schemas
├── src/
│   ├── core/
│   │   ├── flagging.ts         # Deterministic range logic
│   │   ├── redaction.ts        # PII masking
│   │   ├── extraction.ts       # Full RAG & extraction pipeline
│   │   ├── safety.ts           # Guardrails & disclaimers
│   │   ├── languages.ts        # Supported languages & RTL config
│   │   └── llm/                # Abstract LLM client (Gemini + Mock)
│   ├── data/
│   │   └── synthetic_data.ts   # 8+ clinical sample reports
│   └── App.tsx                 # Responsive multilingual UI
├── knowledge/
│   ├── tests_kb.json           # Clinical test metadata & causes
│   └── reference_ranges.json   # Biological intervals & critical thresholds
├── prompts/                    # Tested prompts for extraction & RAG
├── tests/                      # Automated test suite
├── eval/                       # Benchmark scripts & report.md
└── docs/                       # Safety, architecture, pitch, demo script
```
