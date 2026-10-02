# MedLingo: 3-Minute Demo Walkthrough Script

## [0:00 - 0:30] Hook & Problem
- "Judges, imagine an elderly mother or a non-English speaker opening their blood test report. They see numbers like 'ALT 88 U/L' or 'Potassium 6.8 mmol/L'. They are confused, anxious, and can't get an appointment for two weeks."
- "Introducing MedLingo: An AI-powered health literacy engine that translates medical lab tests into clear, grounded, everyday language in seconds."

## [0:30 - 1:15] Demo Flow: Instant Ingestion & Deterministic Flagging
- **Action:** Open MedLingo in the browser.
- **Show:** Click the sample report selector: *"Serum Electrolytes - CRITICAL High Potassium"*.
- **Narrate:** "Notice the immediate pipeline execution. MedLingo automatically scrubs all patient names and identification to protect privacy."
- **Highlight:** "Look at the flag results table. Notice that Potassium at 6.8 mmol/L is prominently labeled in bold red as 'CRITICAL HIGH'. This was NOT determined by a probabilistic LLM guessing in the dark. It is evaluated by pure deterministic code against clinical reference ranges. A red warning banner immediately advises the user to contact a clinician."

## [1:15 - 2:00] Multilingual RAG & Empathy
- **Action:** Switch the language dropdown to **हिन्दी (Hindi)** or **العربية (Arabic)**.
- **Narrate:** "Notice how MedLingo natively translates the entire patient summary and per-test breakdown. Test names keep their standardized English name in brackets so the patient can point to it when speaking with their doctor."
- **Point out:** "For Arabic and Urdu, the layout automatically mirrors to right-to-left (RTL) mode."

## [2:00 - 2:30] Doctor Questions & Accessibility (TTS)
- **Action:** Scroll to the "Questions for Your Doctor" checklist. Click the audio play button.
- **Narrate:** "For patients with low literacy or visual impairments, text-to-speech reads the overview aloud. Patients get a prepared checklist of calm, constructive questions to bring into the consultation room."

## [2:30 - 3:00] Safety, Evaluation & Close
- **Narrate:** "MedLingo has strict safety guardrails: zero diagnoses as absolute facts, zero medication prescriptions, and 100% boundary testing. It empowers patients without practicing medicine without a license. Thank you!"
