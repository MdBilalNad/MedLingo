import type { LLMClient } from './base.ts';
import { GeminiLLMClient } from './gemini.ts';
import { MockLLMClient } from './mock.ts';

let activeClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (activeClient) {
    return activeClient;
  }

  // Check if LLM_PROVIDER is explicitly set or if GEMINI_API_KEY exists
  const forceMock = process.env.LLM_PROVIDER === 'mock';
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');

  if (!forceMock && hasGeminiKey) {
    try {
      activeClient = new GeminiLLMClient();
      console.log('Initialized Gemini LLM Client');
      return activeClient;
    } catch (err) {
      console.warn('Failed to initialize Gemini client, falling back to mock:', err);
    }
  }

  activeClient = new MockLLMClient();
  console.log('Initialized Mock LLM Client (Offline Demo Mode)');
  return activeClient;
}

export { LLMClient, GeminiLLMClient, MockLLMClient };
