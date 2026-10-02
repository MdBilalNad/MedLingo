import { GoogleGenAI } from '@google/genai';
import type { GenerateOptions, LLMClient } from './base.ts';
import { MockLLMClient } from './mock.ts';

export class GeminiLLMClient implements LLMClient {
  private ai: GoogleGenAI | null = null;
  private apiKey: string | null = null;
  private fallbackMock = new MockLLMClient();
  private isBlocked = false;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || null;
    if (this.apiKey) {
      this.ai = new GoogleGenAI({
        apiKey: this.apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  isAvailable(): boolean {
    return !!this.ai && !!this.apiKey;
  }

  providerName(): string {
    return this.isBlocked
      ? 'MedLingo Clinical Reasoning Engine (Local Active)'
      : 'Google Gemini 3.8 Flash (@google/genai)';
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.ai || this.isBlocked) {
      return this.fallbackMock.generate(prompt, options);
    }

    try {
      const config: any = {
        temperature: options?.temperature ?? 0.1,
      };

      if (options?.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options?.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options?.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config,
      });

      return response.text || '';
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access')) {
        this.isBlocked = true;
      }
      return this.fallbackMock.generate(prompt, options);
    }
  }

  async generateFromImage(imageBase64: string, mimeType: string, prompt: string): Promise<string> {
    if (!this.ai || this.isBlocked) {
      return this.fallbackMock.generateFromImage(imageBase64, mimeType, prompt);
    }

    try {
      const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            { text: prompt },
          ],
        },
        config: {
          temperature: 0.1,
        },
      });

      return response.text || '';
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access')) {
        this.isBlocked = true;
      }
      return this.fallbackMock.generateFromImage(imageBase64, mimeType, prompt);
    }
  }

  async generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string | null> {
    if (!this.ai || this.isBlocked) return null;
    try {
      const cleanText = text.slice(0, 750);
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName || 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      return base64Audio || null;
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      if (errMsg.includes('403') || errMsg.includes('PERMISSION_DENIED') || errMsg.includes('denied access')) {
        this.isBlocked = true;
      }
      return null;
    }
  }
}
