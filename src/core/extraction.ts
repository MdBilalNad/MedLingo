import type {
  AnalysisRequest,
  AnalysisResponse,
  LabResult,
} from '../types/medical.ts';
import { redactPii } from './redaction.ts';
import { normalizeLabResult, parseReferenceRange, resolveCanonicalName } from './flagging.ts';
import { getLLMClient } from './llm/index.ts';
import { checkUrgentCriticalValues, DISCLAIMERS_BY_LANG, sanitizeExplanationText } from './safety.ts';
import testsKbData from '../../knowledge/tests_kb.json';

const testsKnowledge: Record<string, any> = (testsKbData as any).tests || {};

/**
 * Regex-based deterministic fallback parser for standard tabular lab reports
 */
export function regexFallbackExtract(
  text: string,
  sex?: 'male' | 'female' | 'other' | null,
  age?: number | null
): LabResult[] {
  const lines = text.split(/\r?\n/);
  const results: LabResult[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('===')) continue;
    if (trimmed.toLowerCase().includes('patient') || trimmed.toLowerCase().includes('date') || trimmed.toLowerCase().includes('doctor')) continue;

    // Match lines like: TestName  Value  Unit  Range
    // e.g. "Hemoglobin 10.2 g/dL 12.1 - 15.1"
    const match = trimmed.match(
      /^([A-Za-z0-9\s()\/+-]+?)\s+([<>]?\s*\d+(?:\.\d+)?)\s+([a-zA-Z0-9%^/]+)?\s*([<>]?\s*\d+(?:\.\d+)?\s*(?:-|to)?\s*\d*(?:\.\d+)?)?/i
    );

    if (match) {
      const rawName = match[1].trim();
      const rawVal = match[2].trim().replace(/\s+/g, '');
      const numVal = parseFloat(rawVal.replace(/[<>]/g, ''));

      if (!isNaN(numVal) && rawName.length > 2) {
        const canonical = resolveCanonicalName(rawName);
        const unit = match[3]?.trim() || null;
        const refText = match[4]?.trim() || null;
        const parsedRange = parseReferenceRange(refText);

        results.push(
          normalizeLabResult(
            {
              test_name: canonical,
              raw_name: rawName,
              value: numVal,
              unit,
              ref_low: parsedRange.low,
              ref_high: parsedRange.high,
              ref_text: refText,
              confidence: 0.88,
            },
            sex,
            age
          )
        );
      }
    }
  }

  return results;
}

/**
 * Full Pipeline: Ingestion -> PII Redaction -> Extraction -> Normalization -> Deterministic Flagging -> RAG Explanation -> Safety Audit
 */
