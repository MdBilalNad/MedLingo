export interface GenerateOptions {
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
  systemInstruction?: string;
}

export interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateFromImage?(imageBase64: string, mimeType: string, prompt: string): Promise<string>;
  generateSpeech?(text: string, voiceName?: string): Promise<string | null>; // returns base64 WAV or null
  isAvailable(): boolean;
  providerName(): string;
}
