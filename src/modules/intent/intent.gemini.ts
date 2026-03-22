import { Injectable, Logger, InternalServerErrorException, Inject } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { BestIntent } from '../../types/intent.types';
import { BestIntentSchema } from '../../validators/bestIntent.schema';
import { APP_LOGGER } from '../../logger/logger.provider';
import { AppLogger } from '../../logger/winston.logger';

@Injectable()
export class IntentGeminiService {
  private readonly client: GoogleGenAI;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    apiKey: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async basicPrompt(prompt: string, model: string = "gemini-2.5-flash"): Promise<string> {
    try {
      if (!prompt.trim()) {
        throw new Error("runPrompt: prompt cannot be empty");
      }

      this.logger.warn(`Attempting to use gemini to detect intent`);

      const response = await this.client.models.generateContent({
          model,
          contents: [
            { role: "user", parts: [{ text: prompt }] }
          ],
      });

      const output = response.text;

      if (!output) {
        throw new Error("No text response from Gemini");
      }

      return output;
    } catch (err: any) {
      throw new InternalServerErrorException(`GeminiChatService Error: ${err.message}`);
    }
  }

  public async getLlmIntent(prompt: string): Promise<BestIntent> {
    try {
      const rawResponse = await this.basicPrompt(prompt);

      const cleaned = rawResponse
        .trim()
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      const result = BestIntentSchema.safeParse(parsed);

      if (!result.success) {
        throw new Error(`Zod validation failed: ${result.error.format()}`)
      }

      return result.data as BestIntent;

    } catch (error: any) {
      throw error;
    }
  }

}
