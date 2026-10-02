import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { analyzeLabReport } from './src/core/extraction.ts';
import { getLLMClient } from './src/core/llm/index.ts';
import { SUPPORTED_LANGUAGES } from './src/core/languages.ts';
import { SYNTHETIC_REPORTS } from './src/data/synthetic_data.ts';
import { sanitizeExplanationText } from './src/core/safety.ts';
import type { AnalysisRequest } from './src/types/medical.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parser with 15MB limit for report text and base64 photos
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging (sanitized, never logs raw report content or PII)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || req.path === '/health') {
      console.log(`[API] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint (as specified in Phase 1)
app.get(['/health', '/api/health'], (req, res) => {
  const llm = getLLMClient();
  res.json({
    status: 'healthy',
    app: 'MedLingo - Multilingual Medical Report Explainer',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    llm_provider: llm.providerName(),
    llm_available: llm.isAvailable(),
    languages_supported: SUPPORTED_LANGUAGES.length,
    features: {
      deterministic_flagging: true,
      pii_redaction: true,
      multilingual_rag: true,
      audio_tts: true,
      offline_demo_mode: true,
    },
  });
});

// List supported languages
app.get('/api/languages', (req, res) => {
  res.json({
    languages: SUPPORTED_LANGUAGES,
  });
});

// Server-backed settings store
let currentServerSettings = {
  theme: 'light',
  preferredLanguage: 'en',
  autoReadAudio: false,
  piiStrictness: 'strict',
  ocrThreshold: 0.60,
  targetReadingGrade: 7,
  exportFormat: 'pdf',
  criticalAlertThresholds: {
    potassiumHigh: 6.0,
    plateletsLow: 50,
    glucoseLow: 54,
    glucoseHigh: 300,
  },
};

// GET /api/settings
app.get('/api/settings', (req, res) => {
  const llm = getLLMClient();
  res.json({
    settings: currentServerSettings,
    system: {
      llm_provider: llm.providerName(),
      llm_available: llm.isAvailable(),
      uptime_seconds: Math.floor(process.uptime()),
      firebase_database: 'ai-studio-medlingomultilin-c0c15e01-def5-49b6-91ed-0e091a2766f3',
      endpoints: ['/api/analyze', '/api/chat', '/api/tts', '/api/samples', '/api/settings'],
    },
  });
});

// POST /api/settings
app.post('/api/settings', (req, res) => {
  try {
    const newSettings = req.body;
    currentServerSettings = {
      ...currentServerSettings,
      ...newSettings,
      criticalAlertThresholds: {
        ...currentServerSettings.criticalAlertThresholds,
        ...(newSettings.criticalAlertThresholds || {}),
      },
    };
    res.json({
      success: true,
      message: 'Settings updated successfully on server.',
      settings: currentServerSettings,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to update settings.' });
  }
});

// List synthetic sample lab reports for instant 1-click testing
app.get('/api/samples', (req, res) => {
  const summaries = SYNTHETIC_REPORTS.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    has_critical: r.has_critical,
    patient_profile: r.patient_profile,
    notes: r.notes,
  }));
  res.json({ samples: summaries });
});

// Get a specific synthetic sample report
app.get('/api/samples/:id', (req, res) => {
  const found = SYNTHETIC_REPORTS.find((r) => r.id === req.params.id);
  if (!found) {
    return res.status(404).json({ error: 'Sample report not found' });
  }
  res.json(found);
});

// Analyze report endpoint
app.post('/api/analyze', async (req, res) => {
  try {
    const requestData: AnalysisRequest = req.body;

    if (!requestData.report_text && !requestData.report_image_base64) {
      return res.status(400).json({
        error: 'Please provide either report text or an uploaded image.',
      });
    }

    const response = await analyzeLabReport(requestData);
    res.json(response);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error?.message || 'An unexpected error occurred while analyzing the lab report.',
    });
  }
});

// TTS audio endpoint
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS synthesis.' });
    }

    const llm = getLLMClient();
    if (llm.generateSpeech) {
      const base64Audio = await llm.generateSpeech(text, voice || 'Kore');
      if (base64Audio) {
        return res.json({
          audio_url: `data:audio/wav;base64,${base64Audio}`,
          format: 'audio/wav',
        });
      }
    }

    res.json({
      audio_url: null,
      message: 'Server-side TTS model unavailable, using browser speech synthesis fallback.',
    });
  } catch (error: any) {
    console.warn('TTS error:', error);
    res.status(500).json({ error: error?.message || 'TTS generation failed' });
  }
});

// Chatbot endpoint: Dr. MedLingo Clinical Assistant (Trained strongly on health education & next steps)
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, reportContext, patientContext, language } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }

    const llm = getLLMClient();
    const lang = language || 'en';

    const prompt = `You are Dr. MedLingo, an authoritative, deeply compassionate, and experienced clinical physician and health educator.
The user is asking you for follow-up clinical guidance on their medical laboratory results.

PATIENT CONTEXT:
Age: ${patientContext?.age || 'Not specified'}
Biological Sex: ${patientContext?.sex || 'Not specified'}
Preferred Language: ${lang}

LABORATORY FINDINGS & REPORT OVERVIEW:
${reportContext ? JSON.stringify(reportContext, null, 2) : 'No report analyzed yet. Provide expert clinical literacy advice.'}

CONVERSATION HISTORY:
${Array.isArray(history) ? history.map((h: any) => `${h.role === 'user' ? 'Patient' : 'Dr. MedLingo'}: ${h.content}`).join('\n') : ''}

PATIENT QUESTION:
"${message}"

CLINICAL GUIDELINES FOR DR. MEDLINGO:
1. TRAINED VERY STRONG ON ACTIONABLE MEDICAL GUIDANCE:
   - Provide direct, clear, actionable advice on WHAT TO DO next.
   - If there is an urgent/critical lab finding (e.g. Potassium > 6.0, Platelets < 50, critical glucose), immediately and clearly advise seeking emergency or urgent medical evaluation without delay.
   - Outline specific "red flag" symptoms to monitor that require prompt clinical care (e.g., chest pain, shortness of breath, irregular heartbeat, severe dizziness, confusion).
   - Suggest non-pharmacological everyday actions (hydration, dietary guidance, rest, avoiding heavy exertion).
   - Formulate 2-3 precise questions they should take to their doctor at their appointment.
2. NATIVE MULTILINGUAL GENERATION:
   - Reply directly and fluently in the requested language (${lang}).
   - Always retain medical test names with English in brackets, e.g. "हीमोग्लोबिन (Hemoglobin)".
3. ETHICAL BOUNDARIES:
   - Do NOT prescribe specific pharmaceutical drug dosages (e.g., no "take 500mg X").
   - Do NOT assert diagnoses as absolute certainty; use "these findings can suggest...", "in clinical practice this pattern is associated with...".
   - Conclude with a warm, reassuring, professional physician sign-off.`;

    const reply = await llm.generate(prompt, { temperature: 0.3 });
    const sanitized = sanitizeExplanationText(reply);

    res.json({
      reply: sanitized.cleanText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Dr. MedLingo Chat error:', error);
    res.status(500).json({
      error: error?.message || 'Dr. MedLingo could not process your question at this moment.',
    });
  }
});

// Setup Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MedLingo Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
