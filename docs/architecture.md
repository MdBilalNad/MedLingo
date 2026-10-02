# MedLingo Architecture Specification

## Overview
MedLingo translates and explains complex medical laboratory reports in plain language for patients, migrant workers, rural families, and non-native speakers. It ensures health equity and safety through a zero-hallucination deterministic flagging layer coupled with a RAG-grounded LLM explanation.

## Dataflow Pipeline

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

## Key Modules
1. **`src/core/flagging.ts`**: Pure deterministic evaluation. Zero room for LLM hallucination on whether potassium is critical or hemoglobin is low.
2. **`src/core/redaction.ts`**: Strict privacy protection prior to any external API invocation.
3. **`src/core/safety.ts`**: Urgent alerts for critical care values, regex-backed sanitize filters, and patient-native disclaimers.
4. **`src/core/llm/`**: Pluggable provider abstraction with Google Gemini 3.8 Flash and offline mock demo mode.