export async function analyzeLabReport(request: AnalysisRequest): Promise<AnalysisResponse> {
  const targetLang = request.language || 'en';
  const warnings: string[] = [];
  const llm = getLLMClient();

  let textToProcess = request.report_text || '';

  // 1. Ingestion & Pre-processing (Image OCR or PDF text ingestion via multimodal Gemini)
  if (!textToProcess && request.report_image_base64) {
    try {
      if (llm.generateFromImage) {
        const mimeMatch = request.report_image_base64.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const prompt = 'Transcribe all text from this medical laboratory report document accurately into plaintext. Include all test names, numerical values, units, and reference ranges verbatim.';
        textToProcess = await llm.generateFromImage(
          request.report_image_base64,
          mimeType,
          prompt
        );
      }
    } catch (err: any) {
      warnings.push(`Document/Image OCR notice: ${err?.message || 'Failed to read document directly, using fallback'}`);
    }
  }

  if (!textToProcess) {
    throw new Error('No report text or image data was provided for analysis.');
  }

  // 2. PII Redaction: Always mask names, DOB, phone, IDs before LLM calls
  const redaction = redactPii(textToProcess);
  if (redaction.detectedPiiCount > 0) {
    console.log(`Masked ${redaction.detectedPiiCount} PII tokens of types: ${redaction.redactedTypes.join(', ')}`);
  }

  // 3. Structured Extraction
  let extractedItems: any[] = [];
  try {
    const extractionPrompt = `You are a clinical laboratory extraction system.
Extract every laboratory test from this redacted medical report.
Output STRICT JSON in this exact structure:
{
  "extracted_tests": [
    {
      "test_name": "Standardized canonical name",
      "raw_name": "Name as written in report",
      "value": 12.5,
      "unit": "g/dL",
      "ref_low": 12.0,
      "ref_high": 16.0,
      "ref_text": "12.0 - 16.0",
      "confidence": 0.95
    }
  ]
}

Report Text:
${redaction.redactedText}`;

    const jsonStr = await llm.generate(extractionPrompt, {
      temperature: 0.0,
      responseMimeType: 'application/json',
    });

    const parsed = JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, '').trim());
    if (Array.isArray(parsed.extracted_tests)) {
      extractedItems = parsed.extracted_tests;
    }
  } catch (err) {
    console.warn('LLM extraction encountered an error, activating regex fallback:', err);
    warnings.push('Used deterministic regex table parser for extraction.');
  }

  // Fallback to regex parser if LLM extraction yielded 0 items
  if (extractedItems.length === 0) {
    const fallbackResults = regexFallbackExtract(redaction.redactedText, request.sex, request.age);
    if (fallbackResults.length > 0) {
      extractedItems = fallbackResults;
    }
  }

  // 4 & 5. Normalization & Pure Deterministic Flagging
  const results: LabResult[] = extractedItems.map((item) =>
    normalizeLabResult(item, request.sex, request.age)
  );

  if (results.length === 0) {
    warnings.push('Could not detect clear laboratory test results in the provided text.');
  }

  // Check confidence
  const lowConfidenceItems = results.filter((r) => r.confidence < 0.7);
  if (lowConfidenceItems.length > 0) {
    warnings.push(
      'Some tests were extracted with lower confidence. Please double-check with your physical report.'
    );
  }

  // Check critical values deterministically
  const urgentNotice = checkUrgentCriticalValues(results, targetLang);

  // 6. RAG Grounded Plain-Language Explanation
  // Assemble knowledge context for abnormal results
  const abnormalResults = results.filter((r) => r.flag !== 'normal');
  const knowledgeContextParts: string[] = [];

  for (const r of abnormalResults) {
    const kb = testsKnowledge[r.test_name];
    if (kb) {
      knowledgeContextParts.push(
        `Test: ${r.test_name} (${r.raw_name})\n` +
          `What it measures: ${kb.what_it_measures}\n` +
          `Plain meaning: ${kb.plain_meaning}\n` +
          `Interpretation: ${r.flag.includes('low') ? kb.low_meaning : kb.high_meaning}\n` +
          `Non-serious causes: ${kb.non_serious_causes}\n` +
          `Suggested questions: ${kb.questions_for_doctor.join(' | ')}`
      );
    }
  }

  let summary = '';
  const explanations: Record<string, string> = {};
  let questionsForDoctor: string[] = [];

  // Default fallback questions from KB
  for (const r of abnormalResults) {
    const kb = testsKnowledge[r.test_name];
    if (kb?.questions_for_doctor) {
      for (const q of kb.questions_for_doctor) {
        if (!questionsForDoctor.includes(q)) questionsForDoctor.push(q);
      }
    }
  }

  if (questionsForDoctor.length === 0) {
    questionsForDoctor = [
      'What lifestyle or dietary adjustments do you recommend based on these findings?',
      'Should we schedule a follow-up lab test in 4 to 12 weeks to monitor trends?',
      'Do any of these values require further specialized evaluation or medication?',
    ];
  }

  try {
    const explanationPrompt = `Generate a plain-language, patient-friendly medical report explanation.
Target reading level: 6th-8th grade.
Language: ${targetLang}

Patient Profile: Age ${request.age ?? 'Not specified'}, Sex ${request.sex ?? 'Not specified'}

Knowledge Base Clinical Context:
${knowledgeContextParts.join('\n\n')}

Extracted Lab Results:
${JSON.stringify(results, null, 2)}

Requirements:
1. Provide a calm, reassuring 3-4 sentence overall summary in the requested language (${targetLang}).
2. Provide an explanation for each abnormal test, explaining what the test measures, why their value might be outside normal range, common non-serious daily causes (like hydration, stress, or diet), and next steps.
3. Keep test names with English in parentheses, e.g., "हीमोग्लोबिन (Hemoglobin)".
4. Suggest 3-4 practical questions the patient can ask their doctor.
5. NEVER diagnose disease. NEVER recommend drug dosages.

Output strictly JSON:
{
  "summary": "...",
  "explanations": {
    "Test Name": "..."
  },
  "questions_for_doctor": ["question 1", "question 2", "question 3"]
}`;

    const explanationJson = await llm.generate(explanationPrompt, {
      temperature: 0.2,
      responseMimeType: 'application/json',
    });

    const parsedExplanation = JSON.parse(
      explanationJson.replace(/```json/g, '').replace(/```/g, '').trim()
    );

    if (parsedExplanation.summary) {
      summary = parsedExplanation.summary;
    }
    if (parsedExplanation.explanations) {
      Object.assign(explanations, parsedExplanation.explanations);
    }
    if (Array.isArray(parsedExplanation.questions_for_doctor) && parsedExplanation.questions_for_doctor.length > 0) {
      questionsForDoctor = parsedExplanation.questions_for_doctor;
    }
  } catch (err) {
    console.warn('LLM explanation failed, falling back to knowledge base templates:', err);
    summary =
      'Your laboratory test results have been analyzed and compared with standard reference ranges. Abnormal items have been highlighted below for you to review with your healthcare provider.';
    for (const r of abnormalResults) {
      const kb = testsKnowledge[r.test_name];
      explanations[r.test_name] = kb
        ? `${kb.plain_meaning} Your level is ${r.value} ${r.unit || ''}. Non-serious factors like hydration or everyday diet can influence this.`
        : `Your ${r.test_name} result is ${r.value} ${r.unit || ''}, which is flagged as ${r.flag.replace('_', ' ')}. Discuss this finding with your physician.`;
    }
  }

  // 7. Safety Layer Audit
  const sanitizedSummary = sanitizeExplanationText(summary);
  summary = sanitizedSummary.cleanText;
  if (sanitizedSummary.violations.length > 0) {
    warnings.push(...sanitizedSummary.violations);
  }

  for (const [key, expl] of Object.entries(explanations)) {
    const sanitized = sanitizeExplanationText(expl);
    explanations[key] = sanitized.cleanText;
  }

  // Disclaimer in patient language
  const disclaimer = DISCLAIMERS_BY_LANG[targetLang] || DISCLAIMERS_BY_LANG.en;

  // 8. TTS Audio Generation (optional)
  let audioUrl: string | null = null;
  if (request.include_audio && llm.generateSpeech) {
    try {
      const speechPrompt = `${summary}. Questions to ask: ${questionsForDoctor.slice(0, 2).join('. ')}`;
      const base64Wav = await llm.generateSpeech(speechPrompt);
      if (base64Wav) {
        audioUrl = `data:audio/wav;base64,${base64Wav}`;
      }
    } catch (err) {
      console.warn('TTS generation failed:', err);
    }
  }

  return {
    results,
    summary,
    explanations,
    questions_for_doctor: questionsForDoctor,
    urgent_notice: urgentNotice,
    disclaimer,
    language: targetLang,
    audio_url: audioUrl,
    warnings,
    redacted_text_sample: redaction.redactedText.slice(0, 400) + (redaction.redactedText.length > 400 ? '...' : ''),
  };
}
