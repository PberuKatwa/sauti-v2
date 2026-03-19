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
    userMessage: string,
    model: string = "gemini-2.5-flash"
  ): Promise<string> {
    try {
      if (!userMessage.trim()) {
        throw new Error("runPrompt: prompt cannot be empty");
      }

      const SYSTEM_PROMPT = `
        You are an intent classification engine.

        Your ONLY job is to map a user message to ONE intent from a predefined list.

        -----------------------
        🎯 AVAILABLE INTENTS
        -----------------------
        1. CREATE_ORDER → creating or generating an order/invoice
        2. REQUEST_CATALOGUE → browsing, viewing, or asking for available items/products
        3. FETCH_ALL_ORDERS → retrieving multiple orders or order history
        4. FETCH_SINGLE_ORDER → retrieving one specific order/invoice
        5. TRACK_ORDER → checking delivery status, location, or progress
        6. PAY_FOR_ORDER → anything related to payment, cost, balance, or paying

        -----------------------
        🧠 RULES
        -----------------------
        - Return ONLY ONE intent
        - Be strict
        - If unclear → return UNKNOWN

        -----------------------
        📦 OUTPUT FORMAT (MANDATORY)
        -----------------------
        {
          id: string;
          label: string;
          score: number;
          matchedPhrase?: string;
          partialPhrases?: string[];
          weakTokens?: string[];
          strongTokens?: string[];
          fuzzyTokens?: string[];
        }

        -----------------------
        ❌ UNKNOWN FORMAT
        -----------------------
        {
          id: "UNKNOWN",
          label: "UNKNOWN",
          score: 0,
          matchedPhrase: "UNKNOWN",
          partialPhrases: [],
          weakTokens: [],
          strongTokens: [],
          fuzzyTokens: [],
        }

        Return ONLY JSON. No explanations.
      `;

      this.logger.warn(`Sending prompt to Gemini model: ${model}`);

      const response = await this.client.models.generateContent({
        model,
        contents: [
          {
            role: "system",
            parts: [{ text: SYSTEM_PROMPT }],
          },
          {
            role: "user",
            parts: [{ text: userMessage }],
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
