import { Injectable, Inject } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import { APP_LOGGER } from "../../logger/logger.provider";
import type { AppLogger } from "../../logger/winston.logger";

@Injectable()
export class IntentGeminiService {
  private readonly client: GoogleGenAI;

  constructor(
    @Inject(APP_LOGGER) private readonly logger: AppLogger,
    apiKey: string
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async basicPrompt(
    prompt: string,
    model: string = "gemini-2.5-flash"
  ): Promise<string> {
    try {
      if (!prompt.trim()) {
        throw new Error("runPrompt: prompt cannot be empty");
      }

      this.logger.warn(`Sending prompt to Gemini model: ${model}`);

      const response = await this.client.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      });

      const output = response.text;

      if (!output) {
        throw new Error("No text response from Gemini");
      }

      return output;

    } catch (error: any) {
      this.logger.error(`Gemini error: ${error.message}`);
      throw error;
    }
  }
}
